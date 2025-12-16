#
# PAI Launcher - PowerShell wrapper for Claude Code with auto-bootstrap
#
# Usage:
#   .\pai.ps1 [claude-code-args]
#   pai [claude-code-args]  (if alias is set)
#

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PAI Launcher                                                  " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Run bootstrap
Write-Host "> Running PAI bootstrap..." -ForegroundColor Yellow
$bootstrapResult = & bun "$env:USERPROFILE\.claude\hooks\pai-bootstrap-all.ts" start 2>&1
Write-Host $bootstrapResult

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Bootstrap complete" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[WARN] Bootstrap had issues (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    Write-Host "       Continuing anyway..."
    Write-Host ""
}

# Model routing status
Write-Host "> Model routing ready:" -ForegroundColor Yellow
Write-Host "   - Simple tasks -> Haiku"
Write-Host "   - Standard tasks -> Sonnet"
Write-Host "   - Complex tasks -> Opus"
Write-Host ""

# Start Claude Code
Write-Host "> Starting Claude Code..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------"
Write-Host ""

& claude $args
