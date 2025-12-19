#!/usr/bin/env bash
#
# PAI OPERATIONS_LOG Entry Helper
# Adds operation entries to PAI_OPERATIONS_LOG.md in <30 seconds
#
# Usage: ./add-pai-operation.sh
# Interactive or piped input
#
# Protocol: Doc-Driven TDD, Zero Tolerance (no console.log)

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
CLAUDE_DIR="${HOME}/.claude"
OPERATIONS_PATH="${CLAUDE_DIR}/PAI_OPERATIONS_LOG.md"

# Valid types and severities
VALID_TYPES=("Deployment" "Migration" "Configuration" "Incident" "Maintenance")
VALID_SEVERITIES=("Critical" "High" "Medium" "Low" "Info")

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Validation
validate_not_empty() {
    local value="$1"
    if [[ -z "$value" || "$value" =~ ^[[:space:]]*$ ]]; then
        return 1
    fi
    return 0
}

# Main function
main() {
    # Check if OPERATIONS_LOG exists
    if [[ ! -f "$OPERATIONS_PATH" ]]; then
        error_exit "PAI_OPERATIONS_LOG.md not found at $OPERATIONS_PATH"
    fi

    # Detect interactive mode
    INTERACTIVE=false
    if [[ -t 0 ]]; then
        INTERACTIVE=true
        echo -e "${GREEN}PAI OPERATIONS_LOG Entry Helper${NC}"
        echo "================================"
        echo ""
        echo -n "Operation title: "
    fi

    # Get inputs
    read -r title
    validate_not_empty "$title" || error_exit "Title cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Type (Deployment/Migration/Configuration/Incident/Maintenance): "
    read -r op_type
    validate_not_empty "$op_type" || error_exit "Type cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Severity (Critical/High/Medium/Low/Info): "
    read -r severity
    validate_not_empty "$severity" || error_exit "Severity cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Summary: "
    read -r summary
    validate_not_empty "$summary" || error_exit "Summary cannot be empty"

    # Get current date
    current_date=$(date +%Y-%m-%d)

    # Create backup
    cp "$OPERATIONS_PATH" "${OPERATIONS_PATH}.backup"

    # Create entry
    TEMP_ENTRY=$(mktemp)
    cat > "$TEMP_ENTRY" << EOF

## [$current_date]

### $title

**Type**: $op_type
**Severity**: $severity
**Status**: Completed
**Duration**: $current_date

#### Summary
$summary

#### What Was Done
1. (Add steps here)

---
EOF

    # Insert before template section
    TEMP_FILE=$(mktemp)
    INSERTED=false

    while IFS= read -r line; do
        if [[ "$INSERTED" == false ]] && [[ "$line" =~ ^\#\#[[:space:]]Operations[[:space:]]Log[[:space:]]Template ]]; then
            cat "$TEMP_ENTRY" >> "$TEMP_FILE"
            INSERTED=true
        fi
        echo "$line" >> "$TEMP_FILE"
    done < "$OPERATIONS_PATH"

    if [[ "$INSERTED" == false ]]; then
        cat "$TEMP_ENTRY" >> "$TEMP_FILE"
    fi

    # Atomic replace
    mv "$TEMP_FILE" "$OPERATIONS_PATH"
    rm -f "$TEMP_ENTRY" "${OPERATIONS_PATH}.backup"

    [[ "$INTERACTIVE" == true ]] && echo -e "\n${GREEN}✓ Operation entry added successfully${NC}"
}

# Run main function
main
