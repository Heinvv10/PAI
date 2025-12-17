#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Get Digital Assistant configuration from environment
DA_NAME="${DA:-Assistant}"  # Assistant name
DA_COLOR="${DA_COLOR:-purple}"  # Color for the assistant name

# Extract data from JSON input
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
model_name=$(echo "$input" | jq -r '.model.display_name')

# Get directory name
dir_name=$(basename "$current_dir")

# Cache file and lock file for ccusage data
CACHE_FILE="/tmp/.claude_ccusage_cache"
LOCK_FILE="/tmp/.claude_ccusage.lock"
CACHE_AGE=30   # 30 seconds for more real-time updates

# Count items from specified directories
# Check both user .claude and PAI .claude directories
claude_dir="${PAI_DIR:-$HOME/.claude}"
pai_dir="/home/hein/PAI/.claude"

commands_count=0
mcps_count=0
fobs_count=0
fabric_count=0

# Count commands from both locations
if [ -d "$claude_dir/commands" ]; then
    commands_count=$(ls -1 "$claude_dir/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi
if [ -d "$pai_dir/commands" ] && [ "$claude_dir" != "$pai_dir" ]; then
    pai_commands=$(ls -1 "$pai_dir/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
    commands_count=$((commands_count + pai_commands))
fi

# Count MCPs from .mcp.json - prefer PAI location
mcp_names_raw=""
if [ -f "$pai_dir/.mcp.json" ]; then
    mcp_data=$(jq -r '.mcpServers | keys | join(" "), length' "$pai_dir/.mcp.json" 2>/dev/null)
    mcp_names_raw=$(echo "$mcp_data" | head -1)
    mcps_count=$(echo "$mcp_data" | tail -1)
elif [ -f "$claude_dir/.mcp.json" ]; then
    mcp_data=$(jq -r '.mcpServers | keys | join(" "), length' "$claude_dir/.mcp.json" 2>/dev/null)
    mcp_names_raw=$(echo "$mcp_data" | head -1)
    mcps_count=$(echo "$mcp_data" | tail -1)
else
    mcps_count="0"
fi

# Count Services (optimized - count .md files directly)
services_dir="${HOME}/Projects/FoundryServices/Services"
if [ -d "$services_dir" ]; then
    fobs_count=$(ls -1 "$services_dir/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count Fabric patterns (optimized - count subdirectories)
# Check PAI location first, then user location, then system-wide
fabric_patterns_dir=""
if [ -d "$pai_dir/skills/fabric/fabric-repo/data/patterns" ]; then
    fabric_patterns_dir="$pai_dir/skills/fabric/fabric-repo/data/patterns"
elif [ -d "$claude_dir/skills/fabric/fabric-repo/data/patterns" ]; then
    fabric_patterns_dir="$claude_dir/skills/fabric/fabric-repo/data/patterns"
elif [ -d "${HOME}/.config/fabric/patterns" ]; then
    fabric_patterns_dir="${HOME}/.config/fabric/patterns"
fi

if [ -n "$fabric_patterns_dir" ] && [ -d "$fabric_patterns_dir" ]; then
    # Count immediate subdirectories only
    fabric_count=$(find "$fabric_patterns_dir" -maxdepth 1 -type d -not -path "$fabric_patterns_dir" 2>/dev/null | wc -l | tr -d ' ')
fi

# Get cached ccusage data - SAFE VERSION without background processes
daily_tokens=""
daily_cost=""

# Check if cache exists and load it
if [ -f "$CACHE_FILE" ]; then
    # Always load cache data first (if it exists)
    source "$CACHE_FILE"
fi

# If cache is stale, missing, or we have no data, update it SYNCHRONOUSLY with timeout
cache_needs_update=false
if [ ! -f "$CACHE_FILE" ] || [ -z "$daily_tokens" ]; then
    cache_needs_update=true
elif [ -f "$CACHE_FILE" ]; then
    cache_age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0)))
    if [ $cache_age -ge $CACHE_AGE ]; then
        cache_needs_update=true
    fi
fi

if [ "$cache_needs_update" = true ]; then
    # Try to acquire lock (non-blocking)
    if mkdir "$LOCK_FILE" 2>/dev/null; then
        # We got the lock - update cache with timeout
        if command -v bunx >/dev/null 2>&1; then
            # Run ccusage with a timeout (5 seconds for faster updates)
            # Check if gtimeout is available (macOS), otherwise try timeout (Linux)
            if command -v gtimeout >/dev/null 2>&1; then
                ccusage_output=$(gtimeout 5 bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            elif command -v timeout >/dev/null 2>&1; then
                ccusage_output=$(timeout 5 bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            else
                # Fallback without timeout (but faster than before)
                ccusage_output=$(bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            fi

            if [ -n "$ccusage_output" ]; then
                # Extract input/output tokens, removing commas and ellipsis
                daily_input=$(echo "$ccusage_output" | awk -F'│' '{print $4}' | sed 's/[^0-9]//g' | head -c 10)
                daily_output=$(echo "$ccusage_output" | awk -F'│' '{print $5}' | sed 's/[^0-9]//g' | head -c 10)
                # Extract cost, keep the dollar sign
                daily_cost=$(echo "$ccusage_output" | awk -F'│' '{print $9}' | sed 's/^ *//;s/ *$//')

                if [ -n "$daily_input" ] && [ -n "$daily_output" ]; then
                    daily_total=$((daily_input + daily_output))
                    daily_tokens=$(printf "%'d" "$daily_total" 2>/dev/null || echo "$daily_total")

                    # Write to cache file (properly escape dollar sign)
                    echo "daily_tokens=\"$daily_tokens\"" > "$CACHE_FILE"
                    # Use printf to properly escape the dollar sign in the cost
                    printf "daily_cost=\"%s\"\n" "${daily_cost//$/\\$}" >> "$CACHE_FILE"
                    # Add timestamp for debugging
                    echo "cache_updated=\"$(date)\"" >> "$CACHE_FILE"
                fi
            fi
        fi

        # Always remove lock when done
        rmdir "$LOCK_FILE" 2>/dev/null
    else
        # Someone else is updating - check if lock is stale (older than 30 seconds)
        if [ -d "$LOCK_FILE" ]; then
            lock_age=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0)))
            if [ $lock_age -gt 30 ]; then
                # Stale lock - remove it and try again
                rmdir "$LOCK_FILE" 2>/dev/null
            fi
        fi

        # Just use cached data if available
        if [ -f "$CACHE_FILE" ]; then
            source "$CACHE_FILE"
        fi
    fi
fi

# Tokyo Night Storm Color Scheme
BACKGROUND='\033[48;2;36;40;59m'
BRIGHT_PURPLE='\033[38;2;187;154;247m'
BRIGHT_BLUE='\033[38;2;122;162;247m'
DARK_BLUE='\033[38;2;100;140;200m'
BRIGHT_GREEN='\033[38;2;158;206;106m'
DARK_GREEN='\033[38;2;130;170;90m'
BRIGHT_ORANGE='\033[38;2;255;158;100m'
BRIGHT_RED='\033[38;2;247;118;142m'
BRIGHT_CYAN='\033[38;2;125;207;255m'
BRIGHT_MAGENTA='\033[38;2;187;154;247m'
BRIGHT_YELLOW='\033[38;2;224;175;104m'

# Map DA_COLOR to actual ANSI color code
case "$DA_COLOR" in
    "purple") DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;
    "blue") DA_DISPLAY_COLOR="$BRIGHT_BLUE" ;;
    "green") DA_DISPLAY_COLOR="$BRIGHT_GREEN" ;;
    "cyan") DA_DISPLAY_COLOR="$BRIGHT_CYAN" ;;
    "magenta") DA_DISPLAY_COLOR="$BRIGHT_MAGENTA" ;;
    "yellow") DA_DISPLAY_COLOR="$BRIGHT_YELLOW" ;;
    "red") DA_DISPLAY_COLOR="$BRIGHT_RED" ;;
    "orange") DA_DISPLAY_COLOR="$BRIGHT_ORANGE" ;;
    *) DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;  # Default to purple
esac

# Line-specific colors
LINE1_PRIMARY="$BRIGHT_PURPLE"
LINE1_ACCENT='\033[38;2;160;130;210m'
MODEL_PURPLE='\033[38;2;138;99;210m'

LINE2_PRIMARY="$DARK_BLUE"
LINE2_ACCENT='\033[38;2;110;150;210m'

LINE3_PRIMARY="$DARK_GREEN"
LINE3_ACCENT='\033[38;2;140;180;100m'
COST_COLOR="$LINE3_ACCENT"
TOKENS_COLOR='\033[38;2;169;177;214m'

SEPARATOR_COLOR='\033[38;2;140;152;180m'
DIR_COLOR='\033[38;2;135;206;250m'

# MCP colors
MCP_DAEMON="$BRIGHT_BLUE"
MCP_STRIPE="$LINE2_ACCENT"
MCP_DEFAULT="$LINE2_PRIMARY"

RESET='\033[0m'

# Format MCP names efficiently
mcp_names_formatted=""
for mcp in $mcp_names_raw; do
    case "$mcp" in
        "daemon") formatted="${MCP_DAEMON}Daemon${RESET}" ;;
        "stripe") formatted="${MCP_STRIPE}Stripe${RESET}" ;;
        "httpx") formatted="${MCP_DEFAULT}HTTPx${RESET}" ;;
        "brightdata") formatted="${MCP_DEFAULT}BrightData${RESET}" ;;
        "naabu") formatted="${MCP_DEFAULT}Naabu${RESET}" ;;
        "apify") formatted="${MCP_DEFAULT}Apify${RESET}" ;;
        "content") formatted="${MCP_DEFAULT}Content${RESET}" ;;
        "Ref") formatted="${MCP_DEFAULT}Ref${RESET}" ;;
        "pai") formatted="${MCP_DEFAULT}Foundry${RESET}" ;;
        "playwright") formatted="${MCP_DEFAULT}Playwright${RESET}" ;;
        *) formatted="${MCP_DEFAULT}${mcp^}${RESET}" ;;
    esac

    if [ -z "$mcp_names_formatted" ]; then
        mcp_names_formatted="$formatted"
    else
        mcp_names_formatted="$mcp_names_formatted${SEPARATOR_COLOR}, ${formatted}"
    fi
done

# ==============================================================================
# TWO-LINE STATUSLINE IMPLEMENTATION
# ==============================================================================
# Line 1: ccusage professional metrics (context, timing, costs, burn rate)
# Line 2: PAI-specific metrics (project, git, infrastructure counts)

# --------------------------------------------------
# LINE 1: Call ccusage statusline
# --------------------------------------------------
# Pass the JSON input to ccusage for professional metrics display
# Includes: Model, Context %, Session time, Costs, Block timer, Burn rate
line1_output=$(echo "$input" | bunx ccusage statusline \
  --visual-burn-rate emoji \
  --context-low-threshold 50 \
  --context-medium-threshold 80 \
  --cost-source auto 2>/dev/null)

# Prepend DA name to ccusage output
if [ -n "$line1_output" ]; then
  line1="${DA_DISPLAY_COLOR}🤖 ${DA_NAME}${RESET} | ${line1_output}"
else
  # Fallback if ccusage fails
  line1="${DA_DISPLAY_COLOR}${DA_NAME}${RESET}${LINE1_PRIMARY} | ${MODEL_PURPLE}🧠 ${model_name}${RESET} | ${DIR_COLOR}📁 ${dir_name}${RESET}"
fi

# --------------------------------------------------
# LINE 2: PAI Metrics + Enhanced Git Stats
# --------------------------------------------------

# Get git information
git_branch=$(git branch --show-current 2>/dev/null)
git_display=""

if [ -n "$git_branch" ]; then
  # Extract line changes from JSON input
  lines_added=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
  lines_removed=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')

  # Get count of uncommitted changes
  uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

  # Determine branch color
  if [ "$git_branch" = "main" ] || [ "$git_branch" = "master" ]; then
    branch_color="$BRIGHT_RED"
  else
    branch_color="$BRIGHT_CYAN"
  fi

  # Build git display
  git_display="${branch_color}🌿 ${git_branch}${RESET}"

  # Add uncommitted files if any
  if [ "$uncommitted" -gt 0 ]; then
    git_display="${git_display}${LINE2_ACCENT} • ${uncommitted} files${RESET}"
  fi

  # Add line changes
  git_display="${git_display}${LINE2_PRIMARY} (+${lines_added} -${lines_removed})${RESET}"
else
  git_display="${LINE2_PRIMARY}🌿 no-git${RESET}"
fi

# Build Line 2 with PAI metrics
# Note: Use printf with %s for dir_name to avoid variable expansion issues
line2_prefix=$(printf "${DIR_COLOR}📁 %s${RESET}" "$dir_name")
line2="${line2_prefix}${LINE2_PRIMARY} | ${git_display}${LINE2_PRIMARY} | ${RESET}${LINE2_PRIMARY}🔧 ${fobs_count} Services${RESET}${LINE2_PRIMARY} | ${RESET}${LINE2_PRIMARY}⚙️ ${commands_count} Commands${RESET}${LINE2_PRIMARY} | ${RESET}${LINE2_PRIMARY}🔌 ${mcps_count} MCPs${RESET}${LINE2_PRIMARY} | ${RESET}${LINE2_PRIMARY}📚 ${fabric_count} Patterns${RESET}"

# --------------------------------------------------
# Output both lines
# --------------------------------------------------
printf "%b\n%b\n" "$line1" "$line2"