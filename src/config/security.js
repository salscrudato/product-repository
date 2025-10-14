/**
 * Security Configuration
 * Centralized security settings and utilities
 */

export const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: [
      "'self'",
      "https://*.firebaseio.com",
      "https://*.googleapis.com",
      "https://api.openai.com",
    ],
    frameSrc: ["'self'", "https://*.firebaseapp.com"],
  },

  // Input Validation
  validation: {
    // Maximum input lengths
    maxProductNameLength: 200,
    maxDescriptionLength: 5000,
    maxCoverageNameLength: 200,
    maxFormNameLength: 200,
    
    // Allowed file types
    allowedFileTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    
    // Maximum file size (in bytes)
    maxFileSize: 10 * 1024 * 1024, // 10MB
    
    // Regex patterns
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      alphanumeric: /^[a-zA-Z0-9\s-_]+$/,
      numeric: /^[0-9]+$/,
      decimal: /^[0-9]+(\.[0-9]{1,2})?$/,
    },
  },

  // Rate Limiting
  rateLimit: {
    // API calls per minute
    apiCallsPerMinute: 60,
    
    // File uploads per hour
    fileUploadsPerHour: 20,
    
    // AI requests per hour
    aiRequestsPerHour: 100,
    
    // Search queries per minute
    searchQueriesPerMinute: 30,
  },

  // Authentication
  auth: {
    // Session timeout (in milliseconds)
    sessionTimeout: 60 * 60 * 1000, // 1 hour
    
    // Require email verification
    requireEmailVerification: true,
    
    // Password requirements
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },

  // Data Sanitization
  sanitization: {
    // HTML sanitization
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
    },
    
    // SQL injection prevention
    escapeCharacters: ["'", '"', '\\', ';', '--', '/*', '*/'],
  },
};

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove script tags
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  return SECURITY_CONFIG.validation.patterns.email.test(email);
};

/**
 * Validate file type
 */
export const isValidFileType = (file) => {
  return SECURITY_CONFIG.validation.allowedFileTypes.includes(file.type);
};

/**
 * Validate file size
 */
export const isValidFileSize = (file) => {
  return file.size <= SECURITY_CONFIG.validation.maxFileSize;
};

/**
 * Check if input length is within limits
 */
export const isValidLength = (input, maxLength) => {
  return input.length <= maxLength;
};

/**
 * Escape SQL special characters
 */
export const escapeSQLInput = (input) => {
  if (typeof input !== 'string') return input;
  
  let escaped = input;
  SECURITY_CONFIG.sanitization.escapeCharacters.forEach(char => {
    escaped = escaped.replace(new RegExp(char, 'g'), `\\${char}`);
  });
  
  return escaped;
};

/**
 * Generate Content Security Policy header
 */
export const generateCSPHeader = () => {
  const { csp } = SECURITY_CONFIG;
  const directives = Object.entries(csp).map(([key, values]) => {
    const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `${directiveName} ${values.join(' ')}`;
  });
  
  return directives.join('; ');
};

/**
 * Rate limiter class
 */
export class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  isAllowed() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    // Check if under limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  reset() {
    this.requests = [];
  }
}

/**
 * Create rate limiters for different operations
 */
export const createRateLimiters = () => ({
  api: new RateLimiter(
    SECURITY_CONFIG.rateLimit.apiCallsPerMinute,
    60 * 1000
  ),
  fileUpload: new RateLimiter(
    SECURITY_CONFIG.rateLimit.fileUploadsPerHour,
    60 * 60 * 1000
  ),
  aiRequest: new RateLimiter(
    SECURITY_CONFIG.rateLimit.aiRequestsPerHour,
    60 * 60 * 1000
  ),
  search: new RateLimiter(
    SECURITY_CONFIG.rateLimit.searchQueriesPerMinute,
    60 * 1000
  ),
});

export default SECURITY_CONFIG;

