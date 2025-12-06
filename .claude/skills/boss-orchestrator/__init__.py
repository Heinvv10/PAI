"""
BOSS Multi-Agent Orchestrator Skill
====================================

Autonomous Claude Agent SDK workers for specialized tasks.

Usage:
    from orchestrator import BossOrchestrator

    orchestrator = BossOrchestrator()
    result = await orchestrator.dispatch_task({
        "type": "email_response",
        "source_data": {...}
    })
"""

from .orchestrator import BossOrchestrator
from .task_queue import Task, TaskQueue, TaskStatus, TaskType, get_task_queue
from .workers import AutonomousWorker, TaskResult
from .workers.email_drafter import EmailDrafterWorker, create_email_drafter

__all__ = [
    # Orchestrator
    "BossOrchestrator",
    # Task Queue
    "Task",
    "TaskQueue",
    "TaskStatus",
    "TaskType",
    "get_task_queue",
    # Workers
    "AutonomousWorker",
    "TaskResult",
    "EmailDrafterWorker",
    "create_email_drafter",
]

__version__ = "1.0.0"
