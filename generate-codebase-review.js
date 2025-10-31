#!/usr/bin/env node

/**
 * Comprehensive Codebase Review Generator
 * 
 * This script consolidates all coding files from the repository into a single
 * organized file for external codebase review. Files are ordered logically by
 * type and location.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = process.cwd();
const OUTPUT_FILE = path.join(REPO_ROOT, 'CODEBASE_REVIEW.md');

// File extensions to include
const CODING_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.css', '.scss',
  '.html', '.md'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  'build',
  'dist',
  '.git',
  '.firebase',
  'coverage',
  'temp-pdfs',
  '.next',
  '.turbo'
];

// Files to exclude
const EXCLUDE_FILES = [
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  '.env',
  '.env.local',
  '.env.*.local'
];

/**
 * Check if a path should be excluded
 */
function shouldExclude(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  
  // Check if any excluded directory is in the path
  for (const excludeDir of EXCLUDE_DIRS) {
    if (relativePath.includes(excludeDir)) {
      return true;
    }
  }
  
  // Check if file is in exclude list
  const fileName = path.basename(filePath);
  if (EXCLUDE_FILES.includes(fileName)) {
    return true;
  }
  
  return false;
}

/**
 * Get file priority for sorting
 */
function getFilePriority(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  
  // Priority order
  const priorities = {
    'package.json': 0,
    'tsconfig.json': 1,
    'vite.config.ts': 2,
    'firebase.json': 3,
    'firestore.rules': 4,
    'storage.rules': 5,
    '.eslintrc': 6,
    'src/': 10,
    'functions/': 20,
    'public/': 30,
    'index.html': 40,
  };
  
  for (const [pattern, priority] of Object.entries(priorities)) {
    if (relativePath.startsWith(pattern) || relativePath === pattern) {
      return priority;
    }
  }
  
  return 100;
}

/**
 * Recursively collect all coding files
 */
function collectFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        collectFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (CODING_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

/**
 * Format file content with proper escaping
 */
function formatFileContent(content, filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  const ext = path.extname(filePath).slice(1) || 'text';
  
  return `
## File: ${relativePath}

\`\`\`${ext}
${content}
\`\`\`

`;
}

/**
 * Main function
 */
async function generateCodebaseReview() {
  console.log('🔍 Scanning repository for coding files...');
  
  // Collect all files
  let files = collectFiles(REPO_ROOT);
  
  // Sort files by priority and then alphabetically
  files.sort((a, b) => {
    const priorityA = getFilePriority(a);
    const priorityB = getFilePriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return a.localeCompare(b);
  });
  
  console.log(`✅ Found ${files.length} coding files`);
  console.log('📝 Generating consolidated review file...');
  
  // Generate header
  let output = `# Comprehensive Codebase Review
Generated: ${new Date().toISOString()}
Total Files: ${files.length}

## Table of Contents

`;
  
  // Add table of contents
  files.forEach((file) => {
    const relativePath = path.relative(REPO_ROOT, file);
    output += `- [${relativePath}](#file-${relativePath.replace(/[^a-z0-9]/gi, '-').toLowerCase()})\n`;
  });
  
  output += '\n---\n';
  
  // Add file contents
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      output += formatFileContent(content, file);
    } catch (err) {
      console.error(`Error reading file ${file}:`, err.message);
      output += `\n## File: ${path.relative(REPO_ROOT, file)}\n\n⚠️ Error reading file: ${err.message}\n\n`;
    }
  }
  
  // Write output file
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  
  const sizeInMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`✨ Codebase review generated successfully!`);
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
  console.log(`📊 File size: ${sizeInMB} MB`);
  console.log(`📋 Total files included: ${files.length}`);
}

// Run the script
generateCodebaseReview().catch(err => {
  console.error('❌ Error generating codebase review:', err);
  process.exit(1);
});

