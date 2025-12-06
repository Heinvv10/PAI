#!/usr/bin/env python3
"""
Task Queue & State Management
==============================

File-based task state management for BOSS Orchestrator.
Follows the proven pattern from autonomous-coding/feature_list.json.

Key Design:
- Tasks can only be updated (never removed) for crash recovery
- JSON file persists across restarts
- Optional Redis pub/sub for real-time notifications
"""

import json
import os
import threading
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from enum import Enum
import uuid


class TaskStatus(Enum):
    """Task lifecycle states."""
    PENDING = "pending"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PENDING_REVIEW = "pending_review"
    CANCELLED = "cancelled"


class TaskType(Enum):
    """Supported task types."""
    EMAIL_RESPONSE = "email_response"
    CODE_IMPLEMENTATION = "code_implementation"
    RESEARCH = "research"
    CONTENT_WRITING = "content_writing"
    DATA_ANALYSIS = "data_analysis"
    CUSTOM = "custom"


@dataclass
class Task:
    """A task in the orchestrator queue."""
    task_id: str
    task_type: str
    status: str
    created_at: str
    updated_at: str
    source_data: Dict[str, Any]
    assigned_worker: Optional[str] = None
    worker_output: Optional[Dict[str, Any]] = None
    validation_status: Optional[str] = None
    confidence: float = 0.0
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    priority: int = 5  # 1-10, 10 = highest

    # Autonomous session support (NEW - Week 1)
    session_id: Optional[str] = None
    autonomous_mode: bool = False
    feature_list_path: Optional[str] = None
    auto_continue: bool = True
    max_sessions: int = 50

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "source_data": self.source_data,
            "assigned_worker": self.assigned_worker,
            "worker_output": self.worker_output,
            "validation_status": self.validation_status,
            "confidence": self.confidence,
            "error": self.error,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "priority": self.priority,
            # Autonomous session fields
            "session_id": self.session_id,
            "autonomous_mode": self.autonomous_mode,
            "feature_list_path": self.feature_list_path,
            "auto_continue": self.auto_continue,
            "max_sessions": self.max_sessions,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        """Create Task from dictionary."""
        return cls(
            task_id=data["task_id"],
            task_type=data["task_type"],
            status=data["status"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            source_data=data.get("source_data", {}),
            assigned_worker=data.get("assigned_worker"),
            worker_output=data.get("worker_output"),
            validation_status=data.get("validation_status"),
            confidence=data.get("confidence", 0.0),
            error=data.get("error"),
            retry_count=data.get("retry_count", 0),
            max_retries=data.get("max_retries", 3),
            priority=data.get("priority", 5),
            # Autonomous session fields (with defaults for backward compatibility)
            session_id=data.get("session_id"),
            autonomous_mode=data.get("autonomous_mode", False),
            feature_list_path=data.get("feature_list_path"),
            auto_continue=data.get("auto_continue", True),
            max_sessions=data.get("max_sessions", 50),
        )


class TaskQueue:
    """
    File-based task queue with crash recovery.

    Stores tasks in task_list.json for persistence.
    Tasks are never deleted, only updated (for audit trail).
    """

    def __init__(
        self,
        state_dir: Optional[Path] = None,
        redis_url: Optional[str] = None,
    ):
        """
        Initialize the task queue.

        Args:
            state_dir: Directory for state files (default: ./state)
            redis_url: Optional Redis URL for pub/sub notifications
        """
        if state_dir is None:
            # Default to state/ directory relative to this file
            state_dir = Path(__file__).parent / "state"

        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.state_dir / "task_list.json"

        self._lock = threading.Lock()
        self._redis = None

        # Initialize Redis if URL provided
        if redis_url:
            try:
                import redis
                self._redis = redis.from_url(redis_url)
            except ImportError:
                print("Warning: Redis not installed, pub/sub disabled")
            except Exception as e:
                print(f"Warning: Redis connection failed: {e}")

        # Initialize state file if doesn't exist
        if not self.state_file.exists():
            self._save_state({"tasks": [], "metadata": self._create_metadata()})

    def _create_metadata(self) -> Dict[str, Any]:
        """Create metadata for state file."""
        return {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "last_modified": datetime.now().isoformat(),
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
        }

    def _load_state(self) -> Dict[str, Any]:
        """Load state from file."""
        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"tasks": [], "metadata": self._create_metadata()}

    def _save_state(self, state: Dict[str, Any]) -> None:
        """Save state to file atomically."""
        state["metadata"]["last_modified"] = datetime.now().isoformat()

        # Update counts
        tasks = state.get("tasks", [])
        state["metadata"]["total_tasks"] = len(tasks)
        state["metadata"]["completed_tasks"] = sum(
            1 for t in tasks if t.get("status") == TaskStatus.COMPLETED.value
        )
        state["metadata"]["failed_tasks"] = sum(
            1 for t in tasks if t.get("status") == TaskStatus.FAILED.value
        )

        # Atomic write using temp file
        temp_file = self.state_file.with_suffix('.tmp')
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        # Replace original file
        temp_file.replace(self.state_file)

    def create_task(
        self,
        task_type: str,
        source_data: Dict[str, Any],
        priority: int = 5,
    ) -> Task:
        """
        Create a new task and add to queue.

        Args:
            task_type: Type of task (email_response, code_implementation, etc.)
            source_data: Input data for the task
            priority: Task priority (1-10, 10 = highest)

        Returns:
            The created Task
        """
        task_id = f"{task_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        now = datetime.now().isoformat()

        task = Task(
            task_id=task_id,
            task_type=task_type,
            status=TaskStatus.PENDING.value,
            created_at=now,
            updated_at=now,
            source_data=source_data,
            priority=priority,
        )

        with self._lock:
            state = self._load_state()
            state["tasks"].append(task.to_dict())
            self._save_state(state)

        # Publish to Redis if available
        self._publish("task_created", task.to_dict())

        return task

    def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        assigned_worker: Optional[str] = None,
        worker_output: Optional[Dict] = None,
        validation_status: Optional[str] = None,
        confidence: Optional[float] = None,
        error: Optional[str] = None,
    ) -> Optional[Task]:
        """
        Update a task's state.

        Args:
            task_id: ID of task to update
            status: New status
            assigned_worker: Worker ID assigned to task
            worker_output: Output from worker
            validation_status: Validation result
            confidence: Confidence score
            error: Error message if failed

        Returns:
            Updated Task or None if not found
        """
        with self._lock:
            state = self._load_state()

            for i, task_data in enumerate(state["tasks"]):
                if task_data["task_id"] == task_id:
                    # Update fields
                    if status is not None:
                        task_data["status"] = status
                    if assigned_worker is not None:
                        task_data["assigned_worker"] = assigned_worker
                    if worker_output is not None:
                        task_data["worker_output"] = worker_output
                    if validation_status is not None:
                        task_data["validation_status"] = validation_status
                    if confidence is not None:
                        task_data["confidence"] = confidence
                    if error is not None:
                        task_data["error"] = error

                    task_data["updated_at"] = datetime.now().isoformat()

                    state["tasks"][i] = task_data
                    self._save_state(state)

                    task = Task.from_dict(task_data)
                    self._publish("task_updated", task.to_dict())
                    return task

        return None

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        state = self._load_state()
        for task_data in state["tasks"]:
            if task_data["task_id"] == task_id:
                return Task.from_dict(task_data)
        return None

    def get_pending_tasks(self, task_type: Optional[str] = None) -> List[Task]:
        """Get all pending tasks, optionally filtered by type."""
        state = self._load_state()
        tasks = []

        for task_data in state["tasks"]:
            if task_data["status"] in [TaskStatus.PENDING.value, TaskStatus.QUEUED.value]:
                if task_type is None or task_data["task_type"] == task_type:
                    tasks.append(Task.from_dict(task_data))

        # Sort by priority (highest first) then by creation time
        tasks.sort(key=lambda t: (-t.priority, t.created_at))
        return tasks

    def get_next_task(self, task_type: Optional[str] = None) -> Optional[Task]:
        """Get the next pending task with highest priority."""
        pending = self.get_pending_tasks(task_type)
        return pending[0] if pending else None

    def mark_in_progress(self, task_id: str, worker_id: str) -> Optional[Task]:
        """Mark a task as in progress and assign worker."""
        return self.update_task(
            task_id=task_id,
            status=TaskStatus.IN_PROGRESS.value,
            assigned_worker=worker_id,
        )

    def mark_completed(
        self,
        task_id: str,
        worker_output: Dict,
        confidence: float,
        validation_status: str = "passed",
    ) -> Optional[Task]:
        """Mark a task as completed with output."""
        return self.update_task(
            task_id=task_id,
            status=TaskStatus.COMPLETED.value,
            worker_output=worker_output,
            confidence=confidence,
            validation_status=validation_status,
        )

    def mark_failed(self, task_id: str, error: str) -> Optional[Task]:
        """Mark a task as failed with error."""
        task = self.get_task(task_id)
        if task and task.retry_count < task.max_retries:
            # Increment retry count and re-queue
            with self._lock:
                state = self._load_state()
                for task_data in state["tasks"]:
                    if task_data["task_id"] == task_id:
                        task_data["retry_count"] = task_data.get("retry_count", 0) + 1
                        task_data["status"] = TaskStatus.PENDING.value
                        task_data["error"] = error
                        task_data["updated_at"] = datetime.now().isoformat()
                        self._save_state(state)
                        return Task.from_dict(task_data)
        else:
            return self.update_task(
                task_id=task_id,
                status=TaskStatus.FAILED.value,
                error=error,
            )

    def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        state = self._load_state()
        return state.get("metadata", {})

    def _publish(self, event: str, data: Dict) -> None:
        """Publish event to Redis if available."""
        if self._redis:
            try:
                channel = f"boss_orchestrator:{event}"
                self._redis.publish(channel, json.dumps(data))
            except Exception:
                pass  # Silently ignore Redis errors


# Module-level instance
_default_queue: Optional[TaskQueue] = None


def get_task_queue(state_dir: Optional[Path] = None) -> TaskQueue:
    """Get or create the default task queue."""
    global _default_queue
    if _default_queue is None:
        _default_queue = TaskQueue(state_dir=state_dir)
    return _default_queue


__all__ = [
    "Task",
    "TaskStatus",
    "TaskType",
    "TaskQueue",
    "get_task_queue",
]
