/**
 * OpenAI Service
 * Centralized service for all OpenAI API interactions
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

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
 * @returns {Promise<Object>} OpenAI response
 */
const chatCompletion = async (options = {}) => {
  const {
    messages,
    model = 'gpt-4o-mini',
    maxTokens = 2000,
    temperature = 0.2,
    timeout = 45000
  } = options;

  const startTime = Date.now();

  try {
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
    
    logger.info('OpenAI API call successful', {
      model,
      duration: `${duration}ms`,
      tokensUsed: response.data.usage?.total_tokens || 0
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model
    };
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

