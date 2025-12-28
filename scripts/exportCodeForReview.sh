#!/bin/bash

# Script to export all frontend and backend code to a single markdown file for AI review
# Excludes: node_modules, build, public assets, lock files, and non-code files

OUTPUT_FILE="code-review-export.md"

echo "# P&C Insurance Product Management System - Full Code Export" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Generated:** $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "This document contains all functional code files from the frontend (React/TypeScript) and backend (Node.js/Firebase Functions) for external AI code review." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the markdown
add_file() {
    local filepath="$1"
    local extension="${filepath##*.}"
    
    # Determine language for syntax highlighting
    case "$extension" in
        ts|tsx) lang="typescript" ;;
        js|jsx) lang="javascript" ;;
        css) lang="css" ;;
        json) lang="json" ;;
        html) lang="html" ;;
        *) lang="" ;;
    esac
    
    echo "" >> "$OUTPUT_FILE"
    echo "## \`$filepath\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`$lang" >> "$OUTPUT_FILE"
    cat "$filepath" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
}

# Track file count
file_count=0

echo "# Table of Contents" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Root Configuration Files" >> "$OUTPUT_FILE"
echo "## Frontend Source Code (src/)" >> "$OUTPUT_FILE"
echo "## Backend Functions (functions/)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Section 1: Root configuration files
echo "# Root Configuration Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for file in package.json tsconfig.json tsconfig.node.json vite.config.ts firebase.json firestore.rules storage.rules firestore.indexes.json index.html; do
    if [ -f "$file" ]; then
        add_file "$file"
        ((file_count++))
        echo "Added: $file"
    fi
done

# Section 2: Frontend source code
echo "" >> "$OUTPUT_FILE"
echo "# Frontend Source Code" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find all TypeScript/JavaScript/CSS files in src directory
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) | sort | while read -r file; do
    add_file "$file"
    ((file_count++))
    echo "Added: $file"
done

# Section 3: Backend functions
echo "" >> "$OUTPUT_FILE"
echo "# Backend Functions (Firebase Cloud Functions)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Functions package.json
if [ -f "functions/package.json" ]; then
    add_file "functions/package.json"
    echo "Added: functions/package.json"
fi

# Functions index.js (entry point)
if [ -f "functions/index.js" ]; then
    add_file "functions/index.js"
    echo "Added: functions/index.js"
fi

# Find all JS files in functions/src
find functions/src -type f -name "*.js" | sort | while read -r file; do
    add_file "$file"
    echo "Added: $file"
done

# Section 4: Scripts (if any TypeScript test files)
echo "" >> "$OUTPUT_FILE"
echo "# Scripts" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find scripts -type f \( -name "*.ts" -o -name "*.js" \) 2>/dev/null | sort | while read -r file; do
    if [[ "$file" != "scripts/exportCodeForReview.sh" ]]; then
        add_file "$file"
        echo "Added: $file"
    fi
done

# Count total files
total_files=$(grep -c "^## \`" "$OUTPUT_FILE")
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Total Files Exported:** $total_files" >> "$OUTPUT_FILE"

echo ""
echo "========================================"
echo "Export complete!"
echo "Output file: $OUTPUT_FILE"
echo "Total files: $total_files"
echo "========================================"

