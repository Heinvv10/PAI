#!/bin/bash
# PAI STT Server - Quick Verification Script

set -e

echo "🎙️ PAI STT Server - Quick Verification"
echo "======================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASS=0
FAIL=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

info() {
    echo "ℹ️  $1"
}

echo "📋 Running verification checks..."
echo ""

# ============================================================================
# Test 1: Bun Installation
# ============================================================================
echo "[1/8] Checking Bun runtime..."
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    pass "Bun installed (version: $BUN_VERSION)"
else
    fail "Bun not installed. Install from: https://bun.sh"
fi
echo ""

# ============================================================================
# Test 2: Environment Configuration
# ============================================================================
echo "[2/8] Checking environment configuration..."
if [ -f "$HOME/.env" ]; then
    pass "~/.env file exists"

    if grep -q "GROQ_API_KEY=" "$HOME/.env" 2>/dev/null; then
        if grep -q "GROQ_API_KEY=your_groq_api_key_here" "$HOME/.env" 2>/dev/null; then
            fail "GROQ_API_KEY not configured (still placeholder)"
        elif grep -q "GROQ_API_KEY=$" "$HOME/.env" 2>/dev/null; then
            fail "GROQ_API_KEY is empty"
        else
            pass "GROQ_API_KEY is configured"
        fi
    else
        fail "GROQ_API_KEY not found in ~/.env"
    fi
else
    fail "~/.env not found. Copy from .env.example"
fi
echo ""

# ============================================================================
# Test 3: Directory Structure
# ============================================================================
echo "[3/8] Checking directory structure..."
REQUIRED_FILES=(
    "$HOME/.claude/stt-server/server.ts"
    "$HOME/.claude/stt-server/tier2-groq.ts"
    "$HOME/.claude/stt-server/cascade.ts"
    "$HOME/.claude/stt-server/cost-tracker.ts"
    "$HOME/.claude/stt-server/audio-processor.ts"
    "$HOME/.claude/stt-server/start.sh"
    "$HOME/.claude/stt-server/stop.sh"
    "$HOME/.claude/stt-server/install.sh"
    "$HOME/.claude/hooks/stt/on_file_attach.ts"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        : # File exists, continue
    else
        fail "Missing file: $file"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = true ]; then
    pass "All required files present"
fi
echo ""

# ============================================================================
# Test 4: Script Permissions
# ============================================================================
echo "[4/8] Checking script permissions..."
SCRIPTS=(
    "$HOME/.claude/stt-server/start.sh"
    "$HOME/.claude/stt-server/stop.sh"
    "$HOME/.claude/stt-server/install.sh"
)

ALL_EXECUTABLE=true
for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        : # Executable, continue
    else
        fail "Not executable: $script"
        ALL_EXECUTABLE=false
    fi
done

if [ "$ALL_EXECUTABLE" = true ]; then
    pass "All scripts are executable"
fi
echo ""

# ============================================================================
# Test 5: Server Status
# ============================================================================
echo "[5/8] Checking if STT server is running..."
if lsof -ti:8889 > /dev/null 2>&1; then
    pass "Server is running on port 8889"

    # Test health endpoint
    echo "    Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:8889/health 2>/dev/null || echo "")

    if [ -n "$HEALTH_RESPONSE" ]; then
        if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
            pass "Health check passed"
        else
            fail "Health check returned unhealthy status"
        fi

        # Check Groq configuration
        if echo "$HEALTH_RESPONSE" | grep -q '"groq_api_configured":true'; then
            pass "Groq API is configured"
        else
            warn "Groq API not configured in server"
        fi
    else
        fail "Health endpoint not responding"
    fi
else
    warn "Server not running on port 8889"
    info "Start server with: cd ~/.claude/stt-server && ./start.sh"
fi
echo ""

# ============================================================================
# Test 6: Logs Directory
# ============================================================================
echo "[6/8] Checking logs directory..."
if [ -d "$HOME/.claude/stt-server/logs" ]; then
    pass "Logs directory exists"

    # Check for log files
    if [ -f "$HOME/.claude/stt-server/logs/stt-server.log" ]; then
        LOG_SIZE=$(wc -c < "$HOME/.claude/stt-server/logs/stt-server.log")
        info "Server log size: $LOG_SIZE bytes"
    fi

    if [ -f "$HOME/.claude/stt-server/logs/cost-log.jsonl" ]; then
        COST_ENTRIES=$(wc -l < "$HOME/.claude/stt-server/logs/cost-log.jsonl")
        info "Cost log entries: $COST_ENTRIES"
    fi
else
    fail "Logs directory not found"
fi
echo ""

# ============================================================================
# Test 7: FFmpeg (Optional)
# ============================================================================
echo "[7/8] Checking FFmpeg (optional)..."
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    pass "FFmpeg installed: $FFMPEG_VERSION"
else
    warn "FFmpeg not installed (optional but recommended)"
    info "Install: https://ffmpeg.org/download.html"
fi

if command -v ffprobe &> /dev/null; then
    pass "ffprobe installed"
else
    warn "ffprobe not installed (optional but recommended)"
fi
echo ""

# ============================================================================
# Test 8: API Connectivity (if server running)
# ============================================================================
echo "[8/8] Testing API connectivity..."
if lsof -ti:8889 > /dev/null 2>&1; then
    # Test if cost endpoint works
    COST_RESPONSE=$(curl -s "http://localhost:8889/cost?period=month" 2>/dev/null || echo "")

    if [ -n "$COST_RESPONSE" ]; then
        if echo "$COST_RESPONSE" | grep -q '"period":"month"'; then
            pass "Cost API endpoint responding"
        else
            fail "Cost API returned invalid response"
        fi
    else
        fail "Cost API not responding"
    fi
else
    warn "Cannot test API (server not running)"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "======================================="
echo "📊 Verification Summary"
echo "======================================="
echo ""
echo "Tests Passed: ${GREEN}$PASS${NC}"
echo "Tests Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test transcription: curl -X POST http://localhost:8889/transcribe --data-binary @audio.mp3 -H 'X-Filename: audio.mp3'"
    echo "2. Attach audio file in Claude Code to test auto-transcription"
    echo "3. Check cost logs: cat ~/.claude/stt-server/logs/cost-log.jsonl"
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    echo ""
    echo "Recommended actions:"

    if ! command -v bun &> /dev/null; then
        echo "- Install Bun: curl -fsSL https://bun.sh/install | bash"
    fi

    if [ ! -f "$HOME/.env" ]; then
        echo "- Copy .env template: cp ~/.claude/stt-server/../.env.example ~/.env"
        echo "- Add GROQ_API_KEY from: https://console.groq.com"
    fi

    if ! lsof -ti:8889 > /dev/null 2>&1; then
        echo "- Start server: cd ~/.claude/stt-server && ./start.sh"
    fi

    echo ""
    echo "For detailed testing, see: TESTING_GUIDE.md"
    exit 1
fi
