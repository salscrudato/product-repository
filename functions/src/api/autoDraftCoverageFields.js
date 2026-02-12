/**
 * autoDraftCoverageFields - Lightweight AI endpoint for auto-drafting coverage fields
 *
 * Uses GPT-4o-mini for fast, cost-efficient field generation with strict JSON response.
 * All outputs follow strict JSON schemas matching the Coverage TypeScript interface.
 */

const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const functions = require('firebase-functions');
const { logger } = require('firebase-functions');
const openaiService = require('../services/openai');

// Use OPENAI_KEY to match the secret set via `firebase functions:secrets:set OPENAI_KEY`
const openaiKey = defineSecret('OPENAI_KEY');

// Step-specific field mappings matching Coverage interface
// Uses canonical field names (arrays) with legacy fallbacks
const STEP_FIELDS = {
  triggers: ['coverageTrigger', 'waitingPeriod', 'waitingPeriodUnit', 'allowRetroactiveDate', 'extendedReportingPeriod'],
  valuation: ['valuationMethods', 'valuationMethod', 'coinsuranceOptions', 'coinsuranceMinimum', 'coinsuranceMaximum', 'hasCoinsurancePenalty', 'depreciationMethod'],
  underwriting: ['underwriterApprovalType', 'eligibilityCriteria', 'prohibitedClasses', 'underwritingGuidelines', 'requiresUnderwriterApproval'],
  claims: ['claimsReportingPeriod', 'proofOfLossDeadline', 'hasSubrogationRights', 'hasSalvageRights'],
  forms: [] // Forms are linked, not generated
};

// JSON schemas for strict type validation
// Supports both canonical (array) and legacy (single value) fields
const JSON_SCHEMAS = {
  triggers: {
    type: 'object',
    properties: {
      coverageTrigger: { type: 'string', enum: ['occurrence', 'claimsMade', 'hybrid'] },
      waitingPeriod: { type: 'number', minimum: 0 },
      waitingPeriodUnit: { type: 'string', enum: ['days', 'months'] },
      allowRetroactiveDate: { type: 'boolean' },
      extendedReportingPeriod: { type: 'number', minimum: 0 }
    },
    required: ['coverageTrigger'],
    additionalProperties: false
  },
  valuation: {
    type: 'object',
    properties: {
      // Canonical: array of valuation methods
      valuationMethods: { type: 'array', items: { type: 'string', enum: ['ACV', 'RC', 'agreedValue', 'marketValue', 'functionalRC', 'statedAmount'] } },
      // Legacy: single valuation method
      valuationMethod: { type: 'string', enum: ['ACV', 'RC', 'agreedValue', 'marketValue', 'functionalRC', 'statedAmount'] },
      // Canonical: array of coinsurance options
      coinsuranceOptions: { type: 'array', items: { type: 'number', minimum: 0, maximum: 100 } },
      coinsuranceMinimum: { type: 'number', minimum: 0, maximum: 100 },
      coinsuranceMaximum: { type: 'number', minimum: 0, maximum: 100 },
      hasCoinsurancePenalty: { type: 'boolean' },
      depreciationMethod: { type: 'string', enum: ['straightLine', 'decliningBalance', 'ageOfItem'] }
    },
    required: [],
    additionalProperties: false
  },
  underwriting: {
    type: 'object',
    properties: {
      // Canonical: semantic approval type
      underwriterApprovalType: { type: 'string', enum: ['required', 'not_required', 'conditional'] },
      // Legacy: boolean
      requiresUnderwriterApproval: { type: 'boolean' },
      eligibilityCriteria: { type: 'array', items: { type: 'string' } },
      prohibitedClasses: { type: 'array', items: { type: 'string' } },
      underwritingGuidelines: { type: 'string' }
    },
    required: [],
    additionalProperties: false
  },
  claims: {
    type: 'object',
    properties: {
      claimsReportingPeriod: { type: 'number', minimum: 0 },
      proofOfLossDeadline: { type: 'number', minimum: 0 },
      hasSubrogationRights: { type: 'boolean' },
      hasSalvageRights: { type: 'boolean' }
    },
    required: [],
    additionalProperties: false
  }
};

// Strict JSON schema prompt for each step
const getStepPrompt = (stepId, coverageName, coverageCode, currentDraft) => {
  const baseContext = `You are configuring a P&C insurance coverage named "${coverageName}" (Code: ${coverageCode || 'TBD'}).

Current draft state:
${JSON.stringify(currentDraft, null, 2)}

Based on the coverage name and type, generate appropriate values for the ${stepId} step.
Use industry-standard defaults appropriate for this specific coverage type.`;

  const prompts = {
    triggers: `${baseContext}

Generate trigger-related fields. Consider:
- "occurrence" trigger: Coverage applies when the loss OCCURS during the policy period (most property coverages)
- "claimsMade" trigger: Coverage applies when the claim is MADE during the policy period (professional liability, D&O)
- "hybrid" trigger: Both occurrence and claims-made elements
- Waiting periods: Common for specific perils (e.g., flood, equipment breakdown)
- Extended reporting periods: Important for claims-made policies

Return ONLY valid JSON matching this exact TypeScript interface:
{
  "coverageTrigger": "occurrence" | "claimsMade" | "hybrid",
  "waitingPeriod": number (0 if none, otherwise days like 14, 30, 60, 72 for weather perils),
  "waitingPeriodUnit": "days" | "months",
  "allowRetroactiveDate": boolean (true for claims-made policies),
  "extendedReportingPeriod": number (months, 0 if not applicable, 12-60 for claims-made)
}`,

    valuation: `${baseContext}

Generate valuation-related fields. Consider:
- ACV (Actual Cash Value): Replacement cost minus depreciation
- RC (Replacement Cost): Full replacement without depreciation deduction
- agreedValue: Pre-agreed value, common for fine art, collectibles
- marketValue: Current market value, used for certain property types
- functionalRC: Cost to replace with similar function, not identical
- statedAmount: Amount stated by insured (usually classic cars)

Coinsurance: 80% is standard, 90-100% for lower premiums
Depreciation: straightLine is most common

Return ONLY valid JSON matching this exact TypeScript interface:
{
  "valuationMethods": ["RC", "ACV"] (array of applicable methods),
  "valuationMethod": "RC" (primary method for legacy compatibility),
  "coinsuranceOptions": [80, 90, 100] (array of available percentages),
  "coinsuranceMinimum": 80 (minimum required percentage),
  "coinsuranceMaximum": 100 (maximum allowed percentage),
  "hasCoinsurancePenalty": boolean (true if coinsurance penalty applies),
  "depreciationMethod": "straightLine" | "decliningBalance" | "ageOfItem"
}`,

    underwriting: `${baseContext}

Generate underwriting-related fields appropriate for this coverage type.
Consider:
- Underwriter approval type: "required" for complex risks, "not_required" for standard, "conditional" for threshold-based
- Eligibility criteria: Specific requirements to qualify
- Prohibited classes: Business types or risks that cannot be insured
- Underwriting guidelines: Free-form notes for underwriters

Return ONLY valid JSON matching this exact TypeScript interface:
{
  "underwriterApprovalType": "required" | "not_required" | "conditional",
  "requiresUnderwriterApproval": boolean (legacy, true if type is "required" or "conditional"),
  "eligibilityCriteria": ["criterion1", "criterion2", ...],
  "prohibitedClasses": ["class1", "class2", ...] or [],
  "underwritingGuidelines": "Optional notes for underwriters"
}`,

    claims: `${baseContext}

Generate claims-related fields. Consider:
- Claims reporting periods: 30-90 days typical
- Proof of loss deadlines: 60-90 days common
- Subrogation: Right to recover from responsible party
- Salvage: Right to damaged property

Return ONLY valid JSON matching this exact TypeScript interface:
{
  "claimsReportingPeriod": number (days, typically 30, 60, or 90),
  "proofOfLossDeadline": number (days, typically 60 or 90),
  "hasSubrogationRights": boolean (usually true for property),
  "hasSalvageRights": boolean (usually true for property)
}`
  };

  return prompts[stepId] || null;
};

/**
 * Validate fields against the step's JSON schema
 */
const validateAndSanitizeFields = (stepId, fields) => {
  const schema = JSON_SCHEMAS[stepId];
  if (!schema) return fields;

  const sanitized = {};
  const allowedFields = STEP_FIELDS[stepId] || [];

  // Only include fields that are in the allowed list for this step
  for (const key of allowedFields) {
    if (fields.hasOwnProperty(key)) {
      const value = fields[key];
      const propSchema = schema.properties[key];

      if (!propSchema) continue;

      // Type validation
      if (propSchema.type === 'string' && typeof value === 'string') {
        if (propSchema.enum && !propSchema.enum.includes(value)) continue;
        sanitized[key] = value;
      } else if (propSchema.type === 'number' && typeof value === 'number') {
        if (propSchema.enum && !propSchema.enum.includes(value)) continue;
        if (propSchema.minimum !== undefined && value < propSchema.minimum) continue;
        if (propSchema.maximum !== undefined && value > propSchema.maximum) continue;
        sanitized[key] = value;
      } else if (propSchema.type === 'boolean' && typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (propSchema.type === 'array' && Array.isArray(value)) {
        sanitized[key] = value.filter(item => typeof item === 'string');
      }
    }
  }

  return sanitized;
};

/**
 * Auto-draft coverage fields for a specific wizard step
 */
const autoDraftCoverageFields = onCall(
  { secrets: [openaiKey], timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { productId, stepId, coverageName, coverageCode, currentDraft = {} } = request.data;

    if (!productId) {
      throw new functions.https.HttpsError('invalid-argument', 'productId is required');
    }
    if (!stepId) {
      throw new functions.https.HttpsError('invalid-argument', 'stepId is required');
    }
    if (!coverageName) {
      throw new functions.https.HttpsError('invalid-argument', 'coverageName is required');
    }

    // Skip if step doesn't have generatable fields
    if (!STEP_FIELDS[stepId] || STEP_FIELDS[stepId].length === 0) {
      return { fields: {}, confidence: 0, suggestions: [] };
    }

    logger.info('Auto-drafting coverage fields', {
      userId: request.auth.uid,
      productId,
      stepId,
      coverageName
    });

    try {
      // The secret is automatically available as process.env.OPENAI_KEY
      // when the function is configured with secrets: [openaiKey]
      // No need to manually initialize - openaiService.getOpenAIKey() reads from env

      const systemPrompt = `You are a P&C insurance product configuration expert.
You generate accurate, industry-standard default values for coverage fields based on the coverage name and type.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no explanations, no markdown, no extra text
2. Use values that match the exact TypeScript types specified
3. Be consistent with P&C insurance industry standards
4. Consider the specific coverage type when choosing defaults

For liability coverages (e.g., General Liability, Professional Liability, D&O):
- Use "claimsMade" or "hybrid" triggers
- Include extended reporting periods (12-60 months)
- Allow retroactive dates

For property coverages (e.g., Building, Contents, Equipment):
- Use "occurrence" trigger
- Waiting periods only for specific perils (flood, earthquake)
- No extended reporting period needed`;

      const userPrompt = getStepPrompt(stepId, coverageName, coverageCode, currentDraft);

      if (!userPrompt) {
        return { fields: {}, confidence: 0, suggestions: [] };
      }

      const response = await openaiService.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.2  // Lower temperature for more consistent outputs
      });

      // Parse JSON response
      let rawFields = {};
      try {
        const content = response.content.trim();
        // Remove any markdown code blocks if present
        const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        rawFields = JSON.parse(jsonStr);
      } catch (parseErr) {
        logger.warn('Failed to parse AI response as JSON', {
          content: response.content,
          error: parseErr.message
        });
        return { fields: {}, confidence: 0, suggestions: ['AI response was not valid JSON'] };
      }

      // Validate and sanitize fields against schema
      const fields = validateAndSanitizeFields(stepId, rawFields);

      logger.info('Auto-draft completed', {
        stepId,
        rawFieldCount: Object.keys(rawFields).length,
        validatedFieldCount: Object.keys(fields).length,
        estimatedCost: response.estimatedCost
      });

      return {
        fields,
        confidence: Object.keys(fields).length > 0 ? 0.85 : 0,
        suggestions: []
      };

    } catch (err) {
      logger.error('Auto-draft error', { error: err.message, stepId, coverageName });
      throw new functions.https.HttpsError('internal', 'Failed to generate field suggestions');
    }
  }
);

module.exports = { autoDraftCoverageFields };

