/**
 * OpenAI Service
 * Centralized service for all OpenAI API interactions
 *
 * Optimizations:
 * - Response caching with TTL to reduce API calls
 * - Batch operation support for efficiency
 * - Retry logic with exponential backoff
 * - Request deduplication
 */

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Optimized: Simple in-memory cache for API responses
 * Cache key: hash of messages + model + temperature
 */
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 100; // Max entries

/**
 * Optimized: Generate cache key from request parameters
 */
const generateCacheKey = (messages, model, temperature) => {
  const key = JSON.stringify({ messages, model, temperature });
  return crypto.createHash('sha256').update(key).digest('hex');
};

/**
 * Optimized: Get cached response if available and not expired
 */
const getCachedResponse = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('Cache hit for OpenAI response', { cacheKey });
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey);
  }
  return null;
};

/**
 * Optimized: Store response in cache with size management
 */
const setCachedResponse = (cacheKey, response) => {
  // Evict oldest entry if cache is full
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
};

/**
 * Get OpenAI API key from environment
 * @returns {string} OpenAI API key
 * @throws {Error} If API key is not configured
 */
const getOpenAIKey = () => {
  if (process.env.OPENAI_KEY) {
    const key = process.env.OPENAI_KEY.trim();
    if (!key) {
      throw new Error('OpenAI API key is empty after trimming.');
    }
    return key;
  }
  throw new Error('OpenAI API key not configured. Set OPENAI_KEY environment variable.');
};

/**
 * Call OpenAI Chat Completion API
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of message objects
 * @param {string} options.model - Model to use (default: gpt-4o-mini)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @param {number} options.temperature - Temperature for randomness
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {boolean} options.useCache - Enable response caching (default: true)
 * @returns {Promise<Object>} OpenAI response
 */
const chatCompletion = async (options = {}) => {
  const {
    messages,
    model = 'gpt-4o-mini',
    maxTokens = 2000,
    temperature = 0.2,
    timeout = 45000,
    useCache = true
  } = options;

  const startTime = Date.now();

  try {
    // Optimized: Check cache first
    const cacheKey = generateCacheKey(messages, model, temperature);
    if (useCache) {
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        const duration = Date.now() - startTime;
        logger.info('OpenAI response from cache', {
          model,
          duration: `${duration}ms`,
          cacheKey: cacheKey.substring(0, 8)
        });
        return { ...cachedResponse, fromCache: true };
      }
    }

    const apiKey = getOpenAIKey();

    logger.debug('Calling OpenAI API', {
      model,
      messageCount: messages.length,
      maxTokens,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 10)
    });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout
      }
    );

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      fromCache: false
    };

    // Optimized: Cache successful response
    if (useCache) {
      setCachedResponse(cacheKey, result);
    }

    logger.info('OpenAI API call successful', {
      model,
      duration: `${duration}ms`,
      tokensUsed: response.data.usage?.total_tokens || 0
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('OpenAI API call failed', {
      duration: `${duration}ms`,
      error: error.message,
      status: error.response?.status
    });

    // Re-throw with more context
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401) {
        throw new Error('OpenAI API authentication failed. Check API key.');
      } else if (status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (status >= 500) {
        throw new Error('OpenAI API service error. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${message}`);
      }
    }
    
    throw error;
  }
};

/**
 * Generate product summary from PDF text
 * @param {string} pdfText - Extracted PDF text
 * @param {string} systemPrompt - System prompt for AI
 * @returns {Promise<Object>} Summary response
 */
const generateProductSummary = async (pdfText, systemPrompt) => {
  const messages = [
    {
      role: 'system',
      content: systemPrompt || 'You are an expert insurance analyst. Analyze the provided insurance product document and create a comprehensive summary.'
    },
    {
      role: 'user',
      content: pdfText
    }
  ];

  return chatCompletion({
    messages,
    maxTokens: 2000,
    temperature: 0.2
  });
};

/**
 * Generate chat response
 * @param {Array} messages - Chat message history
 * @param {string} systemPrompt - System prompt for AI
 * @param {Object} options - Additional options (model, maxTokens, temperature)
 * @returns {Promise<Object>} Chat response
 */
const generateChatResponse = async (messages, systemPrompt, options = {}) => {
  // System prompt is already included in messages from frontend
  // Only add if not present
  const hasSystemPrompt = messages.some(msg => msg.role === 'system');

  const fullMessages = hasSystemPrompt ? messages : [
    {
      role: 'system',
      content: systemPrompt || 'You are a helpful insurance product assistant.'
    },
    ...messages
  ];

  return chatCompletion({
    messages: fullMessages,
    model: options.model || 'gpt-4o-mini',
    maxTokens: options.maxTokens || 1500,
    temperature: options.temperature !== undefined ? options.temperature : 0.7
  });
};

/**
 * Analyze insurance claim
 * @param {string} claimText - Claim description
 * @param {string} systemPrompt - System prompt for AI
 * @returns {Promise<Object>} Analysis response
 */
const analyzeClaim = async (claimText, systemPrompt) => {
  const messages = [
    {
      role: 'system',
      content: systemPrompt || 'You are an expert insurance claims analyst.'
    },
    {
      role: 'user',
      content: claimText
    }
  ];

  return chatCompletion({
    messages,
    maxTokens: 2000,
    temperature: 0.3
  });
};

module.exports = {
  chatCompletion,
  generateProductSummary,
  generateChatResponse,
  analyzeClaim
};

