/**
 * Error Handling Middleware
 * Centralized error handling and logging
 */

const { https } = require('firebase-functions');
const { logger } = require('../utils/logger');

/**
 * Handle and format errors
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {https.HttpsError} Formatted error
 */
const handleError = (error, context = 'unknown') => {
  // Log the error
  logger.error(`Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code
  });

  // If it's already an HttpsError, return it
  if (error instanceof https.HttpsError) {
    return error;
  }

  // Handle specific error types
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new https.HttpsError(
      'unavailable',
      'External service temporarily unavailable. Please try again later.'
    );
  }

  if (error.response) {
    // Axios error with response
    const status = error.response.status;
    
    if (status === 401 || status === 403) {
      return new https.HttpsError(
        'permission-denied',
        'Authentication failed with external service'
      );
    }
    
    if (status === 429) {
      return new https.HttpsError(
        'resource-exhausted',
        'Rate limit exceeded. Please try again later.'
      );
    }
    
    if (status >= 500) {
      return new https.HttpsError(
        'unavailable',
        'External service error. Please try again later.'
      );
    }
  }

  // Default to internal error
  return new https.HttpsError(
    'internal',
    process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An internal error occurred. Please try again later.'
  );
};

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context name for logging
 * @returns {Function} Wrapped function
 */
const withErrorHandling = (fn, context) => {
  return async (data, contextObj) => {
    try {
      return await fn(data, contextObj);
    } catch (error) {
      throw handleError(error, context);
    }
  };
};

module.exports = {
  handleError,
  withErrorHandling
};

