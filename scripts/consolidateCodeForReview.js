#!/usr/bin/env node

/**
 * Consolidate all frontend and backend code files into a single text file
 * for external AI review.
 * 
 * Usage: node scripts/consolidateCodeForReview.js
 * Output: CODE_REVIEW_CONSOLIDATED.txt in repository root
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(REPO_ROOT, 'CODE_REVIEW_CONSOLIDATED.txt');

// File extensions to include
const INCLUDE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.css', '.scss',
  '.html', '.env.example'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  'build',
  'dist',
  '.turbo',
  '.git',
  '.firebase',
  'coverage',
  '.next',
  'temp-pdfs'
];

// Files to exclude
const EXCLUDE_FILES = [
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.*.local'
];

let fileCount = 0;
let totalSize = 0;
const output = [];

// Header
output.push('='.repeat(80));
output.push('CODE REVIEW CONSOLIDATED FILE');
output.push('='.repeat(80));
output.push(`Generated: ${new Date().toISOString()}`);
output.push(`Repository: ${REPO_ROOT}`);
output.push('='.repeat(80));
output.push('');

/**
 * Check if a file should be included
 */
function shouldIncludeFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Check excluded files
  if (EXCLUDE_FILES.includes(fileName)) return false;
  
  // Check extension
  const ext = path.extname(filePath);
  return INCLUDE_EXTENSIONS.includes(ext);
}

/**
 * Check if a directory should be traversed
 */
function shouldTraverseDir(dirPath) {
  const dirName = path.basename(dirPath);
  return !EXCLUDE_DIRS.includes(dirName);
}

/**
 * Recursively collect all code files
 */
function collectFiles(dirPath, files = []) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (shouldTraverseDir(fullPath)) {
          collectFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        if (shouldIncludeFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  
  return files;
}

/**
 * Format file content with proper escaping
 */
function formatFileContent(filePath, content) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  const separator = '='.repeat(80);
  
  return [
    separator,
    `FILE: ${relativePath}`,
    separator,
    content,
    ''
  ].join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning repository for code files...');
  
  // Collect all files
  const files = collectFiles(REPO_ROOT);
  
  // Sort files for consistent output
  files.sort();
  
  console.log(`📦 Found ${files.length} files to include`);
  
  // Process each file
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const formatted = formatFileContent(filePath, content);
      
      output.push(formatted);
      
      fileCount++;
      totalSize += content.length;
      
      const relativePath = path.relative(REPO_ROOT, filePath);
      console.log(`✓ ${relativePath}`);
    } catch (error) {
      console.error(`✗ Error reading ${filePath}:`, error.message);
    }
  }
  
  // Add summary at the end
  output.push('='.repeat(80));
  output.push('CONSOLIDATION SUMMARY');
  output.push('='.repeat(80));
  output.push(`Total Files: ${fileCount}`);
  output.push(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
  output.push(`Generated: ${new Date().toISOString()}`);
  output.push('='.repeat(80));
  
  // Write output file
  const finalOutput = output.join('\n');
  fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf-8');
  
  console.log('');
  console.log('✅ Consolidation complete!');
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
  console.log(`📊 Total files: ${fileCount}`);
  console.log(`📈 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
}

main();

