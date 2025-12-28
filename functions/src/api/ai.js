/**
 * AI API Functions
 * Cloud Functions for AI-powered features
 */

const functions = require('firebase-functions');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
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

/**
 * Suggest coverage names based on partial input
 * Uses AI to dynamically generate relevant P&C insurance coverage suggestions
 *
 * Using v2 onCall for proper Firebase Auth integration
 */
const suggestCoverageNames = onCall(
  {
    // Enable CORS and require authentication
    cors: true,
    // Secrets for OpenAI
    secrets: ['OPENAI_API_KEY'],
  },
  async (request) => {
    // v2 uses request.auth instead of context.auth
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to perform this action'
      );
    }

    const { query, lineOfBusiness = 'property', existingNames = [] } = request.data;

    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    logger.info('Coverage name suggestion requested', {
      userId: request.auth.uid,
      query,
      lineOfBusiness
    });

    // Build a focused prompt for coverage name suggestions
    const systemPrompt = `You are an expert P&C insurance product specialist. Generate relevant insurance coverage name suggestions based on the user's partial input.

Line of Business: ${lineOfBusiness}
${existingNames.length > 0 ? `Existing coverages (avoid duplicates): ${existingNames.join(', ')}` : ''}

Rules:
1. Return only standard P&C insurance coverage names
2. Suggestions should complete or relate to the user's input
3. Be specific and professional (e.g., "Building & Structures Coverage" not just "Building")
4. Include common variations and related coverages
5. Return 5-8 suggestions, most relevant first
6. Format: Return ONLY a JSON array of strings, no explanations`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Suggest coverage names matching: "${query}"` }
    ];

    try {
      const result = await openaiService.generateChatResponse(
        messages,
        'gpt-4o-mini', // Use fast, cheap model for suggestions
        100, // Low max tokens
        0.3 // Low temperature for consistent results
      );

      // Parse the response
      let suggestions = [];
      try {
        const content = result.content || result.choices?.[0]?.message?.content || '[]';
        // Clean up the response - sometimes GPT adds markdown
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        suggestions = JSON.parse(cleaned);

        // Filter out any that match existing names
        suggestions = suggestions.filter(
          s => !existingNames.some(e => e.toLowerCase() === s.toLowerCase())
        );
      } catch (parseError) {
        logger.warn('Failed to parse AI suggestions', { error: parseError.message, content: result.content });
        suggestions = [];
      }

      logger.info('Coverage name suggestions generated', {
        userId: request.auth.uid,
        count: suggestions.length,
        tokensUsed: result.usage?.total_tokens
      });

      return { suggestions };
    } catch (error) {
      logger.error('Coverage suggestion failed', { error: error.message });
      throw new HttpsError('internal', 'Failed to generate suggestions');
    }
  }
);

module.exports = {
  generateProductSummary,
  generateChatResponse,
  analyzeClaim,
  suggestCoverageNames
};

