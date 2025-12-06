#!/usr/bin/env python3
"""
Unit Tests for Autonomous Task Extensions
==========================================

Tests for the autonomous session fields added to Task class.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from task_queue import Task, TaskStatus, TaskType


def test_task_with_autonomous_fields():
    """Test creating task with autonomous session fields."""
    task = Task(
        task_id="test-001",
        task_type=TaskType.CODE_IMPLEMENTATION.value,
        status=TaskStatus.PENDING.value,
        created_at="2025-01-15T10:00:00Z",
        updated_at="2025-01-15T10:00:00Z",
        source_data={"prd_path": "specs/feature-1.md"},
        # Autonomous fields
        session_id="session-test-001-1",
        autonomous_mode=True,
        feature_list_path="./feature_list.json",
        auto_continue=True,
        max_sessions=25,
    )

    assert task.session_id == "session-test-001-1"
    assert task.autonomous_mode is True
    assert task.feature_list_path == "./feature_list.json"
    assert task.auto_continue is True
    assert task.max_sessions == 25
    print("[PASS] Task with autonomous fields created successfully")


def test_task_to_dict_includes_autonomous_fields():
    """Test that to_dict() includes autonomous fields."""
    task = Task(
        task_id="test-002",
        task_type=TaskType.CODE_IMPLEMENTATION.value,
        status=TaskStatus.IN_PROGRESS.value,
        created_at="2025-01-15T10:00:00Z",
        updated_at="2025-01-15T10:00:00Z",
        source_data={},
        session_id="session-test-002-1",
        autonomous_mode=True,
    )

    task_dict = task.to_dict()

    assert "session_id" in task_dict
    assert "autonomous_mode" in task_dict
    assert "feature_list_path" in task_dict
    assert "auto_continue" in task_dict
    assert "max_sessions" in task_dict

    assert task_dict["session_id"] == "session-test-002-1"
    assert task_dict["autonomous_mode"] is True
    assert task_dict["auto_continue"] is True  # Default
    assert task_dict["max_sessions"] == 50  # Default
    print("[PASS] to_dict() includes all autonomous fields")


def test_task_from_dict_with_autonomous_fields():
    """Test that from_dict() loads autonomous fields."""
    task_data = {
        "task_id": "test-003",
        "task_type": TaskType.CODE_IMPLEMENTATION.value,
        "status": TaskStatus.COMPLETED.value,
        "created_at": "2025-01-15T10:00:00Z",
        "updated_at": "2025-01-15T10:30:00Z",
        "source_data": {},
        "session_id": "session-test-003-1",
        "autonomous_mode": True,
        "feature_list_path": "/project/feature_list.json",
        "auto_continue": False,
        "max_sessions": 10,
    }

    task = Task.from_dict(task_data)

    assert task.session_id == "session-test-003-1"
    assert task.autonomous_mode is True
    assert task.feature_list_path == "/project/feature_list.json"
    assert task.auto_continue is False
    assert task.max_sessions == 10
    print("[PASS] from_dict() loads all autonomous fields correctly")


def test_task_backward_compatibility():
    """Test that old task_list.json files without autonomous fields still work."""
    old_task_data = {
        "task_id": "test-004",
        "task_type": TaskType.RESEARCH.value,
        "status": TaskStatus.PENDING.value,
        "created_at": "2025-01-15T09:00:00Z",
        "updated_at": "2025-01-15T09:00:00Z",
        "source_data": {"query": "research topic"},
        # No autonomous fields - simulating old data
    }

    task = Task.from_dict(old_task_data)

    # Should have default values
    assert task.session_id is None
    assert task.autonomous_mode is False
    assert task.feature_list_path is None
    assert task.auto_continue is True
    assert task.max_sessions == 50
    print("[PASS] Backward compatibility maintained - old tasks load with defaults")


def test_task_round_trip():
    """Test that task survives to_dict() -> from_dict() round trip."""
    original = Task(
        task_id="test-005",
        task_type=TaskType.CODE_IMPLEMENTATION.value,
        status=TaskStatus.IN_PROGRESS.value,
        created_at="2025-01-15T10:00:00Z",
        updated_at="2025-01-15T10:00:00Z",
        source_data={},
        session_id="session-test-005-1",
        autonomous_mode=True,
        feature_list_path="./feature_list.json",
        auto_continue=False,
        max_sessions=30,
    )

    # Round trip
    task_dict = original.to_dict()
    restored = Task.from_dict(task_dict)

    # All autonomous fields should match
    assert restored.session_id == original.session_id
    assert restored.autonomous_mode == original.autonomous_mode
    assert restored.feature_list_path == original.feature_list_path
    assert restored.auto_continue == original.auto_continue
    assert restored.max_sessions == original.max_sessions
    print("[PASS] Round trip successful - all autonomous fields preserved")


if __name__ == "__main__":
    test_task_with_autonomous_fields()
    test_task_to_dict_includes_autonomous_fields()
    test_task_from_dict_with_autonomous_fields()
    test_task_backward_compatibility()
    test_task_round_trip()

    print("\n[PASS] All autonomous task tests passed!")
