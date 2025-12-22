# Windows Git Bi-Directional Sync Setup

## Quick Setup (One Command)

1. Copy this folder to your Windows laptop
2. Open PowerShell **as Administrator**
3. Run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\setup-complete.ps1
   ```

That's it! The script will:
- Create sync script in `~\.claude\`
- Set up post-commit hooks for all projects
- Create a Task Scheduler job (runs every 5 minutes)
- Configure branch tracking

## Files Included

| File | Purpose |
|------|---------|
| `setup-complete.ps1` | **Run this** - Complete automated setup |
| `git-sync-all-projects.ps1` | The sync script (auto-copied to ~/.claude/) |
| `setup-post-commit-hooks.ps1` | Standalone hook setup if needed |

## Projects Configured

| Project | Branch |
|---------|--------|
| AgriWize | master |
| Apex | master |
| BOSS | master |
| boss-ghost-mcp | main |
| FF_Next.js | master |
| PAI | main |

## After Setup

### Monitor Sync Activity
```powershell
Get-Content "$env:USERPROFILE\.claude\git-sync.log" -Tail 30
```

### Test Sync Manually
```powershell
& "$env:USERPROFILE\.claude\git-sync-all-projects.ps1"
```

### Check Task Scheduler
```powershell
Get-ScheduledTask -TaskName "GitAutoSync"
```

## How It Works

```
┌─────────────┐                    ┌─────────────┐
│   Laptop    │                    │   Server    │
│  (Windows)  │                    │   (Linux)   │
│             │                    │             │
│  Commit     │──── auto-push ────→│             │
│             │                    │  Commit     │
│             │←─── auto-push ─────│             │
│             │                    │             │
│  Task       │                    │  Cron       │
│  Scheduler  │←── pulls every ───→│  Job        │
│  (5 min)    │     5 minutes      │  (5 min)    │
└─────────────┘                    └─────────────┘
              ↓                    ↓
              └────── GitHub ──────┘
```

## Troubleshooting

### Task not running?
```powershell
# Check if task exists
Get-ScheduledTask -TaskName "GitAutoSync"

# Run manually
Start-ScheduledTask -TaskName "GitAutoSync"
```

### Permission issues?
Run PowerShell as Administrator and re-run setup.

### Sync not working?
```powershell
# Check log for errors
Get-Content "$env:USERPROFILE\.claude\git-sync.log" -Tail 50 | Select-String "ERROR"
```
