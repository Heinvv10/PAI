# Pack System v2.0 - Comprehensive Documentation

**Version**: 2.0
**Status**: ✅ 97.5% Complete (40/41 skills compliant)
**Last Updated**: 2026-01-06

---

## Table of Contents

1. [Overview](#overview)
2. [What is a Pack?](#what-is-a-pack)
3. [Pack v2.0 Specification](#pack-v20-specification)
4. [Directory Structure](#directory-structure)
5. [Creating a New Pack](#creating-a-new-pack)
6. [Pack Installation Workflow](#pack-installation-workflow)
7. [Validation & Testing](#validation--testing)
8. [Best Practices](#best-practices)
9. [Examples](#examples)
10. [Comparison with Dan Miessler's PAI](#comparison-with-dan-miesslers-pai)

---

## Overview

The **Pack System v2.0** is our modular distribution system for Claude Code skills, hooks, tools, and MCP servers. It provides a standardized structure for creating, distributing, and installing reusable AI infrastructure components.

### Key Statistics

- **40/41 skills** (97.5%) follow Pack v2.0 structure
- **23 skills** have SKILL.md progressive disclosure
- **Automated validation** via TDD test suite
- **Template system** for rapid pack creation

### Design Philosophy

Based on the [15 Founding Principles](./15_FOUNDING_PRINCIPLES.md), our Pack System emphasizes:

1. **Deterministic Installation** - AI agents can install packs reliably
2. **Code Before Prompts** - Real code files in `src/`, not markdown-embedded
3. **Spec/Test/Evals First** - TDD validation for Pack v2.0 compliance
4. **UNIX Philosophy** - Modular, composable components
5. **CLI as Interface** - Command-line tools, not manual setup

---

## What is a Pack?

A **Pack** is a self-contained, installable module that extends Claude Code functionality. Packs can contain:

- **Hooks** - Event-driven automation (capture events, process data, trigger actions)
- **Skills** - Reusable prompt templates and workflows
- **Tools** - CLI utilities and scripts
- **MCP Servers** - Model Context Protocol integrations
- **Configuration** - Settings, environment variables, examples

### Pack Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Automation** | Event-driven workflows | `capture-all-events`, `content-scanner` |
| **Development** | Coding assistants | `typescript-error-fixer`, `validation` |
| **Observability** | Monitoring & debugging | `agent-observability`, `proactive-scanner` |
| **Research** | Information gathering | `research`, `fabric` |
| **Integration** | External services | `mcp-builder`, `input-leap-manager` |

---

## Pack v2.0 Specification

### Critical Requirements

Pack v2.0 has **5 mandatory requirements**:

#### 1. **Directory-Based Structure** ✅

Packs MUST be directories, not single files:

```
✅ CORRECT:
~/.claude/skills/my-pack/
  ├── README.md
  ├── INSTALL.md
  ├── VERIFY.md
  └── src/

❌ WRONG:
~/.claude/skills/my-pack.md
```

#### 2. **Real Code Files in src/** ✅

Code MUST be in separate files in `src/`, not embedded in markdown:

```
✅ CORRECT:
src/
  ├── hooks/
  │   └── my-hook.ts
  ├── tools/
  │   └── my-tool.ts
  └── config/
      └── settings.json

❌ WRONG:
README.md with:
```typescript
// Code embedded in markdown
function myHook() { ... }
\`\`\`
```

#### 3. **AI-Installable Design** ✅

The `INSTALL.md` MUST contain:
- Complete installation steps (no manual intervention required)
- Exact file paths and commands
- Configuration instructions
- Dependency installation

**Test**: An AI agent should be able to install the pack by following INSTALL.md alone.

#### 4. **Mandatory Verification** ✅

The `VERIFY.md` MUST contain:
- Checklist of installation steps
- Functional tests to confirm pack works
- Integration tests with existing PAI
- Health check commands

**Test**: A user should be able to verify installation success using VERIFY.md checklist.

#### 5. **No Code Simplification** ✅

Code MUST be:
- **Complete** - No placeholders like `// TODO: implement`
- **Production-ready** - Proper error handling, logging, types
- **Fully functional** - Not simplified examples

```typescript
✅ CORRECT:
export async function securityMiddleware(
  event: KaiEvent,
  hookName: string
): Promise<boolean> {
  // Validate input
  if (!SecurityValidator.validateInput(event)) {
    await logAudit('security-violation', hookName, event);
    return false;
  }

  // Check rate limits
  if (!SecurityValidator.checkRateLimit(hookName)) {
    await logAudit('rate-limit-exceeded', hookName, event);
    return false;
  }

  return true;
}

❌ WRONG:
function securityMiddleware(event) {
  // TODO: Add validation
  return true;
}
```

---

## Directory Structure

### Mandatory Files

Every Pack v2.0 MUST have these three files:

```
my-pack/
├── README.md       # Overview, features, use cases
├── INSTALL.md      # Installation instructions
├── VERIFY.md       # Verification checklist
└── src/            # Real code files (CRITICAL)
```

### Complete Pack Structure

```
my-pack/
├── README.md                    # Pack overview
├── INSTALL.md                   # Installation guide
├── VERIFY.md                    # Verification checklist
├── SKILL.md                     # (Optional) Progressive disclosure
├── settings.json.example        # (Optional) Configuration template
├── .gitignore                   # Git ignore patterns
├── src/                         # REAL CODE FILES
│   ├── hooks/                   # Claude Code hooks
│   │   ├── session-start.ts
│   │   └── stop-hook.ts
│   ├── tools/                   # CLI utilities
│   │   ├── analyze.ts
│   │   └── report.ts
│   ├── skills/                  # Prompt templates
│   │   └── workflow.md
│   ├── config/                  # Configuration
│   │   ├── defaults.json
│   │   └── schema.ts
│   ├── lib/                     # Shared utilities
│   │   ├── utils.ts
│   │   └── types.ts
│   └── mcp/                     # MCP servers (if applicable)
│       └── server.ts
├── tests/                       # (Optional) Pack validation tests
│   └── pack-v2-validation.test.ts
└── docs/                        # (Optional) Extended documentation
    ├── architecture.md
    └── screenshots/
```

### File Naming Rules

| File Type | Pack v2.0 Name | ❌ WRONG Name | Status |
|-----------|----------------|--------------|--------|
| Overview | `README.md` | `PACK_README.md` | ✅ Required |
| Installation | `INSTALL.md` | `PACK_INSTALL.md` | ✅ Required |
| Verification | `VERIFY.md` | `PACK_VERIFY.md` | ✅ Required |
| Progressive Disclosure | `SKILL.md` | N/A | ⚠️ Optional |

**CRITICAL**: Some older packs still use `PACK_*.md` naming. These are **non-compliant** and should be renamed.

---

## Creating a New Pack

### Method 1: Using .pack-template (Recommended)

1. **Copy the template**:
```bash
cp -r ~/.claude/skills/.pack-template ~/.claude/skills/my-new-pack
```

2. **Customize README.md**:
```markdown
# My New Pack

**Version**: 1.0.0
**Author**: Your Name
**Category**: automation

## Overview

[Describe what your pack does in 2-3 sentences]

## What's Included

- **Hooks**: session-start.ts, stop-hook.ts
- **Skills**: workflow.md
- **Tools**: analyze.ts, report.ts

## Key Features

- Feature 1: Real-time analysis
- Feature 2: Automated reporting
- Feature 3: Integration with MCP servers
```

3. **Write INSTALL.md**:
```markdown
# Installation Guide

## Prerequisites

```bash
# Check Bun is installed
bun --version

# Check PAI_DIR is set
echo $PAI_DIR
```

## Installation Steps

### Step 1: Copy Files

```bash
# Copy hooks
cp src/hooks/* $PAI_DIR/hooks/

# Copy skills
cp -r src/skills/* $PAI_DIR/skills/
```

### Step 2: Configure Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun.exe ${PAI_DIR}/hooks/session-start.ts"
          }
        ]
      }
    ]
  }
}
```
```

4. **Create VERIFY.md checklist**:
```markdown
# Verification Checklist

## File Verification

- [ ] All files copied from `src/` to target locations
- [ ] Hook files are in `$PAI_DIR/hooks/`
- [ ] Configuration updated in `settings.json`

## Functional Verification

- [ ] **Test 1**: Hook fires on session start
  ```bash
  # Start new Claude Code session
  # Check for log output
  ```
  **Expected**: "Session started" message in logs

## Health Check

```bash
bun $PAI_DIR/skills/pai-diagnostics/check-pai-state.ts --verbose
```
```

5. **Add code to src/**:
```
src/
├── hooks/
│   └── session-start.ts    # Real TypeScript code
├── tools/
│   └── analyze.ts          # Real TypeScript code
└── config/
    └── settings.json       # Real configuration
```

6. **Test with validation suite**:
```bash
cd tests/pack-v2-validations
bun test pai-diagnostics.test.ts
```

### Method 2: Manual Creation

1. Create directory structure
2. Write README.md, INSTALL.md, VERIFY.md
3. Add code files to `src/`
4. Validate with TDD test suite

---

## Pack Installation Workflow

### For Users (Installing a Pack)

```bash
# Step 1: Navigate to pack directory
cd ~/.claude/skills/my-pack

# Step 2: Read README.md (understand what pack does)
cat README.md

# Step 3: Follow INSTALL.md instructions
cat INSTALL.md
# (Execute installation steps)

# Step 4: Verify installation
cat VERIFY.md
# (Complete verification checklist)

# Step 5: Restart Claude Code
# (Pack is now active)
```

### For AI Agents (Autonomous Installation)

AI agents can install packs autonomously by:

1. **Reading INSTALL.md** - Extract installation steps
2. **Executing commands** - Run file copy, configuration updates
3. **Verifying success** - Check VERIFY.md functional tests
4. **Reporting status** - Confirm installation complete

**Example AI Installation Flow**:
```typescript
async function installPack(packPath: string) {
  // 1. Read INSTALL.md
  const installInstructions = await readFile(`${packPath}/INSTALL.md`);

  // 2. Parse installation steps
  const steps = parseInstallSteps(installInstructions);

  // 3. Execute each step
  for (const step of steps) {
    await executeStep(step);
  }

  // 4. Verify installation
  const verifyChecklist = await readFile(`${packPath}/VERIFY.md`);
  const verificationResults = await runVerification(verifyChecklist);

  // 5. Report status
  return {
    success: verificationResults.allPassed,
    packName: packPath,
    installedFiles: steps.map(s => s.targetPath)
  };
}
```

---

## Validation & Testing

### Automated TDD Validation

We use **Test-Driven Development** to validate Pack v2.0 compliance:

**Location**: `tests/pack-v2-validations/pai-diagnostics.test.ts`

**Test Categories**:

1. **Directory Structure Tests** ✅
   - README.md exists (not PACK_README.md)
   - INSTALL.md exists (not PACK_INSTALL.md)
   - VERIFY.md exists (not PACK_VERIFY.md)
   - src/ directory exists with real code files

2. **Content Validation Tests** ✅
   - README.md has required sections
   - INSTALL.md has step-by-step instructions
   - VERIFY.md has functional test checklist
   - src/ contains actual code files (not empty)

3. **Code Quality Tests** ✅
   - TypeScript files have proper types
   - No placeholder code (`// TODO`, `throw new Error("Not implemented")`)
   - Error handling present
   - Logging implemented

4. **Integration Tests** ⚠️
   - Hooks fire correctly
   - Skills load successfully
   - MCPs connect without errors
   - No conflicts with existing packs

### Running Validation

```bash
# Test a specific pack
cd tests/pack-v2-validations
bun test pai-diagnostics.test.ts

# Test all packs
bun test

# Test with verbose output
bun test --reporter=verbose
```

### Example Test Output

```
✓ Pack v2.0 Directory Structure
  ✓ 🔴 MUST have README.md (not PACK_README.md)
  ✓ 🔴 MUST have INSTALL.md (not PACK_INSTALL.md)
  ✓ 🔴 MUST have VERIFY.md (not PACK_VERIFY.md)
  ✓ 🔴 CRITICAL: MUST have src/ directory with real code files

✓ Pack v2.0 Content Validation
  ✓ README.md MUST have Overview section
  ✓ README.md MUST list what's included
  ✓ INSTALL.md MUST have Prerequisites section
  ✓ INSTALL.md MUST have Step-by-step instructions

✓ Code Quality Validation
  ✓ src/ MUST contain real code files (not empty)
  ✓ TypeScript files MUST have proper type annotations
  ✓ Code MUST NOT have placeholders (// TODO)
```

---

## Best Practices

### 1. **Complete, Not Simplified**

❌ **WRONG** (Simplified example code):
```typescript
function processEvent(event) {
  console.log(event);
}
```

✅ **CORRECT** (Production-ready code):
```typescript
import { KaiEvent } from './types';
import { logHook } from './shared';

export async function processEvent(
  event: KaiEvent
): Promise<void> {
  try {
    // Validate input
    if (!event || !event.type) {
      logHook('process-event', 'Invalid event', 'error');
      return;
    }

    // Process event
    logHook('process-event', `Processing ${event.type}`, 'info');
    // ... actual processing logic ...

  } catch (error) {
    logHook('process-event', `Error: ${error.message}`, 'error');
    throw error;
  }
}
```

### 2. **Self-Contained Dependencies**

Packs should include all required code in `src/`:

```
✅ CORRECT:
src/
├── hooks/
│   └── my-hook.ts
├── lib/
│   ├── utils.ts      # Shared utilities
│   └── types.ts      # Type definitions
└── config/
    └── defaults.json # Configuration

❌ WRONG:
src/
├── hooks/
│   └── my-hook.ts    # Imports from '../../../shared/utils'
```

**Exception**: Shared PAI infrastructure (kai utilities, event bus) can be imported from `~/.claude/hooks/kai/`.

### 3. **Clear Installation Instructions**

INSTALL.md should be:
- **Step-by-step** - Numbered instructions
- **Complete** - No assumptions about user knowledge
- **Testable** - Each step can be verified
- **Automated** - AI agents can follow

❌ **WRONG**:
```markdown
## Installation

Copy files and update settings.
```

✅ **CORRECT**:
```markdown
## Installation Steps

### Step 1: Copy Hooks

```bash
cp src/hooks/session-start.ts $PAI_DIR/hooks/
cp src/hooks/stop-hook.ts $PAI_DIR/hooks/
```

**Verify**: Check files exist:
```bash
ls $PAI_DIR/hooks/ | grep -E "(session-start|stop-hook)"
```

### Step 2: Update Configuration

Add to `~/.claude/settings.json` in the `hooks` section:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun.exe ${PAI_DIR}/hooks/session-start.ts"
          }
        ]
      }
    ]
  }
}
```

**Verify**: Check configuration:
```bash
cat ~/.claude/settings.json | grep "session-start"
```
```

### 4. **Comprehensive Verification**

VERIFY.md should test:
- **File presence** - All files copied correctly
- **Configuration** - Settings updated properly
- **Functionality** - Pack actually works
- **Integration** - No conflicts with existing packs

### 5. **SKILL.md for Progressive Disclosure**

Add `SKILL.md` for AI agent routing:

```yaml
---
name: my-pack
description: My awesome pack that does X. USE WHEN user asks about X, mentions Y, or wants to do Z.
---

# My Pack Skill

## When to Use This

USE THIS SKILL WHEN:
- User says "do X"
- User mentions "Y feature"
- User wants to "accomplish Z"

## What This Does

[Brief explanation - full details in README.md]

## Quick Start

```bash
# Single command to get started
my-pack --help
```

For full documentation, see `README.md`.
```

---

## Examples

### Example 1: agent-observability Pack

**What It Does**: Real-time visualization dashboard for Claude Code agent interactions

**Structure**:
```
agent-observability/
├── README.md              # 12KB - Full documentation
├── INSTALL.md             # 7KB - Detailed installation
├── VERIFY.md              # 6KB - Verification checklist
├── SKILL.md               # Progressive disclosure
├── settings.json.example  # Configuration template
└── src/
    ├── server/            # Bun WebSocket server
    │   ├── file-ingest.ts
    │   └── websocket.ts
    ├── dashboard/         # Vue 3 frontend
    │   ├── main.ts
    │   ├── App.vue
    │   └── components/
    ├── config/
    │   └── server-config.ts
    └── lib/
        ├── event-types.ts
        └── buffer.ts
```

**Why It's Pack v2.0 Compliant**:
- ✅ README.md, INSTALL.md, VERIFY.md (correct naming)
- ✅ Real code in `src/` (not markdown-embedded)
- ✅ AI-installable (complete INSTALL.md with steps)
- ✅ Verification checklist (functional tests)
- ✅ Production-ready code (Vue 3 + Bun + WebSocket)

### Example 2: kai Hook System

**What It Does**: Shared utilities for hook development (event bus, security, categorization)

**Structure**:
```
kai/
├── README.md
├── INSTALL.md
├── VERIFY.md
└── src/
    ├── hooks/
    │   └── kai/
    │       ├── event-bus.ts    # Event processing pipeline
    │       ├── shared.ts       # DRY utilities (25+ functions)
    │       ├── security.ts     # Security validation
    │       └── categorizer.ts  # Session categorization
    └── lib/
        └── metadata-extraction.ts
```

**Why It's Excellent**:
- ✅ Foundation for all other hooks (high reusability)
- ✅ TypeScript interfaces (KaiEvent, TranscriptEntry)
- ✅ Security middleware (injection prevention, rate limiting)
- ✅ DRY principle (eliminated 180+ lines duplication)

### Example 3: Simple Pack (fabric)

**What It Does**: Intelligent pattern selection for Fabric CLI

**Structure**:
```
fabric/
├── README.md
├── INSTALL.md
├── VERIFY.md
├── SKILL.md              # Progressive disclosure
└── src/
    └── skills/
        └── fabric.md     # Prompt template
```

**Why It's Valid**:
- ✅ Follows Pack v2.0 structure
- ✅ src/ contains skill file (real content)
- ✅ SKILL.md for AI routing
- ✅ Simple but complete

---

## Comparison with Dan Miessler's PAI

### What We Have That PAI Doesn't

| Feature | Dan Miessler's PAI | Our Implementation |
|---------|-------------------|-------------------|
| **Pack Count** | ~10 packs | **40 packs** (4x more) |
| **Pack Validation** | Manual verification | **Automated TDD tests** |
| **Pack Template** | No template | **`.pack-template/`** for rapid creation |
| **Observability** | File-based logging | **Real-time WebSocket dashboard** |
| **Orchestration** | Basic parallel execution | **3 patterns + Docker gateway** |
| **Type Safety** | Minimal types | **Comprehensive TypeScript interfaces** |
| **Security** | Basic validation | **Security middleware with audit logging** |

### What PAI Has That We Don't

| Feature | Status | Priority |
|---------|--------|----------|
| **Pack Marketplace** | ❌ Missing | Medium |
| **Dependency Management** | ❌ Missing | Medium |
| **ElevenLabs TTS** | ❌ Missing | Low |
| **Icon Assets** | ❌ Missing | Low |

### Our Advantages

1. **More Complete Pack Ecosystem**
   - 40 production-ready packs vs ~10
   - 97.5% Pack v2.0 compliance

2. **Better Testing Infrastructure**
   - Automated TDD validation
   - Comprehensive test coverage

3. **Advanced Features**
   - Real-time observability dashboard
   - Multi-pattern orchestration
   - Git worktree-based parallel development

4. **Stronger Type Safety**
   - TypeScript throughout
   - Comprehensive interfaces
   - Runtime validation

### Where PAI Excels

1. **Documentation**
   - More extensive conceptual docs
   - Better examples gallery

2. **Community**
   - Larger user base
   - More pack contributions

3. **Marketplace**
   - Centralized pack discovery
   - Ratings and reviews

---

## Future Enhancements

### Priority 1: Pack Dependency Management

**Problem**: No way to declare/resolve dependencies between packs

**Solution**: `pack.json` manifest:
```json
{
  "name": "my-pack",
  "version": "1.0.0",
  "dependencies": {
    "kai": "^2.0.0",
    "agent-observability": "^1.0.0"
  },
  "peerDependencies": {
    "claude-code": "^1.0.0"
  }
}
```

**Benefits**:
- Automatic dependency installation
- Version conflict detection
- Dependency tree visualization

### Priority 2: Pack Marketplace Website

**Features**:
- Pack discovery UI
- Search and filtering
- Ratings and reviews
- Installation counts
- Cross-pack integration examples

**Tech Stack**:
- Next.js frontend
- GitHub API for pack data
- Vercel deployment

### Priority 3: Pack Upgrade System

**Problem**: No way to upgrade installed packs

**Solution**:
```bash
# Check for updates
pai-pack check-updates

# Upgrade single pack
pai-pack upgrade agent-observability

# Upgrade all packs
pai-pack upgrade-all
```

---

## Troubleshooting

### Pack Validation Fails

**Symptom**: `bun test` shows failures for README.md, INSTALL.md, or VERIFY.md

**Solution**: Check file naming (should be `README.md`, not `PACK_README.md`)

```bash
# Rename files if needed
mv PACK_README.md README.md
mv PACK_INSTALL.md INSTALL.md
mv PACK_VERIFY.md VERIFY.md
```

### src/ Directory Missing

**Symptom**: Test fails with "Pack v2.0 REQUIRES src/ directory"

**Solution**: Move code files from root to `src/`:

```bash
mkdir -p src/hooks src/tools src/config
mv *.ts src/hooks/
mv *.json src/config/
```

### Code Simplification Detected

**Symptom**: Test fails with "Code has placeholders"

**Solution**: Replace placeholders with real implementation:

```typescript
// ❌ WRONG
function myFunc() {
  // TODO: implement
  throw new Error("Not implemented");
}

// ✅ CORRECT
async function myFunc(input: string): Promise<string> {
  try {
    // Validate input
    if (!input) {
      throw new Error("Input required");
    }

    // Process
    const result = await process(input);

    // Return
    return result;
  } catch (error) {
    logger.error(`myFunc failed: ${error.message}`);
    throw error;
  }
}
```

---

## Contributing

### Adding a New Pack

1. **Copy template**: `cp -r ~/.claude/skills/.pack-template ~/.claude/skills/my-new-pack`
2. **Implement code**: Add files to `src/`
3. **Write documentation**: README.md, INSTALL.md, VERIFY.md
4. **Test validation**: `bun test tests/pack-v2-validations/`
5. **Submit PR**: Open pull request with pack

### Pack Review Checklist

- [ ] README.md, INSTALL.md, VERIFY.md present (correct naming)
- [ ] src/ directory with real code files
- [ ] No placeholders or simplified code
- [ ] Installation instructions complete
- [ ] Verification tests functional
- [ ] TDD validation passes
- [ ] TypeScript types comprehensive
- [ ] Error handling present
- [ ] No security vulnerabilities

---

## Credits

**Based on**: [Dan Miessler's PAI Pack System](https://github.com/danielmiessler/Personal_AI_Infrastructure)

**Enhancements by**: PAI Implementation Team

**Key Contributors**:
- kai-hook-system architecture
- Pack v2.0 validation tests
- agent-observability dashboard
- async-orchestration patterns

---

## Related Documentation

- [15 Founding Principles](./15_FOUNDING_PRINCIPLES.md) - Design philosophy
- [PAI Implementation Status](./PAI_IMPLEMENTATION_STATUS.md) - Current state
- [PAI Gap Analysis](./PAI_GAP_ANALYSIS.md) - Comparison with Dan Miessler's PAI

---

**Pack System v2.0 Documentation**
**Last Updated**: 2026-01-06
**Version**: 2.0
**Status**: ✅ Production
