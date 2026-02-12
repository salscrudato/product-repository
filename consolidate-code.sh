#!/bin/bash

# Script to consolidate all frontend and backend code files into a single file for AI code review
# Output file name
OUTPUT_FILE="code-review-bundle.txt"

# Remove existing output file if it exists
rm -f "$OUTPUT_FILE"

# Add header to the output file
echo "================================================================================" >> "$OUTPUT_FILE"
echo "AI CODE REVIEW BUNDLE" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "Project: AI-Powered Insurance Product Hub" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Counter for files processed
file_count=0

# Find all frontend (src/) and backend (functions/) code files
# Excluding node_modules, test files, and build artifacts
find src functions -type f \( \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.js" -o \
    -name "*.jsx" \
\) ! -path "*/node_modules/*" ! -path "*/__tests__/*" ! -name "*.test.*" ! -name "*.spec.*" | sort | while read -r filepath; do
    echo "Processing: $filepath"
    
    # Add file separator and path
    echo "" >> "$OUTPUT_FILE"
    echo "================================================================================" >> "$OUTPUT_FILE"
    echo "FILE: $filepath" >> "$OUTPUT_FILE"
    echo "================================================================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    # Add file contents
    cat "$filepath" >> "$OUTPUT_FILE"
    
    # Add newline after file content
    echo "" >> "$OUTPUT_FILE"
    
    ((file_count++))
done

# Also include important config files
for config_file in "firebase.json" "firestore.rules" "storage.rules" "tsconfig.json" "vite.config.ts" "package.json" "functions/package.json"; do
    if [ -f "$config_file" ]; then
        echo "Processing config: $config_file"
        echo "" >> "$OUTPUT_FILE"
        echo "================================================================================" >> "$OUTPUT_FILE"
        echo "FILE: $config_file" >> "$OUTPUT_FILE"
        echo "================================================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$config_file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# Add summary at the end
echo "" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "END OF CODE REVIEW BUNDLE" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"

# Count total files and lines
total_files=$(find src functions -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/__tests__/*" ! -name "*.test.*" ! -name "*.spec.*" | wc -l)
total_lines=$(wc -l < "$OUTPUT_FILE")

echo ""
echo "============================================"
echo "Code consolidation complete!"
echo "Output file: $OUTPUT_FILE"
echo "Total code files processed: $total_files"
echo "Total lines in bundle: $total_lines"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "============================================"

