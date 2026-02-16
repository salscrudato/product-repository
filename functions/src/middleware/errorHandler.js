/**
 * Error Handling Middleware
 * Centralized error handling and logging with correlation ID support
 */

const { https } = require('firebase-functions');
const { logger, extractCorrelationId } = require('../utils/logger');

/**
 * Handle and format errors
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {string} [correlationId] - Optional correlation ID for tracing
 * @returns {https.HttpsError} Formatted error
 */
const handleError = (error, context = 'unknown', correlationId) => {
  const meta = {
    message: error.message,
    stack: error.stack,
    code: error.code,
  };
  if (correlationId) meta.correlationId = correlationId;

  // Log with a scoped logger when correlation ID is available
  const log = correlationId ? logger.withCorrelation(correlationId) : logger;
  log.error(`Error in ${context}:`, meta);

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
 * Wrap async function with error handling and automatic correlation ID extraction.
 *
 * The wrapper:
 *   1. Extracts / generates a correlationId from the callable data
 *   2. Creates a scoped logger and injects it as `data.__scopedLogger`
 *   3. Catches errors and logs them with the same correlationId
 *   4. Returns `{ ..result, correlationId }` so the client can log it too
 *
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context name for logging
 * @returns {Function} Wrapped function
 */
const withErrorHandling = (fn, context) => {
  return async (data, contextObj) => {
    const correlationId = extractCorrelationId(data);
    const scopedLog = logger.withCorrelation(correlationId);

    scopedLog.info(`${context} started`, { caller: contextObj?.auth?.uid || 'anonymous' });

    try {
      const result = await fn({ ...data, __scopedLogger: scopedLog, __correlationId: correlationId }, contextObj);

      scopedLog.info(`${context} completed`);

      // If the result is a plain object, attach the correlationId for the client
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        return { ...result, correlationId };
      }
      return result;
    } catch (error) {
      throw handleError(error, context, correlationId);
    }
  };
};

module.exports = {
  handleError,
  withErrorHandling
};

