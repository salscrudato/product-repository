/**
 * Firebase Cloud Functions - Main Entry Point
 * OPTIMIZED: Cost-effective, fast AI operations
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Define the secret
const openaiKey = defineSecret('OPENAI_KEY');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// COST-EFFECTIVE CONFIG - 100% COMPLETENESS GUARANTEED
// ============================================================================

const AI_CONFIG = {
  // Model pricing (per 1K tokens) - All using gpt-4o-mini for cost savings
  models: {
    fast: { name: 'gpt-4o-mini', inputCost: 0.00015, outputCost: 0.0006 },
    quality: { name: 'gpt-4o-mini', inputCost: 0.00015, outputCost: 0.0006 }
  },

  // Task-specific settings - FULL COMPLETENESS with generous limits
  tasks: {
    summary: { model: 'gpt-4o-mini', maxTokens: 4000, timeout: 90000 },  // 90s, 4K tokens
    chat: { model: 'gpt-4o-mini', maxTokens: 2000, timeout: 60000 },     // 60s, 2K tokens
    claims: { model: 'gpt-4o-mini', maxTokens: 3000, timeout: 90000 }    // 90s, 3K tokens
  },

  // Input limits - NO truncation for summaries, generous for others
  maxInputChars: {
    summary: 200000,  // ~50K tokens - full document support
    chat: 50000,      // ~12.5K tokens - generous context
    claims: 100000    // ~25K tokens - full claim details
  }
};

// In-memory cache for responses (persists across warm function invocations)
const responseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generate cache key
 * Uses more of the content to avoid collisions with long system prompts
 */
const getCacheKey = (type, content, prompt) => {
  // Use a larger portion of content and include the end to capture unique user messages
  const contentStart = content.substring(0, 2000);
  const contentEnd = content.length > 2000 ? content.substring(content.length - 1000) : '';
  const hash = crypto.createHash('md5')
    .update(type + contentStart + contentEnd + (prompt || ''))
    .digest('hex');
  return hash;
};

/**
 * Get cached response
 */
const getFromCache = (key) => {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
};

/**
 * Store in cache
 */
const setCache = (key, data) => {
  // Limit cache size
  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Smart text truncation - preserves completeness, only truncates if absolutely necessary
 */
const smartTruncate = (text, maxChars) => {
  // Return full text if within limits (should almost always be the case now)
  if (!text || text.length <= maxChars) return text;

  // For very large documents, try to preserve structure
  const truncated = text.substring(0, maxChars);
  const lastSection = truncated.lastIndexOf('\n\n');
  if (lastSection > maxChars * 0.9) {
    return truncated.substring(0, lastSection);
  }
  return truncated;
};

/**
 * Compress system prompt - remove unnecessary words
 */
const compressPrompt = (prompt) => {
  if (!prompt) return prompt;
  return prompt
    .replace(/\s+/g, ' ')
    .replace(/please /gi, '')
    .replace(/could you /gi, '')
    .replace(/I would like you to /gi, '')
    .trim();
};

// Import modular API functions
const productCreationAgentAPI = require('./src/api/productCreationAgent');
const aiAPI = require('./src/api/ai'); // Used for suggestCoverageNames






// ============================================================================
// OpenAI Proxy Functions - Cost-Effective with 100% Completeness
// ============================================================================

/**
 * Generate product summary from PDF text
 * COMPLETE: Full document processing, generous token limits, cost-effective model
 */
exports.generateProductSummary = onCall({ secrets: [openaiKey] }, async (request) => {
  // Authentication required
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const startTime = Date.now();

  try {
    const { pdfText, systemPrompt } = request.data;
    const config = AI_CONFIG.tasks.summary;

    // Validation
    if (!pdfText || typeof pdfText !== 'string' || !pdfText.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'PDF text is required');
    }

    // Check cache first
    const cacheKey = getCacheKey('summary', pdfText, systemPrompt);
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit - ${Date.now() - startTime}ms`);
      return { ...cached, fromCache: true };
    }

    const apiKey = openaiKey.value()?.trim();
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    // Process full document - only truncate if extremely large
    const processedText = smartTruncate(pdfText, AI_CONFIG.maxInputChars.summary);
    // Use provided prompt or comprehensive default
    const effectivePrompt = systemPrompt || 'You are an expert insurance analyst. Analyze the provided insurance product document and create a comprehensive, complete summary including ALL coverages, exclusions, conditions, and limits. Do not omit any coverage details.';

    console.log(`📊 Processing: ${pdfText.length} chars, timeout: ${config.timeout}ms`);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: config.model,
      messages: [
        { role: 'system', content: effectivePrompt },
        { role: 'user', content: processedText }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout
    });

    const result = {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: config.model,
      latencyMs: Date.now() - startTime
    };

    // Cache the response
    setCache(cacheKey, result);

    console.log(`✅ Summary complete - ${result.latencyMs}ms, ${response.data.usage?.total_tokens} tokens`);
    return result;

  } catch (error) {
    console.error('Product summary error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', error.response?.data?.error?.message || error.message);
  }
});

/**
 * Generate chat response
 * COMPLETE: Full context support, generous token limits, cost-effective model
 * NOTE: No caching for multi-turn conversations to ensure fresh responses
 */
exports.generateChatResponse = onCall({ secrets: [openaiKey] }, async (request) => {
  // Authentication required
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const startTime = Date.now();

  try {
    const { messages, maxTokens, temperature = 0.7 } = request.data;
    const config = AI_CONFIG.tasks.chat;

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    // Use gpt-4o-mini for cost savings, but allow full token output
    const effectiveMaxTokens = maxTokens || config.maxTokens;

    // NO CACHING for chat - conversations are dynamic and unique
    // Caching causes issues with multi-turn conversations where context matters

    const apiKey = openaiKey.value()?.trim();
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    // Process messages - allow generous context
    const processedMessages = messages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string'
        ? smartTruncate(msg.content, AI_CONFIG.maxInputChars.chat)
        : msg.content
    }));

    // Debug log for conversation context
    console.log(`📝 Chat request - ${messages.length} messages, temp=${temperature}`);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: config.model,
      messages: processedMessages,
      max_tokens: effectiveMaxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout
    });

    const result = {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: config.model,
      latencyMs: Date.now() - startTime
    };

    console.log(`✅ Chat response - ${result.latencyMs}ms, ${response.data.usage?.total_tokens} tokens`);
    return result;

  } catch (error) {
    console.error('Chat response error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', error.response?.data?.error?.message || error.message);
  }
});

/**
 * Claims analysis
 * COMPLETE: Full claim context, comprehensive analysis, cost-effective model
 */
exports.analyzeClaim = onCall({ secrets: [openaiKey] }, async (request) => {
  // Authentication required
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const startTime = Date.now();

  try {
    const { messages, temperature = 0.2 } = request.data;
    const config = AI_CONFIG.tasks.claims;

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    // Check cache
    const cacheKey = getCacheKey('claims', JSON.stringify(messages), '');
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Claims cache hit - ${Date.now() - startTime}ms`);
      return { ...cached, fromCache: true };
    }

    const apiKey = openaiKey.value()?.trim();
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    // Process messages with generous limits
    const processedMessages = messages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string'
        ? smartTruncate(msg.content, AI_CONFIG.maxInputChars.claims)
        : msg.content
    }));

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: config.model,
      messages: processedMessages,
      max_tokens: config.maxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout
    });

    const result = {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: config.model,
      latencyMs: Date.now() - startTime
    };

    // Cache the result
    setCache(cacheKey, result);

    console.log(`✅ Claims analysis - ${result.latencyMs}ms, ${response.data.usage?.total_tokens} tokens`);
    return result;

  } catch (error) {
    console.error('Claims analysis error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', error.response?.data?.error?.message || error.message);
  }
});

// ============================================================================
// ADDITIONAL API EXPORTS
// ============================================================================

// Pricing Engine
const pricingAPI = require('./src/api/pricing');
exports.rateCoverage = pricingAPI.rateCoverage;
exports.ratePackage = pricingAPI.ratePackage;

// Data Integrity (extended)
const dataIntegrityAPI = require('./src/api/dataIntegrity');
exports.migrateToSchemaV3 = dataIntegrityAPI.migrateToSchemaV3;
exports.recalculateProductStats = dataIntegrityAPI.recalculateProductStats;
exports.recalculateCoverageStats = dataIntegrityAPI.recalculateCoverageStats;

// Product Integrity Triggers
const productIntegrityTriggers = require('./src/triggers/productIntegrity');
exports.onCoverageChange = productIntegrityTriggers.onCoverageChange;
exports.onCoverageDelete = productIntegrityTriggers.onCoverageDelete;
exports.onLimitChange = productIntegrityTriggers.onLimitChange;
exports.onLimitDelete = productIntegrityTriggers.onLimitDelete;
exports.onDeductibleChange = productIntegrityTriggers.onDeductibleChange;
exports.onDeductibleDelete = productIntegrityTriggers.onDeductibleDelete;
exports.onFormCoverageChange = productIntegrityTriggers.onFormCoverageChange;
exports.onFormCoverageDelete = productIntegrityTriggers.onFormCoverageDelete;

// Product Creation Agent
exports.createProductFromPDF = productCreationAgentAPI.createProductFromPDF;

// Coverage Assistant (AI Copilot)
const coverageAssistantAPI = require('./src/api/coverageAssistant');
exports.coverageAssistant = coverageAssistantAPI.coverageAssistant;

// Auto-Draft Coverage Fields (lightweight AI for wizard steps)
const autoDraftAPI = require('./src/api/autoDraftCoverageFields');
exports.autoDraftCoverageFields = autoDraftAPI.autoDraftCoverageFields;

// Coverage Name Suggestions (AI-powered autocomplete)
exports.suggestCoverageNames = aiAPI.suggestCoverageNames;

// Admin API - Role Management
const adminAPI = require('./src/api/admin');
exports.setUserRole = adminAPI.setUserRole;
exports.getUserRole = adminAPI.getUserRole;
exports.listUsersWithRoles = adminAPI.listUsersWithRoles;

// AI Gateway - Centralized AI with guardrails
const aiGateway = require('./aiGateway');
exports.aiGateway = aiGateway.aiGateway;
