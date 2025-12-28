#!/usr/bin/env node

/**
 * Export Code for External AI Review
 * Collects all frontend and backend code into a single markdown file
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'code-review-export.md');

// File extensions to include
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

// Directories to scan
const SCAN_DIRS = [
  'src',
  'functions/src',
  'functions/index.js'
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'build',
  'dist',
  '.env',
  '.DS_Store',
  'package-lock.json',
  '*.min.js',
  '*.map'
];

function shouldInclude(filePath) {
  const ext = path.extname(filePath);
  if (!CODE_EXTENSIONS.includes(ext)) return false;
  
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) return false;
    if (pattern.startsWith('*') && filePath.endsWith(pattern.slice(1))) return false;
  }
  return true;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const fullPath = path.join(ROOT_DIR, dirPath);
  
  if (!fs.existsSync(fullPath)) return arrayOfFiles;
  
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (shouldInclude(dirPath)) {
      arrayOfFiles.push(dirPath);
    }
    return arrayOfFiles;
  }
  
  const files = fs.readdirSync(fullPath);
  
  for (const file of files) {
    const relativePath = path.join(dirPath, file);
    const absolutePath = path.join(ROOT_DIR, relativePath);
    const fileStat = fs.statSync(absolutePath);
    
    if (fileStat.isDirectory()) {
      if (!EXCLUDE_PATTERNS.includes(file)) {
        getAllFiles(relativePath, arrayOfFiles);
      }
    } else if (shouldInclude(relativePath)) {
      arrayOfFiles.push(relativePath);
    }
  }
  
  return arrayOfFiles;
}

function getLanguage(filePath) {
  const ext = path.extname(filePath);
  const map = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json'
  };
  return map[ext] || 'text';
}

function main() {
  console.log('🔍 Scanning codebase for functional code files...\n');
  
  let allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles = getAllFiles(dir, allFiles);
  }
  
  // Sort files for consistent ordering
  allFiles.sort();
  
  console.log(`📁 Found ${allFiles.length} code files\n`);
  
  let markdown = `# Code Review Export\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Files: ${allFiles.length}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Table of Contents\n\n`;
  
  // Generate TOC
  for (const file of allFiles) {
    const anchor = file.replace(/[\/\.]/g, '-').toLowerCase();
    markdown += `- [${file}](#${anchor})\n`;
  }
  
  markdown += `\n---\n\n`;
  
  // Add file contents
  for (const file of allFiles) {
    const absolutePath = path.join(ROOT_DIR, file);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lang = getLanguage(file);
    const anchor = file.replace(/[\/\.]/g, '-').toLowerCase();
    
    markdown += `## ${file}\n\n`;
    markdown += `**Path:** \`${file}\`\n\n`;
    markdown += `\`\`\`${lang}\n`;
    markdown += content;
    if (!content.endsWith('\n')) markdown += '\n';
    markdown += `\`\`\`\n\n`;
    markdown += `---\n\n`;
    
    console.log(`✓ ${file}`);
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  
  console.log(`\n✅ Export complete!`);
  console.log(`📄 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Total size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

main();

