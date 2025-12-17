# PAI New PC Setup Guide

## Overview
Complete setup instructions for activating your Personal AI Infrastructure (PAI) system on a new PC.

---

## Prerequisites

- [ ] Windows PC with admin access
- [ ] Python installed (for command scripts)
- [ ] Node.js/npm installed (for MCP servers)
- [ ] Claude Code CLI installed
- [ ] GitHub access configured
- [ ] API tokens ready (GitHub, Hostinger, etc.)

---

## Step 1: Create Directory Structure

### Global Jarvis Directory
```powershell
# Create main Jarvis directory
New-Item -Path "C:\Jarvis" -ItemType Directory -Force

# Create subdirectories
New-Item -Path "C:\Jarvis\AI Workspace" -ItemType Directory -Force
```

### User Claude Directory
```powershell
# Create .claude directory in user home
New-Item -Path "$env:USERPROFILE\.claude" -ItemType Directory -Force

# Create subdirectories
$directories = @(
    "skills",
    "protocols",
    "memories",
    "hooks",
    "commands",
    "session-env",
    "runtime-state"
)

foreach ($dir in $directories) {
    New-Item -Path "$env:USERPROFILE\.claude\$dir" -ItemType Directory -Force
}
```

---

## Step 2: Clone GitHub Repositories

### Option A: If you have a single PAI repo
```bash
cd C:\Jarvis\AI Workspace
git clone https://github.com/[YOUR_USERNAME]/Personal_AI_Infrastructure.git
```

### Option B: If you have separate repos
```bash
cd C:\Jarvis\AI Workspace
git clone [YOUR_PAI_REPO_URL]
git clone [YOUR_SKILLS_REPO_URL]
git clone [YOUR_PROTOCOLS_REPO_URL]
```

---

## Step 3: Copy Core Files

### A. Global Trigger File
```powershell
# Copy CLAUDE.md to C:\Jarvis\
Copy-Item "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure\CLAUDE.md" -Destination "C:\Jarvis\CLAUDE.md"
```

### B. Command Scripts
```powershell
# Copy Python command scripts
$scripts = @(
    "RYR_COMMAND.py",
    "VERITAS_COMMAND.py",
    "ARCHON_GLOBAL_COMMAND.py",
    "UNIVERSAL_RULES_CHECKER.py"
)

foreach ($script in $scripts) {
    if (Test-Path "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure\$script") {
        Copy-Item "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure\$script" -Destination "C:\Jarvis\$script"
    }
}
```

### C. User Configuration Files
```powershell
# Copy .claude directory contents
$sourceClaudeDir = "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure\.claude"
$destClaudeDir = "$env:USERPROFILE\.claude"

# Copy skills
Copy-Item "$sourceClaudeDir\skills\*" -Destination "$destClaudeDir\skills\" -Recurse -Force

# Copy protocols
Copy-Item "$sourceClaudeDir\protocols\*" -Destination "$destClaudeDir\protocols\" -Recurse -Force

# Copy settings.json (you'll need to update paths/tokens)
Copy-Item "$sourceClaudeDir\settings.json" -Destination "$destClaudeDir\settings.json"

# Copy hooks
Copy-Item "$sourceClaudeDir\hooks\*" -Destination "$destClaudeDir\hooks\" -Recurse -Force

# Copy commands
Copy-Item "$sourceClaudeDir\commands\*" -Destination "$destClaudeDir\commands\" -Recurse -Force
```

---

## Step 4: Configure Claude Code Global Settings

### A. Locate Claude Desktop Config
**Path**: `C:\Users\[USERNAME]\AppData\Roaming\Claude\claude_desktop_config.json`

### B. Add Global Instructions
Edit the file to include:
```json
{
  "globalInstructions": {
    "instructionsPath": "C:\\Jarvis\\CLAUDE.md"
  },
  "mcpServers": {
    // MCP servers will be in settings.json
  }
}
```

**OR** use symbolic link approach:
```powershell
# Create symlink from Claude config to your CLAUDE.md
New-Item -ItemType SymbolicLink -Path "C:\Users\[USERNAME]\AppData\Roaming\Claude\CLAUDE.md" -Target "C:\Jarvis\CLAUDE.md"
```

---

## Step 5: Configure API Tokens

### A. Create Environment Variables
```powershell
# Set permanent environment variables
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_github_token_here", "User")
[System.Environment]::SetEnvironmentVariable("HOSTINGER_API_TOKEN", "your_hostinger_token_here", "User")
```

### B. Update settings.json
Edit `~/.claude/settings.json` and update:
- API tokens (use environment variables: `${GITHUB_TOKEN}`)
- File paths (if different on new PC)
- User-specific settings

---

## Step 6: Install MCP Servers

Your settings.json includes these MCP servers:
```bash
# They auto-install on first use, but you can pre-install:
npx -y @upstash/context7-mcp@1.0.31
npx -y @modelcontextprotocol/server-sequential-thinking
npx -y @modelcontextprotocol/server-memory
npx -y @modelcontextprotocol/server-github
npx -y @playwright/mcp@latest
```

---

## Step 7: Initialize Memory System

```powershell
# Create memory files
$memoryDir = "$env:USERPROFILE\.claude\memories"

# Create initial memory files
@"
# PAI Memory - Current Session
Last updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Status: Initialized on new PC

## Active Context
- System: New PC setup
- PAI Version: 2.0 (Context Engineered)
"@ | Out-File -FilePath "$memoryDir\current.md" -Encoding UTF8

New-Item -Path "$memoryDir\archive.md" -ItemType File -Force
New-Item -Path "$memoryDir\project-index.md" -ItemType File -Force
```

---

## Step 8: Verification Tests

### A. Test Global CLAUDE.md Loading
```bash
# Start Claude Code CLI
claude

# In any project, type one of these triggers:
# "RYR" or "Remember Your Rules" or "Veritas" or "Archon"
# If PAI is activated, Claude should respond with the trigger protocol
```

### B. Test Skills
```bash
# Test if skills are loaded
claude --skills list

# Test a specific skill (if you have kai skill)
# In chat: "Use kai skill"
```

### C. Test MCP Servers
```bash
# In Claude Code CLI
# Try using GitHub MCP: "Search GitHub for repositories"
# Try using Memory MCP: "Remember this is my new PC"
```

---

## Step 9: Project-Specific Setup

For each project where you want PAI:

### Option A: Global Activation (Current Setup)
PAI is automatically active in ALL projects via `C:\Jarvis\CLAUDE.md`

### Option B: Project-Specific CLAUDE.md
Some projects may have their own `CLAUDE.md` in the project root:
```powershell
# Copy project-specific CLAUDE.md
Copy-Item "path\to\project\CLAUDE.md" -Destination "C:\Jarvis\AI Workspace\[PROJECT_NAME]\CLAUDE.md"
```

---

## Step 10: Final Checks

Run through this checklist:

- [ ] `C:\Jarvis\CLAUDE.md` exists and is readable
- [ ] Python command scripts in `C:\Jarvis\` are executable
- [ ] `~/.claude/settings.json` exists with correct paths
- [ ] `~/.claude/skills/` contains all your skills
- [ ] `~/.claude/protocols/` contains all protocols
- [ ] API tokens are set in environment variables
- [ ] Claude Desktop config has globalInstructions path
- [ ] Test trigger: Type "RYR" in Claude Code CLI
- [ ] Test skill: Try using any skill you have
- [ ] Test MCP: Try GitHub search or memory functions

---

## Troubleshooting

### Issue: PAI not activating
**Check**:
1. Is `C:\Jarvis\CLAUDE.md` readable?
2. Is Claude Desktop config pointing to it?
3. Restart Claude Code CLI after config changes

### Issue: Skills not found
**Check**:
1. Are skills in `~/.claude/skills/`?
2. Does each skill have `skill.json` or `skill.yaml`?
3. Check settings.json for skill paths

### Issue: MCP servers not working
**Check**:
1. Are environment variables set correctly?
2. Run `npx -y [mcp-package]` manually to test
3. Check settings.json MCP configuration

### Issue: Commands not running
**Check**:
1. Python scripts in `C:\Jarvis\` are executable
2. Python is in PATH
3. Try running command scripts manually:
   ```bash
   python C:\Jarvis\RYR_COMMAND.py
   ```

---

## Key Differences from Old PC

### Paths to Update
Review and update these paths in your files:
- User home directory: `C:\Users\[NEW_USERNAME]\`
- Workspace path: May differ if you use different drive/folder
- Any hardcoded absolute paths in scripts

### Tokens to Replace
- GitHub Personal Access Token
- Hostinger API Token
- Any other service tokens
- MCP server credentials

---

## Quick Reference

### PAI Activation Triggers
```
RYR               → Load all rules
Veritas           → Truth-enforcing mode
Archon            → Universal coding assistant
gfg               → Go For Gold autonomous mode
```

### Key Directories
```
C:\Jarvis\                          # Global PAI
~/.claude/                          # User configuration
~/.claude/skills/                   # PAI skills
~/.claude/protocols/                # Quality protocols
~/.claude/memories/                 # Session memory
```

### Essential Commands
```bash
# Test PAI activation
claude
# Then type: RYR

# List skills
claude --skills list

# Check settings
type %USERPROFILE%\.claude\settings.json
```

---

## Post-Setup Optimization

### 1. Customize for New PC
- Update `~/.claude/memories/current.md` with new PC details
- Add new PC to `~/.claude/memories/project-index.md`
- Update any PC-specific configurations

### 2. Sync Strategy
Consider setting up:
- Git repo for `~/.claude/skills/` and `~/.claude/protocols/`
- Automated sync for `C:\Jarvis\CLAUDE.md`
- Backup strategy for `~/.claude/memories/`

### 3. Test All Features
- [ ] Global trigger activation
- [ ] Skills loading and execution
- [ ] Protocol enforcement
- [ ] Memory persistence
- [ ] Hook automation
- [ ] MCP server integration

---

## Success Criteria

PAI is fully activated when:

1. ✅ Typing "RYR" in any Claude Code session loads your rules
2. ✅ Skills are accessible via Skill tool
3. ✅ Protocols are enforced in development
4. ✅ Memory persists across sessions
5. ✅ MCP servers respond to queries
6. ✅ Hooks execute on appropriate events

---

**Setup Version**: 1.0
**PAI Version**: 2.0 (Context Engineered)
**Last Updated**: 2025-12-17

*Setup guide for global PAI activation on new PC*
