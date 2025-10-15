/**
 * AI API Functions
 * Cloud Functions for AI-powered features
 */

const functions = require('firebase-functions');
const { requireAuth } = require('../middleware/auth');
const { validateAIRequest } = require('../middleware/validation');
const { withErrorHandling } = require('../middleware/errorHandler');
const { rateLimitAI } = require('../middleware/rateLimit');
const { logger } = require('../utils/logger');
const openaiService = require('../services/openai');
const pdfService = require('../services/pdf');

/**
 * Generate product summary from PDF
 * Accepts PDF URL, base64, or pre-extracted text
 */
const generateProductSummary = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    // Authentication and rate limiting
    requireAuth(context);
    rateLimitAI(context);

    const { pdfUrl, pdfBase64, pdfText, systemPrompt } = data;

    logger.info('Product summary generation requested', {
      userId: context.auth.uid,
      hasUrl: !!pdfUrl,
      hasBase64: !!pdfBase64,
      hasText: !!pdfText
    });

    let extractedText = pdfText;

    // Extract text from PDF if URL or base64 provided
    if (pdfUrl) {
      extractedText = await pdfService.extractTextFromUrl(pdfUrl);
    } else if (pdfBase64) {
      extractedText = await pdfService.extractTextFromBase64(pdfBase64);
    }

    if (!extractedText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Must provide pdfUrl, pdfBase64, or pdfText'
      );
    }

    // Validate and truncate text
    validateAIRequest({ pdfText: extractedText, systemPrompt });
    const truncatedText = pdfService.truncateText(extractedText, 100000);

    // Generate summary using OpenAI
    const result = await openaiService.generateProductSummary(
      truncatedText,
      systemPrompt
    );

    logger.info('Product summary generated successfully', {
      userId: context.auth.uid,
      tokensUsed: result.usage?.total_tokens
    });

    return result;
  }, 'generateProductSummary')
);

/**
 * Generate chat response
 */
const generateChatResponse = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    // Authentication and rate limiting
    requireAuth(context);
    rateLimitAI(context);

    const { messages, systemPrompt, model, maxTokens, temperature } = data;

    // Validation
    validateAIRequest({ messages });

    logger.info('Chat response requested', {
      userId: context.auth.uid,
      messageCount: messages.length,
      model: model || 'default',
      maxTokens: maxTokens || 'default'
    });

    // Generate response using OpenAI with custom parameters
    const result = await openaiService.generateChatResponse(
      messages,
      systemPrompt,
      {
        model,
        maxTokens,
        temperature
      }
    );

    logger.info('Chat response generated successfully', {
      userId: context.auth.uid,
      tokensUsed: result.usage?.total_tokens,
      model: result.model
    });

    return result;
  }, 'generateChatResponse')
);

/**
 * Analyze insurance claim
 */
const analyzeClaim = functions.https.onCall(
  withErrorHandling(async (data, context) => {
    // Authentication and rate limiting
    requireAuth(context);
    rateLimitAI(context);

    const { claimText, systemPrompt } = data;

    // Validation
    if (!claimText || typeof claimText !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'claimText is required and must be a string'
      );
    }

    logger.info('Claim analysis requested', {
      userId: context.auth.uid,
      textLength: claimText.length
    });

    // Analyze claim using OpenAI
    const result = await openaiService.analyzeClaim(
      claimText,
      systemPrompt
    );

    logger.info('Claim analysis completed successfully', {
      userId: context.auth.uid,
      tokensUsed: result.usage?.total_tokens
    });

    return result;
  }, 'analyzeClaim')
);

module.exports = {
  generateProductSummary,
  generateChatResponse,
  analyzeClaim
};

