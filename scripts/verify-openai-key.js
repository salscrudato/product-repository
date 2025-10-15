#!/usr/bin/env node

/**
 * Verification Script for OpenAI API Key Configuration
 * 
 * This script verifies that the OpenAI API key is properly configured
 * in all necessary locations and can be accessed by the application.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying OpenAI API Key Configuration...\n');

let hasErrors = false;

// Check 1: .env.local file exists
console.log('1️⃣  Checking .env.local file...');
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('   ✅ .env.local exists');
  
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // Check for VITE_OPENAI_KEY
  if (envContent.includes('VITE_OPENAI_KEY=sk-proj-')) {
    console.log('   ✅ VITE_OPENAI_KEY is set');
  } else {
    console.log('   ❌ VITE_OPENAI_KEY is missing or invalid');
    hasErrors = true;
  }
  
  // Check for REACT_APP_OPENAI_KEY (legacy)
  if (envContent.includes('REACT_APP_OPENAI_KEY=sk-proj-')) {
    console.log('   ✅ REACT_APP_OPENAI_KEY is set (legacy fallback)');
  } else {
    console.log('   ⚠️  REACT_APP_OPENAI_KEY is missing (legacy fallback)');
  }
} else {
  console.log('   ❌ .env.local file not found');
  hasErrors = true;
}

console.log('');

// Check 2: functions/.env file exists
console.log('2️⃣  Checking functions/.env file...');
const functionsEnvPath = path.join(__dirname, '..', 'functions', '.env');
if (fs.existsSync(functionsEnvPath)) {
  console.log('   ✅ functions/.env exists');
  
  const functionsEnvContent = fs.readFileSync(functionsEnvPath, 'utf8');
  
  if (functionsEnvContent.includes('OPENAI_KEY=sk-proj-')) {
    console.log('   ✅ OPENAI_KEY is set in functions/.env');
  } else {
    console.log('   ❌ OPENAI_KEY is missing or invalid in functions/.env');
    hasErrors = true;
  }
} else {
  console.log('   ❌ functions/.env file not found');
  hasErrors = true;
}

console.log('');

// Check 3: .gitignore configuration
console.log('3️⃣  Checking .gitignore configuration...');
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  if (gitignoreContent.includes('.env.local')) {
    console.log('   ✅ .env.local is in .gitignore');
  } else {
    console.log('   ⚠️  .env.local is NOT in .gitignore (security risk!)');
  }
  
  if (gitignoreContent.includes('.env')) {
    console.log('   ✅ .env is in .gitignore');
  } else {
    console.log('   ⚠️  .env is NOT in .gitignore (security risk!)');
  }
} else {
  console.log('   ⚠️  .gitignore file not found');
}

console.log('');

// Check 4: functions/.gitignore configuration
console.log('4️⃣  Checking functions/.gitignore configuration...');
const functionsGitignorePath = path.join(__dirname, '..', 'functions', '.gitignore');
if (fs.existsSync(functionsGitignorePath)) {
  const functionsGitignoreContent = fs.readFileSync(functionsGitignorePath, 'utf8');
  
  if (functionsGitignoreContent.includes('.env')) {
    console.log('   ✅ .env is in functions/.gitignore');
  } else {
    console.log('   ⚠️  .env is NOT in functions/.gitignore (security risk!)');
  }
} else {
  console.log('   ⚠️  functions/.gitignore file not found');
}

console.log('');

// Check 5: Verify key format
console.log('5️⃣  Verifying API key format...');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const viteKeyMatch = envContent.match(/VITE_OPENAI_KEY=(sk-proj-[A-Za-z0-9_-]+)/);
  
  if (viteKeyMatch && viteKeyMatch[1]) {
    const key = viteKeyMatch[1];
    
    // Check key length (OpenAI keys are typically 164+ characters)
    if (key.length >= 100) {
      console.log('   ✅ API key format appears valid');
      console.log(`   ℹ️  Key length: ${key.length} characters`);
    } else {
      console.log('   ⚠️  API key seems too short (might be invalid)');
      console.log(`   ℹ️  Key length: ${key.length} characters`);
    }
    
    // Check if it starts with sk-proj-
    if (key.startsWith('sk-proj-')) {
      console.log('   ✅ API key has correct prefix (sk-proj-)');
    } else {
      console.log('   ❌ API key does not have correct prefix');
      hasErrors = true;
    }
  }
}

console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════');
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED - Please fix the errors above');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - OpenAI API key is properly configured');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Rebuild the application: npm run build');
  console.log('   2. Test locally: npm run dev');
  console.log('   3. Deploy to Firebase: firebase deploy');
  console.log('');
  process.exit(0);
}

