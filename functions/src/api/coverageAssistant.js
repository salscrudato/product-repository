/**
 * Coverage Assistant API
 * AI-powered coverage copilot for multi-turn coverage creation
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const axios = require('axios');
const { logger } = require('../utils/logger');

// Define the secret
const openaiKey = defineSecret('OPENAI_KEY');

// Valid coverage fields for validation
// Includes both canonical and legacy field names for backward compatibility
const VALID_COVERAGE_FIELDS = [
  'name', 'coverageCode', 'description', 'type', 'isOptional', 'coverageKind',
  'scopeOfCoverage', 'perilsCovered', 'exclusions', 'insurableObjects', 'excludedObjects',
  'premiumBasis', 'ratePerUnit', 'minimumPremium', 'premium',
  // Coinsurance - canonical (array) and legacy (single value)
  'coinsuranceOptions', 'coinsuranceMinimum', 'coinsuranceMaximum', // canonical
  'coinsurancePercentage', 'hasCoinsurancePenalty', 'insuredParticipation', 'coinsuranceWaiver', // legacy
  'coverageTrigger', 'waitingPeriod', 'waitingPeriodUnit', 'allowRetroactiveDate',
  // Valuation - canonical (array) and legacy (single value)
  'valuationMethods', // canonical
  'valuationMethod', 'depreciationMethod', 'agreedValueAmount', // legacy
  'territoryType', 'states', 'availabilityStates', 'excludedTerritories', 'includedTerritories',
  'modifiesCoverageId', 'endorsementType', 'supersedes',
  // Underwriting - canonical and legacy
  'underwriterApprovalType', 'underwritingGuidelines', // canonical
  'requiresUnderwriterApproval', 'eligibilityCriteria', 'prohibitedClasses', // legacy
  'requiredCoverages', 'incompatibleCoverages', 'requiredCoverageIds', 'incompatibleCoverageIds',
  'claimsReportingPeriod', 'proofOfLossDeadline', 'hasSubrogationRights', 'hasSalvageRights',
  'coverageCategory', 'lineOfBusiness', 'parentCoverageId'
];

const REQUIRED_FOR_PUBLISH = ['name', 'coverageCode', 'productId'];

const COVERAGE_ASSISTANT_PROMPT = `You are an expert P&C insurance product manager assistant.

Responsibilities:
1. Extract structured coverage data from user messages
2. Ask only minimum necessary follow-up questions
3. Suggest sensible defaults based on industry standards
4. Return structured JSON responses

Coverage Types (coverageKind): coverage, endorsement, exclusion, notice, condition
Valuation methods: ACV, RC, agreedValue, marketValue
Triggers: occurrence, claimsMade, hybrid
Common coinsurance: 80%, 90%, 100%

Respond with JSON:
{
  "assistant_message": "Your response",
  "patch": { /* Fields to update */ },
  "questions": [{ "id": "q1", "text": "Question", "fieldHints": ["field"] }],
  "missing_required_for_publish": ["field1"],
  "warnings": []
}`;

function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

async function findSimilarCoverages(draft, existingCoverages = []) {
  const matches = [];
  const draftText = `${draft.name || ''} ${draft.description || ''} ${draft.coverageCode || ''}`;
  for (const coverage of existingCoverages) {
    if (coverage.id === draft.id) continue;
    const covText = `${coverage.name || ''} ${coverage.description || ''} ${coverage.coverageCode || ''}`;
    const similarity = calculateSimilarity(draftText, covText);
    if (similarity > 0.3) {
      matches.push({
        coverageId: coverage.id,
        name: coverage.name,
        coverageCode: coverage.coverageCode,
        similarity: Math.round(similarity * 100),
        why: 'Similar content'
      });
    }
  }
  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

function sanitizePatch(patch) {
  if (!patch || typeof patch !== 'object') return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!VALID_COVERAGE_FIELDS.includes(key)) continue;
    if (value === null || value === undefined) continue;
    if (key === 'coinsurancePercentage' && typeof value === 'string') {
      sanitized[key] = parseInt(value, 10);
    } else if (['hasSubrogationRights', 'hasCoinsurancePenalty', 'isOptional'].includes(key)) {
      sanitized[key] = Boolean(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function getMissingRequiredFields(draft) {
  return REQUIRED_FOR_PUBLISH.filter(field => {
    const value = draft[field];
    return !value || (typeof value === 'string' && value.trim().length === 0);
  });
}

/**
 * Coverage Assistant - Multi-turn AI copilot for coverage creation
 */
const coverageAssistant = onCall(
  { secrets: [openaiKey], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { productId, userMessage, conversationHistory = [], currentDraft = {}, existingCoverages = [] } = request.data;

    if (!productId) {
      throw new functions.https.HttpsError('invalid-argument', 'productId is required');
    }
    if (!userMessage || typeof userMessage !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'userMessage is required');
    }

    logger.info('Coverage assistant request', { userId: request.auth.uid, productId });

    try {
      const messages = [
        { role: 'system', content: COVERAGE_ASSISTANT_PROMPT },
        { role: 'system', content: `Current draft:\n${JSON.stringify(currentDraft, null, 2)}` }
      ];
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
      }
      messages.push({ role: 'user', content: userMessage });

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 2000, response_format: { type: 'json_object' } },
        { headers: { 'Authorization': `Bearer ${openaiKey.value()}`, 'Content-Type': 'application/json' } }
      );

      const aiContent = response.data.choices[0]?.message?.content;
      if (!aiContent) throw new Error('No response from AI');

      let aiResponse;
      try {
        aiResponse = JSON.parse(aiContent);
      } catch {
        throw new functions.https.HttpsError('internal', 'AI returned invalid JSON');
      }

      const sanitizedPatch = sanitizePatch(aiResponse.patch);
      const mergedDraft = { ...currentDraft, ...sanitizedPatch };
      const nearMatches = await findSimilarCoverages(mergedDraft, existingCoverages);
      const missingRequired = getMissingRequiredFields(mergedDraft);

      const result = {
        assistant_message: aiResponse.assistant_message || 'I processed your request.',
        patch: sanitizedPatch,
        questions: Array.isArray(aiResponse.questions) ? aiResponse.questions : [],
        missing_required_for_publish: missingRequired,
        near_matches: nearMatches,
        warnings: aiResponse.warnings || []
      };

      if (nearMatches.length > 0 && nearMatches[0].similarity > 70) {
        result.warnings.push(`Similar coverage found: "${nearMatches[0].name}" (${nearMatches[0].similarity}% match)`);
      }

      logger.info('Coverage assistant response', { userId: request.auth.uid, patchFields: Object.keys(sanitizedPatch) });
      return result;

    } catch (error) {
      logger.error('Coverage assistant error', { error: error.message });
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', error.message || 'Failed to process request');
    }
  }
);

module.exports = { coverageAssistant };

