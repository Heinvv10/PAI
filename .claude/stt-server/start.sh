#!/bin/bash
# PAI STT Server - Start Script

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🎙️ Starting PAI STT Server..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed"
    echo "   Install from: https://bun.sh"
    exit 1
fi

# Check if .env exists
if [ ! -f "$HOME/.env" ]; then
    echo "⚠️  Warning: ~/.env not found"
    echo "   Copy from: ${SCRIPT_DIR}/../.env.example"
fi

# Check if GROQ_API_KEY is configured
if [ -z "$GROQ_API_KEY" ] && [ -f "$HOME/.env" ]; then
    source "$HOME/.env"
fi

if [ -z "$GROQ_API_KEY" ]; then
    echo "⚠️  Warning: GROQ_API_KEY not configured in ~/.env"
    echo "   Get API key from: https://console.groq.com"
fi

# Check if server is already running
if lsof -ti:8889 > /dev/null 2>&1; then
    echo "⚠️  STT server already running on port 8889"
    echo "   Run './stop.sh' first to restart"
    exit 1
fi

# Create logs directory
mkdir -p "$HOME/.claude/stt-server/logs"

# Start server in background
echo "🚀 Starting server on port 8889..."
cd "$SCRIPT_DIR"
nohup bun server.ts > "$HOME/.claude/stt-server/logs/stt-server.log" 2>&1 &

# Wait for server to start
sleep 2

# Check if server is running
if lsof -ti:8889 > /dev/null 2>&1; then
    echo "✅ PAI STT Server started successfully"
    echo "   Port: 8889"
    echo "   Logs: $HOME/.claude/stt-server/logs/stt-server.log"
    echo "   Health: curl http://localhost:8889/health"
else
    echo "❌ Failed to start STT server"
    echo "   Check logs: tail -f $HOME/.claude/stt-server/logs/stt-server.log"
    exit 1
fi
