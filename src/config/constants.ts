/**
 * Application Constants
 * Centralized configuration constants
 */

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE = {
  // TTL in milliseconds
  TTL_PRODUCTS: 5 * 60 * 1000,      // 5 minutes
  TTL_COVERAGES: 5 * 60 * 1000,     // 5 minutes
  TTL_FORMS: 10 * 60 * 1000,        // 10 minutes
  TTL_NEWS: 60 * 60 * 1000,         // 1 hour
  TTL_RULES: 5 * 60 * 1000,         // 5 minutes

  // Cache size limits
  MAX_CACHE_SIZE: 100,
  MAX_CACHE_ENTRIES: 1000
} as const;

