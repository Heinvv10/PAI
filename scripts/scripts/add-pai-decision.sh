#!/usr/bin/env bash
#
# PAI DECISION_LOG (ADR) Entry Helper
# Adds Architecture Decision Records to PAI_DECISION_LOG.md in <30 seconds
#
# Usage: ./add-pai-decision.sh
# Interactive or piped input (4 lines: title, context, decision, consequences)
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
DECISION_PATH="${CLAUDE_DIR}/PAI_DECISION_LOG.md"

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

# Get next ADR number
get_next_adr_number() {
    if [[ ! -f "$DECISION_PATH" ]]; then
        echo "001"
        return
    fi

    # Find all ADR numbers
    local max_num=0
    while IFS= read -r line; do
        if [[ "$line" =~ \#[[:space:]]ADR-([0-9]+): ]]; then
            local num="${BASH_REMATCH[1]}"
            # Remove leading zeros for arithmetic
            num=$((10#$num))
            if [[ $num -gt $max_num ]]; then
                max_num=$num
            fi
        fi
    done < "$DECISION_PATH"

    # Increment and format with leading zeros
    local next_num=$((max_num + 1))
    printf "%03d" "$next_num"
}

# Main function
main() {
    # Check if DECISION_LOG exists
    if [[ ! -f "$DECISION_PATH" ]]; then
        error_exit "PAI_DECISION_LOG.md not found at $DECISION_PATH"
    fi

    # Detect interactive mode
    INTERACTIVE=false
    if [[ -t 0 ]]; then
        INTERACTIVE=true
    fi

    # Get next ADR number
    adr_num=$(get_next_adr_number)

    if [[ "$INTERACTIVE" == true ]]; then
        echo -e "${GREEN}PAI DECISION_LOG (ADR) Entry Helper${NC}"
        echo "================================"
        echo ""
        echo -e "Creating: ${YELLOW}ADR-${adr_num}${NC}"
        echo ""
        echo -n "Decision title: "
    fi

    # Get inputs (4 lines: title, context, decision, consequences)
    read -r title
    validate_not_empty "$title" || error_exit "Title cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Context: "
    read -r context
    validate_not_empty "$context" || error_exit "Context cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Decision: "
    read -r decision
    validate_not_empty "$decision" || error_exit "Decision cannot be empty"

    [[ "$INTERACTIVE" == true ]] && echo -n "Consequences: "
    read -r consequences
    validate_not_empty "$consequences" || error_exit "Consequences cannot be empty"

    # Get current date
    current_date=$(date +%Y-%m-%d)

    # Create backup
    cp "$DECISION_PATH" "${DECISION_PATH}.backup"

    # Create ADR entry
    TEMP_ENTRY=$(mktemp)
    cat > "$TEMP_ENTRY" << EOF

# ADR-${adr_num}: ${title}

**Date**: ${current_date}
**Status**: Accepted
**Deciders**: Claude (Kai)

## Context

${context}

## Decision

${decision}

## Consequences

### Positive
- ✅ ${consequences}

---
EOF

    # Insert before template section
    TEMP_FILE=$(mktemp)
    INSERTED=false

    while IFS= read -r line; do
        if [[ "$INSERTED" == false ]] && [[ "$line" =~ ^\#\#[[:space:]]ADR[[:space:]]Template ]]; then
            cat "$TEMP_ENTRY" >> "$TEMP_FILE"
            INSERTED=true
        fi
        echo "$line" >> "$TEMP_FILE"
    done < "$DECISION_PATH"

    if [[ "$INSERTED" == false ]]; then
        cat "$TEMP_ENTRY" >> "$TEMP_FILE"
    fi

    # Atomic replace
    mv "$TEMP_FILE" "$DECISION_PATH"
    rm -f "$TEMP_ENTRY" "${DECISION_PATH}.backup"

    [[ "$INTERACTIVE" == true ]] && echo -e "\n${GREEN}✓ ADR-${adr_num} added successfully${NC}"
}

# Run main function
main
