# Setup Post-Commit Hooks for All Projects (Windows)
# Run this script once to create post-commit hooks

$Projects = @(
    @{ Name = "AgriWize"; Path = "C:\Jarvis\AI Workspace\AgriWize"; Branch = "master" },
    @{ Name = "Apex"; Path = "C:\Jarvis\AI Workspace\Apex"; Branch = "master" },
    @{ Name = "BOSS"; Path = "C:\Jarvis\AI Workspace\BOSS"; Branch = "master" },
    @{ Name = "boss-ghost-mcp"; Path = "C:\Jarvis\AI Workspace\boss-ghost-mcp"; Branch = "main" },
    @{ Name = "FF_Next.js"; Path = "C:\Jarvis\AI Workspace\FF_Next.js"; Branch = "master" },
    @{ Name = "PAI"; Path = "C:\Jarvis\AI Workspace\PAI"; Branch = "main" }
)

foreach ($Project in $Projects) {
    $HookPath = Join-Path $Project.Path ".git\hooks\post-commit"

    if (-not (Test-Path (Join-Path $Project.Path ".git"))) {
        Write-Host "SKIP: $($Project.Name) - Not a Git repository" -ForegroundColor Yellow
        continue
    }

    # Create hooks directory if it doesn't exist
    $HooksDir = Split-Path $HookPath -Parent
    if (-not (Test-Path $HooksDir)) {
        New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
    }

    # Create the post-commit hook (bash script for Git)
    $HookContent = @"
#!/bin/bash
# Auto-push to GitHub after each commit
# Part of bi-directional Git sync system

echo "Auto-pushing to GitHub..."
git push origin $($Project.Branch) 2>&1

if [ `$? -eq 0 ]; then
    echo "Successfully pushed to GitHub"
else
    echo "Failed to push to GitHub. You may need to pull first."
    exit 0
fi
"@

    Set-Content -Path $HookPath -Value $HookContent -NoNewline
    Write-Host "OK: $($Project.Name) - Post-commit hook created ($($Project.Branch))" -ForegroundColor Green
}

Write-Host ""
Write-Host "All post-commit hooks created!" -ForegroundColor Cyan
Write-Host "Commits will now auto-push to GitHub." -ForegroundColor Cyan
