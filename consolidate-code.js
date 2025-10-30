#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = '/Users/salscrudato/Projects/product-repository';
const OUTPUT_FILE = path.join(REPO_ROOT, 'CODE_REVIEW.md');

// File extensions to include
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss'];

// Directories to scan
const SOURCE_DIRS = [
  path.join(REPO_ROOT, 'src'),
  path.join(REPO_ROOT, 'functions/src'),
];

// Additional config files to include
const CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'firebase.json',
  'firestore.rules',
  'storage.rules',
];

function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      // Skip node_modules and build directories
      if (file === 'node_modules' || file === 'build' || file === '.git' || file === 'dist') {
        return;
      }
      
      if (stat.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (EXTENSIONS.includes(path.extname(file))) {
        fileList.push(filePath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return fileList;
}

function getConfigFiles() {
  const files = [];
  CONFIG_FILES.forEach(file => {
    const filePath = path.join(REPO_ROOT, file);
    if (fs.existsSync(filePath)) {
      files.push(filePath);
    }
  });
  return files;
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    return `[ERROR: Could not read file - ${err.message}]`;
  }
}

function generateMarkdown(files) {
  let markdown = '# Code Review - Complete Codebase\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n`;
  markdown += `Total Files: ${files.length}\n\n`;
  markdown += '---\n\n';
  
  files.forEach((filePath, index) => {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const content = readFileContent(filePath);
    const ext = path.extname(filePath).slice(1) || 'text';
    
    markdown += `## File ${index + 1}/${files.length}: \`${relativePath}\`\n\n`;
    markdown += `**Full Path:** \`${filePath}\`\n\n`;
    markdown += '```' + ext + '\n';
    markdown += content;
    markdown += '\n```\n\n';
    markdown += '---\n\n';
  });
  
  return markdown;
}

function main() {
  console.log('🔍 Scanning source directories...');
  
  let allFiles = [];
  
  // Get source files
  SOURCE_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      allFiles = allFiles.concat(files);
      console.log(`  Found ${files.length} files in ${path.relative(REPO_ROOT, dir)}`);
    }
  });
  
  // Get config files
  const configFiles = getConfigFiles();
  allFiles = allFiles.concat(configFiles);
  console.log(`  Found ${configFiles.length} config files`);
  
  // Sort files by path
  allFiles.sort();
  
  console.log(`\n📝 Generating consolidated code review file...`);
  const markdown = generateMarkdown(allFiles);
  
  console.log(`\n💾 Writing to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ Success!`);
  console.log(`   Total files consolidated: ${allFiles.length}`);
  console.log(`   Output file size: ${sizeInMB} MB`);
  console.log(`   Output file: ${OUTPUT_FILE}`);
}

main();

