# Git Bi-Directional Sync Script for Windows
# Runs via Task Scheduler every 5 minutes
# Location: C:\Jarvis\AI Workspace\.claude\git-sync-all-projects.ps1

$LogFile = "$env:USERPROFILE\.claude\git-sync.log"
$MaxLogSize = 1MB

# Create log directory if needed
$LogDir = Split-Path $LogFile -Parent
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Rotate log if too large
if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt $MaxLogSize)) {
    Move-Item $LogFile "$LogFile.old" -Force
}

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$Timestamp] $Message"
}

# Define all projects: Name, Path, Branch
$Projects = @(
    @{ Name = "AgriWize"; Path = "C:\Jarvis\AI Workspace\AgriWize"; Branch = "master" },
    @{ Name = "Apex"; Path = "C:\Jarvis\AI Workspace\Apex"; Branch = "master" },
    @{ Name = "BOSS"; Path = "C:\Jarvis\AI Workspace\BOSS"; Branch = "master" },
    @{ Name = "boss-ghost-mcp"; Path = "C:\Jarvis\AI Workspace\boss-ghost-mcp"; Branch = "main" },
    @{ Name = "FF_Next.js"; Path = "C:\Jarvis\AI Workspace\FF_Next.js"; Branch = "master" },
    @{ Name = "PAI"; Path = "C:\Jarvis\AI Workspace\PAI"; Branch = "main" }
)

function Sync-Project {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Branch
    )

    if (-not (Test-Path "$Path\.git")) {
        Write-Log "WARNING: $Name - Not a Git repository ($Path)"
        return
    }

    Push-Location $Path
    try {
        # Fetch updates from GitHub
        git fetch origin $Branch 2>&1 | Out-Null

        # Check if we're behind remote
        $Local = git rev-parse "@" 2>$null
        $Remote = git rev-parse "origin/$Branch" 2>$null

        if ($Local -eq $Remote) {
            Pop-Location
            return  # Already up to date
        }

        Write-Log "SYNC: $Name - Changes detected, pulling from GitHub..."

        # Check for uncommitted local changes
        $Status = git status --porcelain 2>$null
        $Stashed = $false

        if ($Status) {
            Write-Log "STASH: $Name - Stashing uncommitted changes"
            git stash save "Auto-stash $Name $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1 | Out-Null
            $Stashed = $true
        }

        # Pull changes from GitHub
        $PullResult = git pull origin $Branch 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "OK: $Name - Successfully synced from GitHub"

            # Re-apply stashed changes if we stashed
            if ($Stashed) {
                Write-Log "UNSTASH: $Name - Re-applying stashed changes"
                $StashResult = git stash pop 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "OK: $Name - Stash re-applied successfully"
                } else {
                    Write-Log "ERROR: $Name - Failed to re-apply stash (manual intervention needed)"
                }
            }
        } else {
            Write-Log "ERROR: $Name - Failed to pull from GitHub"
        }
    }
    finally {
        Pop-Location
    }
}

# Sync all projects
foreach ($Project in $Projects) {
    Sync-Project -Name $Project.Name -Path $Project.Path -Branch $Project.Branch
}
