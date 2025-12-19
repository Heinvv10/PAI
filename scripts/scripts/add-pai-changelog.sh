#!/usr/bin/env bash
#
# PAI CHANGELOG Entry Helper
# Adds entries to PAI_CHANGELOG.md in <30 seconds
#
# Usage: ./add-pai-changelog.sh
# Interactive prompts for category and description
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
CHANGELOG_PATH="${CLAUDE_DIR}/PAI_CHANGELOG.md"

# Valid categories
VALID_CATEGORIES=("Added" "Changed" "Deprecated" "Removed" "Fixed" "Security" "Improved" "Infrastructure")

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Validation
validate_category() {
    local category="$1"
    for valid in "${VALID_CATEGORIES[@]}"; do
        if [[ "$category" == "$valid" ]]; then
            return 0
        fi
    done
    return 1
}

validate_description() {
    local desc="$1"
    if [[ -z "$desc" || "$desc" =~ ^[[:space:]]*$ ]]; then
        return 1
    fi
    return 0
}

# Main function
main() {
    # Check if CHANGELOG exists
    if [[ ! -f "$CHANGELOG_PATH" ]]; then
        error_exit "PAI_CHANGELOG.md not found at $CHANGELOG_PATH"
    fi

    # Detect if running interactively
    if [[ -t 0 ]]; then
        # Interactive mode
        echo -e "${GREEN}PAI CHANGELOG Entry Helper${NC}"
        echo "================================"
        echo ""
        echo "Valid categories:"
        for i in "${!VALID_CATEGORIES[@]}"; do
            echo "  $((i+1)). ${VALID_CATEGORIES[$i]}"
        done
        echo ""
        echo -n "Enter category (1-${#VALID_CATEGORIES[@]} or name): "
    fi

    # Get category
    read -r category_input

    # Check if input is a number or category name
    if [[ "$category_input" =~ ^[0-9]+$ ]]; then
        # It's a number
        category_num="$category_input"
        if [[ "$category_num" -lt 1 ]] || [[ "$category_num" -gt "${#VALID_CATEGORIES[@]}" ]]; then
            error_exit "Invalid category number. Must be 1-${#VALID_CATEGORIES[@]}"
        fi
        category="${VALID_CATEGORIES[$((category_num-1))]}"
    else
        # It's a category name - validate it exists
        category="$category_input"
        if ! validate_category "$category"; then
            error_exit "Invalid category. Must be one of: ${VALID_CATEGORIES[*]}"
        fi
    fi

    if [[ -t 0 ]]; then
        echo ""
        echo -e "Selected: ${YELLOW}$category${NC}"
        echo ""
        echo -n "Enter description: "
    fi

    # Get description
    read -r description

    # Validate description
    if ! validate_description "$description"; then
        error_exit "Description cannot be empty"
    fi

    # Create backup
    cp "$CHANGELOG_PATH" "${CHANGELOG_PATH}.backup"

    # Find [Unreleased] section and add entry
    # Use temporary file for atomic update
    TEMP_FILE=$(mktemp)

    # Track if we found and updated the section
    FOUND_UNRELEASED=false
    FOUND_CATEGORY=false
    IN_UNRELEASED=false

    while IFS= read -r line; do
        echo "$line" >> "$TEMP_FILE"

        # Detect [Unreleased] section
        if [[ "$line" =~ ^\#\#[[:space:]]\[Unreleased\] ]]; then
            FOUND_UNRELEASED=true
            IN_UNRELEASED=true
            continue
        fi

        # Detect next version section (end of Unreleased)
        if [[ "$IN_UNRELEASED" == true ]] && [[ "$line" =~ ^\#\#[[:space:]]\[[0-9] ]]; then
            IN_UNRELEASED=false
        fi

        # Look for category within Unreleased
        if [[ "$IN_UNRELEASED" == true ]] && [[ "$line" =~ ^\#\#\#[[:space:]]${category} ]]; then
            FOUND_CATEGORY=true
            # Add entry immediately after category header
            echo "- $description" >> "$TEMP_FILE"
        fi
    done < "$CHANGELOG_PATH"

    # If category not found in Unreleased section, we need to add it
    if [[ "$FOUND_UNRELEASED" == true ]] && [[ "$FOUND_CATEGORY" == false ]]; then
        # Recreate file with new category
        rm "$TEMP_FILE"
        TEMP_FILE=$(mktemp)
        IN_UNRELEASED=false

        while IFS= read -r line; do
            echo "$line" >> "$TEMP_FILE"

            # After [Unreleased] header, add empty line, new category, and entry
            if [[ "$line" =~ ^\#\#[[:space:]]\[Unreleased\] ]]; then
                IN_UNRELEASED=true
                echo "" >> "$TEMP_FILE"
                echo "### $category" >> "$TEMP_FILE"
                echo "- $description" >> "$TEMP_FILE"
                continue
            fi
        done < "$CHANGELOG_PATH"
    fi

    # Atomic replace
    mv "$TEMP_FILE" "$CHANGELOG_PATH"

    echo ""
    echo -e "${GREEN}✓ Entry added successfully${NC}"
    echo ""
    echo "Category: $category"
    echo "Description: $description"
    echo ""
    echo "File: $CHANGELOG_PATH"

    # Remove backup if successful
    rm -f "${CHANGELOG_PATH}.backup"

    if [[ -t 0 ]]; then
        # Only show success message in interactive mode
        :  # Command already shown above
    fi
}

# Run main function
main
