#!/usr/bin/env python3
"""
DGTS Validator - Don't Game The System
Part of PAI (Personal AI Infrastructure)

Detects gaming patterns in code:
- Fake tests (assert True, assert 1 == 1)
- Mock implementations pretending to be real
- Commented validation rules
- Feature faking patterns

Usage:
    python dgts-validator.py [path] [--threshold 0.3]
"""

import os
import sys
import re
import argparse
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple

# Gaming patterns to detect
GAMING_PATTERNS = {
    "test_gaming": [
        (r"assert\s+True\s*$", "Meaningless assertion: assert True"),
        (r"assert\s+1\s*==\s*1", "Tautological test: assert 1 == 1"),
        (r"assert\s+['\"].*['\"]\s*==\s*['\"].*['\"]", "String equality that always passes"),
        (r"@pytest\.mark\.skip", "Skipped test hiding failures"),
        (r"@unittest\.skip", "Skipped test hiding failures"),
        (r"return\s*['\"]mock", "Mock data return"),
        (r"return\s*\{\s*['\"]fake", "Fake data return"),
    ],
    "code_gaming": [
        (r"#\s*validation", "Commented validation rule"),
        (r"if\s+False\s*:", "Disabled code block"),
        (r"pass\s*#\s*TODO", "Stub function with TODO"),
        (r"void\s+_error", "Error silencing pattern"),
        (r"except\s*:\s*pass", "Silent exception swallowing"),
        (r"except.*:\s*\.\.\.", "Ellipsis exception handler"),
    ],
    "feature_faking": [
        (r"def\s+\w+\([^)]*\)\s*:\s*pass\s*$", "Empty function implementation"),
        (r"return\s*None\s*#", "None return with comment (likely stub)"),
        (r"raise\s+NotImplementedError", "NotImplementedError (incomplete)"),
        (r"TODO:\s*implement", "TODO marker for unimplemented code"),
        (r"FIXME:", "FIXME marker"),
    ],
    "mock_patterns": [
        (r"mock_data\s*=", "Mock data variable"),
        (r"fake_\w+\s*=", "Fake variable naming"),
        (r"dummy_\w+\s*=", "Dummy variable naming"),
        (r"test@test\.com", "Placeholder test email"),
        (r"example@example\.com", "Placeholder example email"),
        (r"['\"]John\s+Doe['\"]", "Placeholder name"),
        (r"['\"]Jane\s+Doe['\"]", "Placeholder name"),
        (r"lorem\s+ipsum", "Lorem ipsum placeholder"),
        (r"from\s+faker\s+import", "Faker library in production code"),
    ],
    "security_bypass": [
        # Commented security checks
        (r"//\s*(damage[_-]?control|security[_-]?check|auth[_-]?check|permission[_-]?check)", "Commented security check (JS/TS)"),
        (r"#\s*(damage[_-]?control|security[_-]?check|auth[_-]?check|permission[_-]?check)", "Commented security check (Python)"),
        (r"/\*\s*(damage[_-]?control|security[_-]?check|auth[_-]?check|permission[_-]?check)", "Commented security check (block comment)"),
        # Disabled hooks
        (r"hooks\s*:\s*\[\s*\]", "Empty hooks array (security disabled)"),
        (r"hooks\s*=\s*\[\s*\]", "Empty hooks array (security disabled)"),
        # Disabled damage control
        (r"DAMAGE_CONTROL_ENABLED\s*[:=]\s*false", "Damage control explicitly disabled"),
        (r"DAMAGE_CONTROL_ENABLED\s*[:=]\s*False", "Damage control explicitly disabled"),
        (r"SKIP_SECURITY_CHECKS\s*[:=]\s*true", "Security checks explicitly skipped"),
        (r"SKIP_SECURITY_CHECKS\s*[:=]\s*True", "Security checks explicitly skipped"),
        # Empty pattern arrays
        (r"(bashToolPatterns|editToolPatterns|writeToolPatterns)\s*:\s*\[\s*\]", "Empty pattern array (protection disabled)"),
        (r"patterns\s*:\s*\[\s*\]", "Empty patterns array (protection disabled)"),
        # Security theater
        (r"if\s*\(\s*false\s*\)\s*\{[^}]*(security|damage[_-]?control|auth)", "Security code in unreachable if(false) block"),
        (r"if\s+False\s*:[^:]*?(security|damage[_-]?control|auth)", "Security code in unreachable if False block"),
        (r"return\s+true\s*;?\s*//\s*(skip|bypass|disable)\s+(security|validation)", "Early return bypassing security (JS/TS)"),
        (r"return\s+True\s*#\s*(skip|bypass|disable)\s+(security|validation)", "Early return bypassing security (Python)"),
        # Disabled validation
        (r"@pytest\.mark\.skip.*security", "Skipped security test"),
        (r"@unittest\.skip.*security", "Skipped security test"),
        (r"it\.skip.*security", "Skipped security test (Jest)"),
        (r"test\.skip.*security", "Skipped security test (Vitest)"),
    ],
}

# File patterns to scan
SCAN_PATTERNS = ["*.py", "*.ts", "*.tsx", "*.js", "*.jsx"]

# Directories to skip
SKIP_DIRS = ["node_modules", ".git", "__pycache__", "venv", ".venv", "dist", "build"]


@dataclass
class Violation:
    file: str
    line: int
    category: str
    pattern: str
    message: str
    content: str


def scan_file(filepath: Path) -> List[Violation]:
    """Scan a single file for gaming patterns."""
    violations = []

    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
        lines = content.split("\n")

        for line_num, line in enumerate(lines, 1):
            for category, patterns in GAMING_PATTERNS.items():
                for pattern, message in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        violations.append(Violation(
                            file=str(filepath),
                            line=line_num,
                            category=category,
                            pattern=pattern,
                            message=message,
                            content=line.strip()[:80]
                        ))
    except Exception as e:
        print(f"Warning: Could not scan {filepath}: {e}", file=sys.stderr)

    return violations


def scan_directory(path: Path, patterns: List[str]) -> List[Violation]:
    """Recursively scan directory for gaming patterns."""
    all_violations = []

    for pattern in patterns:
        for filepath in path.rglob(pattern):
            # Skip excluded directories
            if any(skip in filepath.parts for skip in SKIP_DIRS):
                continue

            violations = scan_file(filepath)
            all_violations.extend(violations)

    return all_violations


def calculate_gaming_score(violations: List[Violation], total_files: int) -> float:
    """Calculate gaming score based on violations."""
    if total_files == 0:
        return 0.0

    # Weight by category severity
    weights = {
        "test_gaming": 0.3,
        "code_gaming": 0.25,
        "feature_faking": 0.25,
        "mock_patterns": 0.2,
    }

    weighted_score = sum(
        weights.get(v.category, 0.2) for v in violations
    )

    # Normalize by file count
    return min(1.0, weighted_score / max(total_files, 1))


def print_report(violations: List[Violation], score: float, threshold: float):
    """Print formatted violation report."""
    print("\n" + "=" * 60)
    print("  DGTS VALIDATION REPORT")
    print("  Don't Game The System")
    print("=" * 60)

    if not violations:
        print("\n✅ CLEAN - No gaming patterns detected")
        print(f"   Gaming Score: {score:.2f}")
        print("=" * 60)
        return

    # Group by category
    by_category = {}
    for v in violations:
        by_category.setdefault(v.category, []).append(v)

    for category, items in sorted(by_category.items()):
        print(f"\n🔴 {category.upper().replace('_', ' ')} ({len(items)} violations)")
        print("-" * 40)
        for v in items[:5]:  # Show first 5 per category
            print(f"  {v.file}:{v.line}")
            print(f"    {v.message}")
            print(f"    → {v.content}")
        if len(items) > 5:
            print(f"  ... and {len(items) - 5} more")

    print("\n" + "=" * 60)
    print(f"  GAMING SCORE: {score:.2f}")
    print(f"  THRESHOLD:    {threshold:.2f}")

    if score > threshold:
        print("\n  ❌ BLOCKED - Gaming score exceeds threshold")
        print("     Fix violations before proceeding")
    elif score > threshold * 0.7:
        print("\n  ⚠️  WARNING - Approaching threshold")
        print("     Review flagged patterns")
    else:
        print("\n  ✅ PASSED - Within acceptable limits")

    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="DGTS Validator - Detect gaming patterns")
    parser.add_argument("path", nargs="?", default=".", help="Path to scan")
    parser.add_argument("--threshold", type=float, default=0.3, help="Gaming score threshold")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--quiet", action="store_true", help="Only output score")

    args = parser.parse_args()

    path = Path(args.path).resolve()

    if not path.exists():
        print(f"Error: Path does not exist: {path}", file=sys.stderr)
        sys.exit(1)

    # Count total files
    total_files = sum(
        1 for pattern in SCAN_PATTERNS
        for _ in path.rglob(pattern)
        if not any(skip in _.parts for skip in SKIP_DIRS)
    )

    # Scan for violations
    violations = scan_directory(path, SCAN_PATTERNS)

    # Calculate score
    score = calculate_gaming_score(violations, total_files)

    if args.quiet:
        print(f"{score:.2f}")
    elif args.json:
        import json
        print(json.dumps({
            "score": score,
            "threshold": args.threshold,
            "passed": score <= args.threshold,
            "total_violations": len(violations),
            "violations": [
                {
                    "file": v.file,
                    "line": v.line,
                    "category": v.category,
                    "message": v.message
                }
                for v in violations
            ]
        }, indent=2))
    else:
        print_report(violations, score, args.threshold)

    # Exit with error if over threshold
    sys.exit(0 if score <= args.threshold else 1)


if __name__ == "__main__":
    main()
