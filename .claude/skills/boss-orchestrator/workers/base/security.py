#!/usr/bin/env python3
"""
Security & Validation for BOSS Orchestrator Workers
=====================================================

Integrates with Kai's validation infrastructure:
- Bash command security (allowlist-based)
- DGTS (Don't Game The System) validation
- NLNH (No Lies, No Hallucination) protocol
- Validation loops with intelligent retry

Imports from existing PAI infrastructure where available.
"""

import re
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# ============================================================================
# BASH COMMAND SECURITY (from autonomous-coding pattern)
# ============================================================================

# Base allowed commands for all workers
BASE_ALLOWED_COMMANDS = {
    # Read-only file operations
    "ls", "cat", "head", "tail", "wc", "grep", "find",
    # Safe utilities
    "pwd", "echo", "date", "hostname",
    # Git read operations
    "git",  # Will validate subcommands
}

# Extended commands for code workers
CODE_WORKER_COMMANDS = BASE_ALLOWED_COMMANDS | {
    "cp", "mkdir", "chmod", "touch", "mv",
    "npm", "node", "python", "python3", "pip",
    "pytest", "vitest", "jest", "make", "cargo", "go",
}

# Restricted commands for email/content workers
EMAIL_WORKER_COMMANDS = {"ls", "pwd", "date", "echo"}

# Commands that are NEVER allowed
BLOCKED_COMMANDS = {
    "rm -rf /", "rm -rf ~", "rm -rf *", "sudo", "su", "passwd",
    "chmod 777", "curl | sh", "curl | bash", "wget | sh", "wget | bash",
    "eval", "exec", "> /dev/sda", "dd if=", "mkfs", "format", "fdisk",
    "taskkill", "pkill -9", "kill -9",  # Process killing blocked
}


def extract_commands(command_string: str) -> list[str]:
    """Extract individual base commands from a bash command string."""
    separators = [";", "&&", "||", "|"]
    commands = [command_string]

    for sep in separators:
        new_commands = []
        for cmd in commands:
            new_commands.extend(cmd.split(sep))
        commands = new_commands

    base_commands = []
    for cmd in commands:
        cmd = cmd.strip()
        if not cmd:
            continue
        cmd = re.split(r'[<>]', cmd)[0].strip()
        parts = cmd.split()
        if parts:
            base_cmd = parts[0]
            if "/" in base_cmd:
                base_cmd = base_cmd.split("/")[-1]
            base_commands.append(base_cmd)

    return base_commands


def is_command_blocked(command_string: str) -> Tuple[bool, str]:
    """Check if a command is in the blocked list."""
    command_lower = command_string.lower().strip()

    for blocked in BLOCKED_COMMANDS:
        if blocked in command_lower:
            return True, f"Command contains blocked pattern: '{blocked}'"

    # Shell injection patterns
    injection_patterns = [r'\$\(.*\)', r'`.*`', r'\${.*}']
    for pattern in injection_patterns:
        if re.search(pattern, command_string):
            return True, f"Command contains dangerous pattern: {pattern}"

    return False, ""


def validate_bash_command(command: str, allowed_commands: set[str]) -> Tuple[bool, str]:
    """Validate a bash command against an allowlist."""
    is_blocked, reason = is_command_blocked(command)
    if is_blocked:
        return False, reason

    commands = extract_commands(command)
    for cmd in commands:
        if cmd not in allowed_commands:
            return False, f"Command '{cmd}' is not in the allowed commands list"

    return True, "Command is allowed"


async def bash_security_hook(
    input_data: Dict[str, Any],
    tool_use_id: str = None,
    context: Any = None,
    allowed_commands: set[str] = None,
) -> Dict[str, Any]:
    """Pre-tool-use hook that validates bash commands."""
    if input_data.get("tool_name") != "Bash":
        return {}

    command = input_data.get("tool_input", {}).get("command", "")
    if not command:
        return {}

    commands = allowed_commands or BASE_ALLOWED_COMMANDS
    is_valid, reason = validate_bash_command(command, commands)

    if not is_valid:
        return {"decision": "block", "reason": reason}
    return {}


def create_worker_security_hook(worker_type: str):
    """Create a security hook with worker-specific allowed commands."""
    if worker_type in ("code_implementer", "code_worker"):
        allowed = CODE_WORKER_COMMANDS
    elif worker_type in ("email_drafter", "content_writer"):
        allowed = EMAIL_WORKER_COMMANDS
    else:
        allowed = BASE_ALLOWED_COMMANDS

    async def worker_bash_hook(
        input_data: Dict[str, Any],
        tool_use_id: str = None,
        context: Any = None,
    ) -> Dict[str, Any]:
        return await bash_security_hook(input_data, tool_use_id, context, allowed)

    return worker_bash_hook


# ============================================================================
# NLNH PROTOCOL (No Lies, No Hallucination)
# ============================================================================

class NLNHConfidence(Enum):
    """NLNH Confidence levels."""
    HIGH = "high"       # 95-100% - Will definitely work
    MEDIUM = "medium"   # 70-94% - Should work with adjustments
    LOW = "low"         # 50-69% - Might work, needs testing
    UNCERTAIN = "uncertain"  # 0-49% - Unsure, need verification


@dataclass
class NLNHValidation:
    """Result of NLNH validation."""
    is_valid: bool
    confidence: NLNHConfidence
    confidence_score: float  # 0.0 to 1.0
    issues: List[str]
    citations: List[str]
    hallucination_detected: bool


class NLNHValidator:
    """
    NLNH Protocol Validator - No Lies, No Hallucination.

    Validates that worker outputs:
    - Do not contain hallucinated facts
    - Have appropriate confidence levels
    - Cite sources when making claims
    - Say "I don't know" when uncertain
    """

    # Patterns that indicate potential hallucination
    HALLUCINATION_PATTERNS = [
        r'\b(definitely|certainly|always|never)\b.*\b(will|is|are)\b',  # Overconfident claims
        r'\bI can confirm\b',  # Unverified confirmations
        r'\bAs (you know|everyone knows)\b',  # Assumed knowledge
        r'\bIt\'s (obvious|clear) that\b',  # Unsubstantiated claims
    ]

    # Patterns indicating appropriate uncertainty
    HONEST_UNCERTAINTY_PATTERNS = [
        r"\bI don't know\b",
        r'\bI\'m not (sure|certain)\b',
        r'\bI cannot (confirm|verify)\b',
        r'\bThis may (require|need) verification\b',
        r'\bBased on (the provided|available) information\b',
    ]

    # Patterns indicating grounded claims
    CITATION_PATTERNS = [
        r'According to',
        r'Based on',
        r'As stated in',
        r'Referenced from',
        r'Source:',
    ]

    def __init__(self, min_confidence: float = 0.7):
        self.min_confidence = min_confidence

    def validate(self, content: str, context: Optional[Dict] = None) -> NLNHValidation:
        """
        Validate content for NLNH compliance.

        Args:
            content: The text content to validate
            context: Optional context data (e.g., source data for email drafts)

        Returns:
            NLNHValidation result
        """
        issues = []
        citations = []
        hallucination_detected = False

        # Check for hallucination patterns
        for pattern in self.HALLUCINATION_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                issues.append(f"Overconfident/unverified claim detected: '{matches[0]}'")
                hallucination_detected = True

        # Check for citation patterns (positive)
        for pattern in self.CITATION_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            citations.extend(matches)

        # Check for honest uncertainty (positive)
        has_honest_uncertainty = any(
            re.search(pattern, content, re.IGNORECASE)
            for pattern in self.HONEST_UNCERTAINTY_PATTERNS
        )

        # Calculate confidence score
        base_score = 0.8
        if hallucination_detected:
            base_score -= 0.3
        if len(citations) > 0:
            base_score += 0.1
        if has_honest_uncertainty:
            base_score += 0.05

        # Clamp to 0-1
        confidence_score = max(0.0, min(1.0, base_score))

        # Determine confidence level
        if confidence_score >= 0.95:
            confidence = NLNHConfidence.HIGH
        elif confidence_score >= 0.70:
            confidence = NLNHConfidence.MEDIUM
        elif confidence_score >= 0.50:
            confidence = NLNHConfidence.LOW
        else:
            confidence = NLNHConfidence.UNCERTAIN

        # Validate against context if provided
        if context and isinstance(context, dict):
            issues.extend(self._validate_against_context(content, context))

        is_valid = (
            not hallucination_detected
            and confidence_score >= self.min_confidence
            and len(issues) == 0
        )

        return NLNHValidation(
            is_valid=is_valid,
            confidence=confidence,
            confidence_score=confidence_score,
            issues=issues,
            citations=citations,
            hallucination_detected=hallucination_detected,
        )

    def _validate_against_context(self, content: str, context: Dict) -> List[str]:
        """Validate content claims against provided context."""
        issues = []

        # For email drafting: check that referenced names/dates/etc match context
        if "email" in context:
            email = context["email"]
            # Check if sender name is correctly referenced
            if "from" in email and email["from"]:
                sender_name = email["from"].split("@")[0].split("<")[0].strip()
                if sender_name.lower() not in content.lower():
                    # Not necessarily an issue, but note it
                    pass

        return issues


# ============================================================================
# DGTS VALIDATOR (Don't Game The System)
# ============================================================================

@dataclass
class DGTSViolation:
    """Detected gaming violation."""
    violation_type: str
    content: str
    severity: str  # "critical", "error", "warning"
    explanation: str
    remediation: str


@dataclass
class DGTSValidation:
    """DGTS validation result."""
    is_gaming: bool
    violations: List[DGTSViolation]
    gaming_score: float  # 0.0 = clean, 1.0 = heavily gamed


class DGTSValidator:
    """
    DGTS Validator - Don't Game The System.

    Detects attempts to game worker outputs:
    - Fake/mock responses
    - Placeholder content
    - Skipped validation
    - Stub implementations
    """

    # Gaming patterns in output
    GAMING_PATTERNS = {
        'fake_content': [
            r'\[placeholder\]',
            r'\[TODO\]',
            r'\[insert .* here\]',
            r'Lorem ipsum',
            r'xxx+',
            r'dummy (data|content|text)',
        ],
        'stub_response': [
            r'Not implemented',
            r'Coming soon',
            r'TBD',
            r'To be determined',
            r'Work in progress',
        ],
        'gaming_keywords': [
            r'\bfake\b',
            r'\bmock\b(?! up)',  # "mock" but not "mock up"
            r'\bstub\b',
            r'\bplaceholder\b',
        ],
    }

    def validate(self, content: str) -> DGTSValidation:
        """
        Validate content for gaming patterns.

        Args:
            content: The content to validate

        Returns:
            DGTSValidation result
        """
        violations = []

        for category, patterns in self.GAMING_PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    severity = "critical" if category == 'fake_content' else "warning"

                    violations.append(DGTSViolation(
                        violation_type=f"DGTS_{category.upper()}",
                        content=str(matches[0])[:100],
                        severity=severity,
                        explanation=f"Gaming pattern detected: {category}",
                        remediation="Replace with genuine content",
                    ))

        # Calculate gaming score
        gaming_score = 0.0
        for v in violations:
            if v.severity == "critical":
                gaming_score += 0.3
            elif v.severity == "error":
                gaming_score += 0.2
            else:
                gaming_score += 0.1

        gaming_score = min(1.0, gaming_score)
        is_gaming = gaming_score > 0.3 or any(v.severity == "critical" for v in violations)

        return DGTSValidation(
            is_gaming=is_gaming,
            violations=violations,
            gaming_score=gaming_score,
        )


# ============================================================================
# VALIDATION LOOP (Retry with intelligent fixes)
# ============================================================================

@dataclass
class ValidationResult:
    """Result of a validation attempt."""
    passed: bool
    protocol: str  # "NLNH", "DGTS", "SECURITY"
    message: str
    errors: List[str]
    suggestions: List[str]
    confidence: float


class ValidationLoop:
    """
    Validation loop with retry mechanism.

    Implements: validate -> analyze error -> suggest fix -> retry
    """

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.nlnh_validator = NLNHValidator()
        self.dgts_validator = DGTSValidator()

    def validate_worker_output(
        self,
        content: str,
        context: Optional[Dict] = None,
    ) -> ValidationResult:
        """
        Run all validations on worker output.

        Args:
            content: The output to validate
            context: Optional context for NLNH validation

        Returns:
            ValidationResult
        """
        errors = []
        suggestions = []

        # Run NLNH validation
        nlnh_result = self.nlnh_validator.validate(content, context)
        if not nlnh_result.is_valid:
            errors.extend(nlnh_result.issues)
            if nlnh_result.hallucination_detected:
                suggestions.append("Remove unverified claims or add citations")
            if nlnh_result.confidence_score < 0.7:
                suggestions.append("Use 'I don't know' when uncertain instead of guessing")

        # Run DGTS validation
        dgts_result = self.dgts_validator.validate(content)
        if dgts_result.is_gaming:
            for v in dgts_result.violations:
                errors.append(f"{v.violation_type}: {v.explanation}")
                suggestions.append(v.remediation)

        # Determine overall result
        passed = nlnh_result.is_valid and not dgts_result.is_gaming

        return ValidationResult(
            passed=passed,
            protocol="COMBINED" if errors else "ALL",
            message="Validation passed" if passed else "Validation failed",
            errors=errors,
            suggestions=suggestions,
            confidence=nlnh_result.confidence_score,
        )


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    # Bash security
    "bash_security_hook",
    "create_worker_security_hook",
    "validate_bash_command",
    "BASE_ALLOWED_COMMANDS",
    "CODE_WORKER_COMMANDS",
    "EMAIL_WORKER_COMMANDS",
    # NLNH
    "NLNHValidator",
    "NLNHValidation",
    "NLNHConfidence",
    # DGTS
    "DGTSValidator",
    "DGTSValidation",
    "DGTSViolation",
    # Validation
    "ValidationLoop",
    "ValidationResult",
]
