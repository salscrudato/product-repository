#!/bin/bash

# Script to collect all frontend and backend code into a single text file
# Output file
OUTPUT_FILE="codebase-collection.txt"

# Remove existing output file if it exists
rm -f "$OUTPUT_FILE"

echo "Collecting codebase into $OUTPUT_FILE..."
echo "========================================" >> "$OUTPUT_FILE"
echo "CODEBASE COLLECTION" >> "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the collection
add_file() {
    local file="$1"
    echo "" >> "$OUTPUT_FILE"
    echo "========================================" >> "$OUTPUT_FILE"
    echo "FILE: $file" >> "$OUTPUT_FILE"
    echo "========================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
}

# Frontend source files
echo "Collecting frontend source files..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) | while read file; do
    add_file "$file"
done

# Backend/Functions files
echo "Collecting backend/functions files..."
find functions/src -type f \( -name "*.ts" -o -name "*.js" \) 2>/dev/null | while read file; do
    add_file "$file"
done

# Root level functions file
if [ -f "functions/index.js" ]; then
    add_file "functions/index.js"
fi

# Configuration files
echo "Collecting configuration files..."
for config_file in \
    "package.json" \
    "tsconfig.json" \
    "tsconfig.node.json" \
    "vite.config.ts" \
    "firebase.json" \
    "firestore.rules" \
    "firestore.indexes.json" \
    "storage.rules" \
    "functions/package.json" \
    "index.html" \
    "public/index.html"
do
    if [ -f "$config_file" ]; then
        add_file "$config_file"
    fi
done

# Scripts
echo "Collecting scripts..."
find scripts -type f \( -name "*.ts" -o -name "*.js" \) 2>/dev/null | while read file; do
    add_file "$file"
done

echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "END OF CODEBASE COLLECTION" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Count files and lines
file_count=$(grep -c "^FILE: " "$OUTPUT_FILE")
line_count=$(wc -l < "$OUTPUT_FILE")

echo ""
echo "Collection complete!"
echo "Output file: $OUTPUT_FILE"
echo "Files collected: $file_count"
echo "Total lines: $line_count"
echo ""

