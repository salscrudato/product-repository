// src/utils/rateLimitInfo.js
// Utility functions for handling NewsData.io rate limiting information

/**
 * NewsData.io API Rate Limits (as of 2024)
 * Free Plan: 200 requests per day
 * Paid Plans: Higher limits based on subscription
 */

export const RATE_LIMIT_INFO = {
  FREE_PLAN: {
    dailyLimit: 200,
    description: 'Free plan allows 200 requests per day'
  },
  RECOMMENDATIONS: [
    'Use cached data when possible (30-minute cache)',
    'Avoid frequent manual refreshes',
    'Consider upgrading to a paid plan for higher limits',
    'Rate limits reset at midnight UTC'
  ]
};

/**
 * Calculate estimated requests per hour to stay within daily limit
 * @param {number} dailyLimit - Daily request limit
 * @returns {number} Recommended requests per hour
 */
export function getRecommendedRequestsPerHour(dailyLimit = 200) {
  // Leave some buffer (use 80% of daily limit)
  const safeLimit = Math.floor(dailyLimit * 0.8);
  return Math.floor(safeLimit / 24); // Spread across 24 hours
}

/**
 * Get user-friendly rate limit explanation
 * @param {string} errorMessage - Error message from API
 * @returns {Object} Explanation object
 */
export function getRateLimitExplanation(errorMessage) {
  if (errorMessage.includes('Rate limit')) {
    return {
      title: 'API Rate Limit Reached',
      message: 'The NewsData.io API has daily usage limits. We\'re showing cached articles while waiting for the limit to reset.',
      suggestions: [
        'Cached articles are automatically updated every 30 minutes',
        'Rate limits typically reset at midnight UTC',
        'Manual refreshes should be used sparingly',
        'Consider the app\'s automatic refresh feature instead'
      ],
      severity: 'warning'
    };
  }
  
  return {
    title: 'API Error',
    message: errorMessage,
    suggestions: ['Please try again later'],
    severity: 'error'
  };
}

/**
 * Check if current time is near rate limit reset (midnight UTC)
 * @returns {Object} Reset information
 */
export function getRateLimitResetInfo() {
  const now = new Date();
  const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  
  // Calculate next midnight UTC
  const nextMidnightUTC = new Date(utcNow);
  nextMidnightUTC.setUTCHours(24, 0, 0, 0);
  
  const hoursUntilReset = Math.ceil((nextMidnightUTC - utcNow) / (1000 * 60 * 60));
  
  return {
    nextResetTime: nextMidnightUTC,
    hoursUntilReset,
    isNearReset: hoursUntilReset <= 2,
    resetTimeLocal: nextMidnightUTC.toLocaleString()
  };
}

/**
 * Format rate limit error for user display
 * @param {Error} error - The rate limit error
 * @returns {string} User-friendly error message
 */
export function formatRateLimitError(error) {
  if (error.message.includes('Rate limit')) {
    const resetInfo = getRateLimitResetInfo();
    return `Rate limit reached. Limits reset in ${resetInfo.hoursUntilReset} hours (${resetInfo.resetTimeLocal}). Using cached data.`;
  }
  
  return error.message;
}

export default {
  RATE_LIMIT_INFO,
  getRecommendedRequestsPerHour,
  getRateLimitExplanation,
  getRateLimitResetInfo,
  formatRateLimitError
};
