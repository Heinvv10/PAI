#!/bin/bash
# PAI STT Server - Stop Script

set -e

echo "🛑 Stopping PAI STT Server..."

# Find process on port 8889
PID=$(lsof -ti:8889 2>/dev/null || true)

if [ -z "$PID" ]; then
    echo "ℹ️  STT server is not running"
    exit 0
fi

# Kill the process
kill "$PID" 2>/dev/null || true

# Wait for process to terminate
sleep 1

# Check if still running
if lsof -ti:8889 > /dev/null 2>&1; then
    echo "⚠️  Process still running, forcing kill..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
fi

# Verify stopped
if lsof -ti:8889 > /dev/null 2>&1; then
    echo "❌ Failed to stop STT server"
    exit 1
else
    echo "✅ PAI STT Server stopped"
fi
