# SSH Server Setup Script for Windows
# Run this as Administrator

Write-Host "Installing OpenSSH Server..." -ForegroundColor Cyan
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

Write-Host "`nStarting SSH service..." -ForegroundColor Cyan
Start-Service sshd

Write-Host "Setting SSH service to start automatically..." -ForegroundColor Cyan
Set-Service -Name sshd -StartupType 'Automatic'

Write-Host "Configuring Windows Firewall..." -ForegroundColor Cyan
# Remove existing rule if it exists
Remove-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue

# Add new firewall rule
New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22

Write-Host "`nChecking SSH service status..." -ForegroundColor Cyan
Get-Service -Name sshd | Select-Object Name, Status, StartType

Write-Host "`nSSH Server setup complete!" -ForegroundColor Green
Write-Host "Your laptop can now accept SSH connections." -ForegroundColor Green
Write-Host "`nYour username: $env:USERNAME" -ForegroundColor Yellow
Write-Host "Test connection from Velo server with: ssh -p 2222 $env:USERNAME@localhost" -ForegroundColor Yellow
