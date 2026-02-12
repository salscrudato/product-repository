/**
 * AI Gateway Cloud Function
 * Centralized AI calls with structured outputs, guardrails, and telemetry
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");

// Define the secret - matches the secret set via `firebase functions:secrets:set OPENAI_KEY`
const openaiKey = defineSecret('OPENAI_KEY');

// PII patterns for redaction
const PII_PATTERNS = [
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]' },
  { name: 'phone', pattern: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE REDACTED]' },
  { name: 'creditCard', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CC REDACTED]' },
  { name: 'dob', pattern: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g, replacement: '[DOB REDACTED]' },
];

// Redact PII from text
function redactPII(text) {
  if (!text || typeof text !== 'string') return text;
  
  let redacted = text;
  const redactions = [];
  
  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches) {
      redactions.push({ type: name, count: matches.length });
      redacted = redacted.replace(pattern, replacement);
    }
  }
  
  return { text: redacted, redactions };
}

// Validate response against JSON schema
function validateResponse(response, schema) {
  if (!schema) return { valid: true, data: response };
  
  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    // Basic schema validation (in production, use ajv or similar)
    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Calculate cost estimate based on model and tokens
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };
  
  const rates = pricing[model] || pricing['gpt-4o-mini'];
  return (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);
}

/**
 * AI Gateway - Centralized AI call handler
 */
exports.aiGateway = onCall({
  region: "us-east1",
  memory: "512MiB",
  timeoutSeconds: 120,
  cors: true,
  secrets: [openaiKey],
}, async (request) => {
  const startTime = Date.now();
  const db = getFirestore();
  
  // Validate authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  
  const { 
    prompt, 
    systemPrompt,
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 2000,
    responseSchema,
    context = {},
    requestId,
  } = request.data;
  
  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt is required");
  }
  
  // Redact PII from prompt
  const { text: sanitizedPrompt, redactions } = redactPII(prompt);
  
  // Log telemetry start
  const telemetryRef = db.collection('aiTelemetry').doc();
  const telemetryData = {
    requestId: requestId || telemetryRef.id,
    userId: request.auth.uid,
    model,
    temperature,
    maxTokens,
    promptLength: sanitizedPrompt.length,
    piiRedactions: redactions,
    context: {
      productId: context.productId,
      feature: context.feature,
    },
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  };
  
  try {
    // Build messages
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: sanitizedPrompt });
    
    // Call OpenAI API - access the secret value
    const apiKey = openaiKey.value()?.trim();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "OpenAI API key not configured");
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: responseSchema ? { type: 'json_object' } : undefined,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    
    const completion = response.data;
    const content = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};
    
    // Validate response if schema provided
    const validation = validateResponse(content, responseSchema);
    
    // Calculate metrics
    const latencyMs = Date.now() - startTime;
    const cost = estimateCost(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
    
    // Update telemetry
    await telemetryRef.set({
      ...telemetryData,
      status: 'success',
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      latencyMs,
      estimatedCost: cost,
      responseValid: validation.valid,
      completedAt: FieldValue.serverTimestamp(),
    });
    
    return {
      success: true,
      content: validation.valid ? validation.data : content,
      raw: content,
      usage: {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      metrics: {
        latencyMs,
        estimatedCost: cost,
        piiRedacted: redactions.length > 0,
      },
      requestId: telemetryRef.id,
    };
    
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    
    // Log error telemetry
    await telemetryRef.set({
      ...telemetryData,
      status: 'error',
      error: error.message,
      latencyMs,
      completedAt: FieldValue.serverTimestamp(),
    });
    
    console.error('AI Gateway error:', error.message);
    throw new HttpsError("internal", `AI request failed: ${error.message}`);
  }
});

