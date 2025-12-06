#!/usr/bin/env python3
"""
Autonomous Worker Base Class
============================

Base class for autonomous Claude Agent SDK workers.
Implements the proven patterns from autonomous-coding demo:
- Fresh ClaudeSDKClient per task (stateless sessions)
- Security hooks for bash command validation
- Sandbox isolation
- Tool allowlisting

Each specialized worker (EmailDrafter, CodeImplementer, etc.)
inherits from this base class and provides:
- Custom system prompt
- Worker-specific tools
- Output validation
"""

import asyncio
import os
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import json

# Fix Windows console encoding for Unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Ensure Claude CLI is in PATH
npm_bin = r"C:\Users\HeinvanVuuren\AppData\Roaming\npm"
if npm_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = npm_bin + os.pathsep + os.environ.get("PATH", "")

# CRITICAL: Remove ANTHROPIC_API_KEY - use CLI's built-in auth from setup-token
if "ANTHROPIC_API_KEY" in os.environ:
    del os.environ["ANTHROPIC_API_KEY"]

from claude_code_sdk import ClaudeCodeOptions, query
from .security import bash_security_hook


@dataclass
class TaskResult:
    """Result from an autonomous worker task."""
    task_id: str
    worker_type: str
    status: str  # "completed", "failed", "pending_review"
    output: Any
    confidence: float  # 0.0 to 1.0
    validation_passed: bool
    error: Optional[str] = None
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "worker_type": self.worker_type,
            "status": self.status,
            "output": self.output,
            "confidence": self.confidence,
            "validation_passed": self.validation_passed,
            "error": self.error,
            "created_at": self.created_at,
        }


class AutonomousWorker(ABC):
    """
    Base class for autonomous Claude Agent SDK workers.

    Each worker runs in a fresh, stateless session for each task.
    This is the proven pattern from the autonomous-coding demo.
    """

    # Default model - can be overridden by subclasses
    DEFAULT_MODEL = "claude-sonnet-4-5-20250929"

    # Base allowed tools - subclasses can extend
    BASE_ALLOWED_TOOLS = [
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
    ]

    def __init__(
        self,
        worker_id: str,
        model: Optional[str] = None,
        working_dir: Optional[Path] = None,
    ):
        """
        Initialize the autonomous worker.

        Args:
            worker_id: Unique identifier for this worker instance
            model: Claude model to use (defaults to DEFAULT_MODEL)
            working_dir: Working directory for file operations
        """
        self.worker_id = worker_id
        self.model = model or self.DEFAULT_MODEL
        self.working_dir = working_dir or Path.cwd()

    @property
    @abstractmethod
    def worker_type(self) -> str:
        """Return the type of worker (e.g., 'email_drafter')."""
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Return the system prompt for this worker type."""
        pass

    @property
    def allowed_tools(self) -> list[str]:
        """
        Return the list of allowed tools for this worker.
        Subclasses can override to add or restrict tools.
        """
        return self.BASE_ALLOWED_TOOLS.copy()

    @property
    def permission_mode(self) -> str:
        """
        Return the permission mode for this worker.
        Options: 'acceptEdits', 'bypassPermissions', etc.
        """
        return 'acceptEdits'

    def get_options(self) -> ClaudeCodeOptions:
        """
        Create ClaudeCodeOptions for this worker.

        This is called fresh for each task to ensure stateless operation.
        """
        return ClaudeCodeOptions(
            system_prompt=self.system_prompt,
            permission_mode=self.permission_mode,
            cwd=str(self.working_dir.resolve()),
            allowed_tools=self.allowed_tools,
        )

    @abstractmethod
    async def validate_output(self, output: Any) -> tuple[bool, float, Optional[str]]:
        """
        Validate the worker's output.

        Args:
            output: The output to validate

        Returns:
            Tuple of (is_valid, confidence, error_message)
        """
        pass

    @abstractmethod
    def build_prompt(self, task_data: dict) -> str:
        """
        Build the prompt for this specific task.

        Args:
            task_data: The task data containing input parameters

        Returns:
            The prompt string to send to Claude
        """
        pass

    async def execute_task(self, task_id: str, task_data: dict) -> TaskResult:
        """
        Execute a task autonomously.

        This is the main entry point for running a task.
        Creates a fresh session, executes the prompt, and validates output.

        Args:
            task_id: Unique identifier for this task
            task_data: The task data/parameters

        Returns:
            TaskResult with the outcome
        """
        print(f"[{self.worker_type}:{self.worker_id}] Starting task {task_id}")

        try:
            # Build the prompt for this task
            prompt = self.build_prompt(task_data)

            # Get fresh options for this task (stateless pattern)
            options = self.get_options()

            # Collect all messages from the agent
            messages = []
            text_content = []

            print(f"[{self.worker_type}:{self.worker_id}] Executing query...")

            async for message in query(prompt=prompt, options=options):
                messages.append(message)

                # Extract text content from messages
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            text_content.append(block.text)

            # Combine text output
            output = "\n".join(text_content) if text_content else None

            if output is None:
                return TaskResult(
                    task_id=task_id,
                    worker_type=self.worker_type,
                    status="failed",
                    output=None,
                    confidence=0.0,
                    validation_passed=False,
                    error="No output generated by agent",
                )

            # Validate the output
            is_valid, confidence, error = await self.validate_output(output)

            status = "completed" if is_valid else "pending_review"
            if confidence < 0.5:
                status = "pending_review"

            print(f"[{self.worker_type}:{self.worker_id}] Task {task_id} {status} (confidence: {confidence:.2f})")

            return TaskResult(
                task_id=task_id,
                worker_type=self.worker_type,
                status=status,
                output=output,
                confidence=confidence,
                validation_passed=is_valid,
                error=error,
            )

        except Exception as e:
            print(f"[{self.worker_type}:{self.worker_id}] Task {task_id} failed: {e}")
            return TaskResult(
                task_id=task_id,
                worker_type=self.worker_type,
                status="failed",
                output=None,
                confidence=0.0,
                validation_passed=False,
                error=str(e),
            )

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(worker_id={self.worker_id!r}, model={self.model!r})"
