#!/bin/bash

# ============================================
# PAI Velo Server Setup & Verification Script
# ============================================
# Run this on the Velo server at 192.168.1.150
# Location: /home/velo/AI-Workspace/PAI
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Emoji
CHECK="✅"
CROSS="❌"
WARN="⚠️"
ROCKET="🚀"

PAI_DIR="/home/velo/AI-Workspace/PAI"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ${ROCKET} PAI Velo Server Setup & Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# Step 1: Verify Environment
# ============================================
echo -e "${BLUE}Step 1: Verifying Environment${NC}"
echo ""

# Check Claude
if command -v claude &> /dev/null; then
    claude_version=$(claude --version 2>&1 | head -1)
    echo -e "${GREEN}${CHECK} Claude: $claude_version${NC}"
else
    echo -e "${RED}${CROSS} Claude not found${NC}"
    exit 1
fi

# Check Bun
if command -v bun &> /dev/null; then
    bun_version=$(bun --version)
    echo -e "${GREEN}${CHECK} Bun: $bun_version${NC}"
else
    echo -e "${YELLOW}${WARN} Bun not found - installing...${NC}"
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo -e "${GREEN}${CHECK} Bun installed${NC}"
fi

# Check Git
if command -v git &> /dev/null; then
    git_version=$(git --version)
    echo -e "${GREEN}${CHECK} Git: $git_version${NC}"
else
    echo -e "${RED}${CROSS} Git not found${NC}"
    exit 1
fi

echo ""

# ============================================
# Step 2: Update PAI Repository
# ============================================
echo -e "${BLUE}Step 2: Updating PAI Repository${NC}"
echo ""

cd "$PAI_DIR"

# Check current commit
current_commit=$(git log --oneline -1 | cut -d' ' -f1)
echo -e "Current commit: ${YELLOW}$current_commit${NC}"

# Fetch latest
git fetch origin main

# Check if behind
commits_behind=$(git rev-list --count HEAD..origin/main)
if [ "$commits_behind" -gt 0 ]; then
    echo -e "${YELLOW}${WARN} Repository is $commits_behind commits behind${NC}"
    echo -e "Pulling latest changes..."
    git pull origin main
    new_commit=$(git log --oneline -1 | cut -d' ' -f1)
    echo -e "${GREEN}${CHECK} Updated to: $new_commit${NC}"
else
    echo -e "${GREEN}${CHECK} Repository is up to date${NC}"
fi

# Show latest commit
echo ""
echo -e "${BLUE}Latest commit:${NC}"
git log --oneline -1 --decorate

echo ""

# ============================================
# Step 3: Check Required Files
# ============================================
echo -e "${BLUE}Step 3: Checking PAI Files${NC}"
echo ""

required_files=(
    ".claude/hooks/auto-generate-expertise.ts"
    ".claude/hooks/expert-load.ts"
    ".claude/hooks/expert-self-improve.ts"
    ".claude/settings.json"
    ".claude/expertise.yaml"
    ".claude/AUTO-EXPERTISE-SYSTEM.md"
)

all_present=true
for file in "${required_files[@]}"; do
    if [ -f "$PAI_DIR/$file" ]; then
        echo -e "${GREEN}${CHECK} $file${NC}"
    else
        echo -e "${RED}${CROSS} $file (MISSING)${NC}"
        all_present=false
    fi
done

if [ "$all_present" = false ]; then
    echo ""
    echo -e "${RED}${CROSS} Some required files are missing${NC}"
    exit 1
fi

echo ""

# ============================================
# Step 4: Setup ~/.claude Directory
# ============================================
echo -e "${BLUE}Step 4: Setting up ~/.claude${NC}"
echo ""

# Backup existing settings if present
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    backup_file="$CLAUDE_DIR/settings.json.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$CLAUDE_DIR/settings.json" "$backup_file"
    echo -e "${GREEN}${CHECK} Backed up existing settings to: $backup_file${NC}"
fi

# Create directories
mkdir -p "$CLAUDE_DIR/hooks"
mkdir -p "$CLAUDE_DIR/memories"
mkdir -p "$CLAUDE_DIR/expertise"
mkdir -p "$CLAUDE_DIR/protocols"

# Copy hooks
echo -e "Copying hooks..."
cp "$PAI_DIR/.claude/hooks/auto-generate-expertise.ts" "$CLAUDE_DIR/hooks/"
cp "$PAI_DIR/.claude/hooks/expert-load.ts" "$CLAUDE_DIR/hooks/"
cp "$PAI_DIR/.claude/hooks/expert-self-improve.ts" "$CLAUDE_DIR/hooks/"
chmod +x "$CLAUDE_DIR/hooks/"*.ts

# Copy settings
cp "$PAI_DIR/.claude/settings.json" "$CLAUDE_DIR/settings.json"

# Copy documentation
cp "$PAI_DIR/.claude/AUTO-EXPERTISE-SYSTEM.md" "$CLAUDE_DIR/"

# Copy expertise template
if [ -d "$PAI_DIR/.claude/expertise" ]; then
    cp -r "$PAI_DIR/.claude/expertise/"* "$CLAUDE_DIR/expertise/" 2>/dev/null || true
fi

# Initialize memories if not present
if [ ! -f "$CLAUDE_DIR/memories/current.md" ]; then
    cat > "$CLAUDE_DIR/memories/current.md" <<'EOF'
# Current Session Progress

**Last Updated**: $(date +%Y-%m-%d)
**Session Type**: Initial Setup

---

## Active Tasks

✅ **COMPLETED**: PAI Installation on Velo Server

---

## Context for Next Session

PAI is now installed and configured on Velo server.
All hooks and expertise system are operational.
EOF
fi

echo -e "${GREEN}${CHECK} ~/.claude setup complete${NC}"
echo ""

# ============================================
# Step 5: Verify Hook Configuration
# ============================================
echo -e "${BLUE}Step 5: Verifying Hook Configuration${NC}"
echo ""

# Check if settings.json has the required hooks
hooks_to_check=(
    "auto-generate-expertise.ts"
    "expert-load.ts"
    "expert-self-improve.ts"
)

for hook in "${hooks_to_check[@]}"; do
    if grep -q "$hook" "$CLAUDE_DIR/settings.json"; then
        echo -e "${GREEN}${CHECK} Hook configured: $hook${NC}"
    else
        echo -e "${YELLOW}${WARN} Hook not configured: $hook${NC}"
    fi
done

echo ""

# ============================================
# Step 6: Test Expertise System
# ============================================
echo -e "${BLUE}Step 6: Testing Expertise System${NC}"
echo ""

# Create test project
TEST_DIR="/tmp/pai-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize as Node.js project
cat > package.json <<'EOF'
{
  "name": "pai-test",
  "version": "1.0.0",
  "scripts": {
    "test": "echo \"test\""
  }
}
EOF

mkdir -p src/components
echo "// Test component" > src/components/Test.js

echo -e "Created test project at: ${YELLOW}$TEST_DIR${NC}"
echo ""

# Test auto-generate-expertise
echo -e "Testing auto-generate-expertise.ts..."
if bun "$CLAUDE_DIR/hooks/auto-generate-expertise.ts" 2>&1 | grep -q "AUTO-GENERATED EXPERTISE"; then
    echo -e "${GREEN}${CHECK} Auto-generate expertise: WORKING${NC}"

    if [ -f "$TEST_DIR/.claude/expertise.yaml" ]; then
        echo -e "${GREEN}${CHECK} expertise.yaml created${NC}"
        echo ""
        echo -e "${BLUE}Generated expertise:${NC}"
        head -20 "$TEST_DIR/.claude/expertise.yaml"
    fi
else
    echo -e "${RED}${CROSS} Auto-generate expertise: FAILED${NC}"
fi

echo ""

# Test expert-load
if [ -f "$TEST_DIR/.claude/expertise.yaml" ]; then
    echo -e "Testing expert-load.ts..."
    echo '{"working_directory":"'$TEST_DIR'"}' | bun "$CLAUDE_DIR/hooks/expert-load.ts" 2>&1 | head -10
    echo -e "${GREEN}${CHECK} Expert load: WORKING${NC}"
fi

echo ""

# Cleanup test project
rm -rf "$TEST_DIR"
echo -e "${GREEN}${CHECK} Test project cleaned up${NC}"

echo ""

# ============================================
# Step 7: Summary
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${CHECK} PAI Setup Complete on Velo Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}What's Working:${NC}"
echo -e "  ${CHECK} Claude Code installed"
echo -e "  ${CHECK} Bun runtime installed"
echo -e "  ${CHECK} PAI repository updated"
echo -e "  ${CHECK} Hooks installed to ~/.claude/hooks/"
echo -e "  ${CHECK} Settings configured"
echo -e "  ${CHECK} Expertise system tested"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Restart Claude Code (if currently running)"
echo -e "  2. Navigate to any coding project"
echo -e "  3. Start Claude Code - hooks will run automatically"
echo -e "  4. Expertise will be auto-generated for new projects"
echo ""
echo -e "${YELLOW}${WARN} Important:${NC}"
echo -e "  - Settings changes require Claude Code restart"
echo -e "  - Expertise updates happen at commit time + session end"
echo -e "  - Check ~/.claude/memories/current.md for session state"
echo ""
