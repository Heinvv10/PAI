# PAI Transfer Checklist - New PC Setup

## Quick Setup Guide

### 🚀 Fast Track (10 minutes)

1. **Clone repo on new PC**
   ```powershell
   cd C:\Jarvis\AI Workspace
   git clone [YOUR_REPO_URL]
   ```

2. **Run automated setup**
   ```powershell
   cd Personal_AI_Infrastructure
   .\setup-new-pc.ps1
   ```

3. **Set API tokens**
   ```powershell
   [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token_here", "User")
   [System.Environment]::SetEnvironmentVariable("HOSTINGER_API_TOKEN", "your_token_here", "User")
   ```

4. **Test activation**
   ```bash
   claude
   # Type: RYR
   ```

---

## 📋 Pre-Transfer Checklist (Old PC)

### Files to Commit to GitHub

- [ ] `C:\Jarvis\CLAUDE.md` → Commit to repo root
- [ ] `C:\Jarvis\*.py` → Command scripts (RYR, VERITAS, ARCHON, etc.)
- [ ] `~/.claude/settings.json` → **Remove sensitive tokens first!**
- [ ] `~/.claude/skills/*` → All skill directories
- [ ] `~/.claude/protocols/*` → All protocol files
- [ ] `~/.claude/hooks/*` → Hook scripts
- [ ] `~/.claude/commands/*` → Slash commands
- [ ] Any project-specific CLAUDE.md files

### Sensitive Data to Handle Separately

- [ ] API tokens (GitHub, Hostinger, etc.) → Store in password manager
- [ ] `~/.claude/memories/*` → Optional: Export if you want history
- [ ] SSH keys → Copy separately or regenerate
- [ ] `.env` files → Store credentials separately

### What NOT to transfer

- ❌ `node_modules/` → Will reinstall automatically
- ❌ `~/.claude/runtime-state/*` → Session-specific, will regenerate
- ❌ `~/.claude/shell-snapshots/*` → Session-specific
- ❌ `~/.claude/history.jsonl` → Session history, not needed
- ❌ `~/.claude/cache/*` → Will rebuild

---

## 📦 Post-Download Checklist (New PC)

### Immediate Setup

- [ ] Verify repo cloned to `C:\Jarvis\AI Workspace\`
- [ ] Run `.\setup-new-pc.ps1` from repo directory
- [ ] Set environment variables (GITHUB_TOKEN, etc.)
- [ ] Restart PowerShell/terminal

### Verification Tests

- [ ] Test 1: Global trigger works
  ```bash
  claude
  # Type: RYR
  # Expected: Rules loaded message
  ```

- [ ] Test 2: Skills accessible
  ```bash
  # In Claude: "Use kai skill" or check available skills
  ```

- [ ] Test 3: MCP servers working
  ```bash
  # In Claude: "Search GitHub for repositories"
  # Should use GitHub MCP
  ```

- [ ] Test 4: Memory persistence
  ```bash
  # In Claude: "Remember I'm on new PC: [HOSTNAME]"
  # Check: ~/.claude/memories/current.md updated
  ```

### Optional: Advanced Setup

- [ ] Import old memories (if exported)
  - Copy exported `memories/` files to `~/.claude/memories/`

- [ ] Customize for new PC
  - Update PC name in `~/.claude/memories/current.md`
  - Update any hardcoded paths in scripts

- [ ] Test all protocols
  - NLNH: Test truth-first responses
  - DGTS: Test validation on code changes
  - Zero Tolerance: Test pre-commit hooks

---

## 🔍 Critical File Manifest

### Must Have (System Won't Work Without)

```
Priority 1: Core Activation
├── C:\Jarvis\CLAUDE.md                    # Global trigger
└── ~/.claude\settings.json                # Configuration

Priority 2: Functionality
├── ~/.claude\skills\                      # PAI capabilities
│   ├── kai\
│   ├── fabric\
│   └── [other skills]\
└── ~/.claude\protocols\                   # Quality standards
    ├── nlnh-protocol.md
    ├── dgts-validation.md
    └── zero-tolerance-quality.md
```

### Optional but Recommended

```
Automation & Enhancement
├── C:\Jarvis\RYR_COMMAND.py              # Command triggers
├── C:\Jarvis\VERITAS_COMMAND.py
├── C:\Jarvis\ARCHON_GLOBAL_COMMAND.py
├── ~/.claude\hooks\                       # Automation
└── ~/.claude\commands\                    # Slash commands
```

### Generated/Recreatable (Don't Transfer)

```
Auto-Generated
├── ~/.claude\runtime-state\
├── ~/.claude\shell-snapshots\
├── ~/.claude\cache\
├── ~/.claude\history.jsonl
└── node_modules\
```

---

## 🎯 Success Criteria

PAI is fully activated when ALL these work:

### Level 1: Basic Activation ✅
- [ ] Type "RYR" → Rules load
- [ ] Type "Veritas" → Truth mode activates
- [ ] Type "Archon" → Coding assistant activates

### Level 2: Skills & Tools ✅
- [ ] Skills are accessible and load correctly
- [ ] MCP servers respond (GitHub, Memory, etc.)
- [ ] Settings.json properly configured

### Level 3: Advanced Features ✅
- [ ] Hooks execute on events (if configured)
- [ ] Memory persists across sessions
- [ ] Protocols enforce quality standards
- [ ] Slash commands work (if configured)

---

## ⚠️ Common Issues & Solutions

### Issue: "RYR" doesn't trigger rules

**Solutions:**
1. Check `C:\Jarvis\CLAUDE.md` exists and is readable
2. Verify Claude Desktop config has globalInstructions:
   ```json
   {
     "globalInstructions": {
       "instructionsPath": "C:\\Jarvis\\CLAUDE.md"
     }
   }
   ```
3. Restart Claude Code CLI

### Issue: Skills not found

**Solutions:**
1. Verify `~/.claude/skills/` has skill directories
2. Each skill needs `skill.json` or `skill.yaml`
3. Check settings.json points to correct skill paths

### Issue: MCP servers fail

**Solutions:**
1. Check environment variables are set:
   ```powershell
   [System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
   ```
2. Restart terminal after setting env vars
3. Test MCP manually:
   ```bash
   npx -y @modelcontextprotocol/server-github
   ```

### Issue: Python commands don't run

**Solutions:**
1. Verify Python installed: `python --version`
2. Check scripts in `C:\Jarvis\`:
   ```powershell
   ls C:\Jarvis\*.py
   ```
3. Test manually:
   ```bash
   python C:\Jarvis\RYR_COMMAND.py
   ```

---

## 📞 Quick Reference

### Key Paths (Windows)

```
Global Trigger:     C:\Jarvis\CLAUDE.md
Command Scripts:    C:\Jarvis\*.py
User Config:        C:\Users\[USER]\.claude\
Settings:           C:\Users\[USER]\.claude\settings.json
Skills:             C:\Users\[USER]\.claude\skills\
Protocols:          C:\Users\[USER]\.claude\protocols\
Memories:           C:\Users\[USER]\.claude\memories\
Claude Desktop:     C:\Users\[USER]\AppData\Roaming\Claude\
```

### PAI Trigger Commands

```
RYR                → Remember Your Rules (load all)
Veritas            → Truth-enforcing coding mode
Archon             → Universal coding assistant
gfg                → Go For Gold (autonomous mode)
gfg stop           → Stop autonomous mode
```

### Essential Environment Variables

```powershell
# View
[System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
[System.Environment]::GetEnvironmentVariable("HOSTINGER_API_TOKEN", "User")

# Set
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token", "User")
[System.Environment]::SetEnvironmentVariable("HOSTINGER_API_TOKEN", "your_token", "User")
```

---

## 🎓 Understanding PAI Activation

### How Global Activation Works

1. **Claude Code starts** → Reads `claude_desktop_config.json`
2. **Loads global instructions** → From `C:\Jarvis\CLAUDE.md`
3. **Loads user config** → From `~/.claude/settings.json`
4. **Activates MCP servers** → Based on settings.json
5. **Loads skills** → From `~/.claude/skills/`
6. **Triggers available** → RYR, Veritas, Archon work in ANY project

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│ Claude Code CLI                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Global Context                          │ │
│ │ ← C:\Jarvis\CLAUDE.md                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ User Configuration                      │ │
│ │ ← ~/.claude/settings.json               │ │
│ │   ├── MCP Servers                       │ │
│ │   ├── Skills Paths                      │ │
│ │   └── Hooks & Commands                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Skills & Protocols                      │ │
│ │ ← ~/.claude/skills/                     │ │
│ │ ← ~/.claude/protocols/                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Memory & State                          │ │
│ │ ← ~/.claude/memories/                   │ │
│ │ ← ~/.claude/runtime-state/              │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
         ↓
   Works in ANY project!
```

---

## 📊 Transfer Time Estimates

- **Fast Setup** (automated): ~10 minutes
- **Manual Setup** (following guide): ~30 minutes
- **Full Setup + Testing**: ~1 hour
- **Advanced Configuration**: +30 minutes

---

**Version**: 1.0
**Last Updated**: 2025-12-17
**PAI Version**: 2.0 (Context Engineered)

*Quick reference for transferring PAI to new PC*
