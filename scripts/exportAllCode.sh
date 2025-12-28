#!/bin/bash

# Export all frontend and backend code to a single markdown file for AI code review
# This script collects all functional code files and formats them for review

OUTPUT_FILE="code-export-for-review.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Start the markdown file
cat > "$OUTPUT_FILE" << 'EOF'
# Complete Codebase Export for AI Code Review

EOF

echo "Generated on: $TIMESTAMP" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "This file contains all functional frontend and backend code for review." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the markdown
add_file() {
    local filepath="$1"
    local ext="${filepath##*.}"
    
    # Determine language for syntax highlighting
    local lang=""
    case "$ext" in
        ts|tsx) lang="typescript" ;;
        js|jsx) lang="javascript" ;;
        json) lang="json" ;;
        css) lang="css" ;;
        html) lang="html" ;;
        *) lang="" ;;
    esac
    
    echo "## \`$filepath\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`$lang" >> "$OUTPUT_FILE"
    cat "$filepath" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
}

echo "Exporting code files..."

# Add table of contents header
echo "## Table of Contents" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Frontend files
echo "### Frontend (src/)" >> "$OUTPUT_FILE"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    echo "- [\`$file\`](#$(echo "$file" | tr '/' '-' | tr '.' '-' | tr '[:upper:]' '[:lower:]'))" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"
echo "### Backend (functions/)" >> "$OUTPUT_FILE"
find functions/src -type f -name "*.js" | sort | while read -r file; do
    echo "- [\`$file\`](#$(echo "$file" | tr '/' '-' | tr '.' '-' | tr '[:upper:]' '[:lower:]'))" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"
echo "### Configuration Files" >> "$OUTPUT_FILE"
echo "- [\`functions/index.js\`](#functions-index-js)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Export Frontend files
echo "# Frontend Code (src/)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    echo "Adding: $file"
    add_file "$file"
done

# Export Backend files
echo "" >> "$OUTPUT_FILE"
echo "# Backend Code (functions/)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Add main functions index
echo "Adding: functions/index.js"
add_file "functions/index.js"

find functions/src -type f -name "*.js" | sort | while read -r file; do
    echo "Adding: $file"
    add_file "$file"
done

# Count files
frontend_count=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l | tr -d ' ')
backend_count=$(find functions/src -type f -name "*.js" | wc -l | tr -d ' ')
backend_count=$((backend_count + 1))  # +1 for functions/index.js

total_lines=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')

echo ""
echo "========================================="
echo "Export complete!"
echo "========================================="
echo "Output file: $OUTPUT_FILE"
echo "Frontend files: $frontend_count"
echo "Backend files: $backend_count"
echo "Total files: $((frontend_count + backend_count))"
echo "Total lines in export: $total_lines"
echo "========================================="

