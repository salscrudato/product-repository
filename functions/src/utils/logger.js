/**
 * Logging Utility
 * Centralized logging with structured output and correlation ID support
 */

const functions = require('firebase-functions');
const crypto = require('crypto');

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Generate a correlation ID (matches the client-side format).
 * @returns {string} e.g. "corr-lx3f9k2-a8b3c1"
 */
function generateCorrelationId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString('hex');
  return `corr-${ts}-${rand}`;
}

/**
 * Extract (or generate) a correlation ID from an incoming request / callable context.
 *
 * Priority:
 *   1. `x-correlation-id` header (HTTP callable / REST)
 *   2. `correlationId` field inside the callable data payload
 *   3. Auto-generate a new one
 *
 * @param {Object} dataOrReq - Callable data object or Express-like request
 * @returns {string} correlationId
 */
function extractCorrelationId(dataOrReq) {
  // HTTP / Express-style request
  if (dataOrReq && typeof dataOrReq.get === 'function') {
    const fromHeader = dataOrReq.get('x-correlation-id');
    if (fromHeader) return fromHeader;
  }

  // Callable data object
  if (dataOrReq && dataOrReq.correlationId) {
    return dataOrReq.correlationId;
  }

  return generateCorrelationId();
}

/**
 * Logger class for structured logging
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this._correlationId = null;
  }

  /**
   * Return a scoped logger that automatically includes the given correlationId.
   * The returned object has the same API (info / warn / error / debug).
   *
   * @param {string} correlationId
   * @returns {Logger} scoped logger instance
   */
  withCorrelation(correlationId) {
    const scoped = new Logger();
    scoped._correlationId = correlationId;
    return scoped;
  }

  /**
   * Format log message with metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Formatted log object
   */
  formatLog(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
    if (this._correlationId) {
      entry.correlationId = this._correlationId;
    }
    return entry;
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    if (this.isDevelopment) {
      const log = this.formatLog(LOG_LEVELS.DEBUG, message, metadata);
      console.log(JSON.stringify(log));
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    const log = this.formatLog(LOG_LEVELS.INFO, message, metadata);
    functions.logger.info(log);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    const log = this.formatLog(LOG_LEVELS.WARN, message, metadata);
    functions.logger.warn(log);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    const log = this.formatLog(LOG_LEVELS.ERROR, message, metadata);
    functions.logger.error(log);
  }

}

// Export singleton instance
const logger = new Logger();

module.exports = {
  logger,
  LOG_LEVELS,
  generateCorrelationId,
  extractCorrelationId,
};

