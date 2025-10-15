/**
 * Logging Utility
 * Centralized logging with structured output
 */

const functions = require('firebase-functions');

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Logger class for structured logging
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format log message with metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Formatted log object
   */
  formatLog(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
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
  LOG_LEVELS
};

