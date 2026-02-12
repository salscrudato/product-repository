/**
 * Comprehensive AI Testing Script
 * Tests all AI functionality including service layer and business logic
 *
 * Run with: OPENAI_KEY=your-key node test-ai-local.js
 */

const openaiService = require('./src/services/openai');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (color, ...args) => console.log(colors[color], ...args, colors.reset);

const testResults = { passed: 0, failed: 0, errors: [], totalTime: 0 };

function logResult(name, passed, details = '', timeMs = 0) {
  testResults.totalTime += timeMs;
  if (passed) {
    testResults.passed++;
    log('green', `✓ ${name}` + (timeMs ? ` (${timeMs}ms)` : ''));
    if (details) console.log(`  ${details}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ name, details });
    log('red', `✗ ${name}`);
    if (details) console.log(`  Error: ${details}`);
  }
}

// Test 1: Basic chatCompletion
async function testChatCompletion() {
  log('blue', '\n--- Test: Basic Chat Completion ---');
  const start = Date.now();
  try {
    const result = await openaiService.chatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Be concise.' },
        { role: 'user', content: 'What is property insurance? Answer in one sentence.' }
      ],
      maxTokens: 100,
      temperature: 0.3
    });

    const hasContent = result.content && result.content.length > 10;
    const hasUsage = result.usage && result.usage.total_tokens > 0;

    logResult('Chat Completion', hasContent && hasUsage,
      `Response: ${result.content?.substring(0, 80)}... (${result.usage?.total_tokens} tokens)`, Date.now() - start);
    return hasContent;
  } catch (error) {
    logResult('Chat Completion', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 2: Coverage Name Suggestions
async function testCoverageNameSuggestions() {
  log('blue', '\n--- Test: Coverage Name Suggestions ---');
  const start = Date.now();
  try {
    const messages = [
      { role: 'system', content: `You are a P&C insurance expert. Generate 5 relevant coverage names for commercial property insurance. Return ONLY a JSON array of strings.` },
      { role: 'user', content: 'Suggest coverage names matching: "building"' }
    ];

    const result = await openaiService.chatCompletion({
      messages,
      maxTokens: 150,
      temperature: 0.3
    });

    // Try to parse as JSON
    let suggestions = [];
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    suggestions = JSON.parse(cleaned);

    const isArray = Array.isArray(suggestions);
    const hasItems = suggestions.length > 0;

    logResult('Coverage Name Suggestions', isArray && hasItems,
      `Found ${suggestions.length} suggestions: ${suggestions.slice(0, 3).join(', ')}`, Date.now() - start);
    return isArray && hasItems;
  } catch (error) {
    logResult('Coverage Name Suggestions', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 3: Claims Analysis
async function testClaimsAnalysis() {
  log('blue', '\n--- Test: Claims Analysis ---');
  const start = Date.now();
  try {
    const claimText = 'A fire damaged the building roof on Jan 15, 2025. Estimated damage is $50,000.';
    const result = await openaiService.analyzeClaim(claimText);

    const hasContent = result.content && result.content.length > 20;
    logResult('Claims Analysis', hasContent,
      `Analysis: ${result.content?.substring(0, 100)}...`, Date.now() - start);
    return hasContent;
  } catch (error) {
    logResult('Claims Analysis', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 4: Product Summary Generation
async function testProductSummary() {
  log('blue', '\n--- Test: Product Summary Generation ---');
  const start = Date.now();
  try {
    const sampleText = 'Commercial Property Coverage Form CP 00 10. Covers building, contents, business personal property. Includes coverage for fire, windstorm, theft.';
    const result = await openaiService.generateProductSummary(sampleText);

    const hasContent = result.content && result.content.length > 50;
    logResult('Product Summary Generation', hasContent,
      `Summary: ${result.content?.substring(0, 100)}...`, Date.now() - start);
    return hasContent;
  } catch (error) {
    logResult('Product Summary Generation', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 5: JSON Response Format
async function testJSONResponseFormat() {
  log('blue', '\n--- Test: JSON Response Format ---');
  const start = Date.now();
  try {
    const result = await openaiService.chatCompletion({
      messages: [
        { role: 'system', content: 'Return only valid JSON. No markdown, no explanation.' },
        { role: 'user', content: 'Return a JSON object with: coverageTrigger="occurrence", waitingPeriod=0' }
      ],
      maxTokens: 100,
      temperature: 0.1
    });

    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const isValid = parsed && typeof parsed === 'object';

    logResult('JSON Response Format', isValid,
      `Parsed JSON: ${JSON.stringify(parsed)}`, Date.now() - start);
    return isValid;
  } catch (error) {
    logResult('JSON Response Format', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 6: Coverage Assistant Prompt (autoDraftCoverageFields)
async function testCoverageFieldsDraft() {
  log('blue', '\n--- Test: Coverage Fields Draft (Triggers Step) ---');
  const start = Date.now();
  try {
    const systemPrompt = `You are an insurance product expert. Generate coverage trigger fields for insurance coverages.
Return valid JSON only with these fields:
- coverageTrigger: one of "occurrence", "claimsMade", "sunset", "manifestation", "continuous", "hybrid", "injuryInFact"
- waitingPeriod: number (hours)
- waitingPeriodUnit: "hours", "days", or "months"
- retroactiveDate: optional string "YYYY-MM-DD"
- deductibleApplication: "perOccurrence", "perClaim", "aggregate", "disappearing"`;

    const result = await openaiService.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate trigger fields for: Building Coverage (commercial property)' }
      ],
      maxTokens: 300,
      temperature: 0.3
    });

    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const hasRequiredFields = parsed.coverageTrigger &&
      ['occurrence', 'claimsMade', 'sunset', 'manifestation', 'continuous', 'hybrid', 'injuryInFact'].includes(parsed.coverageTrigger);

    logResult('Coverage Fields Draft', hasRequiredFields,
      `Trigger: ${parsed.coverageTrigger}, Waiting: ${parsed.waitingPeriod || 0}`, Date.now() - start);
    return hasRequiredFields;
  } catch (error) {
    logResult('Coverage Fields Draft', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 7: Coverage Assistant Multi-turn
async function testCoverageAssistantLogic() {
  log('blue', '\n--- Test: Coverage Assistant Multi-turn Logic ---');
  const start = Date.now();
  try {
    const systemPrompt = `You are an AI assistant helping create insurance coverages.
Analyze the user request and respond in JSON format:
{
  "action": "create" | "clarify" | "suggest",
  "coverageName": "string if creating",
  "message": "explanation to user",
  "fieldsToSet": { ... optional coverage fields }
}`;

    const result = await openaiService.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Create a coverage for flood damage to buildings' }
      ],
      maxTokens: 400,
      temperature: 0.3
    });

    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const isValid = parsed.action && parsed.message &&
      ['create', 'clarify', 'suggest'].includes(parsed.action);

    logResult('Coverage Assistant Logic', isValid,
      `Action: ${parsed.action}, Name: ${parsed.coverageName || 'N/A'}`, Date.now() - start);
    return isValid;
  } catch (error) {
    logResult('Coverage Assistant Logic', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 8: aiGateway style request
async function testAiGatewayLogic() {
  log('blue', '\n--- Test: AI Gateway Style Request ---');
  const start = Date.now();
  try {
    const result = await openaiService.chatCompletion({
      messages: [
        { role: 'system', content: 'You are an expert insurance assistant. Be concise and accurate.' },
        { role: 'user', content: 'What are the typical exclusions in a commercial property policy?' }
      ],
      maxTokens: 500,
      temperature: 0.7
    });

    const hasContent = result.content && result.content.length > 100;
    const mentionsExclusions = result.content.toLowerCase().includes('exclusion') ||
      result.content.toLowerCase().includes('flood') ||
      result.content.toLowerCase().includes('earthquake') ||
      result.content.toLowerCase().includes('war');

    logResult('AI Gateway Style Request', hasContent && mentionsExclusions,
      `Response length: ${result.content.length} chars, mentions exclusions: ${mentionsExclusions}`, Date.now() - start);
    return hasContent;
  } catch (error) {
    logResult('AI Gateway Style Request', false, error.message, Date.now() - start);
    return false;
  }
}

// Test 9: Error handling - Invalid input
async function testErrorHandling() {
  log('blue', '\n--- Test: Error Handling ---');
  const start = Date.now();
  try {
    // Test with empty messages - should handle gracefully
    await openaiService.chatCompletion({
      messages: [],
      maxTokens: 100
    });
    logResult('Error Handling (empty messages)', false, 'Should have thrown error', Date.now() - start);
    return false;
  } catch (error) {
    // Expected to fail - this is correct behavior
    logResult('Error Handling (empty messages)', true,
      `Correctly rejected: ${error.message.substring(0, 50)}...`, Date.now() - start);
    return true;
  }
}

// Run all tests
async function runTests() {
  log('yellow', '\n==========================================');
  log('yellow', 'Comprehensive AI Service Testing');
  log('yellow', '==========================================');

  if (!process.env.OPENAI_KEY && !process.env.OPENAI_API_KEY) {
    log('red', 'ERROR: OPENAI_KEY environment variable not set');
    log('yellow', 'Usage: OPENAI_KEY=sk-xxx node test-ai-local.js');
    process.exit(1);
  }

  log('cyan', '\n=== Core OpenAI Service Tests ===');
  await testChatCompletion();
  await testJSONResponseFormat();
  await testErrorHandling();

  log('cyan', '\n=== Coverage & Product Tests ===');
  await testCoverageNameSuggestions();
  await testCoverageFieldsDraft();
  await testCoverageAssistantLogic();

  log('cyan', '\n=== Claims & Summary Tests ===');
  await testClaimsAnalysis();
  await testProductSummary();

  log('cyan', '\n=== Gateway & Integration Tests ===');
  await testAiGatewayLogic();

  log('yellow', '\n==========================================');
  log('yellow', 'Test Summary');
  log('yellow', '==========================================');
  log('green', `Passed: ${testResults.passed}`);
  if (testResults.failed > 0) log('red', `Failed: ${testResults.failed}`);
  log('cyan', `Total time: ${(testResults.totalTime / 1000).toFixed(1)}s`);

  if (testResults.errors.length > 0) {
    log('red', '\nFailed tests:');
    testResults.errors.forEach(e => console.log(`  - ${e.name}: ${e.details}`));
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests();

