#!/bin/bash
# PAI STT Server - Installation Script

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🎙️ PAI STT Server Installation"
echo "================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo ""
    echo "Install Bun:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo ""
    exit 1
else
    echo "✅ Bun installed: $(bun --version)"
fi

# Check FFmpeg (optional but recommended)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg not found (optional for audio conversion)"
    echo "   Install: https://ffmpeg.org/download.html"
else
    echo "✅ FFmpeg installed: $(ffmpeg -version | head -n1)"
fi

# Check ffprobe (for duration detection)
if ! command -v ffprobe &> /dev/null; then
    echo "⚠️  ffprobe not found (optional for duration detection)"
else
    echo "✅ ffprobe installed"
fi

echo ""
echo "📝 Configuring environment..."

# Check .env
if [ ! -f "$HOME/.env" ]; then
    echo "⚠️  ~/.env not found"
    echo "   Creating from example..."

    if [ -f "${SCRIPT_DIR}/../.env.example" ]; then
        cp "${SCRIPT_DIR}/../.env.example" "$HOME/.env"
        echo "✅ Created ~/.env (please edit with your API keys)"
    else
        cat > "$HOME/.env" << EOF
# PAI STT Server Configuration

# STT Service
STT_PORT=8889
STT_ENABLED=true

# Groq API (REQUIRED for Tier 2)
GROQ_API_KEY=your_groq_api_key_here

# Deepgram API (Optional for Tier 3 real-time)
DEEPGRAM_API_KEY=your_deepgram_api_key_here
EOF
        echo "✅ Created ~/.env template"
    fi

    echo ""
    echo "⚠️  IMPORTANT: Edit ~/.env and add your GROQ_API_KEY"
    echo "   Get API key from: https://console.groq.com"
    echo ""
else
    echo "✅ ~/.env exists"

    # Check if GROQ_API_KEY is configured
    if grep -q "GROQ_API_KEY=your_groq_api_key_here" "$HOME/.env" 2>/dev/null || ! grep -q "GROQ_API_KEY=" "$HOME/.env" 2>/dev/null; then
        echo "⚠️  GROQ_API_KEY not configured in ~/.env"
        echo "   Get API key from: https://console.groq.com"
    else
        echo "✅ GROQ_API_KEY configured"
    fi
fi

# Create logs directory
mkdir -p "$HOME/.claude/stt-server/logs"
echo "✅ Created logs directory"

# Make scripts executable
chmod +x "${SCRIPT_DIR}/start.sh"
chmod +x "${SCRIPT_DIR}/stop.sh"
echo "✅ Made scripts executable"

echo ""
echo "🚀 Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Edit ~/.env and add your GROQ_API_KEY"
echo "  2. Start the server: cd ${SCRIPT_DIR} && ./start.sh"
echo "  3. Test health check: curl http://localhost:8889/health"
echo ""
echo "Documentation: ${SCRIPT_DIR}/README.md"
