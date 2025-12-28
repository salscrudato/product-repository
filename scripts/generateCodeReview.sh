#!/bin/bash

# Script to export all functional code files for external AI code review
# Outputs a single markdown file with file paths and contents

OUTPUT_FILE="code-review-export.md"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

# Start the markdown file
cat > "$OUTPUT_FILE" << 'EOF'
# Code Review Export

This document contains all functional code files from the repository for external AI code review.

Generated on: $(date)

---

EOF

# Replace the date placeholder
sed -i '' "s/\$(date)/$(date)/" "$OUTPUT_FILE" 2>/dev/null || sed -i "s/\$(date)/$(date)/" "$OUTPUT_FILE"

# Function to add a file to the output
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

# Counter for files processed
file_count=0

echo "Exporting functional code files..."

# Frontend source files (TypeScript/TSX)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    add_file "$file"
    ((file_count++))
done

# Backend functions files (JavaScript)
find functions/src -type f -name "*.js" | sort | while read -r file; do
    add_file "$file"
    ((file_count++))
done

# Root function entry point
if [ -f "functions/index.js" ]; then
    add_file "functions/index.js"
fi

# Count total files
total_files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l)
total_files=$((total_files + $(find functions/src -type f -name "*.js" | wc -l)))
if [ -f "functions/index.js" ]; then
    total_files=$((total_files + 1))
fi

echo ""
echo "✅ Export complete!"
echo "📄 Output file: $OUTPUT_FILE"
echo "📊 Total files exported: $total_files"
echo ""
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"

