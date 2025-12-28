/**
 * Backend AI Test Script
 * Tests the deployed Firebase Cloud Functions with realistic P&C insurance data
 * 
 * Usage: npx ts-node scripts/testBackendAI.ts
 */

import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiJAva8O7z6bwPOq4YnuSA2nJqjgla938",
  authDomain: "insurance-product-hub.firebaseapp.com",
  projectId: "insurance-product-hub",
  storageBucket: "insurance-product-hub.firebasestorage.app",
  messagingSenderId: "462695490715",
  appId: "1:462695490715:web:d49e6f7eb397baf994923e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// ============================================================================
// Realistic P&C Insurance Test Data
// ============================================================================

const COMMERCIAL_GENERAL_LIABILITY_FORM = `
COMMERCIAL GENERAL LIABILITY COVERAGE FORM

Various provisions in this policy restrict coverage. Read the entire policy carefully to determine rights, duties and what is and is not covered.

Throughout this policy the words "you" and "your" refer to the Named Insured shown in the Declarations, and any other person or organization qualifying as a Named Insured under this policy. The words "we", "us" and "our" refer to the Company providing this insurance.

SECTION I – COVERAGES

COVERAGE A – BODILY INJURY AND PROPERTY DAMAGE LIABILITY

1. Insuring Agreement
   a. We will pay those sums that the insured becomes legally obligated to pay as damages because of "bodily injury" or "property damage" to which this insurance applies. We will have the right and duty to defend the insured against any "suit" seeking those damages.
   
   b. This insurance applies to "bodily injury" and "property damage" only if:
      (1) The "bodily injury" or "property damage" is caused by an "occurrence" that takes place in the "coverage territory";
      (2) The "bodily injury" or "property damage" occurs during the policy period.

2. Exclusions
   This insurance does not apply to:
   a. Expected Or Intended Injury
      "Bodily injury" or "property damage" expected or intended from the standpoint of the insured.
   
   b. Contractual Liability
      "Bodily injury" or "property damage" for which the insured is obligated to pay damages by reason of the assumption of liability in a contract or agreement.
   
   c. Liquor Liability
      "Bodily injury" or "property damage" for which any insured may be held liable by reason of causing or contributing to the intoxication of any person.
   
   d. Workers' Compensation And Similar Laws
      Any obligation of the insured under a workers' compensation, disability benefits or unemployment compensation law.
   
   e. Pollution
      (1) "Bodily injury" or "property damage" arising out of the actual, alleged or threatened discharge, dispersal, seepage, migration, release or escape of "pollutants".

COVERAGE B – PERSONAL AND ADVERTISING INJURY LIABILITY

1. Insuring Agreement
   a. We will pay those sums that the insured becomes legally obligated to pay as damages because of "personal and advertising injury" to which this insurance applies.

2. Exclusions
   This insurance does not apply to:
   a. Knowing Violation Of Rights Of Another
   b. Material Published With Knowledge Of Falsity
   c. Criminal Acts

SECTION II – WHO IS AN INSURED

1. If you are designated in the Declarations as:
   a. An individual, you and your spouse are insureds
   b. A partnership or joint venture, you are an insured
   c. A limited liability company, you are an insured
   d. An organization other than a partnership, joint venture or limited liability company, you are an insured

SECTION III – LIMITS OF INSURANCE

1. The Limits of Insurance shown in the Declarations and the rules below fix the most we will pay regardless of the number of:
   a. Insureds;
   b. Claims made or "suits" brought;
   c. Persons or organizations making claims or bringing "suits".

2. The General Aggregate Limit is the most we will pay for the sum of:
   a. Medical expenses under Coverage C;
   b. Damages under Coverage A, except damages because of "bodily injury" or "property damage" included in the "products-completed operations hazard";
   c. Damages under Coverage B.

3. Each Occurrence Limit: $1,000,000
   General Aggregate Limit: $2,000,000
   Products-Completed Operations Aggregate: $2,000,000
   Personal and Advertising Injury Limit: $1,000,000
   Damage to Premises Rented to You: $100,000
   Medical Expense Limit: $5,000

SECTION IV – CONDITIONS

1. Bankruptcy
2. Duties In The Event Of Occurrence, Offense, Claim Or Suit
3. Legal Action Against Us
4. Other Insurance
5. Premium Audit
6. Representations
7. Separation Of Insureds
8. Transfer Of Rights Of Recovery Against Others To Us
9. When We Do Not Renew

DEFINITIONS

"Bodily injury" means bodily injury, sickness or disease sustained by a person, including death resulting from any of these at any time.

"Coverage territory" means:
a. The United States of America
b. Puerto Rico
c. All other territories and possessions of the United States of America

"Occurrence" means an accident, including continuous or repeated exposure to substantially the same general harmful conditions.

"Property damage" means:
a. Physical injury to tangible property, including all resulting loss of use of that property.
b. Loss of use of tangible property that is not physically injured.
`;

const WORKERS_COMP_FORM = `
WORKERS COMPENSATION AND EMPLOYERS LIABILITY INSURANCE POLICY

PART ONE - WORKERS COMPENSATION INSURANCE

A. How This Insurance Applies
   This workers compensation insurance applies to bodily injury by accident or bodily injury by disease.
   Bodily injury includes resulting death.

   1. Bodily Injury by Accident. The bodily injury must occur during the policy period.
   2. Bodily Injury by Disease. The bodily injury must be caused or aggravated by the conditions of your employment.

B. We Will Pay
   We will pay promptly when due the benefits required of you by the workers compensation law.

C. We Will Defend
   We have the right and duty to defend at our expense any claim, proceeding or suit against you for benefits payable by this insurance.

D. We Will Also Pay
   We will also pay these costs, in addition to other amounts payable under this insurance:
   1. Reasonable expenses incurred at our request
   2. Premiums for bonds to release attachments and for appeal bonds
   3. Litigation costs taxed against you

PART TWO - EMPLOYERS LIABILITY INSURANCE

A. How This Insurance Applies
   This employers liability insurance applies to bodily injury by accident or bodily injury by disease.

B. We Will Pay
   We will pay all sums you legally must pay as damages because of bodily injury to your employees.

C. Exclusions
   This insurance does not cover:
   1. Liability assumed under a contract
   2. Punitive or exemplary damages
   3. Bodily injury to an employee while employed in violation of law
   4. Any obligation imposed by a workers compensation law
   5. Bodily injury intentionally caused by the employer
   6. Damages arising out of coercion, criticism, demotion, evaluation, reassignment

LIMITS:
   Bodily Injury by Accident: $500,000 each accident
   Bodily Injury by Disease: $500,000 policy limit
   Bodily Injury by Disease: $500,000 each employee
`;

// ============================================================================
// Test Functions
// ============================================================================

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  response?: unknown;
  error?: string;
}

async function runTest(testName: string, testFn: () => Promise<unknown>): Promise<TestResult> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${testName}...`);

  try {
    const response = await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${testName} passed (${duration}ms)`);
    return { testName, success: true, duration, response };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${testName} failed: ${errorMessage}`);
    return { testName, success: false, duration, error: errorMessage };
  }
}

// Unique ID to bypass cache for fresh tests
const TEST_RUN_ID = Date.now().toString();

// Test 1: Generate Product Summary
async function testGenerateProductSummary(): Promise<unknown> {
  const generateProductSummary = httpsCallable(functions, 'generateProductSummary');

  const result = await generateProductSummary({
    pdfText: COMMERCIAL_GENERAL_LIABILITY_FORM + `\n\n[Test Run: ${TEST_RUN_ID}]`,
    systemPrompt: `You are an expert P&C insurance analyst. Analyze this coverage form and provide a COMPLETE, comprehensive summary including:
1. Coverage name and type
2. ALL coverages included (Coverage A, B, C, etc.)
3. ALL exclusions - do not omit any
4. Complete limits structure
5. All conditions and endorsements
6. Any sub-coverages or optional coverages
Format your response as structured JSON. Ensure 100% completeness - do not abbreviate or skip any details.`
  });

  console.log('Summary response:', JSON.stringify(result.data, null, 2).substring(0, 1000));
  return result.data;
}

// Test 2: Generate Chat Response (Coverage Question)
async function testChatResponseCoverageQuestion(): Promise<unknown> {
  const generateChatResponse = httpsCallable(functions, 'generateChatResponse');

  const result = await generateChatResponse({
    messages: [
      {
        role: 'system',
        content: 'You are an insurance expert helping agents understand coverage forms. Provide complete, thorough answers.'
      },
      {
        role: 'user',
        content: `[${TEST_RUN_ID}] Given this CGL form excerpt:
${COMMERCIAL_GENERAL_LIABILITY_FORM}

Question: What are ALL the exclusions under Coverage A - Bodily Injury and Property Damage Liability? List each exclusion with a brief description.`
      }
    ],
    maxTokens: 2000,
    temperature: 0.3
  });

  console.log('Chat response:', JSON.stringify(result.data, null, 2).substring(0, 1000));
  return result.data;
}

// Test 3: Analyze Claim
async function testAnalyzeClaim(): Promise<unknown> {
  const analyzeClaim = httpsCallable(functions, 'analyzeClaim');

  const claimScenario = `[${TEST_RUN_ID}]
CLAIM DETAILS:
- Policy Type: Commercial General Liability
- Date of Loss: October 15, 2024
- Claimant: ABC Manufacturing Corp
- Location: 123 Industrial Blvd, Chicago, IL

INCIDENT DESCRIPTION:
A delivery driver for the insured was making a delivery to a customer's warehouse. While backing up the delivery truck, the driver struck a forklift that was being operated in the loading dock area, causing the forklift to tip over. The forklift operator sustained injuries including a broken arm and concussion. The forklift was also damaged beyond repair.

CLAIMED DAMAGES:
- Medical expenses: $45,000
- Lost wages: $12,000
- Forklift replacement: $35,000
- Warehouse repairs: $8,000
- Total claimed: $100,000

COVERAGE IN QUESTION:
The insured has a CGL policy with the following limits:
- Each Occurrence: $1,000,000
- General Aggregate: $2,000,000
- Damage to Rented Premises: $100,000`;

  const result = await analyzeClaim({
    messages: [
      {
        role: 'system',
        content: `You are an expert insurance claims analyst. Provide a comprehensive analysis including:
1. Complete coverage analysis - does the CGL policy cover this claim?
2. ALL applicable exclusions to consider
3. Potential coverage issues and concerns
4. Recommended reserves with justification
5. Detailed next steps for claims handling`
      },
      {
        role: 'user',
        content: claimScenario
      }
    ],
    maxTokens: 3000,
    temperature: 0.2
  });

  console.log('Claim analysis:', JSON.stringify(result.data, null, 2).substring(0, 1000));
  return result.data;
}

// Test 4: Chat with Workers Comp Form Context
async function testWorkersCompChat(): Promise<unknown> {
  const generateChatResponse = httpsCallable(functions, 'generateChatResponse');

  const result = await generateChatResponse({
    messages: [
      {
        role: 'system',
        content: 'You are an expert workers compensation insurance specialist. Provide complete, thorough answers.'
      },
      {
        role: 'user',
        content: `[${TEST_RUN_ID}] Analyze this Workers Compensation policy form:
${WORKERS_COMP_FORM}

What are ALL the key differences between Part One (Workers Compensation) and Part Two (Employers Liability)? Include coverage scope, defense obligations, limits, and any exclusions for each part.`
      }
    ],
    maxTokens: 2000,
    temperature: 0.3
  });

  console.log('Workers Comp chat:', JSON.stringify(result.data, null, 2).substring(0, 1000));
  return result.data;
}

// ============================================================================
// Cost Estimation
// ============================================================================

const PRICING = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },  // per 1K tokens
  'gpt-4o': { input: 0.005, output: 0.015 }
};

interface UsageData {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

function estimateCost(usage: UsageData | undefined, model: string = 'gpt-4o-mini'): number {
  if (!usage) return 0;
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o-mini'];
  const inputCost = ((usage.prompt_tokens || 0) / 1000) * pricing.input;
  const outputCost = ((usage.completion_tokens || 0) / 1000) * pricing.output;
  return inputCost + outputCost;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('='.repeat(70));
  console.log('🔥 FIREBASE CLOUD FUNCTIONS - AI BACKEND TEST SUITE');
  console.log('='.repeat(70));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🎯 Project: insurance-product-hub`);
  console.log(`🌐 Environment: Production (Live Firebase)`);
  console.log('='.repeat(70));

  const results: TestResult[] = [];
  let totalCost = 0;
  let totalTokens = 0;

  // Run all tests
  results.push(await runTest('Generate Product Summary (CGL Form)', testGenerateProductSummary));
  results.push(await runTest('Chat Response - Coverage Question', testChatResponseCoverageQuestion));
  results.push(await runTest('Analyze Claim Scenario', testAnalyzeClaim));
  results.push(await runTest('Workers Comp Form Analysis', testWorkersCompChat));

  // Calculate costs
  results.forEach(r => {
    const resp = r.response as { usage?: UsageData; fromCache?: boolean } | undefined;
    if (resp?.usage && !resp?.fromCache) {
      const cost = estimateCost(resp.usage, 'gpt-4o-mini');
      totalCost += cost;
      totalTokens += resp.usage.total_tokens || 0;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const cachedCount = results.filter(r => (r.response as { fromCache?: boolean })?.fromCache).length;

  results.forEach(r => {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    const cached = (r.response as { fromCache?: boolean })?.fromCache ? ' [CACHED]' : '';
    console.log(`  ${status} - ${r.testName} (${r.duration}ms)${cached}`);
  });

  console.log('');
  console.log(`  Total: ${results.length} tests`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Cached: ${cachedCount}`);
  console.log(`  Total Duration: ${totalDuration}ms`);
  console.log('');
  console.log('💰 COST ANALYSIS (gpt-4o-mini pricing):');
  console.log(`  Tokens used: ${totalTokens}`);
  console.log(`  Estimated cost: $${totalCost.toFixed(6)}`);
  console.log(`  Cost per 1000 requests: $${(totalCost * 1000 / Math.max(1, results.length - cachedCount)).toFixed(2)}`);
  console.log('');
  console.log('📈 SAVINGS vs gpt-4o:');
  const gpt4oCost = totalTokens * 0.01 / 1000; // Approximate gpt-4o cost
  console.log(`  gpt-4o would cost: ~$${gpt4oCost.toFixed(4)}`);
  console.log(`  Savings: ${((1 - totalCost / Math.max(0.0001, gpt4oCost)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Backend is working correctly.');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
