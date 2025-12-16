# Context Engineering Migration Guide

**Purpose**: Migrate from monolithic CLAUDE.md to progressive disclosure system

**Expected Results**:
- ✅ 10,000+ token savings per session
- ✅ Faster Claude Code startup
- ✅ Better attention on actual work
- ✅ Persistent memory across sessions
- ✅ On-demand protocol loading

---

## What Was Implemented

### ✅ 1. Progressive Disclosure Protocol Files
**Location**: `~/.claude/protocols/`

Created 7 protocol files:
- `dgts-validation.md` - Anti-gaming enforcement
- `nlnh-protocol.md` - Truth enforcement
- `doc-driven-tdd.md` - Test-driven development
- `playwright-testing.md` - E2E testing
- `antihall-validator.md` - Hallucination prevention
- `zero-tolerance-quality.md` - Quality gates
- `forbidden-commands.md` - Data loss prevention

**Benefit**: Load only when needed instead of all upfront

### ✅ 2. Structured Memory System
**Location**: `~/.claude/memories/`

Created memory files:
- `current.md` - Active session state
- `archive.md` - Historical context
- `project-index.md` - Cross-project tracker
- `README.md` - Documentation

**Benefit**: Persistent context across sessions

### ✅ 3. Memory Maintenance Hook
**Location**: `~/.claude/hooks/memory-maintenance-hook.ts`

**Purpose**: Auto-updates memory at end of each conversation turn

**Benefit**: Consistent memory maintenance without manual effort

### ✅ 4. Smart Context Loader Hook
**Location**: `~/.claude/hooks/smart-context-loader.ts`

**Purpose**: Analyzes user prompt and suggests relevant protocols

**Benefit**: Intelligent context loading based on task type

### ✅ 5. Streamlined CLAUDE.md
**Location**: `C:\Jarvis\CLAUDE-STREAMLINED.md`

**Size**: ~300 lines (down from 988 lines)

**Benefit**: 70% reduction in upfront context load

---

## Migration Steps

### Step 1: Backup Original CLAUDE.md

```bash
# Create backup
cp "C:\Jarvis\CLAUDE.md" "C:\Jarvis\CLAUDE-BACKUP-$(date +%Y%m%d).md"

# Verify backup
ls -lh "C:\Jarvis\CLAUDE-BACKUP-"*
```

### Step 2: Replace CLAUDE.md

```bash
# Replace with streamlined version
cp "C:\Jarvis\CLAUDE-STREAMLINED.md" "C:\Jarvis\CLAUDE.md"

# Verify
wc -l "C:\Jarvis\CLAUDE.md"
# Should show ~300 lines instead of 988
```

### Step 3: Update settings.json

**Location**: `~/.claude/settings.json`

Add the new hooks to your settings:

```json
{
  "hooks": {
    "SessionStart": [
      "~/.claude/hooks/initialize-pai-session.ts"
    ],
    "UserPromptSubmit": [
      "~/.claude/hooks/smart-context-loader.ts"
    ],
    "Stop": [
      "~/.claude/hooks/stop-hook.ts",
      "~/.claude/hooks/memory-maintenance-hook.ts"
    ]
  }
}
```

**Hook execution order**:
1. **SessionStart**: `initialize-pai-session.ts` (sets up session)
2. **UserPromptSubmit**: `smart-context-loader.ts` (suggests protocols)
3. **Stop**: `stop-hook.ts` (voice/tab title) → `memory-maintenance-hook.ts` (updates memory)

### Step 4: Make Hooks Executable

```bash
# Windows (PowerShell)
# TypeScript files don't need +x on Windows, but verify they exist:
Get-ChildItem ~/.claude/hooks/*.ts

# Linux/Mac
chmod +x ~/.claude/hooks/memory-maintenance-hook.ts
chmod +x ~/.claude/hooks/smart-context-loader.ts
```

### Step 5: Test the System

**Test 1: Protocol Suggestion**
```
Prompt: "Help me validate my code quality"
Expected: Smart context loader suggests zero-tolerance-quality.md and dgts-validation.md
```

**Test 2: Memory Update**
```
Do any task, then check:
cat ~/.claude/memories/current.md
Expected: Should show what you just accomplished
```

**Test 3: Context Savings**
```
Simple prompt: "What time is it?"
Expected: No protocols loaded, minimal context usage
```

---

## Verification Checklist

- [ ] Backup of original CLAUDE.md created
- [ ] New streamlined CLAUDE.md in place (check line count)
- [ ] All protocol files exist in `~/.claude/protocols/`
- [ ] All memory files exist in `~/.claude/memories/`
- [ ] Hooks added to settings.json
- [ ] Hooks are executable (or exist on Windows)
- [ ] Test session shows protocol suggestions
- [ ] Test session updates memory files
- [ ] Simple queries don't load all protocols

---

## Rollback Plan

If something goes wrong:

### Quick Rollback
```bash
# Restore original CLAUDE.md
cp "C:\Jarvis\CLAUDE-BACKUP-YYYYMMDD.md" "C:\Jarvis\CLAUDE.md"

# Remove hooks from settings.json
# Edit ~/.claude/settings.json and remove new hooks
```

### Keep Improvements, Just Disable Hooks
```json
{
  "hooks": {
    "SessionStart": [
      "~/.claude/hooks/initialize-pai-session.ts"
    ],
    "UserPromptSubmit": [
      // "~/.claude/hooks/smart-context-loader.ts"  // Disabled
    ],
    "Stop": [
      "~/.claude/hooks/stop-hook.ts"
      // "~/.claude/hooks/memory-maintenance-hook.ts"  // Disabled
    ]
  }
}
```

---

## Expected Behavior After Migration

### Before (Old System)
```
Session start:
- Load 988-line CLAUDE.md (~12,000 tokens)
- All protocols loaded upfront
- No memory system
- Total context: ~15,000 tokens

Simple query: "What time is it?"
- Still has 15,000 tokens of protocol context
- Wasted: 14,900 tokens
```

### After (New System)
```
Session start:
- Load 300-line CLAUDE.md (~3,000 tokens)
- No protocols loaded yet
- Memory system available
- Total context: ~3,500 tokens

Simple query: "What time is it?"
- No protocols loaded
- Memory checked but not needed
- Total context: ~3,500 tokens
- Saved: ~11,500 tokens

Complex task: "Validate code quality"
- Smart loader suggests relevant protocols
- Load only zero-tolerance-quality.md + dgts-validation.md (~2,000 tokens)
- Total context: ~5,500 tokens
- Saved: ~9,500 tokens
```

---

## Token Savings Calculator

| Task Type | Old System | New System | Savings |
|-----------|-----------|------------|---------|
| Simple query | 15,000 | 3,500 | **11,500** ✅ |
| Code validation | 15,000 | 5,500 | **9,500** ✅ |
| UI testing | 15,000 | 6,000 | **9,000** ✅ |
| Feature development | 15,000 | 7,000 | **8,000** ✅ |

**Average savings**: **~10,000 tokens per session** = More room for actual work!

---

## Troubleshooting

### Hook Not Running
**Symptom**: No protocol suggestions or memory updates

**Fix**:
1. Check settings.json hook paths are correct
2. Verify hooks exist: `ls -la ~/.claude/hooks/`
3. Check hook output: Look for `🧠 SMART CONTEXT LOADER` or `💾 Memory maintenance` messages
4. Restart Claude Code

### Memory Not Updating
**Symptom**: `current.md` stays empty

**Fix**:
1. Check `memory-maintenance-hook.ts` is in Stop hooks
2. Verify memory files exist: `ls -la ~/.claude/memories/`
3. Manually test: Complete a task and check if current.md updates

### Protocols Not Loading
**Symptom**: Can't find protocol files

**Fix**:
1. Verify protocol files exist: `ls -la ~/.claude/protocols/`
2. Check paths in smart-context-loader.ts are correct
3. Manually read a protocol to test: Use Read tool on protocol path

---

## Support

If you encounter issues:
1. Check the rollback plan above
2. Review hook logs in terminal
3. Test hooks individually
4. Restore backup CLAUDE.md if needed

---

## Next Steps After Migration

1. **Monitor token usage** - Compare before/after context sizes
2. **Customize protocols** - Edit protocol files for your workflow
3. **Enhance memory system** - Add project-specific memory files
4. **Create custom hooks** - Build on this foundation
5. **Share learnings** - Document what works for you

---

**Migration complete!** 🎉

You now have a context-engineered PAI system that saves ~10k tokens per session!
