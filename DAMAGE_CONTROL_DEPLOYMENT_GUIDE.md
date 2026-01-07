# 🛡️ Damage Control System - Deployment Guide

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2026-01-07

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Testing & Verification](#testing--verification)
6. [Customization](#customization)
7. [Troubleshooting](#troubleshooting)
8. [Performance & Monitoring](#performance--monitoring)

---

## Overview

The Damage Control System is a proactive security layer for Claude Code that intercepts and blocks dangerous operations before execution. It provides:

- **100+ Dangerous Command Patterns** - Blocks destructive bash commands
- **3-Level Path Protection** - Zero-access, read-only, no-delete file protection
- **Security Audit Trail** - JSONL logging of all security events
- **Pre-Commit Validation** - CPD integration for code quality gates
- **Real-time Interception** - PreToolUse hooks block operations before execution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code CLI                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │    PreToolUse Hooks        │
         │  (settings.json config)    │
         └────────────┬───────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌────────┐   ┌────────┐   ┌────────┐
   │  Bash  │   │  Edit  │   │ Write  │
   │  Hook  │   │  Hook  │   │  Hook  │
   └───┬────┘   └───┬────┘   └───┬────┘
       │            │            │
       └────────────┼────────────┘
                    ▼
         ┌──────────────────────┐
         │ Damage Control Engine │
         │  (TypeScript Library) │
         └──────────┬────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Patterns │ │  Path   │ │ Audit   │
   │  YAML   │ │Protection│ │  Log    │
   └─────────┘ └─────────┘ └─────────┘
```

### Key Features

| Feature | Description | Performance |
|---------|-------------|-------------|
| **Command Blocking** | Intercepts dangerous bash patterns | ~10-15ms overhead |
| **Path Protection** | Enforces file access policies | ~5-10ms overhead |
| **Security Audit** | JSONL logging with timestamps | ~2-5ms overhead |
| **CPD Validation** | Pre-commit file scanning | ~200ms overhead |
| **Pattern Matching** | Regex-based detection | ~1-3ms per pattern |

---

## Prerequisites

### Required Software

1. **Claude Code CLI** - Latest version
   ```bash
   # Verify installation
   claude --version
   ```

2. **Bun Runtime** - For TypeScript hook execution
   ```bash
   # Install Bun (Windows)
   powershell -c "irm bun.sh/install.ps1 | iex"

   # Verify installation
   bun --version
   ```

3. **Git** - For version control
   ```bash
   git --version
   ```

### System Requirements

- **OS**: Windows, macOS, or Linux
- **Node.js**: v18+ (for TypeScript compilation)
- **Disk Space**: ~10MB for damage control files
- **Memory**: ~2MB runtime overhead

### Permissions

- Write access to `~/.claude/` directory
- Ability to modify Claude Code settings.json
- Execute permissions for hook scripts

---

## Installation

### Step 1: Clone or Download Files

**Option A: From PAI Repository**
```bash
# Clone the full PAI repository
git clone https://github.com/Heinvv10/PAI.git
cd PAI
```

**Option B: Manual File Copy**

Create the required directory structure:
```bash
# Create directories
mkdir -p ~/.claude/hooks/damage-control
mkdir -p ~/.claude/hooks/lib
mkdir -p ~/.claude/skills/damage-control
```

Copy the following files to your system:

```
~/.claude/
├── hooks/
│   ├── damage-control/
│   │   ├── bash-tool-damage-control.ts
│   │   ├── edit-tool-damage-control.ts
│   │   └── write-tool-damage-control.ts
│   └── lib/
│       ├── damage-control.ts
│       ├── damage-control.test.ts
│       └── damage-control-validator.ts
└── skills/
    └── damage-control/
        └── patterns.yaml
```

### Step 2: Install Dependencies

```bash
# Install TypeScript dependencies
cd ~/.claude/hooks/lib
bun install
```

### Step 3: Copy Pattern Configuration

```bash
# Copy patterns to global location
cp ~/.claude/hooks/damage-control/patterns.yaml \
   ~/.claude/skills/damage-control/patterns.yaml
```

### Step 4: Register Hooks in Settings

Edit `~/.claude/settings.json` and add the following to the `PreToolUse` section:

**Windows:**
```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bun.exe C:/Users/YOUR_USERNAME/.claude/hooks/damage-control/bash-tool-damage-control.ts"
        }
      ]
    },
    {
      "matcher": "Edit",
      "hooks": [
        {
          "type": "command",
          "command": "bun.exe C:/Users/YOUR_USERNAME/.claude/hooks/damage-control/edit-tool-damage-control.ts"
        }
      ]
    },
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "bun.exe C:/Users/YOUR_USERNAME/.claude/hooks/damage-control/write-tool-damage-control.ts"
        }
      ]
    }
  ]
}
```

**macOS/Linux:**
```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts"
        }
      ]
    },
    {
      "matcher": "Edit",
      "hooks": [
        {
          "type": "command",
          "command": "bun ~/.claude/hooks/damage-control/edit-tool-damage-control.ts"
        }
      ]
    },
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "bun ~/.claude/hooks/damage-control/write-tool-damage-control.ts"
        }
      ]
    }
  ]
}
```

**Important**: Replace `YOUR_USERNAME` with your actual username.

### Step 5: Restart Claude Code

```bash
# Exit Claude Code completely
exit

# Restart Claude Code
claude
```

Hooks are loaded at startup, so restart is required for changes to take effect.

---

## Configuration

### Pattern Configuration (patterns.yaml)

The `patterns.yaml` file contains all dangerous command patterns and path protection rules.

**Location**: `~/.claude/skills/damage-control/patterns.yaml`

#### Configuration Hierarchy

1. **Global** - `~/.claude/skills/damage-control/patterns.yaml` (shared across all projects)
2. **Project** - `<project>/.claude/hooks/damage-control/patterns.yaml` (project-specific)
3. **Personal** - `<project>/.claude/hooks/damage-control/patterns.local.yaml` (local overrides)

The system merges configurations in order: Global → Project → Personal

### Pattern Types

#### 1. Dangerous Commands (BLOCK immediately)

```yaml
dangerousPatterns:
  - pattern: "\\brm\\s+(-[^\\s]*)*-[rRf]"
    reason: "rm with recursive or force flags"
    severity: "high"
    category: "file_operations"
```

**Fields**:
- `pattern` - Regex pattern to match
- `reason` - User-facing explanation
- `severity` - `critical`, `high`, `medium`, or `low`
- `category` - Grouping for reporting

#### 2. Ask Patterns (Require confirmation)

```yaml
askPatterns:
  - pattern: "\\bgit\\s+stash\\s+drop\\b"
    reason: "git stash drop (permanent data loss)"
    severity: "high"
    category: "git_operations"
```

**Behavior**: Triggers Claude Code confirmation dialog before execution.

#### 3. Path Protection

```yaml
pathProtection:
  # Zero-access paths (no read, write, edit, or delete)
  zeroAccessPaths:
    - ".env"
    - "*.key"
    - "*.pem"
    - ".env.*"
    - "credentials.json"
    - "secrets.yaml"

  # Read-only paths (read allowed, but no write/edit/delete)
  readOnlyPaths:
    - ".git/config"
    - ".gitignore"
    - "package-lock.json"
    - "bun.lockb"

  # No-delete paths (read/write/edit allowed, but no delete)
  noDeletePaths:
    - "src/"
    - "*.ts"
    - "*.tsx"
    - "*.js"
    - "*.jsx"
```

**Glob Patterns Supported**:
- `*` - Match any characters except `/`
- `**` - Match any characters including `/`
- `?` - Match single character
- `[abc]` - Match any character in set
- `{a,b}` - Match either pattern

### Security Audit Log

**Location**: `~/.claude/security-audit.jsonl`

**Format**: JSON Lines (one JSON object per line)

```json
{
  "timestamp": "2026-01-07T04:16:01.573Z",
  "session_id": "unknown",
  "event_type": "BLOCKED",
  "severity": "high",
  "reason": "rm with recursive or force flags",
  "pattern": "\\brm\\s+(-[^\\s]*)*-[rRf]",
  "context": "rm -rf /tmp/test-damage-control"
}
```

**Event Types**:
- `BLOCKED` - Operation prevented
- `ASK` - Confirmation required
- `ALLOWED` - Operation permitted (if logging enabled)

### CPD Validator Integration

Add to your `package.json` or git hooks:

```json
{
  "scripts": {
    "pre-commit": "bun ~/.claude/hooks/lib/damage-control-validator.ts"
  }
}
```

Or use with Git hooks (`.git/hooks/pre-commit`):

```bash
#!/bin/bash
bun ~/.claude/hooks/lib/damage-control-validator.ts
exit $?
```

---

## Testing & Verification

### Unit Tests

Run the comprehensive test suite:

```bash
# Run all tests
bun test ~/.claude/hooks/lib/damage-control.test.ts

# Expected output:
# ✓ 33 tests passed (1,011ms)
```

### Manual Hook Testing

Test hooks directly with JSON input:

```bash
# Test dangerous bash command (should block)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
# Expected: 🚫 SECURITY: rm with recursive or force flags (exit code 2)

# Test protected file edit (should block)
echo '{"tool_name":"Edit","tool_input":{"file_path":".env","old_string":"","new_string":"test"}}' | \
  bun ~/.claude/hooks/damage-control/edit-tool-damage-control.ts
# Expected: 🚫 SECURITY: Zero-access path: .env (exit code 2)

# Test safe command (should allow)
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
# Expected: (no output, exit code 0)
```

### Live Workflow Testing

After restarting Claude Code, test in actual usage:

```bash
# Start Claude Code
claude

# In Claude Code session, try dangerous commands:
# These should be BLOCKED by hooks
```

**Test 1: Dangerous Command**
```
> rm -rf /tmp/test
Expected: PreToolUse:Bash hook error: 🚫 SECURITY: rm with recursive or force flags
```

**Test 2: Protected File Edit**
```
> Edit .env file
Expected: PreToolUse:Edit hook error: 🚫 SECURITY: Zero-access path: .env
```

**Test 3: Protected File Write**
```
> Write to package-lock.json
Expected: PreToolUse:Write hook error: 🚫 SECURITY: Read-only path: package-lock.json
```

### Verify Audit Logging

```bash
# Check recent security events
tail -n 10 ~/.claude/security-audit.jsonl

# Count blocked operations today
grep "$(date +%Y-%m-%d)" ~/.claude/security-audit.jsonl | wc -l

# View all critical events
grep '"severity":"critical"' ~/.claude/security-audit.jsonl
```

### Performance Benchmarking

```bash
# Measure hook overhead
time echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts

# Expected: ~10-15ms total time
```

---

## Customization

### Adding Custom Patterns

**Scenario**: Block a specific command for your environment

1. Create personal overrides file:
```bash
touch <project>/.claude/hooks/damage-control/patterns.local.yaml
```

2. Add custom pattern:
```yaml
dangerousPatterns:
  - pattern: "\\bmycustomcmd\\s+--dangerous"
    reason: "mycustomcmd with dangerous flag"
    severity: "high"
    category: "custom"
```

3. No restart required - patterns are loaded per-command

### Whitelisting Specific Commands

**Scenario**: Allow a normally-blocked command in your project

Use the `allowedExceptions` feature:

```yaml
# In patterns.local.yaml
allowedExceptions:
  - pattern: "\\brm\\s+-rf\\s+/tmp/safe-directory"
    reason: "Safe temp directory cleanup"
```

### Custom Path Protection

**Scenario**: Protect project-specific files

```yaml
# In project patterns.yaml
pathProtection:
  zeroAccessPaths:
    - "config/production.json"
    - "secrets/"
  readOnlyPaths:
    - "CHANGELOG.md"
    - "docs/"
  noDeletePaths:
    - "core/"
    - "*.config.ts"
```

### Integration with External Tools

**Scenario**: Send alerts to monitoring system

Modify hook scripts to call external APIs:

```typescript
// In bash-tool-damage-control.ts
if (result.blocked) {
  // Send alert to monitoring system
  await fetch('https://your-monitor.com/alert', {
    method: 'POST',
    body: JSON.stringify({
      severity: 'critical',
      command: command,
      reason: result.reason
    })
  });

  console.error(`🚫 SECURITY: ${result.reason}`);
  process.exit(2);
}
```

### Disable Specific Hooks

**Scenario**: Temporarily disable path protection

Comment out the hook in `settings.json`:

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [...]
    }
    // Temporarily disabled:
    // {
    //   "matcher": "Edit",
    //   "hooks": [...]
    // }
  ]
}
```

Restart Claude Code for changes to take effect.

---

## Troubleshooting

### Issue: Hooks Not Executing

**Symptoms**: Dangerous commands execute without blocking

**Solutions**:

1. **Verify hooks are registered**:
```bash
# Check settings.json contains hook configuration
cat ~/.claude/settings.json | grep -A5 "PreToolUse"
```

2. **Restart Claude Code**:
```bash
# Hooks load at startup
exit
claude
```

3. **Test hooks manually**:
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
```

4. **Check Bun installation**:
```bash
bun --version
# Should output version number
```

### Issue: Pattern Not Matching

**Symptoms**: Specific command not blocked despite pattern

**Solutions**:

1. **Test regex pattern**:
```bash
# Use regex tester
echo "rm -rf /tmp" | grep -E "\brm\s+(-[^\s]*)*-[rRf]"
```

2. **Check pattern syntax**:
```yaml
# Ensure proper escaping in YAML
pattern: "\\brm\\s+(-[^\\s]*)*-[rRf]"  # Correct
pattern: "\brm\s+(-[^\s]*)*-[rRf]"    # Wrong (single backslash)
```

3. **Verify pattern file loaded**:
```bash
# Check which patterns file is being used
ls -la ~/.claude/skills/damage-control/patterns.yaml
```

### Issue: Path Protection Not Working

**Symptoms**: Protected files can be edited/written

**Solutions**:

1. **Verify pathProtection section exists**:
```bash
grep -A10 "pathProtection:" ~/.claude/skills/damage-control/patterns.yaml
```

2. **Check glob pattern matching**:
```bash
# Test if file matches glob pattern
# .env.test should match .env*
```

3. **Ensure global patterns copied**:
```bash
cp ~/.claude/hooks/damage-control/patterns.yaml \
   ~/.claude/skills/damage-control/patterns.yaml
```

### Issue: High Performance Overhead

**Symptoms**: Noticeable delay before commands execute

**Solutions**:

1. **Benchmark hook execution**:
```bash
time echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
```

2. **Optimize pattern count**:
- Remove unnecessary patterns from patterns.yaml
- Combine similar patterns with alternation: `(pattern1|pattern2)`

3. **Check audit log performance**:
```bash
# Disable audit logging temporarily to test
# Comment out auditLogger.log() calls in damage-control.ts
```

### Issue: Audit Log Not Writing

**Symptoms**: No entries in security-audit.jsonl

**Solutions**:

1. **Verify file permissions**:
```bash
touch ~/.claude/security-audit.jsonl
chmod 644 ~/.claude/security-audit.jsonl
```

2. **Check directory exists**:
```bash
mkdir -p ~/.claude
```

3. **Test manual write**:
```bash
echo '{"test":"entry"}' >> ~/.claude/security-audit.jsonl
tail -n 1 ~/.claude/security-audit.jsonl
```

### Issue: False Positives

**Symptoms**: Safe commands are blocked incorrectly

**Solutions**:

1. **Add to allowedExceptions**:
```yaml
allowedExceptions:
  - pattern: "<safe command regex>"
    reason: "Safe use case explanation"
```

2. **Refine pattern specificity**:
```yaml
# Too broad:
pattern: "\\brm\\b"  # Blocks all rm usage

# More specific:
pattern: "\\brm\\s+(-[^\\s]*)*-[rRf]"  # Only blocks rm with -r or -f
```

3. **Use project-local overrides**:
```bash
# Create project-specific exceptions
touch .claude/hooks/damage-control/patterns.local.yaml
```

### Issue: Hooks Execute But Don't Block

**Symptoms**: See hook output but command still runs

**Solutions**:

1. **Check exit codes**:
```bash
# Hook must exit with code 2 to block
# Verify hook script has: process.exit(2)
```

2. **Test exit code manually**:
```bash
bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
echo $?  # Should be 2 for blocked, 0 for allowed
```

3. **Check error output format**:
```typescript
// Correct format:
console.error(`🚫 SECURITY: ${result.reason}`);
process.exit(2);

// Wrong format (stdout instead of stderr):
console.log(`🚫 SECURITY: ${result.reason}`);  // Won't block
```

---

## Performance & Monitoring

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Per-command overhead | <50ms | ~10-15ms | ✅ |
| Per-commit overhead | <500ms | ~200ms | ✅ |
| Memory overhead | <5MB | ~1.5MB | ✅ |
| Pattern match time | <5ms | ~1-3ms | ✅ |
| Audit log write | <10ms | ~2-5ms | ✅ |

### Monitoring Commands

```bash
# View recent security events
tail -f ~/.claude/security-audit.jsonl

# Count blocks by severity
grep '"severity":"critical"' ~/.claude/security-audit.jsonl | wc -l
grep '"severity":"high"' ~/.claude/security-audit.jsonl | wc -l

# Count blocks by category
grep '"category":"file_operations"' ~/.claude/security-audit.jsonl | wc -l
grep '"category":"git_operations"' ~/.claude/security-audit.jsonl | wc -l

# View blocked commands timeline
grep BLOCKED ~/.claude/security-audit.jsonl | \
  jq -r '[.timestamp, .reason, .context] | @tsv'
```

### Dashboard (Optional)

Create a simple monitoring dashboard:

```bash
# Create dashboard script
cat > ~/.claude/damage-control-dashboard.sh << 'EOF'
#!/bin/bash
echo "=== Damage Control Dashboard ==="
echo ""
echo "Total Events: $(wc -l < ~/.claude/security-audit.jsonl)"
echo "Blocked Today: $(grep "$(date +%Y-%m-%d)" ~/.claude/security-audit.jsonl | wc -l)"
echo ""
echo "By Severity:"
echo "  Critical: $(grep '"severity":"critical"' ~/.claude/security-audit.jsonl | wc -l)"
echo "  High: $(grep '"severity":"high"' ~/.claude/security-audit.jsonl | wc -l)"
echo "  Medium: $(grep '"severity":"medium"' ~/.claude/security-audit.jsonl | wc -l)"
echo ""
echo "Recent Events:"
tail -n 5 ~/.claude/security-audit.jsonl | jq -r '[.timestamp, .severity, .reason] | @tsv'
EOF

chmod +x ~/.claude/damage-control-dashboard.sh

# Run dashboard
~/.claude/damage-control-dashboard.sh
```

### Log Rotation

Prevent audit log from growing too large:

```bash
# Create log rotation script
cat > ~/.claude/rotate-audit-log.sh << 'EOF'
#!/bin/bash
LOG_FILE="$HOME/.claude/security-audit.jsonl"
MAX_SIZE=10485760  # 10MB

if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt $MAX_SIZE ]; then
  mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d-%H%M%S)"
  touch "$LOG_FILE"
  echo "Rotated audit log"
fi
EOF

chmod +x ~/.claude/rotate-audit-log.sh

# Add to crontab (run daily)
crontab -e
# Add: 0 0 * * * ~/.claude/rotate-audit-log.sh
```

### Performance Tuning

**Reduce Pattern Count**:
```yaml
# Instead of multiple similar patterns:
- pattern: "\\brm\\s+-rf\\b"
- pattern: "\\brm\\s+-r\\b"
- pattern: "\\brm\\s+-f\\b"

# Use single combined pattern:
- pattern: "\\brm\\s+(-[^\\s]*)*-[rRf]"
```

**Optimize Glob Matching**:
```yaml
# Specific patterns match faster
zeroAccessPaths:
  - ".env"              # Fast: exact match
  - "secrets/*.key"     # Fast: specific directory
  - "**/*.secret"       # Slower: recursive search
```

**Disable Audit Logging (if needed)**:
```typescript
// In damage-control.ts, comment out:
// await this.auditLogger.log(...);
```

---

## Support & Contributing

### Getting Help

- **GitHub Issues**: https://github.com/Heinvv10/PAI/issues
- **Documentation**: See `DAMAGE_CONTROL_TESTING_RESULTS.md` for detailed test results
- **Discord**: [Your Discord Server]

### Contributing

Contributions welcome! To add new patterns:

1. Test pattern locally:
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"your-test-command"}}' | \
  bun ~/.claude/hooks/damage-control/bash-tool-damage-control.ts
```

2. Add to patterns.yaml with proper metadata:
```yaml
- pattern: "<your-regex>"
  reason: "<user-friendly explanation>"
  severity: "high|medium|low"
  category: "<category-name>"
```

3. Add test case to damage-control.test.ts:
```typescript
test('should block your-dangerous-command', async () => {
  const result = await engine.validateBashCommand('your-dangerous-command');
  expect(result.blocked).toBe(true);
  expect(result.reason).toContain('your expected reason');
});
```

4. Submit PR with test results

---

## License

MIT License - See LICENSE file for details

---

## Changelog

### v1.0.0 (2026-01-07)
- ✅ Initial production release
- ✅ 100+ dangerous command patterns
- ✅ 3-level path protection system
- ✅ Security audit logging (JSONL)
- ✅ CPD pre-commit validation
- ✅ Comprehensive test suite (33 tests)
- ✅ Live workflow testing verified
- ✅ Performance benchmarks validated

---

**Documentation Version**: 1.0.0
**System Status**: ✅ Production Ready
**Last Tested**: 2026-01-07
