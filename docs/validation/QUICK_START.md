# PAI Validation System - Quick Start Guide

**Get started with the enhanced PAI validation system in 5 minutes**

## 🚀 Quick Setup (One-Time)

### Step 1: Run Auto-Discovery
Automatically detect your project's tools and frameworks:

```bash
python scripts/validation/auto-discovery.py
```

**Output**: `.pai/validation-config.json` with discovered tools

### Step 2: Generate E2E Tests (UI Projects Only)
If your project has UI components:

```bash
node scripts/validation/e2e-generator.js --install --analyze
```

**Output**: `tests/e2e/generated/*.spec.ts` test files

### Step 3: Verify Setup
Run full validation to ensure everything works:

```bash
node scripts/validation/pai-orchestrator.js --verbose
```

**Expected**: Validation runs through all layers and protocols

## ✅ Daily Usage

### Automatic Validation (Recommended)
Hooks run validation automatically:

**After editing code** → Quick validation (< 2s)
- Zero Tolerance patterns
- TypeScript/ESLint checks
- DGTS gaming detection

**Before committing** → Full validation (1-5 min) **BLOCKS COMMIT IF FAILS**
- All layers (Static + Unit + E2E)
- All protocols (NLNH + DGTS + ZT + Doc-TDD + AntiHall)

**No action required** - hooks handle everything!

### Manual Validation
Run validation anytime:

```bash
# Full validation (verbose output)
node scripts/validation/pai-orchestrator.js --verbose

# Quick validation (skip E2E tests)
node scripts/validation/pai-orchestrator.js --skip-e2e

# Via slash command
/pai-validate
```

## 🔄 Validation Loop Workflow

When validation fails, the system automatically:

1. **Analyzes the error** (which protocol failed?)
2. **Suggests fixes** (intelligent, protocol-specific)
3. **Retries** (up to 3 attempts)
4. **Monitors for gaming** (detect fake fixes)

**Example Loop**:
```
Attempt 1: ❌ FAILED - Console.log detected
  💡 Suggestion: Replace with logger import
  🔄 Retrying...

Attempt 2: ❌ FAILED - TypeScript errors
  💡 Suggestion: Add explicit types
  🔄 Retrying...

Attempt 3: ✅ PASSED - All validations successful!
```

## 📊 Understanding Validation Layers

### Layer 1: Static Analysis (Fast)
**What it checks**:
- TypeScript type errors
- ESLint violations
- NLNH truth violations
- DGTS gaming patterns
- Zero Tolerance anti-patterns

**When it runs**: After every code change

### Layer 2: Unit Tests (Medium)
**What it checks**:
- Unit test pass/fail
- Code coverage (>95%)
- Tests match documentation (Doc-TDD)
- Code exists (AntiHall)

**When it runs**: Before commits, on-demand

### Layer 3: E2E Tests (Slow)
**What it checks**:
- Navigation works
- Forms validate correctly
- CRUD operations function
- Auth flows secure
- Responsive design

**When it runs**: Before commits (UI projects only)

## 🛠️ Common Workflows

### Workflow 1: Adding a New Feature

```bash
# 1. Write code normally
# (Post-file-edit hook runs quick validation automatically)

# 2. Write tests
npm run test

# 3. Run full validation before commit
node scripts/validation/pai-orchestrator.js --verbose

# 4. Commit (pre-commit hook runs automatically)
git add .
git commit -m "Add new feature"
# → Full validation runs, blocks if fails
```

### Workflow 2: Fixing a Bug

```bash
# 1. Fix the bug
# (Quick validation runs after each edit)

# 2. Verify fix with tests
npm run test

# 3. Commit
git commit -am "Fix bug"
# → Pre-commit validation ensures no regressions
```

### Workflow 3: Refactoring Code

```bash
# 1. Refactor
# (Validation loops catch any breaking changes immediately)

# 2. Run full validation
node scripts/validation/pai-orchestrator.js --verbose

# 3. Commit when all validations pass
git commit -am "Refactor component"
```

## 🚨 Troubleshooting

### "Validation failed on attempt 3"
**Cause**: Code has errors that weren't fixed after retries

**Fix**:
1. Read error messages carefully
2. Apply suggested fixes
3. Run validation manually: `node scripts/validation/pai-orchestrator.js --verbose`
4. Review gaming score (might be gaming the system)

### "Console.log statements detected"
**Cause**: Zero Tolerance blocking (CRITICAL)

**Fix**:
```typescript
// ❌ BAD
console.log('Debug message');

// ✅ GOOD
import { log } from '@/lib/logger';
log.info('Debug message', data, 'ComponentName');
```

### "TypeScript errors detected"
**Cause**: Type errors in code

**Fix**:
```bash
# Check errors
npx tsc --noEmit

# Fix errors (add types, remove 'any', etc.)
# Then re-run validation
```

### "E2E tests not running"
**Cause**: Tests not generated or Playwright not installed

**Fix**:
```bash
# Generate E2E tests
node scripts/validation/e2e-generator.js --install --analyze

# Run tests manually
npx playwright test
```

### "Gaming score too high"
**Cause**: Agent detected gaming patterns in retries

**Fix**:
1. Review retry attempts - are fixes real?
2. Check DGTS validator output
3. Implement genuine fixes, not workarounds
4. If score >0.5, manual review required

## 📝 Package.json Scripts (Recommended)

Add these to your `package.json`:

```json
{
  "scripts": {
    "validate": "node scripts/validation/pai-orchestrator.js --verbose",
    "validate:quick": "node scripts/validation/pai-orchestrator.js --skip-e2e",
    "validate:discover": "python scripts/validation/auto-discovery.py",
    "validate:e2e-gen": "node scripts/validation/e2e-generator.js --install --analyze",
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --ui"
  }
}
```

**Usage**:
```bash
npm run validate          # Full validation
npm run validate:quick    # Skip E2E tests
npm run validate:discover # Re-run auto-discovery
npm run validate:e2e-gen  # Regenerate E2E tests
npm run test:e2e          # Run E2E tests only
npm run test:e2e:ui       # Run E2E tests in UI mode
```

## 🎯 Best Practices

### ✅ DO
- Let hooks run automatically (don't skip)
- Review validation output carefully
- Apply suggested fixes from validation loops
- Keep E2E tests up-to-date with UI changes
- Run auto-discovery after major dependency changes

### ❌ DON'T
- Skip validation to "save time" (technical debt builds up)
- Game the validation system (DGTS will catch you)
- Commit without pre-commit validation passing
- Ignore warnings (they become errors later)
- Delete generated E2E tests without replacing them

## 📚 Additional Resources

- **Full Architecture**: `docs/validation/VALIDATION_ARCHITECTURE.md`
- **Validation Loops**: `docs/validation/VALIDATION_LOOPS.md`
- **E2E Templates**: `docs/validation/E2E_TEST_TEMPLATES.md`
- **NLNH Protocol**: `C:/Jarvis/validation/NLNH_ENHANCED.md`
- **DGTS System**: `C:/Jarvis/AI Workspace/Archon/python/src/agents/validation/`

## 🆘 Getting Help

### Check Status
```bash
# View auto-discovered configuration
cat .pai/validation-config.json

# Check hook configuration
cat .claude/settings.json | grep -A 20 "hooks"

# View validation history
# (Stored in validation loop logs)
```

### Debug Mode
```bash
# Verbose output
node scripts/validation/pai-orchestrator.js --verbose

# Playwright debug mode
npx playwright test --debug

# Enable hook logging
# (Set in .claude/settings.json)
```

---

**Status**: ✅ Ready to use
**Questions?**: Check docs/validation/ directory
**Last Updated**: 2025-11-20
