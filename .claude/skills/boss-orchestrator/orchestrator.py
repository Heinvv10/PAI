#!/usr/bin/env python3
"""
BOSS Multi-Agent Orchestrator
==============================

Central dispatcher for autonomous Claude Agent SDK workers.
Routes tasks to specialized workers (Email Drafter, Code Implementer, etc.)
that run as truly autonomous Claude agents with fresh context per task.

Usage:
    from orchestrator import BossOrchestrator

    orchestrator = BossOrchestrator()

    # Dispatch an email drafting task
    result = await orchestrator.dispatch_task({
        "type": "email_response",
        "source_data": {
            "email_id": "abc123",
            "from": "client@example.com",
            "subject": "Project Update",
            "body": "When will the project be complete?"
        }
    })

    # Check status
    status = orchestrator.get_task_status("email_response_20251206_120000_abc123")
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from task_queue import TaskQueue, Task, TaskStatus, TaskType, get_task_queue
from workers.base import AutonomousWorker, TaskResult
from workers.email_drafter import EmailDrafterWorker, create_email_drafter


class BossOrchestrator:
    """
    Central orchestrator for autonomous Claude Agent SDK workers.

    Implements the Boss/Worker pattern where:
    - Boss (this class) manages task queue and worker assignment
    - Workers run autonomously with fresh context per task
    - All outputs are validated with NLNH/DGTS protocols
    """

    # Worker type to class mapping
    WORKER_REGISTRY: Dict[str, Type[AutonomousWorker]] = {
        TaskType.EMAIL_RESPONSE.value: EmailDrafterWorker,
        # Future workers will be added here:
        # TaskType.CODE_IMPLEMENTATION.value: CodeImplementerWorker,
        # TaskType.RESEARCH.value: ResearcherWorker,
        # TaskType.CONTENT_WRITING.value: ContentWriterWorker,
    }

    def __init__(
        self,
        state_dir: Optional[Path] = None,
        model: Optional[str] = None,
        max_concurrent_workers: int = 3,
    ):
        """
        Initialize the orchestrator.

        Args:
            state_dir: Directory for task state files
            model: Default Claude model for workers
            max_concurrent_workers: Max parallel worker executions
        """
        self.state_dir = state_dir or Path(__file__).parent / "state"
        self.model = model or "claude-sonnet-4-5-20250929"
        self.max_concurrent_workers = max_concurrent_workers

        # Initialize task queue
        self.task_queue = get_task_queue(self.state_dir)

        # Active workers (worker_id -> worker instance)
        self.active_workers: Dict[str, AutonomousWorker] = {}

        # Semaphore for concurrent worker limit
        self._worker_semaphore = asyncio.Semaphore(max_concurrent_workers)

        print(f"[BOSS] Orchestrator initialized")
        print(f"[BOSS] State dir: {self.state_dir}")
        print(f"[BOSS] Model: {self.model}")
        print(f"[BOSS] Max concurrent workers: {max_concurrent_workers}")

    def _create_worker(self, task_type: str) -> Optional[AutonomousWorker]:
        """
        Create a worker for the given task type.

        Args:
            task_type: Type of task (email_response, code_implementation, etc.)

        Returns:
            Worker instance or None if type not supported
        """
        worker_class = self.WORKER_REGISTRY.get(task_type)
        if worker_class is None:
            print(f"[BOSS] Warning: No worker registered for task type '{task_type}'")
            return None

        # Use factory method if available
        if task_type == TaskType.EMAIL_RESPONSE.value:
            return create_email_drafter(model=self.model)

        # Generic worker creation
        worker_id = f"{task_type}_{datetime.now().strftime('%H%M%S')}"
        return worker_class(worker_id=worker_id, model=self.model)

    async def dispatch_task(
        self,
        task_data: Dict[str, Any],
        priority: int = 5,
        wait_for_result: bool = True,
    ) -> Dict[str, Any]:
        """
        Dispatch a task to an autonomous worker.

        Args:
            task_data: Task specification containing:
                - type: Task type (email_response, code_implementation, etc.)
                - source_data: Input data for the task
            priority: Task priority (1-10, 10 = highest)
            wait_for_result: If True, wait for worker to complete

        Returns:
            Dict with task_id and optionally the result
        """
        task_type = task_data.get("type")
        source_data = task_data.get("source_data", task_data)

        if not task_type:
            return {"error": "Missing task type", "success": False}

        # Create task in queue
        task = self.task_queue.create_task(
            task_type=task_type,
            source_data=source_data,
            priority=priority,
        )

        print(f"[BOSS] Created task: {task.task_id}")

        if wait_for_result:
            result = await self._execute_task(task)
            return {
                "task_id": task.task_id,
                "success": result.status == "completed",
                "result": result.to_dict(),
            }
        else:
            # Queue for background execution
            asyncio.create_task(self._execute_task(task))
            return {
                "task_id": task.task_id,
                "success": True,
                "status": "queued",
            }

    async def _execute_task(self, task: Task) -> TaskResult:
        """
        Execute a task using the appropriate worker.

        Args:
            task: The task to execute

        Returns:
            TaskResult from the worker
        """
        async with self._worker_semaphore:
            # Create worker
            worker = self._create_worker(task.task_type)
            if worker is None:
                self.task_queue.mark_failed(
                    task.task_id,
                    f"No worker available for task type: {task.task_type}",
                )
                return TaskResult(
                    task_id=task.task_id,
                    worker_type="unknown",
                    status="failed",
                    output=None,
                    confidence=0.0,
                    validation_passed=False,
                    error=f"No worker available for task type: {task.task_type}",
                )

            # Register active worker
            self.active_workers[worker.worker_id] = worker

            # Mark task in progress
            self.task_queue.mark_in_progress(task.task_id, worker.worker_id)

            print(f"[BOSS] Assigned task {task.task_id} to worker {worker.worker_id}")

            try:
                # Execute task
                result = await worker.execute_task(task.task_id, task.source_data)

                # Update task queue based on result
                if result.status == "completed":
                    self.task_queue.mark_completed(
                        task_id=task.task_id,
                        worker_output={"output": result.output},
                        confidence=result.confidence,
                        validation_status="passed" if result.validation_passed else "failed",
                    )
                elif result.status == "pending_review":
                    self.task_queue.update_task(
                        task_id=task.task_id,
                        status=TaskStatus.PENDING_REVIEW.value,
                        worker_output={"output": result.output},
                        confidence=result.confidence,
                        validation_status="needs_review",
                    )
                else:
                    self.task_queue.mark_failed(task.task_id, result.error or "Unknown error")

                print(f"[BOSS] Task {task.task_id} {result.status} (confidence: {result.confidence:.2f})")

                return result

            except Exception as e:
                error_msg = str(e)
                print(f"[BOSS] Task {task.task_id} failed with error: {error_msg}")
                self.task_queue.mark_failed(task.task_id, error_msg)

                return TaskResult(
                    task_id=task.task_id,
                    worker_type=worker.worker_type,
                    status="failed",
                    output=None,
                    confidence=0.0,
                    validation_passed=False,
                    error=error_msg,
                )

            finally:
                # Cleanup worker
                if worker.worker_id in self.active_workers:
                    del self.active_workers[worker.worker_id]

    async def process_queue(self, max_tasks: Optional[int] = None) -> List[TaskResult]:
        """
        Process pending tasks from the queue.

        Args:
            max_tasks: Maximum number of tasks to process (None = all pending)

        Returns:
            List of TaskResults from processed tasks
        """
        pending_tasks = self.task_queue.get_pending_tasks()

        if max_tasks is not None:
            pending_tasks = pending_tasks[:max_tasks]

        if not pending_tasks:
            print("[BOSS] No pending tasks in queue")
            return []

        print(f"[BOSS] Processing {len(pending_tasks)} pending tasks")

        # Execute tasks concurrently (up to max_concurrent_workers)
        results = await asyncio.gather(
            *[self._execute_task(task) for task in pending_tasks],
            return_exceptions=True,
        )

        # Filter out exceptions and convert to TaskResult
        task_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                task_results.append(TaskResult(
                    task_id=pending_tasks[i].task_id,
                    worker_type="unknown",
                    status="failed",
                    output=None,
                    confidence=0.0,
                    validation_passed=False,
                    error=str(result),
                ))
            else:
                task_results.append(result)

        return task_results

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a task by ID."""
        task = self.task_queue.get_task(task_id)
        if task:
            return task.to_dict()
        return None

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        stats = self.task_queue.get_stats()
        stats["active_workers"] = len(self.active_workers)
        stats["registered_task_types"] = list(self.WORKER_REGISTRY.keys())
        return stats

    def list_pending_tasks(self, task_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """List pending tasks, optionally filtered by type."""
        tasks = self.task_queue.get_pending_tasks(task_type)
        return [t.to_dict() for t in tasks]


# ============================================================================
# CLI Interface
# ============================================================================

async def main():
    """CLI interface for the orchestrator."""
    import argparse

    parser = argparse.ArgumentParser(description="BOSS Multi-Agent Orchestrator")
    parser.add_argument("command", choices=["status", "process", "dispatch"], help="Command to run")
    parser.add_argument("--task-type", type=str, help="Task type for dispatch")
    parser.add_argument("--email-from", type=str, help="Email sender for email tasks")
    parser.add_argument("--email-subject", type=str, help="Email subject")
    parser.add_argument("--email-body", type=str, help="Email body")
    parser.add_argument("--max-tasks", type=int, help="Max tasks to process")

    args = parser.parse_args()

    orchestrator = BossOrchestrator()

    if args.command == "status":
        stats = orchestrator.get_queue_stats()
        print("\n=== BOSS Orchestrator Status ===")
        for key, value in stats.items():
            print(f"  {key}: {value}")

        pending = orchestrator.list_pending_tasks()
        if pending:
            print(f"\nPending tasks: {len(pending)}")
            for task in pending[:5]:
                print(f"  - {task['task_id']} ({task['task_type']}) priority={task['priority']}")

    elif args.command == "process":
        results = await orchestrator.process_queue(max_tasks=args.max_tasks)
        print(f"\nProcessed {len(results)} tasks")
        for result in results:
            status_icon = "" if result.status == "completed" else "" if result.status == "pending_review" else ""
            print(f"  {status_icon} {result.task_id}: {result.status} (confidence: {result.confidence:.2f})")

    elif args.command == "dispatch":
        if args.task_type == "email_response":
            if not all([args.email_from, args.email_subject, args.email_body]):
                print("Error: --email-from, --email-subject, and --email-body required for email tasks")
                return

            result = await orchestrator.dispatch_task({
                "type": "email_response",
                "source_data": {
                    "from": args.email_from,
                    "subject": args.email_subject,
                    "body": args.email_body,
                }
            })

            print(f"\nTask dispatched: {result.get('task_id')}")
            if result.get("result"):
                print(f"Status: {result['result'].get('status')}")
                if result['result'].get('output'):
                    print("\n--- Email Draft ---")
                    print(result['result']['output'])
        else:
            print(f"Error: Unknown task type '{args.task_type}'")


if __name__ == "__main__":
    asyncio.run(main())
