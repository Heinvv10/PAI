# PAI Validation System Documentation

**Location**: `scripts/validation/`
**Orchestrator**: `pai-orchestrator.js`
**Status**: Production (7-layer validation system)

---

## Overview

The PAI validation system is a comprehensive 7-layer quality gate system that runs during pre-commit hooks to ensure code quality, security, and compliance with PAI standards.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  git commit                                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  pre-commit.ts                                              │
│  → calls pai-orchestrator.js                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  pai-orchestrator.js (7 Validation Layers)                 │
│                                                              │
│  Layer 1: Static Analysis & Truth Enforcement               │
│    ├─ NLNH Validator (No Lies, No Hallucinations)          │
│    ├─ DGTS Validator (Don't Game The System)               │
│    ├─ Zero Tolerance Quality Check                          │
│    └─ Damage Control Assessment                             │
│                                                              │
│  Layer 2: Code Quality                                      │
│    ├─ TypeScript Compilation                                │
│    ├─ ESLint                                                 │
│    └─ Bundle Size Check                                      │
│                                                              │
│  Layer 3: Security                                          │
│    ├─ Dependency Audit                                       │
│    └─ Secret Detection                                       │
│                                                              │
│  Layer 4: Testing                                           │
│    ├─ Unit Tests                                             │
│    └─ Integration Tests                                      │
│                                                              │
│  Layer 5: Documentation                                     │
│    └─ Documentation Check                                    │
│                                                              │
│  Layer 6: Git Hygiene                                       │
│    ├─ Commit Message Format                                 │
│    └─ Branch Naming                                          │
│                                                              │
│  Layer 7: Final Verification                                │
│    └─ Pre-Push Checks                                        │
│                                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
    ┌───────▼────┐    ┌───────▼──────┐
    │ BLOCKED    │    │ ALLOWED      │
    │ (exit 1)   │    │ (exit 0)     │
    └────────────┘    └──────────────┘
```

---

## Layer 1: Static Analysis & Truth Enforcement

### 1.1 NLNH Validator (No Lies, No Hallucinations)

**Purpose**: Detect hallucinated code references and unimplemented features

**File**: `scripts/validators/nlnh-validator.js`

**Checks**:
- Method references that don't exist
- Imports of non-existent files
- Calls to undefined functions
- References to non-existent properties

**Exit Codes**:
- `0` - No violations
- `1` - Violations found (blocks commit)

**Example Violation**:
```javascript
// ❌ VIOLATION: Calling method that doesn't exist
userService.getNonExistentMethod();
```

### 1.2 DGTS Validator (Don't Game The System)

**Purpose**: Detect attempts to game validation systems

**File**: `scripts/validators/dgts-validator.py`

**Checks**:
- Commented validation calls
- Disabled linting rules
- Try-catch blocks without proper handling
- Security bypass attempts (NEW - damage control integration)

**Exit Codes**:
- `0` - Gaming score < threshold (passes)
- `1` - Gaming score ≥ threshold (blocks commit)

**Gaming Score Calculation**:
- Commented checks: +0.2
- Disabled linting: +0.3
- Empty catch blocks: +0.2
- Security bypass: +0.5 (immediate block)

**Threshold**: 0.3

**Example Violations**:
```javascript
// ❌ VIOLATION: Commented validation
// validateInput(data);

// ❌ VIOLATION: Security bypass
// damage_control disabled

// ❌ VIOLATION: Empty catch
try {
  dangerousOperation();
} catch (e) {
  // Empty catch - gaming attempt
}
```

**Security Gaming Patterns** (added via damage control integration):
```python
SECURITY_GAMING_PATTERNS = [
    r'\/\/\s*(damage[_-]?control|security[_-]?check)',  # Commented security
    r'#\s*(damage[_-]?control|security[_-]?check)',
    r'hooks\s*:\s*\[\]',                                 # Empty hooks
    r'DAMAGE_CONTROL_ENABLED\s*=\s*false',               # Disabled security
    r'patterns\s*:\s*\[\]',                              # Empty patterns
    r'bashToolPatterns\s*:\s*\[\]',
    r'if\s+\(false\)\s*\{[^}]*security',                # Security theater
    r'return\s+true\s*;?\s*\/\/\s*skip security',
]
```

### 1.3 Zero Tolerance Quality Check

**Purpose**: Enforce zero-tolerance rules (no console.log, etc.)

**File**: `scripts/zero-tolerance-check.js`

**Checks**:
- No `console.log` statements (except in specific allowed files)
- No `debugger` statements
- No TODO comments in production code
- No commented-out code blocks

**Exit Codes**:
- `0` - No violations
- `1` - Violations found (blocks commit)

**Example Violations**:
```javascript
// ❌ VIOLATION: console.log in production
console.log('Debug output');

// ❌ VIOLATION: debugger statement
debugger;

// ❌ VIOLATION: TODO in production
// TODO: Implement this later
```

### 1.4 Damage Control Assessment (NEW)

**Purpose**: Validate staged files for dangerous patterns and security violations

**File**: `~/.claude/hooks/lib/damage-control-validator.ts`

**Checks**:
1. **Shell Scripts** (*.sh, *.bash, *.ps1) for dangerous command patterns
2. **All Files** for commented security checks
3. **All Files** for hardcoded secrets
4. **All Files** for disabled safety mechanisms

**Exit Codes**:
- `0` - No violations
- `1` - Violations found (blocks commit)

**Validation Process**:
```typescript
async function validateCommit(): Promise<void> {
  const stagedFiles = getStagedFiles();
  const violations: string[] = [];

  for (const file of stagedFiles) {
    // Check shell scripts
    if (file.match(/\.(sh|bash|ps1)$/)) {
      const content = readFileSync(file, 'utf-8');
      const result = await engine.validateBashCommand(content);
      if (result.blocked) violations.push(`${file}: ${result.reason}`);
    }

    // Check for security gaming
    const content = readFileSync(file, 'utf-8');
    if (content.match(/\/\/\s*security check/i)) {
      violations.push(`${file}: Commented security check`);
    }

    // Check for hardcoded secrets
    if (content.match(/password\s*=\s*["'][^"']{8,}/i)) {
      violations.push(`${file}: Potential hardcoded secret`);
    }
  }

  if (violations.length > 0) {
    console.error('❌ Damage Control violations:\n');
    violations.forEach(v => console.error(`  - ${v}`));
    process.exit(1); // Block commit
  }

  console.log('✅ No damage control violations\n');
  process.exit(0);
}
```

**Example Violations**:
```bash
# ❌ VIOLATION: Dangerous command in shell script
rm -rf /var/log

# ❌ VIOLATION: Commented security check
// damage_control disabled

# ❌ VIOLATION: Hardcoded secret
const apiKey = "sk-1234567890abcdef";
```

**Integration with Damage Control System**:

The damage control validator uses the shared damage control engine:

```typescript
import { getDamageControlEngine } from './damage-control';

const engine = getDamageControlEngine('cpd-validator');
const result = await engine.validateBashCommand(command);
```

**Features**:
- Uses same patterns as runtime damage control (100+ patterns)
- Supports multi-level configuration (global/project/personal)
- Logs to security audit trail (`~/.claude/security-audit.jsonl`)
- Sends events to observability dashboard (if running)

**Performance**:
- Per-commit overhead: ~200ms (target: <500ms) ✅
- Validation is non-blocking for minor issues
- Critical issues block commit immediately

---

## Layer 2: Code Quality

### 2.1 TypeScript Compilation

**Purpose**: Ensure type safety and catch compile-time errors

**Command**: `tsc --noEmit`

**Checks**:
- Type errors
- Missing imports
- Invalid type assertions

**Exit Codes**:
- `0` - No type errors
- `1` - Type errors found (blocks commit)

### 2.2 ESLint

**Purpose**: Enforce code style and catch common issues

**Command**: `eslint --max-warnings 0`

**Checks**:
- Code style violations
- Unused variables
- Potential bugs
- Best practice violations

**Exit Codes**:
- `0` - No violations
- `1` - Violations found (blocks commit)

### 2.3 Bundle Size Check

**Purpose**: Prevent bundle bloat

**Command**: Custom script

**Checks**:
- Total bundle size < threshold
- Individual chunk sizes < threshold

**Exit Codes**:
- `0` - Bundle size OK
- `1` - Bundle too large (blocks commit)

---

## Layer 3: Security

### 3.1 Dependency Audit

**Purpose**: Detect vulnerable dependencies

**Command**: `npm audit`

**Checks**:
- Known vulnerabilities in dependencies
- Outdated dependencies with security issues

**Exit Codes**:
- `0` - No high/critical vulnerabilities
- `1` - High/critical vulnerabilities found (blocks commit)

### 3.2 Secret Detection

**Purpose**: Prevent committing secrets

**Command**: Custom script

**Checks**:
- API keys
- Passwords
- Private keys
- Tokens

**Exit Codes**:
- `0` - No secrets detected
- `1` - Secrets found (blocks commit)

---

## Layer 4: Testing

### 4.1 Unit Tests

**Purpose**: Ensure core functionality works

**Command**: `npm test`

**Checks**:
- All unit tests pass
- Code coverage meets threshold

**Exit Codes**:
- `0` - All tests pass
- `1` - Tests fail (blocks commit)

### 4.2 Integration Tests

**Purpose**: Ensure system components work together

**Command**: `npm run test:integration`

**Checks**:
- Integration tests pass
- API contracts maintained

**Exit Codes**:
- `0` - All tests pass
- `1` - Tests fail (blocks commit)

---

## Layer 5: Documentation

### 5.1 Documentation Check

**Purpose**: Ensure code is documented

**Command**: Custom script

**Checks**:
- Public APIs documented
- README up to date
- CHANGELOG updated

**Exit Codes**:
- `0` - Documentation OK
- `1` - Documentation missing (blocks commit)

---

## Layer 6: Git Hygiene

### 6.1 Commit Message Format

**Purpose**: Enforce commit message conventions

**Checks**:
- Conventional commits format
- Descriptive commit message
- References to issues (if applicable)

**Exit Codes**:
- `0` - Message format OK
- `1` - Invalid format (blocks commit)

**Example Valid Messages**:
```
feat: Add damage control validation to CPD workflow
fix: Correct pattern matching in bash validator
docs: Update validation system documentation
```

### 6.2 Branch Naming

**Purpose**: Enforce branch naming conventions

**Checks**:
- Feature branches: `feature/*`
- Bug fixes: `fix/*`
- Hotfixes: `hotfix/*`

**Exit Codes**:
- `0` - Branch name OK
- `1` - Invalid branch name (blocks commit)

---

## Layer 7: Final Verification

### 7.1 Pre-Push Checks

**Purpose**: Final verification before push

**Checks**:
- All commits have proper format
- No merge conflicts
- Branch is up to date with remote

**Exit Codes**:
- `0` - Ready to push
- `1` - Issues found (blocks push)

---

## Usage

### Running Full Validation

```bash
# Run all validation layers
node scripts/validation/pai-orchestrator.js

# Run specific layer
node scripts/validation/pai-orchestrator.js --layer 1

# Run damage control validation only
bun ~/.claude/hooks/lib/damage-control-validator.ts
```

### Integration with Git Hooks

**File**: `~/.claude/hooks/pre-commit.ts`

```typescript
import { execSync } from 'child_process';

try {
  // Run PAI validation orchestrator
  execSync('node scripts/validation/pai-orchestrator.js', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('✅ All validation checks passed');
  process.exit(0);
} catch (error) {
  console.error('❌ Validation failed');
  process.exit(1);
}
```

### Bypassing Validation (Emergency Only)

```bash
# Skip all validations (use with extreme caution)
git commit --no-verify -m "Emergency fix"
```

**WARNING**: Only use `--no-verify` in genuine emergencies. All bypassed commits should be fixed in follow-up commits.

---

## Configuration

### Validation Levels

Each layer can be configured to be:
- **BLOCKING**: Commit blocked if violations found (default)
- **WARNING**: Violations logged but commit allowed
- **DISABLED**: Layer skipped entirely

**File**: `scripts/validation/config.json`

```json
{
  "layers": {
    "layer1": {
      "enabled": true,
      "blocking": true,
      "validators": {
        "nlnh": { "enabled": true, "blocking": true },
        "dgts": { "enabled": true, "blocking": true, "threshold": 0.3 },
        "zeroTolerance": { "enabled": true, "blocking": true },
        "damageControl": { "enabled": true, "blocking": true }
      }
    }
  }
}
```

### Project-Level Overrides

**File**: `.claude/validation/config.json`

```json
{
  "layers": {
    "layer1": {
      "validators": {
        "damageControl": {
          "enabled": true,
          "blocking": true,
          "patternsPath": ".claude/hooks/damage-control/patterns.yaml"
        }
      }
    }
  }
}
```

---

## Troubleshooting

### False Positives

**Problem**: Validator blocks valid code

**Solution**:
1. Review violation details in console output
2. If false positive, add exception to validator config
3. Document exception with comment explaining why

**Example**:
```javascript
// Exception: Third-party library requires console output
console.log('Library output'); // @zero-tolerance-ignore
```

### Performance Issues

**Problem**: Validation takes too long

**Solution**:
1. Check which layer is slow: `node scripts/validation/pai-orchestrator.js --profile`
2. Optimize slow validators
3. Consider caching validation results for unchanged files

**Target Times**:
- Layer 1 (Static Analysis): <500ms
- Layer 2 (Code Quality): <2s
- Layer 3 (Security): <1s
- Layer 4 (Testing): <30s
- Total: <1 minute

### Damage Control Integration Issues

**Problem**: Damage control validator failing

**Solution**:
1. Verify patterns file exists: `ls ~/.claude/hooks/damage-control/patterns.yaml`
2. Test pattern matching: `bun test ~/.claude/hooks/lib/damage-control.test.ts`
3. Check security audit log: `tail ~/.claude/security-audit.jsonl`
4. Verify shared library: `ls ~/.claude/hooks/lib/damage-control.ts`

---

## Testing

### Unit Tests

```bash
# Test individual validators
bun test scripts/validators/nlnh-validator.test.js
bun test scripts/validators/dgts-validator.test.py
bun test ~/.claude/hooks/lib/damage-control.test.ts

# Test orchestrator
bun test scripts/validation/pai-orchestrator.test.js
```

### Integration Tests

```bash
# Test full validation workflow
bun test scripts/validation/integration.test.js

# Test with actual commit
git add .
git commit -m "test: Testing validation system"
# Should trigger all validation layers
```

---

## Performance Metrics

**Current Performance** (as of 2026-01-06):

| Layer | Average Time | Target | Status |
|-------|--------------|--------|--------|
| Layer 1 (Static) | ~300ms | <500ms | ✅ |
| - NLNH | ~50ms | <100ms | ✅ |
| - DGTS | ~100ms | <200ms | ✅ |
| - Zero Tolerance | ~50ms | <100ms | ✅ |
| - Damage Control | ~200ms | <500ms | ✅ |
| Layer 2 (Quality) | ~1.5s | <2s | ✅ |
| Layer 3 (Security) | ~800ms | <1s | ✅ |
| Layer 4 (Testing) | ~25s | <30s | ✅ |
| **Total** | ~28s | <1min | ✅ |

---

## References

- **PAI Orchestrator**: `scripts/validation/pai-orchestrator.js`
- **Damage Control Validator**: `~/.claude/hooks/lib/damage-control-validator.ts`
- **Shared Library**: `~/.claude/hooks/lib/damage-control.ts`
- **Test Suite**: `~/.claude/hooks/lib/damage-control.test.ts`
- **Integration Tests**: `~/.claude/hooks/lib/INTEGRATION_TEST_RESULTS.md`
- **Protocol**: `~/.claude/protocols/damage-control.md`

---

**Document Status**: ✅ Complete
**Last Updated**: 2026-01-06
**Maintainer**: PAI System
