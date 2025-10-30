#!/bin/bash

# Consolidate all frontend and backend code into a single file for external review
# This script creates a comprehensive code review document with all source files

OUTPUT_FILE="/Users/salscrudato/Projects/product-repository/COMPLETE_CODEBASE_REVIEW.txt"

# Clear the output file
> "$OUTPUT_FILE"

# Add header
cat >> "$OUTPUT_FILE" << 'HEADER'
================================================================================
                    COMPLETE CODEBASE REVIEW
                Insurance Product Management Application
================================================================================

This document contains the complete source code for both frontend and backend
of the insurance product management application. All files are organized by
directory structure for easy navigation.

Generated: $(date)
Repository: /Users/salscrudato/Projects/product-repository

================================================================================
                            TABLE OF CONTENTS
================================================================================

1. CONFIGURATION FILES
2. FRONTEND SOURCE CODE
   - Root Files
   - Components
   - Services
   - Utilities
   - Hooks
   - Styles
3. BACKEND SOURCE CODE (Firebase Functions)
   - Configuration
   - Main Entry Point
   - API Handlers
   - Services
   - Triggers
   - Middleware
   - Utilities

================================================================================
                        1. CONFIGURATION FILES
================================================================================

HEADER

# Add configuration files
echo "" >> "$OUTPUT_FILE"
echo "--- package.json (Root) ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/package.json >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- tsconfig.json ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/tsconfig.json >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- vite.config.ts ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/vite.config.ts >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- tailwind.config.js ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/tailwind.config.js >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- functions/package.json ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/functions/package.json >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Add frontend section header
cat >> "$OUTPUT_FILE" << 'FRONTEND_HEADER'

================================================================================
                    2. FRONTEND SOURCE CODE
================================================================================

FRONTEND_HEADER

# Add root frontend files
echo "" >> "$OUTPUT_FILE"
echo "--- src/index.tsx ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/src/index.tsx >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- src/App.tsx ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/src/App.tsx >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- src/firebase.ts ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/src/firebase.ts >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Add all component files
echo "" >> "$OUTPUT_FILE"
echo "--- COMPONENTS ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/src/components -type f \( -name "*.tsx" -o -name "*.ts" \) | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all service files
echo "" >> "$OUTPUT_FILE"
echo "--- SERVICES ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/src/services -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all utility files
echo "" >> "$OUTPUT_FILE"
echo "--- UTILITIES ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/src/utils -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all hook files
echo "" >> "$OUTPUT_FILE"
echo "--- HOOKS ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/src/hooks -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add backend section header
cat >> "$OUTPUT_FILE" << 'BACKEND_HEADER'

================================================================================
                    3. BACKEND SOURCE CODE (Firebase Functions)
================================================================================

BACKEND_HEADER

# Add functions configuration
echo "" >> "$OUTPUT_FILE"
echo "--- functions/index.js ---" >> "$OUTPUT_FILE"
cat /Users/salscrudato/Projects/product-repository/functions/index.js >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Add all API handlers
echo "" >> "$OUTPUT_FILE"
echo "--- API HANDLERS ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/functions/src/api -type f -name "*.js" | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all services
echo "" >> "$OUTPUT_FILE"
echo "--- BACKEND SERVICES ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/functions/src/services -type f -name "*.js" | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all triggers
echo "" >> "$OUTPUT_FILE"
echo "--- TRIGGERS ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/functions/src/triggers -type f -name "*.js" | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all middleware
echo "" >> "$OUTPUT_FILE"
echo "--- MIDDLEWARE ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/functions/src/middleware -type f -name "*.js" | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add all backend utilities
echo "" >> "$OUTPUT_FILE"
echo "--- BACKEND UTILITIES ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find /Users/salscrudato/Projects/product-repository/functions/src/utils -type f -name "*.js" | sort | while read file; do
    relative_path="${file#/Users/salscrudato/Projects/product-repository/}"
    echo "--- $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add footer
cat >> "$OUTPUT_FILE" << 'FOOTER'

================================================================================
                            END OF CODEBASE REVIEW
================================================================================

This document contains the complete source code for the insurance product
management application. All code is organized by directory structure for
easy navigation and review.

For questions or clarifications, please refer to the repository structure
and configuration files included at the beginning of this document.

================================================================================
FOOTER

echo "✓ Code consolidation complete!"
echo "✓ Output file: $OUTPUT_FILE"
echo "✓ File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "✓ Total lines: $(wc -l < "$OUTPUT_FILE")"

