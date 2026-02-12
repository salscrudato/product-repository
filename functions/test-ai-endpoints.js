/**
 * AI Endpoint Testing Script
 * Tests all AI-powered Cloud Functions against the production environment
 * 
 * Usage: node test-ai-endpoints.js
 */

const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'insurance-product-hub' });
}
const db = admin.firestore();

// Test results tracking
const testResults = { passed: 0, failed: 0, errors: [] };

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function logResult(name, passed, details = '') {
  if (passed) {
    testResults.passed++;
    log('green', `✓ ${name}`);
    if (details) console.log(`  ${details}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ name, details });
    log('red', `✗ ${name}`);
    if (details) console.log(`  Error: ${details}`);
  }
}

// Helper to call Cloud Functions via HTTP (for testing without auth)
async function callFunction(functionName, data, region = 'us-central1') {
  const url = `https://${region}-insurance-product-hub.cloudfunctions.net/${functionName}`;
  try {
    const response = await axios.post(url, { data }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

// Test aiGateway function
async function testAiGateway() {
  log('blue', '\n--- Testing aiGateway ---');

  // This function requires auth, so we expect an unauthenticated error
  const result = await callFunction('aiGateway', {
    prompt: 'What is property insurance?',
    model: 'gpt-4o-mini'
  }, 'us-east1');

  // Without auth, it should return 401 or 403 (both indicate auth required)
  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('aiGateway auth check', true, `Correctly requires authentication (${result.status})`);
    return true;
  } else {
    logResult('aiGateway auth check', false, `Unexpected: ${JSON.stringify(result)}`);
    return false;
  }
}

// Test suggestCoverageNames function
async function testSuggestCoverageNames() {
  log('blue', '\n--- Testing suggestCoverageNames ---');
  
  const result = await callFunction('suggestCoverageNames', {
    query: 'building',
    lineOfBusiness: 'property'
  });
  
  if (result.status === 401 || result.error?.message?.includes('unauthenticated')) {
    logResult('suggestCoverageNames auth check', true, 'Correctly requires authentication');
    return true;
  } else {
    logResult('suggestCoverageNames auth check', false, `Unexpected: ${JSON.stringify(result)}`);
    return false;
  }
}

// Test coverageAssistant function
async function testCoverageAssistant() {
  log('blue', '\n--- Testing coverageAssistant ---');
  
  const result = await callFunction('coverageAssistant', {
    productId: 'aI8cx02bJkyeHxZCF7wN',
    userMessage: 'Create a building coverage'
  });
  
  if (result.status === 401 || result.error?.message?.includes('unauthenticated')) {
    logResult('coverageAssistant auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('coverageAssistant auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Test autoDraftCoverageFields function
async function testAutoDraftCoverageFields() {
  log('blue', '\n--- Testing autoDraftCoverageFields ---');

  const result = await callFunction('autoDraftCoverageFields', {
    productId: 'aI8cx02bJkyeHxZCF7wN',
    stepId: 'triggers',
    coverageName: 'Building Coverage',
    coverageCode: 'BLDG'
  });

  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('autoDraftCoverageFields auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('autoDraftCoverageFields auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Test generateProductSummary function
async function testGenerateProductSummary() {
  log('blue', '\n--- Testing generateProductSummary ---');

  const result = await callFunction('generateProductSummary', {
    pdfText: 'Sample insurance form text'
  });

  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('generateProductSummary auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('generateProductSummary auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Test generateChatResponse function
async function testGenerateChatResponse() {
  log('blue', '\n--- Testing generateChatResponse ---');

  const result = await callFunction('generateChatResponse', {
    messages: [{ role: 'user', content: 'Test' }]
  });

  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('generateChatResponse auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('generateChatResponse auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Test analyzeClaim function
async function testAnalyzeClaim() {
  log('blue', '\n--- Testing analyzeClaim ---');

  const result = await callFunction('analyzeClaim', {
    claimText: 'Fire damage to building'
  });

  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('analyzeClaim auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('analyzeClaim auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Test createProductFromPDF function
async function testCreateProductFromPDF() {
  log('blue', '\n--- Testing createProductFromPDF ---');

  const result = await callFunction('createProductFromPDF', {
    pdfUrl: 'https://example.com/test.pdf',
    productName: 'Test Product'
  });

  if (result.status === 401 || result.status === 403 || result.error?.message?.includes('unauthenticated')) {
    logResult('createProductFromPDF auth check', true, 'Correctly requires authentication');
    return true;
  }
  logResult('createProductFromPDF auth check', false, `Unexpected: ${JSON.stringify(result)}`);
  return false;
}

// Run all tests
async function runTests() {
  log('yellow', '====================================');
  log('yellow', 'AI Endpoint Testing (No Auth Mode)');
  log('yellow', 'Testing authentication enforcement');
  log('yellow', '====================================');

  await testAiGateway();
  await testSuggestCoverageNames();
  await testCoverageAssistant();
  await testAutoDraftCoverageFields();
  await testGenerateProductSummary();
  await testGenerateChatResponse();
  await testAnalyzeClaim();
  await testCreateProductFromPDF();

  // Summary
  log('yellow', '\n====================================');
  log('yellow', 'Test Summary');
  log('yellow', '====================================');
  log('green', `Passed: ${testResults.passed}`);
  if (testResults.failed > 0) log('red', `Failed: ${testResults.failed}`);

  if (testResults.errors.length > 0) {
    log('red', '\nFailed tests:');
    testResults.errors.forEach(e => console.log(`  - ${e.name}: ${e.details}`));
  }

  console.log('\nNote: Full AI testing requires authentication.');
  console.log('Use Firebase Auth token or run in emulator with auth bypass.');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

