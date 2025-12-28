/**
 * OpenAI Service
 * Centralized service for all OpenAI API interactions
 *
 * OPTIMIZED VERSION - Enhanced Performance & Reliability:
 * - Response caching with TTL to reduce API calls
 * - Exponential backoff retry logic for transient failures
 * - Intelligent timeout handling based on request size
 * - Request deduplication to prevent duplicate calls
 * - Cost tracking and token budget management
 * - Model-specific optimizations
 */

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Cache settings
  cacheTTL: 3600000, // 1 hour
  maxCacheSize: 100,

  // Retry settings
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds

  // Timeout settings (ms)
  baseTimeout: 30000, // 30 seconds base
  timeoutPerToken: 50, // Additional ms per expected token
  maxTimeout: 120000, // 2 minutes max

  // Model configurations
  models: {
    'gpt-4o-mini': { costPer1kInput: 0.00015, costPer1kOutput: 0.0006, maxTokens: 16384 },
    'gpt-4o': { costPer1kInput: 0.005, costPer1kOutput: 0.015, maxTokens: 4096 },
    'gpt-4-turbo': { costPer1kInput: 0.01, costPer1kOutput: 0.03, maxTokens: 4096 }
  }
};

// ============================================================================
// Cache Management
// ============================================================================

const responseCache = new Map();
const pendingRequests = new Map(); // For request deduplication

/**
 * Generate cache key from request parameters
 */
const generateCacheKey = (messages, model, temperature) => {
  const key = JSON.stringify({ messages, model, temperature });
  return crypto.createHash('sha256').update(key).digest('hex');
};

/**
 * Get cached response if available and not expired
 */
const getCachedResponse = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONFIG.cacheTTL) {
    logger.debug('Cache hit for OpenAI response', { cacheKey: cacheKey.substring(0, 8) });
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey);
  }
  return null;
};

/**
 * Store response in cache with size management
 */
const setCachedResponse = (cacheKey, response) => {
  // Evict oldest entry if cache is full
  if (responseCache.size >= CONFIG.maxCacheSize) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
};

/**
 * Calculate dynamic timeout based on expected response size
 */
const calculateTimeout = (maxTokens) => {
  const dynamicTimeout = CONFIG.baseTimeout + (maxTokens * CONFIG.timeoutPerToken);
  return Math.min(dynamicTimeout, CONFIG.maxTimeout);
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (attempt) => {
  const delay = CONFIG.initialRetryDelay * Math.pow(2, attempt);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, CONFIG.maxRetryDelay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }
  const status = error.response.status;
  // Retry on rate limits (429) and server errors (5xx)
  return status === 429 || status >= 500;
};

/**
 * Get OpenAI API key from environment
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
 * Estimate input tokens (rough approximation)
 */
const estimateInputTokens = (messages) => {
  const text = messages.map(m => m.content || '').join(' ');
  return Math.ceil(text.length / 4);
};

/**
 * Call OpenAI Chat Completion API with retry logic
 * OPTIMIZED: Dynamic timeout, exponential backoff, request deduplication
 *
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of message objects
 * @param {string} options.model - Model to use (default: gpt-4o-mini)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @param {number} options.temperature - Temperature for randomness
 * @param {number} options.timeout - Request timeout in milliseconds (auto-calculated if not provided)
 * @param {boolean} options.useCache - Enable response caching (default: true)
 * @param {boolean} options.deduplicate - Enable request deduplication (default: true)
 * @returns {Promise<Object>} OpenAI response
 */
const chatCompletion = async (options = {}) => {
  const {
    messages,
    model = 'gpt-4o-mini',
    maxTokens = 2000,
    temperature = 0.2,
    timeout,
    useCache = true,
    deduplicate = true
  } = options;

  const startTime = Date.now();
  const cacheKey = generateCacheKey(messages, model, temperature);

  // Calculate dynamic timeout based on expected response size
  const effectiveTimeout = timeout || calculateTimeout(maxTokens);

  // Check cache first
  if (useCache) {
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      logger.info('OpenAI response from cache', {
        model,
        duration: `${Date.now() - startTime}ms`,
        cacheKey: cacheKey.substring(0, 8)
      });
      return { ...cachedResponse, fromCache: true };
    }
  }

  // Request deduplication - if same request is in flight, wait for it
  if (deduplicate && pendingRequests.has(cacheKey)) {
    logger.debug('Waiting for duplicate request', { cacheKey: cacheKey.substring(0, 8) });
    return pendingRequests.get(cacheKey);
  }

  // Create the request promise
  const requestPromise = executeWithRetry(messages, model, maxTokens, temperature, effectiveTimeout, cacheKey, useCache, startTime);

  // Store for deduplication
  if (deduplicate) {
    pendingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => pendingRequests.delete(cacheKey));
  }

  return requestPromise;
};

/**
 * Execute API call with retry logic
 */
const executeWithRetry = async (messages, model, maxTokens, temperature, timeout, cacheKey, useCache, startTime) => {
  const apiKey = getOpenAIKey();
  let lastError = null;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        logger.debug(`Retry attempt ${attempt}/${CONFIG.maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      logger.debug('Calling OpenAI API', {
        model,
        messageCount: messages.length,
        maxTokens,
        attempt: attempt + 1,
        timeout
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
      const inputTokens = estimateInputTokens(messages);
      const outputTokens = response.data.usage?.completion_tokens || 0;
      const modelConfig = CONFIG.models[model] || CONFIG.models['gpt-4o-mini'];
      const estimatedCost = (inputTokens / 1000 * modelConfig.costPer1kInput) +
                           (outputTokens / 1000 * modelConfig.costPer1kOutput);

      const result = {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model,
        fromCache: false,
        estimatedCost: estimatedCost.toFixed(6),
        retryCount: attempt
      };

      // Cache successful response
      if (useCache) {
        setCachedResponse(cacheKey, result);
      }

      logger.info('OpenAI API call successful', {
        model,
        duration: `${duration}ms`,
        tokensUsed: response.data.usage?.total_tokens || 0,
        estimatedCost: `$${estimatedCost.toFixed(6)}`,
        retries: attempt
      });

      return result;
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        break;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= CONFIG.maxRetries) {
        break;
      }

      logger.warn('OpenAI API call failed, will retry', {
        attempt: attempt + 1,
        error: error.message,
        status: error.response?.status
      });
    }
  }

  // All retries exhausted
  const duration = Date.now() - startTime;
  logger.error('OpenAI API call failed after retries', {
    duration: `${duration}ms`,
    error: lastError.message,
    status: lastError.response?.status,
    retries: CONFIG.maxRetries
  });

  // Re-throw with more context
  if (lastError.response) {
    const status = lastError.response.status;
    const message = lastError.response.data?.error?.message || lastError.message;

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

  throw lastError;
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

