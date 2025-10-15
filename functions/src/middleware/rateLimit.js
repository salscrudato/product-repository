/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting request rates
 */

const { https } = require('firebase-functions');
const admin = require('firebase-admin');

// In-memory rate limit store (for simple implementation)
// In production, use Redis or Firestore for distributed rate limiting
const rateLimitStore = new Map();

/**
 * Clean up old entries from rate limit store
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < oneHourAgo) {
      rateLimitStore.delete(key);
    }
  }
};

// Clean up every 10 minutes
setInterval(cleanupRateLimitStore, 600000);

/**
 * Rate limit middleware
 * @param {Object} context - Firebase Functions context
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests allowed
 * @param {number} options.windowMs - Time window in milliseconds
 * @throws {https.HttpsError} If rate limit exceeded
 */
const rateLimit = (context, options = {}) => {
  const { maxRequests = 100, windowMs = 3600000 } = options; // Default: 100 requests per hour
  
  // Get user identifier
  const userId = context.auth?.uid || context.rawRequest?.ip || 'anonymous';
  const key = `${userId}:${context.rawRequest?.url || 'unknown'}`;
  
  const now = Date.now();
  const data = rateLimitStore.get(key);
  
  if (!data || now > data.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return;
  }
  
  if (data.count >= maxRequests) {
    const resetIn = Math.ceil((data.resetTime - now) / 1000);
    throw new https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Try again in ${resetIn} seconds.`
    );
  }
  
  data.count++;
  rateLimitStore.set(key, data);
};

/**
 * Rate limit for AI requests (more restrictive)
 * @param {Object} context - Firebase Functions context
 */
const rateLimitAI = (context) => {
  return rateLimit(context, {
    maxRequests: 20, // 20 requests per hour for AI
    windowMs: 3600000
  });
};

/**
 * Rate limit for data operations
 * @param {Object} context - Firebase Functions context
 */
const rateLimitData = (context) => {
  return rateLimit(context, {
    maxRequests: 1000, // 1000 requests per hour for data operations
    windowMs: 3600000
  });
};

module.exports = {
  rateLimit,
  rateLimitAI,
  rateLimitData
};

