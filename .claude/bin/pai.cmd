@echo off
REM PAI Launcher - Batch wrapper for Claude Code with auto-bootstrap
powershell -ExecutionPolicy Bypass -File "%USERPROFILE%\.claude\bin\pai.ps1" %*
