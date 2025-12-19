# /auto - PAI Autonomous Coding from PRD

**Purpose:** Convert a PRD/specification document into a `feature_list.json` and execute PAI autonomous development with full validation including Playwright MCP testing.

## Usage

```bash
/auto <path-to-prd>
/auto <path-to-prd> --project <project-root>
/auto <path-to-prd> --max-sessions 50
```

## What It Does

1. **PRD Analysis** - Reads and analyzes the provided PRD/specification document
2. **Feature Extraction** - Breaks down requirements into testable features
3. **Test Generation** - Creates comprehensive test specifications including:
   - Unit tests
   - Integration tests
   - E2E tests (using Playwright MCP)
   - Visual regression tests (Playwright screenshots)
4. **Feature List Creation** - Generates `feature_list.json` with:
   - Feature descriptions
   - Test requirements (unit, integration, E2E, Playwright)
   - Acceptance criteria
   - Implementation notes
5. **Validation Setup** - Ensures all quality gates are enabled:
   - NLNH protocol (No hallucinations)
   - DGTS validation (No gaming the system)
   - Playwright MCP integration
   - Pre-commit hooks
   - Test coverage requirements
6. **PAI Autonomous Execution** - Launches PAI autonomous coding worker

## Feature List Format

The generated `feature_list.json` follows this structure:

```json
{
  "project": "Project Name",
  "source_prd": "path/to/prd.md",
  "generated_at": "2025-12-18T20:00:00Z",
  "pai_autonomous_mode": true,
  "features": [
    {
      "id": "feature-001",
      "name": "User Authentication UI",
      "description": "Implement secure user login and registration interface",
      "test_file": "tests/auth.test.ts",
      "test_description": "Tests login flow, registration validation, password hashing",
      "playwright_tests": {
        "enabled": true,
        "test_file": "tests/e2e/auth.spec.ts",
        "scenarios": [
          "User can navigate to login page",
          "User can submit valid credentials",
          "Invalid credentials show error message",
          "User can register new account",
          "Session persists after page reload"
        ],
        "screenshots": true,
        "network_validation": true
      },
      "status": "pending",
      "acceptance_criteria": [
        "Users can register with email and password",
        "Passwords are hashed using bcrypt",
        "Invalid credentials show appropriate error",
        "Session tokens expire after 24 hours",
        "All UI interactions pass Playwright E2E tests"
      ],
      "validation_requirements": {
        "unit_tests": true,
        "integration_tests": true,
        "e2e_tests_playwright": true,
        "min_coverage": 80,
        "nlnh_check": true,
        "dgts_check": true,
        "playwright_mcp_check": true
      }
    }
  ]
}
```

## Options

- `--project <path>` - Target project directory (defaults to current directory)
- `--max-sessions <number>` - Maximum autonomous coding sessions (default: 50)
- `--checkpoint-interval <number>` - Validate every N sessions (default: 5)
- `--skip-validation` - Skip PRD validation (NOT RECOMMENDED)
- `--dry-run` - Generate feature_list.json without starting autonomous mode
- `--skip-playwright` - Disable Playwright MCP tests (NOT RECOMMENDED for UI features)

## Example

```bash
# Basic usage with full Playwright validation
/auto docs/prd/shopping-cart-feature.md

# With custom project path
/auto docs/prd/user-profile.md --project ../my-app

# Dry run to review feature list first
/auto docs/prd/api-endpoints.md --dry-run
```

## Quality Gates (Always Active)

The `/auto` command **ALWAYS** enforces:

1. **NLNH Protocol** - Zero hallucinations, truth-first development
2. **DGTS Validation** - Real implementations, no shortcuts
3. **Playwright MCP Integration** - E2E tests for UI features using Playwright MCP server
4. **Test Requirements** - Features marked incomplete until ALL tests pass
5. **Pre-commit Hooks** - Validation before each commit
6. **Checkpoint Validation** - Progress review every N sessions

## Playwright MCP Integration

For features with UI components, PAI autonomous worker will:

1. **Use Playwright MCP Tools**:
   - `browser_navigate` - Navigate to pages
   - `browser_click` - Interact with UI elements
   - `browser_type` - Fill forms
   - `browser_take_screenshot` - Visual validation
   - `browser_snapshot` - Accessibility snapshots

2. **Generate E2E Test Files** in format:
```typescript
// tests/e2e/feature-name.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    // Navigate using Playwright MCP
    await page.goto('http://localhost:3000/feature');

    // Interact with elements
    await page.click('[data-testid="submit-button"]');

    // Validate state
    await expect(page.locator('.success-message')).toBeVisible();

    // Screenshot for visual regression
    await page.screenshot({ path: 'screenshots/feature-success.png' });
  });
});
```

3. **Validate UI Before Completion**:
   - All Playwright tests must pass
   - Screenshots reviewed for visual regressions
   - Network requests validated
   - Console errors checked

## Workflow

```
User runs: /auto prd.md
    ↓
1. Read and parse PRD document
    ↓
2. Extract features, requirements, acceptance criteria
    ↓
3. Generate test specifications (unit, integration, Playwright E2E)
    ↓
4. Create feature_list.json with Playwright MCP validation
    ↓
5. Display feature list summary for user review
    ↓
6. Ask for confirmation (unless --yes flag)
    ↓
7. Launch PAI autonomous coding worker
    ↓
8. Worker implements features one-by-one:
   - Write implementation code
   - Write unit tests → run → validate
   - Write integration tests → run → validate
   - Write Playwright E2E tests → run via MCP → validate
   - Take screenshots → review → validate
    ↓
9. Each feature must pass ALL tests (including Playwright)
    ↓
10. Checkpoints every N sessions for quality validation
    ↓
11. Continue until all features pass all tests
```

## Error Handling

- **Invalid PRD path** → Show error, suggest using Glob to find files
- **PRD parse error** → Show specific parsing issue
- **No features extracted** → PRD may be too vague, ask user to clarify
- **Project path invalid** → Confirm project directory exists
- **feature_list.json exists** → Ask user if they want to merge or replace
- **Playwright MCP unavailable** → Warn user, ask if they want to continue without E2E tests

## Integration with PAI Autonomous Coding Worker

This command creates a task for the PAI autonomous coding worker:

```python
{
    "task_type": "pai_autonomous_coding",
    "project_root": "/path/to/project",
    "feature_list_path": "/path/to/project/feature_list.json",
    "max_sessions": 50,
    "checkpoint_interval": 5,
    "autonomous_mode": True,
    "validation_enabled": True,  # ALWAYS True
    "playwright_mcp_enabled": True,  # ALWAYS True for UI features
    "mcp_servers": {
        "playwright": "enabled",
        "context7": "enabled",
        "memory": "enabled"
    }
}
```

## PAI Autonomous Coding Worker Features

The PAI worker extends standard autonomous coding with:

1. **Playwright MCP Integration** - First-class E2E testing
2. **Visual Regression Detection** - Screenshot comparison
3. **Accessibility Validation** - Using browser_snapshot
4. **Network Request Validation** - Check API calls
5. **Console Error Detection** - No JavaScript errors
6. **Progressive Enhancement** - Graceful degradation testing

## Notes

- The `/auto` command does NOT skip validations - this is a safety requirement
- All UI features require Playwright E2E tests - this is non-negotiable for quality
- PRD can be in Markdown, plain text, or JSON format
- Feature list is human-readable and can be manually edited before execution
- Progress is tracked in `feature_list.json` (survives crashes)
- Playwright MCP server must be configured in `~/.claude/settings.json`
- Screenshots are saved to `tests/screenshots/` for visual review
