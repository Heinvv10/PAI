#!/usr/bin/env python3
"""
Email Drafter Worker
====================

Autonomous worker that drafts professional email responses.
Integrates with BOSS Exchange API for the approval workflow.

Features:
- NLNH validation (no hallucinated facts)
- DGTS validation (no gaming/placeholder content)
- Professional tone detection
- Context-aware responses based on email thread
"""

import json
import os
from pathlib import Path
from typing import Any, Optional, Tuple

import httpx

from ..base.autonomous_worker import AutonomousWorker, TaskResult
from ..base.security import (
    NLNHValidator,
    DGTSValidator,
    ValidationLoop,
    EMAIL_WORKER_COMMANDS,
)


# BOSS Exchange API endpoint
BOSS_API_URL = os.getenv("BOSS_API_URL", "http://72.61.197.178:8000")


class EmailDrafterWorker(AutonomousWorker):
    """
    Autonomous worker for drafting email responses.

    Uses Claude Agent SDK to draft professional emails while
    enforcing NLNH (no hallucination) and DGTS (no gaming) protocols.
    """

    # Email drafter has minimal tool access
    BASE_ALLOWED_TOOLS = ["Read"]  # Only needs to read context

    def __init__(
        self,
        worker_id: str,
        model: Optional[str] = None,
        working_dir: Optional[Path] = None,
        boss_api_url: Optional[str] = None,
    ):
        super().__init__(worker_id, model, working_dir)
        self.boss_api_url = boss_api_url or BOSS_API_URL
        self.nlnh_validator = NLNHValidator(min_confidence=0.75)
        self.dgts_validator = DGTSValidator()
        self.validation_loop = ValidationLoop(max_retries=2)

    @property
    def worker_type(self) -> str:
        return "email_drafter"

    @property
    def system_prompt(self) -> str:
        return """You are a professional email drafting assistant for Kai (the user).
Your role is to draft clear, professional email responses that:

1. TRUTH ENFORCEMENT (NLNH Protocol):
   - Only reference facts present in the provided email context
   - Never make up dates, commitments, or facts not in the original email
   - If unsure about something, say "I would need to verify..."
   - Do not assume information not provided

2. PROFESSIONAL STANDARDS:
   - Maintain a professional but friendly tone
   - Be concise and clear
   - Address all points raised in the original email
   - Use appropriate greetings and sign-offs

3. FORMAT:
   - Start with a greeting using the sender's name
   - Address each topic/question in the email
   - End with an appropriate closing
   - Keep responses focused and relevant

4. IMPORTANT CONSTRAINTS:
   - Do NOT include placeholders like [INSERT X HERE]
   - Do NOT use Lorem ipsum or dummy text
   - Do NOT make promises or commitments unless instructed
   - If you need more information to respond properly, say so explicitly

Output ONLY the email draft text. No explanations or meta-commentary.
Sign the email as "Kai" unless instructed otherwise."""

    @property
    def allowed_tools(self) -> list[str]:
        """Email drafter has minimal tool access."""
        return self.BASE_ALLOWED_TOOLS.copy()

    def build_prompt(self, task_data: dict) -> str:
        """
        Build the prompt for email drafting.

        Expected task_data format:
        {
            "email_id": "abc123",
            "from": "sender@example.com",
            "from_name": "John Smith",
            "subject": "Project Update Request",
            "body": "Hi, when will the project be complete?",
            "thread": [...],  # Optional: previous emails in thread
            "instructions": "..."  # Optional: specific instructions
        }
        """
        email_data = task_data.get("source_data", task_data)

        prompt_parts = []

        # Original email context
        prompt_parts.append("## Original Email")
        prompt_parts.append(f"**From:** {email_data.get('from', 'Unknown Sender')}")
        if email_data.get('from_name'):
            prompt_parts.append(f"**Name:** {email_data['from_name']}")
        prompt_parts.append(f"**Subject:** {email_data.get('subject', 'No Subject')}")
        prompt_parts.append(f"\n**Body:**\n{email_data.get('body', 'No content')}")

        # Thread context if available
        if email_data.get('thread'):
            prompt_parts.append("\n## Previous Emails in Thread")
            for i, thread_email in enumerate(email_data['thread'], 1):
                prompt_parts.append(f"\n### Email {i}")
                prompt_parts.append(f"From: {thread_email.get('from', 'Unknown')}")
                prompt_parts.append(f"Date: {thread_email.get('date', 'Unknown')}")
                prompt_parts.append(f"Body: {thread_email.get('body', 'No content')}")

        # Special instructions
        if email_data.get('instructions'):
            prompt_parts.append(f"\n## Additional Instructions\n{email_data['instructions']}")

        # Request
        prompt_parts.append("\n## Task")
        prompt_parts.append("Draft a professional email response. Output ONLY the email text.")

        return "\n".join(prompt_parts)

    async def validate_output(self, output: Any) -> Tuple[bool, float, Optional[str]]:
        """
        Validate the email draft using NLNH and DGTS protocols.

        Returns:
            Tuple of (is_valid, confidence, error_message)
        """
        if not output or not isinstance(output, str):
            return False, 0.0, "No output generated"

        if len(output.strip()) < 20:
            return False, 0.0, "Email draft too short"

        # Run NLNH validation
        nlnh_result = self.nlnh_validator.validate(output)
        if nlnh_result.hallucination_detected:
            return False, nlnh_result.confidence_score, f"NLNH violation: {nlnh_result.issues[0]}"

        # Run DGTS validation
        dgts_result = self.dgts_validator.validate(output)
        if dgts_result.is_gaming:
            return False, 0.3, f"DGTS violation: {dgts_result.violations[0].explanation}"

        # Check for common email issues
        issues = self._check_email_quality(output)
        if issues:
            return False, 0.6, f"Quality issue: {issues[0]}"

        return True, nlnh_result.confidence_score, None

    def _check_email_quality(self, email_text: str) -> list[str]:
        """Check for common email quality issues."""
        issues = []

        # Check for greeting
        greetings = ["hi ", "hello ", "dear ", "good morning", "good afternoon", "hey "]
        has_greeting = any(email_text.lower().startswith(g) for g in greetings)
        if not has_greeting:
            issues.append("Email should start with a greeting")

        # Check for sign-off
        signoffs = ["best", "regards", "thanks", "sincerely", "cheers", "kai"]
        has_signoff = any(s in email_text.lower()[-100:] for s in signoffs)
        if not has_signoff:
            issues.append("Email should end with a sign-off")

        # Check for placeholder patterns
        placeholders = ["[insert", "[add", "[your", "[recipient", "xxx", "todo"]
        for placeholder in placeholders:
            if placeholder in email_text.lower():
                issues.append(f"Email contains placeholder text: '{placeholder}'")

        return issues

    async def submit_to_boss(self, task_result: TaskResult, original_email_id: str) -> dict:
        """
        Submit the drafted email to BOSS Exchange for approval.

        Args:
            task_result: The task result containing the draft
            original_email_id: ID of the original email being replied to

        Returns:
            API response with approval queue status
        """
        if task_result.status != "completed":
            return {"error": "Cannot submit incomplete draft", "status": task_result.status}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.boss_api_url}/api/v1/email/draft",
                    json={
                        "original_email_id": original_email_id,
                        "draft_content": task_result.output,
                        "worker_id": self.worker_id,
                        "confidence": task_result.confidence,
                        "validation_passed": task_result.validation_passed,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to submit to BOSS: {str(e)}", "submitted": False}
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}", "submitted": False}


class EmailDrafterFactory:
    """Factory for creating EmailDrafterWorker instances."""

    _worker_count = 0

    @classmethod
    def create(
        cls,
        model: Optional[str] = None,
        working_dir: Optional[Path] = None,
    ) -> EmailDrafterWorker:
        """Create a new EmailDrafterWorker with auto-generated ID."""
        cls._worker_count += 1
        worker_id = f"email_drafter_{cls._worker_count:03d}"
        return EmailDrafterWorker(
            worker_id=worker_id,
            model=model,
            working_dir=working_dir,
        )


# Module-level convenience function
def create_email_drafter(**kwargs) -> EmailDrafterWorker:
    """Create a new email drafter worker."""
    return EmailDrafterFactory.create(**kwargs)


__all__ = [
    "EmailDrafterWorker",
    "EmailDrafterFactory",
    "create_email_drafter",
]
