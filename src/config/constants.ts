/**
 * Application Constants
 * Centralized configuration for magic numbers, timeouts, limits, and other constants
 */

// ============================================================================
// Performance & Timing Constants
// ============================================================================

export const TIMING = {
  // Debounce/Throttle delays (ms)
  DEBOUNCE_SEARCH: 250,
  DEBOUNCE_INPUT: 300,
  THROTTLE_SCROLL: 100,
  THROTTLE_RESIZE: 150,

  // Timeouts (ms)
  FIRESTORE_TIMEOUT: 10000,
  API_TIMEOUT: 30000,
  ANALYSIS_TIMEOUT: 120000,
  CHAT_TIMEOUT: 60000,

  // Delays (ms)
  TOAST_DURATION: 3000,
  MODAL_ANIMATION: 300,
  TOOLTIP_DELAY: 300,
  RIPPLE_DURATION: 600,

  // Minimum load times (ms)
  MIN_LOAD_TIME: 500,
  MIN_SKELETON_TIME: 300
} as const;

// ============================================================================
// Data Limits & Pagination
// ============================================================================

export const LIMITS = {
  // Product/Coverage limits
  MAX_PRODUCTS: 500,
  MAX_COVERAGES_PER_PRODUCT: 100,
  MAX_SUB_COVERAGES: 50,
  MAX_FORMS_PER_COVERAGE: 20,

  // Pagination
  PAGE_SIZE_PRODUCTS: 20,
  PAGE_SIZE_FORMS: 15,
  PAGE_SIZE_NEWS: 10,
  PAGE_SIZE_TASKS: 25,

  // Virtualization
  VIRTUALIZED_GRID_COLUMNS: 2,
  VIRTUALIZED_GRID_ROW_HEIGHT: 350,
  VIRTUALIZED_GRID_HEIGHT: 600,
  VIRTUALIZED_OVERSCAN_ROWS: 2,

  // Text limits
  MAX_PRODUCT_NAME_LENGTH: 255,
  MAX_COVERAGE_NAME_LENGTH: 255,
  MAX_FORM_NUMBER_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 1000,

  // File limits
  MAX_PDF_SIZE_MB: 50,
  MAX_PDF_SIZE_BYTES: 50 * 1024 * 1024,
  MAX_PAYLOAD_SIZE_MB: 9,
  MAX_PAYLOAD_SIZE_BYTES: 9 * 1024 * 1024,

  // Batch operations
  BATCH_SIZE: 500,
  BATCH_DELAY: 1000,
  MAX_CONCURRENT_QUERIES: 5
} as const;

// ============================================================================
// API & Endpoint Constants
// ============================================================================

export const API = {
  // Cloud Functions
  FUNCTIONS: {
    GENERATE_SUMMARY: 'generateProductSummary',
    GENERATE_CHAT: 'generateChatResponse',
    ANALYZE_CLAIM: 'analyzeClaimWithChunking'
  }
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const UI = {
  // Breakpoints (px)
  BREAKPOINT_MOBILE: 640,
  BREAKPOINT_TABLET: 1024,
  BREAKPOINT_DESKTOP: 1280,

  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 100,
    MODAL_OVERLAY: 1000,
    MODAL: 1001,
    TOOLTIP: 1100,
    NOTIFICATION: 1200
  },

  // Animation durations (ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,

  // Spacing scale (px)
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48
  }
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION = {
  // Email regex
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // URL regex
  URL_REGEX: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,

  // Date format
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,

  // Form number pattern
  FORM_NUMBER_REGEX: /^[A-Z0-9\-\s]+$/,

  // Product code pattern
  PRODUCT_CODE_REGEX: /^[A-Z0-9]+$/
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection issue. Please check your connection and try again.',
  AUTH_ERROR: 'You do not have permission to perform this action. Please log in again.',
  VALIDATION_ERROR: 'Invalid input. Please check your data and try again.',
  NOT_FOUND_ERROR: 'The requested resource was not found.',
  CONFLICT_ERROR: 'This resource already exists. Please use a different name or ID.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'Server error. Please try again in a moment.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  TIMEOUT_ERROR: 'Operation timed out. Please try again.',
  PDF_TOO_LARGE: 'PDF file is too large. Please use a smaller document.',
  EXTRACTION_FAILED: 'Failed to extract text from PDF. Please try again.',
  SUMMARY_FAILED: 'Failed to generate summary. Please try again.'
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  COVERAGE_CREATED: 'Coverage created successfully',
  COVERAGE_UPDATED: 'Coverage updated successfully',
  COVERAGE_DELETED: 'Coverage deleted successfully',
  FORM_UPLOADED: 'Form uploaded successfully',
  FORM_DELETED: 'Form deleted successfully',
  RULE_CREATED: 'Rule created successfully',
  RULE_UPDATED: 'Rule updated successfully',
  RULE_DELETED: 'Rule deleted successfully'
} as const;

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

// ============================================================================
// Retry Configuration
// ============================================================================

export const RETRY = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 100,
  MAX_DELAY_MS: 5000,
  BACKOFF_MULTIPLIER: 2,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 60000
} as const;

// ============================================================================
// AI Configuration
// ============================================================================

export const AI = {
  // Token limits
  MAX_TOKENS_SUMMARY: 1000,
  MAX_TOKENS_CHAT: 2000,
  MAX_TOKENS_ANALYSIS: 3000,

  // Context limits
  MAX_CONTEXT_MESSAGES: 5,
  MAX_PDF_TOKENS: 100000,

  // Temperature settings
  TEMPERATURE_PRECISE: 0.3,
  TEMPERATURE_BALANCED: 0.7,
  TEMPERATURE_CREATIVE: 0.9
} as const;

// ============================================================================
// Firestore Configuration
// ============================================================================

export const FIRESTORE = {
  // Collections
  COLLECTIONS: {
    PRODUCTS: 'products',
    COVERAGES: 'coverages',
    FORMS: 'forms',
    RULES: 'rules',
    TASKS: 'tasks',
    AUDIT_LOGS: 'auditLogs',
    DATA_DICTIONARY: 'dataDictionary'
  },

  // Subcollections
  SUBCOLLECTIONS: {
    COVERAGES: 'coverages',
    LIMITS: 'limits',
    DEDUCTIBLES: 'deductibles',
    PRICING_STEPS: 'pricingSteps',
    PACKAGES: 'packages',
    VERSIONS: 'versions'
  }
} as const;

