/**
 * Error Handling Configuration
 * Defines error handling strategies and recovery mechanisms
 * Ensures professional-grade error management
 */

// ============================================================================
// ERROR TYPES & CODES
// ============================================================================

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_FAILED = 'AUTH_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Business logic errors
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // Data errors
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_CONFLICT = 'DATA_CONFLICT',
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  FIREBASE_ERROR = 'FIREBASE_ERROR',
}

// ============================================================================
// ERROR SEVERITY LEVELS
// ============================================================================

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// ============================================================================
// ERROR CONFIGURATION
// ============================================================================

export const ERROR_CONFIG = {
  // Retry configuration
  RETRY: {
    // Maximum retry attempts
    MAX_ATTEMPTS: 3,
    // Initial retry delay (ms)
    INITIAL_DELAY_MS: 1000,
    // Maximum retry delay (ms)
    MAX_DELAY_MS: 10000,
    // Exponential backoff multiplier
    BACKOFF_MULTIPLIER: 2,
    // Jitter to prevent thundering herd
    JITTER_ENABLED: true,
  },

  // Timeout configuration
  TIMEOUT: {
    // Default timeout (ms)
    DEFAULT_MS: 30000,
    // API timeout (ms)
    API_MS: 30000,
    // External service timeout (ms)
    EXTERNAL_SERVICE_MS: 45000,
    // Database timeout (ms)
    DATABASE_MS: 10000,
  },

  // Error reporting
  REPORTING: {
    // Report errors to monitoring service
    ENABLED: true,
    // Report errors in development
    REPORT_IN_DEV: false,
    // Sample rate for error reporting (0-1)
    SAMPLE_RATE: 1.0,
    // Maximum errors per minute
    MAX_ERRORS_PER_MINUTE: 100,
  },

  // Error recovery
  RECOVERY: {
    // Automatic recovery enabled
    ENABLED: true,
    // Recovery timeout (ms)
    TIMEOUT_MS: 5000,
    // Maximum recovery attempts
    MAX_ATTEMPTS: 3,
  },

  // Error display
  DISPLAY: {
    // Show error details to user
    SHOW_DETAILS: false,
    // Show error details in development
    SHOW_DETAILS_IN_DEV: true,
    // Error message timeout (ms)
    TIMEOUT_MS: 5000,
    // Maximum concurrent error messages
    MAX_CONCURRENT: 3,
  },
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Network errors
  [ErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ErrorCode.CONNECTION_REFUSED]: 'Connection refused. The server may be unavailable.',

  // Authentication errors
  [ErrorCode.AUTH_REQUIRED]: 'Authentication required. Please log in.',
  [ErrorCode.AUTH_FAILED]: 'Authentication failed. Please check your credentials.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action.',

  // Validation errors
  [ErrorCode.VALIDATION_ERROR]: 'Validation error. Please check your input.',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing.',

  // Business logic errors
  [ErrorCode.BUSINESS_LOGIC_ERROR]: 'Business logic error occurred.',
  [ErrorCode.INVALID_STATE]: 'Invalid state for this operation.',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not allowed.',

  // Data errors
  [ErrorCode.DATA_NOT_FOUND]: 'Data not found.',
  [ErrorCode.DATA_CONFLICT]: 'Data conflict. Please refresh and try again.',
  [ErrorCode.DATA_INTEGRITY_ERROR]: 'Data integrity error occurred.',

  // System errors
  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',

  // External service errors
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error. Please try again later.',
  [ErrorCode.OPENAI_ERROR]: 'AI service error. Please try again later.',
  [ErrorCode.FIREBASE_ERROR]: 'Database error. Please try again later.',
};

// ============================================================================
// ERROR SEVERITY MAPPING
// ============================================================================

export const ERROR_SEVERITY_MAP: Record<ErrorCode, ErrorSeverity> = {
  // Network errors - WARNING
  [ErrorCode.NETWORK_ERROR]: ErrorSeverity.WARNING,
  [ErrorCode.TIMEOUT_ERROR]: ErrorSeverity.WARNING,
  [ErrorCode.CONNECTION_REFUSED]: ErrorSeverity.WARNING,

  // Authentication errors - ERROR
  [ErrorCode.AUTH_REQUIRED]: ErrorSeverity.ERROR,
  [ErrorCode.AUTH_FAILED]: ErrorSeverity.ERROR,
  [ErrorCode.SESSION_EXPIRED]: ErrorSeverity.WARNING,
  [ErrorCode.PERMISSION_DENIED]: ErrorSeverity.ERROR,

  // Validation errors - WARNING
  [ErrorCode.VALIDATION_ERROR]: ErrorSeverity.WARNING,
  [ErrorCode.INVALID_INPUT]: ErrorSeverity.WARNING,
  [ErrorCode.MISSING_REQUIRED_FIELD]: ErrorSeverity.WARNING,

  // Business logic errors - ERROR
  [ErrorCode.BUSINESS_LOGIC_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.INVALID_STATE]: ErrorSeverity.ERROR,
  [ErrorCode.OPERATION_NOT_ALLOWED]: ErrorSeverity.ERROR,

  // Data errors - ERROR
  [ErrorCode.DATA_NOT_FOUND]: ErrorSeverity.WARNING,
  [ErrorCode.DATA_CONFLICT]: ErrorSeverity.ERROR,
  [ErrorCode.DATA_INTEGRITY_ERROR]: ErrorSeverity.CRITICAL,

  // System errors - CRITICAL
  [ErrorCode.INTERNAL_ERROR]: ErrorSeverity.CRITICAL,
  [ErrorCode.SERVICE_UNAVAILABLE]: ErrorSeverity.CRITICAL,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: ErrorSeverity.WARNING,

  // External service errors - ERROR
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.OPENAI_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.FIREBASE_ERROR]: ErrorSeverity.ERROR,
};

// ============================================================================
// RETRYABLE ERRORS
// ============================================================================

export const RETRYABLE_ERRORS = new Set([
  ErrorCode.NETWORK_ERROR,
  ErrorCode.TIMEOUT_ERROR,
  ErrorCode.CONNECTION_REFUSED,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.RATE_LIMIT_EXCEEDED,
  ErrorCode.EXTERNAL_SERVICE_ERROR,
]);

// ============================================================================
// ERROR RECOVERY STRATEGIES
// ============================================================================

export const RECOVERY_STRATEGIES = {
  // Network errors - retry with backoff
  [ErrorCode.NETWORK_ERROR]: 'retry',
  [ErrorCode.TIMEOUT_ERROR]: 'retry',
  [ErrorCode.CONNECTION_REFUSED]: 'retry',

  // Authentication errors - redirect to login
  [ErrorCode.AUTH_REQUIRED]: 'redirect-to-login',
  [ErrorCode.AUTH_FAILED]: 'redirect-to-login',
  [ErrorCode.SESSION_EXPIRED]: 'redirect-to-login',
  [ErrorCode.PERMISSION_DENIED]: 'show-error',

  // Validation errors - show error to user
  [ErrorCode.VALIDATION_ERROR]: 'show-error',
  [ErrorCode.INVALID_INPUT]: 'show-error',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'show-error',

  // Business logic errors - show error
  [ErrorCode.BUSINESS_LOGIC_ERROR]: 'show-error',
  [ErrorCode.INVALID_STATE]: 'show-error',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'show-error',

  // Data errors - show error or retry
  [ErrorCode.DATA_NOT_FOUND]: 'show-error',
  [ErrorCode.DATA_CONFLICT]: 'retry',
  [ErrorCode.DATA_INTEGRITY_ERROR]: 'show-error',

  // System errors - retry or show error
  [ErrorCode.INTERNAL_ERROR]: 'retry',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'retry',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'retry',

  // External service errors - retry
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'retry',
  [ErrorCode.OPENAI_ERROR]: 'retry',
  [ErrorCode.FIREBASE_ERROR]: 'retry',
} as const;

export default {
  ErrorCode,
  ErrorSeverity,
  ERROR_CONFIG,
  ERROR_MESSAGES,
  ERROR_SEVERITY_MAP,
  RETRYABLE_ERRORS,
  RECOVERY_STRATEGIES,
};

