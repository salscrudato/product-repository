/**
 * Firebase Cloud Functions - Main Entry Point
 * Modernized architecture with modular structure
 */

const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');

// Define the secret
const openaiKey = defineSecret('OPENAI_KEY');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Import modular API functions
const aiAPI = require('./src/api/ai');
const productCreationAgentAPI = require('./src/api/productCreationAgent');






// ============================================================================
// OpenAI Proxy Functions (Secure API calls from frontend)
// ============================================================================

/**
 * Generate product summary from PDF text
 * Updated: 2025-10-15 - Enhanced validation and logging
 */
exports.generateProductSummary = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { pdfText, systemPrompt } = request.data;

    // Enhanced logging for debugging
    console.log('generateProductSummary called with:', {
      hasPdfText: !!pdfText,
      pdfTextType: typeof pdfText,
      pdfTextLength: pdfText?.length || 0,
      pdfTextTrimmedLength: pdfText?.trim?.()?.length || 0,
      hasSystemPrompt: !!systemPrompt,
      firstChars: pdfText?.substring?.(0, 100) || 'N/A'
    });

    // Validate pdfText
    if (!pdfText) {
      console.error('pdfText is missing or null');
      throw new functions.https.HttpsError('invalid-argument', 'PDF text is required');
    }

    if (typeof pdfText !== 'string') {
      console.error('pdfText is not a string:', typeof pdfText);
      throw new functions.https.HttpsError('invalid-argument', 'PDF text must be a string');
    }

    if (pdfText.trim().length === 0) {
      console.error('pdfText is empty after trimming');
      throw new functions.https.HttpsError('invalid-argument', 'PDF text cannot be empty');
    }

    console.log('✅ PDF text validation passed, calling OpenAI...');

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in secrets');
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are an expert insurance analyst.' },
        { role: 'user', content: pdfText }
      ],
      max_tokens: 2000,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    });

    console.log('✅ OpenAI response received successfully');

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Product summary error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

/**
 * Generate chat response
 */
exports.generateChatResponse = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { messages, model = 'gpt-4o-mini', maxTokens = 1000, temperature = 0.7 } = request.data;

    console.log('generateChatResponse called with:', {
      messagesCount: messages?.length,
      model,
      maxTokens,
      temperature
    });

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    // Access the secret value and clean it
    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      console.error('OpenAI API key not found in secrets');
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    console.log('API key found, length:', apiKey.length, 'starts with:', apiKey.substring(0, 10));

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Chat response error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});



/**
 * Claims analysis
 */
exports.analyzeClaim = onCall({ secrets: [openaiKey] }, async (request) => {
  try {
    const { messages, model = 'gpt-4o', maxTokens = 2000, temperature = 0.2 } = request.data;

    if (!messages || !Array.isArray(messages)) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    const apiKey = openaiKey.value()?.trim();

    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };

  } catch (error) {
    console.error('Claims analysis error:', error.response?.data || error.message);
    throw new functions.https.HttpsError(
      'internal',
      error.response?.data?.error?.message || error.message
    );
  }
});

// ============================================================================
// MODERNIZED API EXPORTS
// ============================================================================

// AI-powered features (using new modular architecture)
exports.generateProductSummaryV2 = aiAPI.generateProductSummary;
exports.generateChatResponseV2 = aiAPI.generateChatResponse;
exports.analyzeClaimV2 = aiAPI.analyzeClaim;

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
