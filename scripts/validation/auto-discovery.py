#!/usr/bin/env python3

"""
PAI Auto-Discovery Engine

Automatically detects project tools, frameworks, and configurations
Inspired by Context Engineering auto-discovery pattern

Discovers:
- Linters: ESLint, Ruff, Pylint, etc.
- Type checkers: TypeScript, MyPy, Flow
- Test frameworks: Jest, Vitest, Pytest, Mocha, etc.
- Formatters: Prettier, Black, etc.
- Build tools: Vite, Webpack, etc.
- E2E frameworks: Playwright, Cypress, Selenium

Usage:
    python auto-discovery.py [project_path]

Output:
    .pai/validation-config.json with discovered tools
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class DiscoveredTool:
    """Represents a discovered validation tool"""
    name: str
    type: str  # linter, type_checker, test_framework, formatter, e2e
    config_file: Optional[str]
    command: str
    enabled: bool = True
    auto_discovered: bool = True


@dataclass
class ProjectInfo:
    """Project information and characteristics"""
    is_typescript: bool
    is_python: bool
    is_javascript: bool
    is_ui_project: bool
    has_tests: bool
    package_manager: Optional[str]  # npm, yarn, pnpm, bun, pip, poetry, uv


class AutoDiscovery:
    """
    Auto-discovery engine for project validation tools
    """

    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.discovered_tools: List[DiscoveredTool] = []
        self.project_info: Optional[ProjectInfo] = None

    def discover_all(self) -> Dict[str, Any]:
        """
        Run complete discovery process

        Returns:
            Dictionary with project_info and discovered_tools
        """
        print(f"🔍 PAI Auto-Discovery Engine")
        print(f"📁 Project: {self.project_path}\n")

        # Step 1: Analyze project characteristics
        self.project_info = self._analyze_project()

        # Step 2: Discover tools
        self._discover_linters()
        self._discover_type_checkers()
        self._discover_test_frameworks()
        self._discover_formatters()
        self._discover_e2e_frameworks()

        # Step 3: Generate results
        results = self._generate_results()

        # Step 4: Save configuration
        self._save_configuration(results)

        # Step 5: Print summary
        self._print_summary()

        return results

    def _analyze_project(self) -> ProjectInfo:
        """Analyze project characteristics"""
        print("📊 Analyzing project characteristics...")

        is_typescript = self._file_exists("tsconfig.json")
        is_python = self._file_exists("pyproject.toml") or self._file_exists("setup.py") or self._file_exists("requirements.txt")
        is_javascript = self._file_exists("package.json") and not is_typescript

        # UI project detection
        is_ui_project = (
            self._dir_exists("src/components") or
            self._dir_exists("src/app") or
            self._dir_exists("app") or
            self._dir_exists("pages") or
            self._dir_exists("src/pages")
        )

        # Test detection
        has_tests = (
            self._dir_exists("tests") or
            self._dir_exists("test") or
            self._dir_exists("__tests__") or
            self._file_exists("pytest.ini")
        )

        # Package manager detection
        package_manager = None
        if self._file_exists("package-lock.json"):
            package_manager = "npm"
        elif self._file_exists("yarn.lock"):
            package_manager = "yarn"
        elif self._file_exists("pnpm-lock.yaml"):
            package_manager = "pnpm"
        elif self._file_exists("bun.lockb"):
            package_manager = "bun"
        elif self._file_exists("poetry.lock"):
            package_manager = "poetry"
        elif self._file_exists("uv.lock"):
            package_manager = "uv"
        elif self._file_exists("Pipfile.lock"):
            package_manager = "pipenv"
        elif is_python:
            package_manager = "pip"

        info = ProjectInfo(
            is_typescript=is_typescript,
            is_python=is_python,
            is_javascript=is_javascript,
            is_ui_project=is_ui_project,
            has_tests=has_tests,
            package_manager=package_manager
        )

        print(f"   TypeScript: {info.is_typescript}")
        print(f"   Python: {info.is_python}")
        print(f"   JavaScript: {info.is_javascript}")
        print(f"   UI Project: {info.is_ui_project}")
        print(f"   Has Tests: {info.has_tests}")
        print(f"   Package Manager: {info.package_manager}\n")

        return info

    def _discover_linters(self):
        """Discover linting tools"""
        print("🔍 Discovering linters...")

        # ESLint
        if self._file_exists(".eslintrc.json") or self._file_exists(".eslintrc.js") or self._file_exists(".eslintrc.cjs"):
            config_file = next((f for f in [".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs"] if self._file_exists(f)), None)
            self.discovered_tools.append(DiscoveredTool(
                name="ESLint",
                type="linter",
                config_file=config_file,
                command="npx eslint . --ext .ts,.tsx,.js,.jsx"
            ))
            print("   ✓ ESLint")

        # Ruff (Python)
        if self._file_exists("ruff.toml") or self._has_in_pyproject("ruff"):
            config_file = "ruff.toml" if self._file_exists("ruff.toml") else "pyproject.toml"
            self.discovered_tools.append(DiscoveredTool(
                name="Ruff",
                type="linter",
                config_file=config_file,
                command="ruff check ."
            ))
            print("   ✓ Ruff")

        # Pylint
        if self._file_exists(".pylintrc") or self._has_in_pyproject("pylint"):
            self.discovered_tools.append(DiscoveredTool(
                name="Pylint",
                type="linter",
                config_file=".pylintrc" if self._file_exists(".pylintrc") else "pyproject.toml",
                command="pylint **/*.py"
            ))
            print("   ✓ Pylint")

    def _discover_type_checkers(self):
        """Discover type checking tools"""
        print("\n🔍 Discovering type checkers...")

        # TypeScript
        if self._file_exists("tsconfig.json"):
            self.discovered_tools.append(DiscoveredTool(
                name="TypeScript",
                type="type_checker",
                config_file="tsconfig.json",
                command="npx tsc --noEmit"
            ))
            print("   ✓ TypeScript")

        # MyPy (Python)
        if self._file_exists("mypy.ini") or self._has_in_pyproject("mypy"):
            config_file = "mypy.ini" if self._file_exists("mypy.ini") else "pyproject.toml"
            self.discovered_tools.append(DiscoveredTool(
                name="MyPy",
                type="type_checker",
                config_file=config_file,
                command="mypy ."
            ))
            print("   ✓ MyPy")

    def _discover_test_frameworks(self):
        """Discover test frameworks"""
        print("\n🔍 Discovering test frameworks...")

        # Vitest
        if self._has_package_dependency("vitest"):
            self.discovered_tools.append(DiscoveredTool(
                name="Vitest",
                type="test_framework",
                config_file="vitest.config.ts" if self._file_exists("vitest.config.ts") else None,
                command="npm run test"
            ))
            print("   ✓ Vitest")

        # Jest
        elif self._has_package_dependency("jest"):
            self.discovered_tools.append(DiscoveredTool(
                name="Jest",
                type="test_framework",
                config_file="jest.config.js" if self._file_exists("jest.config.js") else None,
                command="npm test"
            ))
            print("   ✓ Jest")

        # Pytest
        if self._file_exists("pytest.ini") or self._has_in_pyproject("pytest"):
            config_file = "pytest.ini" if self._file_exists("pytest.ini") else "pyproject.toml"
            self.discovered_tools.append(DiscoveredTool(
                name="Pytest",
                type="test_framework",
                config_file=config_file,
                command="pytest --cov --cov-report=term-missing"
            ))
            print("   ✓ Pytest")

        # Mocha
        if self._has_package_dependency("mocha"):
            self.discovered_tools.append(DiscoveredTool(
                name="Mocha",
                type="test_framework",
                config_file=".mocharc.json" if self._file_exists(".mocharc.json") else None,
                command="npm test"
            ))
            print("   ✓ Mocha")

    def _discover_formatters(self):
        """Discover code formatters"""
        print("\n🔍 Discovering formatters...")

        # Prettier
        if self._file_exists(".prettierrc") or self._file_exists(".prettierrc.json") or self._file_exists("prettier.config.js"):
            config_file = next((f for f in [".prettierrc", ".prettierrc.json", "prettier.config.js"] if self._file_exists(f)), None)
            self.discovered_tools.append(DiscoveredTool(
                name="Prettier",
                type="formatter",
                config_file=config_file,
                command="npx prettier --check ."
            ))
            print("   ✓ Prettier")

        # Black (Python)
        if self._has_in_pyproject("black") or self._has_package_dependency("black"):
            self.discovered_tools.append(DiscoveredTool(
                name="Black",
                type="formatter",
                config_file="pyproject.toml",
                command="black --check ."
            ))
            print("   ✓ Black")

    def _discover_e2e_frameworks(self):
        """Discover E2E testing frameworks"""
        print("\n🔍 Discovering E2E frameworks...")

        # Playwright
        if self._file_exists("playwright.config.ts") or self._file_exists("playwright.config.js"):
            config_file = "playwright.config.ts" if self._file_exists("playwright.config.ts") else "playwright.config.js"
            self.discovered_tools.append(DiscoveredTool(
                name="Playwright",
                type="e2e",
                config_file=config_file,
                command="npx playwright test"
            ))
            print("   ✓ Playwright")

        # Cypress
        elif self._file_exists("cypress.config.ts") or self._file_exists("cypress.config.js"):
            config_file = "cypress.config.ts" if self._file_exists("cypress.config.ts") else "cypress.config.js"
            self.discovered_tools.append(DiscoveredTool(
                name="Cypress",
                type="e2e",
                config_file=config_file,
                command="npx cypress run"
            ))
            print("   ✓ Cypress")

    def _generate_results(self) -> Dict[str, Any]:
        """Generate discovery results"""
        return {
            "project_info": asdict(self.project_info) if self.project_info else {},
            "discovered_tools": [asdict(tool) for tool in self.discovered_tools],
            "validation_layers": {
                "layer1_static_analysis": [
                    tool.name for tool in self.discovered_tools
                    if tool.type in ["linter", "type_checker"]
                ],
                "layer2_unit_tests": [
                    tool.name for tool in self.discovered_tools
                    if tool.type == "test_framework"
                ],
                "layer3_e2e_tests": [
                    tool.name for tool in self.discovered_tools
                    if tool.type == "e2e"
                ]
            }
        }

    def _save_configuration(self, results: Dict[str, Any]):
        """Save discovered configuration to .pai/validation-config.json"""
        pai_dir = self.project_path / ".pai"
        pai_dir.mkdir(exist_ok=True)

        config_file = pai_dir / "validation-config.json"

        with open(config_file, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n💾 Configuration saved to: {config_file}")

    def _print_summary(self):
        """Print discovery summary"""
        print(f"\n{'=' * 60}")
        print("📊 DISCOVERY SUMMARY")
        print(f"{'=' * 60}\n")

        tools_by_type = {}
        for tool in self.discovered_tools:
            tools_by_type.setdefault(tool.type, []).append(tool.name)

        print(f"Total tools discovered: {len(self.discovered_tools)}\n")

        for tool_type, tools in tools_by_type.items():
            print(f"{tool_type.replace('_', ' ').title()}:")
            for tool in tools:
                print(f"   • {tool}")
            print()

        if not self.discovered_tools:
            print("⚠️  No validation tools discovered")
            print("   Consider adding ESLint, TypeScript, or testing frameworks\n")

    # Helper methods
    def _file_exists(self, filename: str) -> bool:
        """Check if file exists in project"""
        return (self.project_path / filename).exists()

    def _dir_exists(self, dirname: str) -> bool:
        """Check if directory exists in project"""
        return (self.project_path / dirname).is_dir()

    def _has_package_dependency(self, package: str) -> bool:
        """Check if package.json has dependency"""
        package_json_path = self.project_path / "package.json"

        if not package_json_path.exists():
            return False

        try:
            with open(package_json_path) as f:
                data = json.load(f)

            return (
                package in data.get("dependencies", {}) or
                package in data.get("devDependencies", {})
            )
        except:
            return False

    def _has_in_pyproject(self, section: str) -> bool:
        """Check if pyproject.toml has section"""
        pyproject_path = self.project_path / "pyproject.toml"

        if not pyproject_path.exists():
            return False

        try:
            with open(pyproject_path) as f:
                content = f.read()
            return f"[tool.{section}]" in content or f"[{section}]" in content
        except:
            return False


# CLI execution
if __name__ == "__main__":
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."

    discovery = AutoDiscovery(project_path)
    results = discovery.discover_all()

    print(f"\n✅ Auto-discovery complete!")
    print(f"   Use discovered tools in PAI validation orchestrator")
