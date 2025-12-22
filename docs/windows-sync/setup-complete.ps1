# Complete Git Bi-Directional Sync Setup for Windows
# Run as Administrator for Task Scheduler setup
# Usage: Right-click -> Run with PowerShell (as Admin)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Git Bi-Directional Sync Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create .claude directory
$ClaudeDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $ClaudeDir)) {
    New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null
    Write-Host "Created: $ClaudeDir" -ForegroundColor Green
}

# 2. Copy sync script
$SyncScript = @'
# Git Bi-Directional Sync Script for Windows
$LogFile = "$env:USERPROFILE\.claude\git-sync.log"
$MaxLogSize = 1MB

$LogDir = Split-Path $LogFile -Parent
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt $MaxLogSize)) { Move-Item $LogFile "$LogFile.old" -Force }

function Write-Log { param([string]$Message); Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" }

$Projects = @(
    @{ Name = "AgriWize"; Path = "C:\Jarvis\AI Workspace\AgriWize"; Branch = "master" },
    @{ Name = "Apex"; Path = "C:\Jarvis\AI Workspace\Apex"; Branch = "master" },
    @{ Name = "BOSS"; Path = "C:\Jarvis\AI Workspace\BOSS"; Branch = "master" },
    @{ Name = "boss-ghost-mcp"; Path = "C:\Jarvis\AI Workspace\boss-ghost-mcp"; Branch = "main" },
    @{ Name = "FF_Next.js"; Path = "C:\Jarvis\AI Workspace\FF_Next.js"; Branch = "master" },
    @{ Name = "PAI"; Path = "C:\Jarvis\AI Workspace\PAI"; Branch = "main" }
)

function Sync-Project { param([string]$Name, [string]$Path, [string]$Branch)
    if (-not (Test-Path "$Path\.git")) { return }
    Push-Location $Path
    try {
        git fetch origin $Branch 2>&1 | Out-Null
        $Local = git rev-parse "@" 2>$null
        $Remote = git rev-parse "origin/$Branch" 2>$null
        if ($Local -eq $Remote) { Pop-Location; return }
        Write-Log "SYNC: $Name - Pulling from GitHub..."
        $Status = git status --porcelain 2>$null
        $Stashed = $false
        if ($Status) { Write-Log "STASH: $Name"; git stash save "Auto-stash" 2>&1 | Out-Null; $Stashed = $true }
        git pull origin $Branch 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Log "OK: $Name - Synced" }
        if ($Stashed) { git stash pop 2>&1 | Out-Null; Write-Log "UNSTASH: $Name" }
    } finally { Pop-Location }
}

foreach ($Project in $Projects) { Sync-Project -Name $Project.Name -Path $Project.Path -Branch $Project.Branch }
'@

$SyncScriptPath = "$ClaudeDir\git-sync-all-projects.ps1"
Set-Content -Path $SyncScriptPath -Value $SyncScript
Write-Host "Created: $SyncScriptPath" -ForegroundColor Green

# 3. Set up post-commit hooks
Write-Host ""
Write-Host "Setting up post-commit hooks..." -ForegroundColor Yellow

$Projects = @(
    @{ Name = "AgriWize"; Path = "C:\Jarvis\AI Workspace\AgriWize"; Branch = "master" },
    @{ Name = "Apex"; Path = "C:\Jarvis\AI Workspace\Apex"; Branch = "master" },
    @{ Name = "BOSS"; Path = "C:\Jarvis\AI Workspace\BOSS"; Branch = "master" },
    @{ Name = "boss-ghost-mcp"; Path = "C:\Jarvis\AI Workspace\boss-ghost-mcp"; Branch = "main" },
    @{ Name = "FF_Next.js"; Path = "C:\Jarvis\AI Workspace\FF_Next.js"; Branch = "master" },
    @{ Name = "PAI"; Path = "C:\Jarvis\AI Workspace\PAI"; Branch = "main" }
)

foreach ($Project in $Projects) {
    $GitDir = Join-Path $Project.Path ".git"
    if (-not (Test-Path $GitDir)) {
        Write-Host "  SKIP: $($Project.Name) - Not found or not a Git repo" -ForegroundColor Yellow
        continue
    }

    $HooksDir = Join-Path $GitDir "hooks"
    if (-not (Test-Path $HooksDir)) { New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null }

    $HookContent = @"
#!/bin/bash
echo "Auto-pushing to GitHub..."
git push origin $($Project.Branch) 2>&1
if [ `$? -eq 0 ]; then echo "Successfully pushed"; else echo "Push failed"; fi
"@

    Set-Content -Path "$HooksDir\post-commit" -Value $HookContent -NoNewline
    Write-Host "  OK: $($Project.Name) -> $($Project.Branch)" -ForegroundColor Green
}

# 4. Set up Task Scheduler
Write-Host ""
Write-Host "Setting up Task Scheduler..." -ForegroundColor Yellow

$TaskName = "GitAutoSync"
$TaskExists = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($TaskExists) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Removed existing task" -ForegroundColor Yellow
}

try {
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SyncScriptPath`""
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited

    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Git bi-directional sync - pulls from GitHub every 5 minutes" | Out-Null
    Write-Host "  Created Task: $TaskName (runs every 5 minutes)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Could not create scheduled task. Run as Administrator." -ForegroundColor Red
    Write-Host "  Manual setup: Create task 'GitAutoSync' that runs:" -ForegroundColor Yellow
    Write-Host "  powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SyncScriptPath`"" -ForegroundColor White
}

# 5. Configure branch tracking
Write-Host ""
Write-Host "Configuring branch tracking..." -ForegroundColor Yellow

foreach ($Project in $Projects) {
    if (-not (Test-Path "$($Project.Path)\.git")) { continue }
    Push-Location $Project.Path
    git branch --set-upstream-to="origin/$($Project.Branch)" 2>$null
    Write-Host "  OK: $($Project.Name)" -ForegroundColor Green
    Pop-Location
}

# Done!
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "How it works:" -ForegroundColor White
Write-Host "  - Commits auto-push to GitHub (post-commit hooks)" -ForegroundColor Gray
Write-Host "  - Changes auto-pull every 5 min (Task Scheduler)" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitor sync:" -ForegroundColor White
Write-Host "  Get-Content `"$ClaudeDir\git-sync.log`" -Tail 20" -ForegroundColor Gray
Write-Host ""
Write-Host "Test sync now:" -ForegroundColor White
Write-Host "  & `"$SyncScriptPath`"" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
