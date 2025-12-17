# PAI New PC Setup Script
# Automated setup for Personal AI Infrastructure on new PC
# Version: 1.0

param(
    [string]$GitHubUsername = "",
    [string]$GitHubToken = "",
    [string]$HostingerToken = "",
    [string]$SourcePath = "C:\Jarvis\AI Workspace\Personal_AI_Infrastructure"
)

Write-Host "🤖 PAI New PC Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create directories
Write-Host "📁 Step 1: Creating directory structure..." -ForegroundColor Yellow

$directories = @(
    "C:\Jarvis",
    "C:\Jarvis\AI Workspace",
    "$env:USERPROFILE\.claude",
    "$env:USERPROFILE\.claude\skills",
    "$env:USERPROFILE\.claude\protocols",
    "$env:USERPROFILE\.claude\memories",
    "$env:USERPROFILE\.claude\hooks",
    "$env:USERPROFILE\.claude\commands",
    "$env:USERPROFILE\.claude\session-env",
    "$env:USERPROFILE\.claude\runtime-state"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "  ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 2: Check if source exists (from GitHub clone or USB transfer)
Write-Host "📦 Step 2: Checking source files..." -ForegroundColor Yellow

if (-not (Test-Path $SourcePath)) {
    Write-Host "  ❌ Source path not found: $SourcePath" -ForegroundColor Red
    Write-Host "  Please clone your PAI repo or specify correct path with -SourcePath" -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✅ Source found: $SourcePath" -ForegroundColor Green
Write-Host ""

# Step 3: Copy global trigger file
Write-Host "🎯 Step 3: Installing global trigger (CLAUDE.md)..." -ForegroundColor Yellow

if (Test-Path "$SourcePath\CLAUDE.md") {
    Copy-Item "$SourcePath\CLAUDE.md" -Destination "C:\Jarvis\CLAUDE.md" -Force
    Write-Host "  ✅ Installed: C:\Jarvis\CLAUDE.md" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  CLAUDE.md not found in source" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Copy command scripts
Write-Host "🔧 Step 4: Installing command scripts..." -ForegroundColor Yellow

$scripts = @(
    "RYR_COMMAND.py",
    "VERITAS_COMMAND.py",
    "ARCHON_GLOBAL_COMMAND.py",
    "UNIVERSAL_RULES_CHECKER.py"
)

foreach ($script in $scripts) {
    $sourcePath = "$SourcePath\$script"
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath -Destination "C:\Jarvis\$script" -Force
        Write-Host "  ✅ Installed: $script" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Not found: $script (optional)" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 5: Copy .claude directory contents
Write-Host "⚙️  Step 5: Installing user configuration..." -ForegroundColor Yellow

$claudeItems = @(
    @{Source = "$SourcePath\.claude\skills"; Dest = "$env:USERPROFILE\.claude\skills"; Name = "Skills"},
    @{Source = "$SourcePath\.claude\protocols"; Dest = "$env:USERPROFILE\.claude\protocols"; Name = "Protocols"},
    @{Source = "$SourcePath\.claude\hooks"; Dest = "$env:USERPROFILE\.claude\hooks"; Name = "Hooks"},
    @{Source = "$SourcePath\.claude\commands"; Dest = "$env:USERPROFILE\.claude\commands"; Name = "Commands"},
    @{Source = "$SourcePath\.claude\settings.json"; Dest = "$env:USERPROFILE\.claude\settings.json"; Name = "Settings"}
)

foreach ($item in $claudeItems) {
    if (Test-Path $item.Source) {
        Copy-Item $item.Source -Destination $item.Dest -Recurse -Force
        Write-Host "  ✅ Installed: $($item.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Not found: $($item.Name)" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 6: Initialize memory system
Write-Host "🧠 Step 6: Initializing memory system..." -ForegroundColor Yellow

$memoryDir = "$env:USERPROFILE\.claude\memories"
$currentMemory = @"
# PAI Memory - Current Session
Last updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Status: Initialized on new PC - $(hostname)

## Active Context
- System: New PC setup complete
- PAI Version: 2.0 (Context Engineered)
- Machine: $(hostname)
- User: $env:USERNAME

## Setup Notes
- Completed automated setup on $(Get-Date -Format "yyyy-MM-dd")
- Ready for first PAI activation test
"@

$currentMemory | Out-File -FilePath "$memoryDir\current.md" -Encoding UTF8 -Force
New-Item -Path "$memoryDir\archive.md" -ItemType File -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -Path "$memoryDir\project-index.md" -ItemType File -Force -ErrorAction SilentlyContinue | Out-Null

Write-Host "  ✅ Memory system initialized" -ForegroundColor Green
Write-Host ""

# Step 7: Set environment variables (if tokens provided)
Write-Host "🔐 Step 7: Configuring environment variables..." -ForegroundColor Yellow

if ($GitHubToken) {
    [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $GitHubToken, "User")
    Write-Host "  ✅ Set GITHUB_TOKEN" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped: GITHUB_TOKEN (not provided)" -ForegroundColor Gray
    Write-Host "     Set manually: [System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'your_token', 'User')" -ForegroundColor DarkGray
}

if ($HostingerToken) {
    [System.Environment]::SetEnvironmentVariable("HOSTINGER_API_TOKEN", $HostingerToken, "User")
    Write-Host "  ✅ Set HOSTINGER_API_TOKEN" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped: HOSTINGER_API_TOKEN (not provided)" -ForegroundColor Gray
    Write-Host "     Set manually: [System.Environment]::SetEnvironmentVariable('HOSTINGER_API_TOKEN', 'your_token', 'User')" -ForegroundColor DarkGray
}

Write-Host ""

# Step 8: Configure Claude Desktop (if exists)
Write-Host "🎨 Step 8: Configuring Claude Desktop..." -ForegroundColor Yellow

$claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$claudeConfigDir = Split-Path $claudeConfigPath

if (-not (Test-Path $claudeConfigDir)) {
    Write-Host "  ⏭️  Claude Desktop not installed (config dir not found)" -ForegroundColor Gray
} else {
    $config = @{
        globalInstructions = @{
            instructionsPath = "C:\Jarvis\CLAUDE.md"
        }
    }

    if (Test-Path $claudeConfigPath) {
        # Backup existing config
        Copy-Item $claudeConfigPath "$claudeConfigPath.backup" -Force
        Write-Host "  ✅ Backed up existing config" -ForegroundColor Green

        # Read and merge
        $existing = Get-Content $claudeConfigPath -Raw | ConvertFrom-Json
        $existing.globalInstructions = $config.globalInstructions
        $existing | ConvertTo-Json -Depth 10 | Out-File $claudeConfigPath -Encoding UTF8
    } else {
        $config | ConvertTo-Json -Depth 10 | Out-File $claudeConfigPath -Encoding UTF8
    }

    Write-Host "  ✅ Claude Desktop configured with global instructions" -ForegroundColor Green
}

Write-Host ""

# Step 9: Verification
Write-Host "✅ Step 9: Setup verification..." -ForegroundColor Yellow

$checks = @(
    @{Path = "C:\Jarvis\CLAUDE.md"; Name = "Global trigger file"},
    @{Path = "$env:USERPROFILE\.claude\settings.json"; Name = "Settings file"},
    @{Path = "$env:USERPROFILE\.claude\skills"; Name = "Skills directory"},
    @{Path = "$env:USERPROFILE\.claude\protocols"; Name = "Protocols directory"},
    @{Path = "$env:USERPROFILE\.claude\memories\current.md"; Name = "Memory system"}
)

$allPass = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✅ $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Name) - MISSING" -ForegroundColor Red
        $allPass = $false
    }
}

Write-Host ""

# Final summary
Write-Host "================================" -ForegroundColor Cyan
if ($allPass) {
    Write-Host "🎉 PAI Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your terminal/PowerShell for env vars to take effect" -ForegroundColor White
    Write-Host "2. Start Claude Code CLI: claude" -ForegroundColor White
    Write-Host "3. Test activation: Type 'RYR' or 'Remember Your Rules'" -ForegroundColor White
    Write-Host "4. Verify skills: Check if skills load correctly" -ForegroundColor White
    Write-Host ""
    Write-Host "For detailed testing, see: PAI-NEW-PC-SETUP.md" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Setup completed with warnings" -ForegroundColor Yellow
    Write-Host "Some files are missing. Check the output above." -ForegroundColor Yellow
}
Write-Host "================================" -ForegroundColor Cyan
