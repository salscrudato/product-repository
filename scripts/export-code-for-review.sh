#!/bin/bash

# Script to export all frontend and backend code to a single markdown file for AI code review
# Generated: $(date)

OUTPUT_FILE="code-review-export.md"

# Clear/create the output file
echo "# Complete Codebase Export for AI Code Review" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the output
add_file() {
    local filepath="$1"
    local extension="${filepath##*.}"
    
    # Determine language for syntax highlighting
    case "$extension" in
        ts|tsx) lang="typescript" ;;
        js|jsx) lang="javascript" ;;
        json) lang="json" ;;
        css) lang="css" ;;
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

echo "Exporting codebase to $OUTPUT_FILE..."

# Count files
file_count=0

# ===== FRONTEND CODE =====
echo "" >> "$OUTPUT_FILE"
echo "# Frontend Code" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Root config files
echo "## Root Configuration Files" >> "$OUTPUT_FILE"
for file in package.json tsconfig.json tsconfig.node.json vite.config.ts firebase.json firestore.rules storage.rules; do
    if [ -f "$file" ]; then
        add_file "$file"
        ((file_count++))
    fi
done

# Main source files
echo "" >> "$OUTPUT_FILE"
echo "## Main Source Files" >> "$OUTPUT_FILE"
for file in src/index.tsx src/App.tsx src/firebase.ts src/styled.d.ts src/vite-env.d.ts; do
    if [ -f "$file" ]; then
        add_file "$file"
        ((file_count++))
    fi
done

# Components
echo "" >> "$OUTPUT_FILE"
echo "## Components" >> "$OUTPUT_FILE"
find src/components -name "*.tsx" -o -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Pages
echo "" >> "$OUTPUT_FILE"
echo "## Pages" >> "$OUTPUT_FILE"
find src/pages -name "*.tsx" -o -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Hooks
echo "" >> "$OUTPUT_FILE"
echo "## Hooks" >> "$OUTPUT_FILE"
find src/hooks -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Services
echo "" >> "$OUTPUT_FILE"
echo "## Services" >> "$OUTPUT_FILE"
find src/services -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Context
echo "" >> "$OUTPUT_FILE"
echo "## Context" >> "$OUTPUT_FILE"
find src/context -name "*.tsx" -o -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Types
echo "" >> "$OUTPUT_FILE"
echo "## Types" >> "$OUTPUT_FILE"
find src/types -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Utils
echo "" >> "$OUTPUT_FILE"
echo "## Utils" >> "$OUTPUT_FILE"
find src/utils -name "*.ts" -o -name "*.tsx" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Config
echo "" >> "$OUTPUT_FILE"
echo "## Config" >> "$OUTPUT_FILE"
find src/config -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Styles
echo "" >> "$OUTPUT_FILE"
echo "## Styles" >> "$OUTPUT_FILE"
find src/styles -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Data
echo "" >> "$OUTPUT_FILE"
echo "## Data" >> "$OUTPUT_FILE"
find src/data -name "*.ts" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Tests
echo "" >> "$OUTPUT_FILE"
echo "## Tests" >> "$OUTPUT_FILE"
find src/__tests__ -name "*.ts" -o -name "*.tsx" 2>/dev/null | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# ===== BACKEND CODE (Firebase Functions) =====
echo "" >> "$OUTPUT_FILE"
echo "# Backend Code (Firebase Functions)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Functions config
if [ -f "functions/package.json" ]; then
    add_file "functions/package.json"
    ((file_count++))
fi

if [ -f "functions/index.js" ]; then
    add_file "functions/index.js"
    ((file_count++))
fi

# All function source files
find functions/src -name "*.js" | sort | while read file; do
    add_file "$file"
    ((file_count++))
done

# Final count
total_files=$(grep -c "^## \`" "$OUTPUT_FILE")
total_lines=$(wc -l < "$OUTPUT_FILE")

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "# Export Summary" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "- **Total Files Exported:** $total_files" >> "$OUTPUT_FILE"
echo "- **Total Lines in Export:** $total_lines" >> "$OUTPUT_FILE"

echo ""
echo "✅ Export complete!"
echo "   Output file: $OUTPUT_FILE"
echo "   Total files: $total_files"
echo "   Total lines: $total_lines"

