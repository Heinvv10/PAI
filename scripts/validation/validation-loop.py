#!/usr/bin/env python3

"""
PAI Validation Loop System

Formalized validation → analyze → fix → retry pattern for all agents
Inspired by Context Engineering PRP validation loops with PAI protocol enforcement

Usage:
    from validation_loop import ValidationLoop, ValidationResult

    loop = ValidationLoop(max_retries=3)
    result = loop.execute(task_function, validation_function)

Key Features:
- Maximum retry attempts (default 3)
- Intelligent error analysis per protocol (NLNH, DGTS, ZT, etc.)
- Fix suggestion generation
- Comprehensive logging
- Gaming detection during retries
"""

import subprocess
import sys
import json
import time
from typing import Callable, Optional, Dict, List, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class ValidationProtocol(Enum):
    """PAI Validation Protocols"""
    NLNH = "NLNH"  # No Lies, No Hallucination
    DGTS = "DGTS"  # Don't Game The System
    ZERO_TOLERANCE = "ZeroTolerance"  # Quality gates
    DOC_TDD = "DocumentationDrivenTDD"  # Tests from docs
    ANTIHALL = "AntiHall"  # Code existence
    E2E = "E2E"  # End-to-end tests


@dataclass
class ValidationResult:
    """Result of a validation attempt"""
    passed: bool
    protocol: Optional[ValidationProtocol]
    message: str
    errors: List[str]
    suggestions: List[str]
    attempt: int
    duration: float


@dataclass
class ValidationLoopConfig:
    """Configuration for validation loop"""
    max_retries: int = 3
    enable_gaming_detection: bool = True
    enable_intelligent_fixes: bool = True
    log_file: Optional[str] = None
    verbose: bool = False


class ValidationLoop:
    """
    Formalized validation loop with retry mechanism

    Implements: validate → analyze error → suggest fix → retry
    """

    def __init__(self, config: Optional[ValidationLoopConfig] = None):
        self.config = config or ValidationLoopConfig()
        self.history: List[ValidationResult] = []
        self.gaming_score = 0.0

    def execute(
        self,
        task_func: Callable,
        validation_func: Callable,
        task_name: str = "Unknown Task"
    ) -> ValidationResult:
        """
        Execute task with validation loop

        Args:
            task_func: Function to execute (e.g., code implementation)
            validation_func: Function to validate result
            task_name: Name of task for logging

        Returns:
            Final ValidationResult
        """
        print(f"\n{'=' * 60}")
        print(f"🔄 PAI VALIDATION LOOP: {task_name}")
        print(f"{'=' * 60}\n")

        for attempt in range(1, self.config.max_retries + 1):
            print(f"📍 Attempt {attempt}/{self.config.max_retries}")

            start_time = time.time()

            try:
                # Execute task
                print(f"   ⚙️  Executing task...")
                task_result = task_func()

                # Validate result
                print(f"   🔍 Running validation...")
                validation_result = validation_func(task_result)

                duration = time.time() - start_time

                if validation_result.passed:
                    print(f"   ✅ PASSED ({duration:.2f}s)\n")

                    result = ValidationResult(
                        passed=True,
                        protocol=validation_result.protocol,
                        message=f"Validation passed on attempt {attempt}",
                        errors=[],
                        suggestions=[],
                        attempt=attempt,
                        duration=duration
                    )

                    self.history.append(result)
                    return result
                else:
                    print(f"   ❌ FAILED ({duration:.2f}s)")
                    print(f"   Protocol: {validation_result.protocol.value if validation_result.protocol else 'Unknown'}\n")

                    # Analyze failure
                    analysis = self._analyze_failure(validation_result)

                    # Detect gaming patterns in retry
                    if attempt > 1 and self.config.enable_gaming_detection:
                        self._detect_gaming_in_retry(validation_result)

                    # Generate fix suggestions
                    suggestions = self._generate_fix_suggestions(validation_result, analysis)

                    print(f"   💡 Error Analysis:")
                    for error in validation_result.errors[:3]:  # Show top 3 errors
                        print(f"      • {error}")

                    print(f"\n   🔧 Suggested Fixes:")
                    for suggestion in suggestions[:3]:  # Show top 3 suggestions
                        print(f"      • {suggestion}")

                    # Store result
                    result = ValidationResult(
                        passed=False,
                        protocol=validation_result.protocol,
                        message=validation_result.message,
                        errors=validation_result.errors,
                        suggestions=suggestions,
                        attempt=attempt,
                        duration=duration
                    )

                    self.history.append(result)

                    # Check if we should retry
                    if attempt < self.config.max_retries:
                        print(f"\n   🔄 Retrying with suggested fixes...\n")
                        time.sleep(0.5)  # Brief pause before retry
                    else:
                        print(f"\n   ⚠️  Maximum retries ({self.config.max_retries}) exhausted")
                        print(f"   🚨 VALIDATION LOOP FAILED - Manual intervention required\n")
                        return result

            except Exception as e:
                duration = time.time() - start_time
                print(f"   💥 Exception: {str(e)} ({duration:.2f}s)\n")

                result = ValidationResult(
                    passed=False,
                    protocol=None,
                    message=f"Exception during execution: {str(e)}",
                    errors=[str(e)],
                    suggestions=["Check logs for detailed error trace", "Verify task function is correct"],
                    attempt=attempt,
                    duration=duration
                )

                self.history.append(result)

                if attempt >= self.config.max_retries:
                    return result

        # Should not reach here
        return self.history[-1]

    def _analyze_failure(self, result: ValidationResult) -> Dict[str, Any]:
        """Analyze validation failure by protocol"""
        analysis = {
            "protocol": result.protocol.value if result.protocol else "Unknown",
            "error_count": len(result.errors),
            "primary_cause": "Unknown",
            "severity": "Medium",
        }

        if not result.protocol:
            return analysis

        # Protocol-specific analysis
        if result.protocol == ValidationProtocol.NLNH:
            analysis["primary_cause"] = "Truth/confidence violation"
            analysis["severity"] = "High"

        elif result.protocol == ValidationProtocol.DGTS:
            analysis["primary_cause"] = "Gaming pattern detected"
            analysis["severity"] = "Critical"

        elif result.protocol == ValidationProtocol.ZERO_TOLERANCE:
            # Parse errors for specific patterns
            errors_str = " ".join(result.errors).lower()
            if "console.log" in errors_str:
                analysis["primary_cause"] = "Console.log statements"
                analysis["severity"] = "High"
            elif "typescript" in errors_str or "type error" in errors_str:
                analysis["primary_cause"] = "TypeScript errors"
                analysis["severity"] = "High"
            elif "eslint" in errors_str:
                analysis["primary_cause"] = "ESLint violations"
                analysis["severity"] = "Medium"

        elif result.protocol == ValidationProtocol.DOC_TDD:
            analysis["primary_cause"] = "Tests don't match documentation"
            analysis["severity"] = "High"

        elif result.protocol == ValidationProtocol.ANTIHALL:
            analysis["primary_cause"] = "Code doesn't exist in codebase"
            analysis["severity"] = "Critical"

        elif result.protocol == ValidationProtocol.E2E:
            analysis["primary_cause"] = "End-to-end test failures"
            analysis["severity"] = "High"

        return analysis

    def _generate_fix_suggestions(
        self,
        result: ValidationResult,
        analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate intelligent fix suggestions based on protocol and errors"""
        suggestions = []

        if not result.protocol:
            suggestions.append("Run full validation to identify specific protocol failure")
            return suggestions

        # Protocol-specific suggestions
        if result.protocol == ValidationProtocol.NLNH:
            suggestions.extend([
                "Increase confidence score by citing sources",
                "Replace assumptions with verified facts",
                "Add explicit 'I don't know' statements where uncertain",
                "Remove superlatives and overconfident language"
            ])

        elif result.protocol == ValidationProtocol.DGTS:
            suggestions.extend([
                "Remove mock data returns - implement real functionality",
                "Replace 'assert True' with meaningful assertions",
                "Uncomment validation rules that were disabled",
                "Remove 'if False' disabled code blocks",
                "Implement actual logic instead of TODO/pass stubs"
            ])

        elif result.protocol == ValidationProtocol.ZERO_TOLERANCE:
            # Specific suggestions based on error type
            errors_str = " ".join(result.errors).lower()

            if "console.log" in errors_str:
                suggestions.append("Replace console.log with proper logging: import { log } from '@/lib/logger'")
                suggestions.append("Remove all console.* statements (console.log, console.error, console.warn)")

            if "typescript" in errors_str or "type error" in errors_str:
                suggestions.append("Fix TypeScript type errors - run: npx tsc --noEmit")
                suggestions.append("Add explicit types for all parameters and return values")
                suggestions.append("Remove 'any' types and use proper typing")

            if "eslint" in errors_str:
                suggestions.append("Run ESLint auto-fix: npx eslint . --fix")
                suggestions.append("Fix remaining ESLint errors manually")

            if "catch" in errors_str or "error" in errors_str:
                suggestions.append("Add error parameter to catch blocks: catch (error: unknown)")
                suggestions.append("Remove void error anti-patterns")

        elif result.protocol == ValidationProtocol.DOC_TDD:
            suggestions.extend([
                "Create tests from PRD/PRP/ADR documentation first",
                "Map each requirement to a testable acceptance criterion",
                "Implement code to pass documentation-derived tests",
                "Verify test coverage matches all documented requirements"
            ])

        elif result.protocol == ValidationProtocol.ANTIHALL:
            suggestions.extend([
                "Verify the code/method exists in codebase before referencing",
                "Run: npm run antihall:check '<code snippet>'",
                "Use antihall:find to discover correct naming",
                "Check actual implementation, don't assume it exists"
            ])

        elif result.protocol == ValidationProtocol.E2E:
            suggestions.extend([
                "Review Playwright test failures and screenshots",
                "Fix UI bugs identified in E2E tests",
                "Update selectors if DOM structure changed",
                "Run tests in headed mode for debugging: npx playwright test --headed"
            ])

        return suggestions

    def _detect_gaming_in_retry(self, result: ValidationResult):
        """Detect gaming patterns in retry attempts"""
        # Check if the same error is repeated (possible gaming)
        if len(self.history) > 0:
            prev_result = self.history[-1]

            # If errors are identical across retries, might be gaming
            if prev_result.errors == result.errors:
                self.gaming_score += 0.2
                print(f"   ⚠️  Gaming detection: Identical errors across retries (score: {self.gaming_score:.2f})")

            # If protocol changes frequently, might be gaming
            if prev_result.protocol != result.protocol:
                self.gaming_score += 0.1
                print(f"   ⚠️  Gaming detection: Protocol switching (score: {self.gaming_score:.2f})")

        # If gaming score too high, warn
        if self.gaming_score > 0.5:
            print(f"   🚨 HIGH GAMING SCORE ({self.gaming_score:.2f}) - Agent may be gaming validation loop")
            print(f"      Consider manual review or agent blocking")

    def get_summary(self) -> Dict[str, Any]:
        """Get validation loop execution summary"""
        total_attempts = len(self.history)
        passed = sum(1 for r in self.history if r.passed)
        failed = total_attempts - passed

        total_duration = sum(r.duration for r in self.history)

        protocols_failed = {}
        for result in self.history:
            if not result.passed and result.protocol:
                proto = result.protocol.value
                protocols_failed[proto] = protocols_failed.get(proto, 0) + 1

        return {
            "total_attempts": total_attempts,
            "passed": passed,
            "failed": failed,
            "total_duration": round(total_duration, 2),
            "gaming_score": round(self.gaming_score, 2),
            "protocols_failed": protocols_failed,
            "final_status": "PASSED" if self.history and self.history[-1].passed else "FAILED"
        }


# Example usage
if __name__ == "__main__":
    # Example task and validation functions
    def example_task():
        """Example task implementation"""
        # Simulate code implementation
        return {"code": "function test() { console.log('test'); }", "status": "implemented"}

    def example_validation(task_result):
        """Example validation"""
        code = task_result.get("code", "")

        # Check for console.log (Zero Tolerance)
        if "console.log" in code:
            return ValidationResult(
                passed=False,
                protocol=ValidationProtocol.ZERO_TOLERANCE,
                message="Zero Tolerance violation",
                errors=["Console.log statement found in code"],
                suggestions=[],
                attempt=0,
                duration=0.0
            )

        return ValidationResult(
            passed=True,
            protocol=ValidationProtocol.ZERO_TOLERANCE,
            message="All validations passed",
            errors=[],
            suggestions=[],
            attempt=0,
            duration=0.0
        )

    # Run validation loop
    loop = ValidationLoop(ValidationLoopConfig(max_retries=3, verbose=True))
    result = loop.execute(example_task, example_validation, "Example Code Implementation")

    print("\n" + "=" * 60)
    print("📊 VALIDATION LOOP SUMMARY")
    print("=" * 60)

    summary = loop.get_summary()
    for key, value in summary.items():
        print(f"   {key}: {value}")
