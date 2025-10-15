#!/usr/bin/env node

/**
 * Codebase Aggregation Script
 * Generates a comprehensive text file containing all active code files
 * for external codebase review
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = 'CODEBASE_REVIEW.txt';
const ROOT_DIR = path.join(__dirname, '..');

// Files and directories to include
const INCLUDE_PATTERNS = {
  // Source code
  src: ['.ts', '.tsx', '.js', '.jsx'],
  functions: ['.js'],
  // Configuration files
  config: ['.json', '.ts', '.js'],
  // Root level important files
  root: ['package.json', 'tsconfig.json', 'vite.config.ts', 'firebase.json', 
         'firestore.rules', 'storage.rules', '.env.example']
};

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  'build',
  'dist',
  '.git',
  'coverage',
  '.vscode',
  '.idea'
];

// Files to exclude
const EXCLUDE_FILES = [
  'package-lock.json',
  'yarn.lock',
  '.DS_Store',
  'firebase-debug.log'
];

/**
 * Check if a path should be excluded
 */
function shouldExclude(filePath) {
  const parts = filePath.split(path.sep);
  
  // Check if any part of the path is in exclude dirs
  if (parts.some(part => EXCLUDE_DIRS.includes(part))) {
    return true;
  }
  
  // Check if filename is in exclude files
  const filename = path.basename(filePath);
  if (EXCLUDE_FILES.includes(filename)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a file should be included based on extension
 */
function shouldIncludeFile(filePath, allowedExtensions) {
  const ext = path.extname(filePath);
  return allowedExtensions.includes(ext);
}

/**
 * Get all files recursively from a directory
 */
function getFilesRecursively(dir, allowedExtensions = []) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getFilesRecursively(fullPath, allowedExtensions));
      } else if (stat.isFile()) {
        if (allowedExtensions.length === 0 || shouldIncludeFile(fullPath, allowedExtensions)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Format file content with header
 */
function formatFileContent(filePath, content) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const separator = '='.repeat(80);
  const lineCount = content.split('\n').length;
  
  return `
${separator}
FILE: ${relativePath}
LINES: ${lineCount}
${separator}

${content}

`;
}

/**
 * Generate the codebase review document
 */
function generateCodebaseReview() {
  console.log('🚀 Starting codebase aggregation...\n');
  
  let output = `${'='.repeat(80)}
CODEBASE REVIEW DOCUMENT
Generated: ${new Date().toISOString()}
Project: Insurance Product Repository
${'='.repeat(80)}

TABLE OF CONTENTS
=================

`;

  const sections = [];
  
  // Section 1: Project Overview
  console.log('📋 Section 1: Project Overview');
  sections.push({
    title: '1. PROJECT OVERVIEW',
    files: ['README.md'].map(f => path.join(ROOT_DIR, f)).filter(f => fs.existsSync(f))
  });
  
  // Section 2: Configuration Files
  console.log('⚙️  Section 2: Configuration Files');
  const configFiles = [];
  INCLUDE_PATTERNS.root.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      configFiles.push(filePath);
    }
  });
  sections.push({
    title: '2. CONFIGURATION FILES',
    files: configFiles
  });
  
  // Section 3: Source Code - Components
  console.log('🎨 Section 3: React Components');
  const componentFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'components'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '3. REACT COMPONENTS',
    files: componentFiles
  });
  
  // Section 4: Source Code - Hooks
  console.log('🪝 Section 4: Custom Hooks');
  const hookFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'hooks'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '4. CUSTOM HOOKS',
    files: hookFiles
  });
  
  // Section 5: Source Code - Services
  console.log('🔧 Section 5: Services');
  const serviceFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'services'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '5. SERVICES',
    files: serviceFiles
  });
  
  // Section 6: Source Code - Utils
  console.log('🛠️  Section 6: Utilities');
  const utilFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'utils'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '6. UTILITIES',
    files: utilFiles
  });
  
  // Section 7: Source Code - Config
  console.log('📝 Section 7: App Configuration');
  const appConfigFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'config'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '7. APP CONFIGURATION',
    files: appConfigFiles
  });
  
  // Section 8: Source Code - Styles & Types
  console.log('🎨 Section 8: Styles & Types');
  const stylesFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'styles'),
    INCLUDE_PATTERNS.src
  ).sort();
  const typesFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'src', 'types'),
    INCLUDE_PATTERNS.src
  ).sort();
  sections.push({
    title: '8. STYLES & TYPES',
    files: [...stylesFiles, ...typesFiles].sort()
  });
  
  // Section 9: Core App Files
  console.log('⚡ Section 9: Core App Files');
  const coreFiles = [
    'src/index.tsx',
    'src/App.tsx',
    'src/firebase.ts',
    'src/vite-env.d.ts'
  ].map(f => path.join(ROOT_DIR, f)).filter(f => fs.existsSync(f));
  sections.push({
    title: '9. CORE APP FILES',
    files: coreFiles
  });
  
  // Section 10: Firebase Functions
  console.log('☁️  Section 10: Firebase Functions');
  const functionsFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'functions'),
    INCLUDE_PATTERNS.functions
  ).filter(f => !f.includes('node_modules')).sort();
  sections.push({
    title: '10. FIREBASE FUNCTIONS',
    files: functionsFiles
  });
  
  // Section 11: Scripts
  console.log('📜 Section 11: Scripts');
  const scriptFiles = getFilesRecursively(
    path.join(ROOT_DIR, 'scripts'),
    ['.js']
  ).sort();
  sections.push({
    title: '11. SCRIPTS',
    files: scriptFiles
  });
  
  // Build table of contents
  sections.forEach(section => {
    output += `\n${section.title}\n`;
    section.files.forEach(file => {
      const relativePath = path.relative(ROOT_DIR, file);
      output += `  - ${relativePath}\n`;
    });
  });
  
  output += `\n${'='.repeat(80)}\n\n`;
  
  // Add all file contents
  let totalFiles = 0;
  let totalLines = 0;
  
  sections.forEach(section => {
    output += `\n\n${'#'.repeat(80)}\n`;
    output += `${section.title}\n`;
    output += `${'#'.repeat(80)}\n\n`;
    
    section.files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        output += formatFileContent(file, content);
        totalFiles++;
        totalLines += content.split('\n').length;
      } catch (error) {
        console.error(`Error reading file ${file}:`, error.message);
        output += formatFileContent(file, `ERROR: Could not read file - ${error.message}`);
      }
    });
  });
  
  // Add summary at the end
  output += `\n\n${'='.repeat(80)}\n`;
  output += `SUMMARY\n`;
  output += `${'='.repeat(80)}\n\n`;
  output += `Total Files: ${totalFiles}\n`;
  output += `Total Lines of Code: ${totalLines}\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `${'='.repeat(80)}\n`;
  
  // Write to file
  const outputPath = path.join(ROOT_DIR, OUTPUT_FILE);
  fs.writeFileSync(outputPath, output, 'utf8');
  
  console.log(`\n✅ Codebase review document generated successfully!`);
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
  console.log(`📊 Total files: ${totalFiles}`);
  console.log(`📏 Total lines: ${totalLines}`);
  console.log(`💾 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`);
}

// Run the script
try {
  generateCodebaseReview();
} catch (error) {
  console.error('❌ Error generating codebase review:', error);
  process.exit(1);
}

