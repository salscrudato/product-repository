/**
 * Comprehensive Logging System for Product Hub App
 * Provides structured logging for all user actions, API calls, data operations, and system events
 */

// Log levels
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN', 
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE'
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

// Log categories for better organization
export const LOG_CATEGORIES = {
  AUTH: 'AUTH',
  API: 'API',
  FIREBASE: 'FIREBASE',
  USER_ACTION: 'USER_ACTION',
  NAVIGATION: 'NAVIGATION',
  FORM: 'FORM',
  DATA: 'DATA',
  ERROR: 'ERROR',
  AI: 'AI',
  UPLOAD: 'UPLOAD',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  CACHE: 'CACHE',
  NEWS: 'NEWS',
  EARNINGS: 'EARNINGS',
  CLAIMS: 'CLAIMS'
} as const;

export type LogCategory = typeof LOG_CATEGORIES[keyof typeof LOG_CATEGORIES];

interface LogEntry {
  timestamp: string;
  sessionId: string;
  userId: string | null;
  sessionDuration: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data: Record<string, unknown>;
  url: string;
  userAgent: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isEnabled: boolean;
  private logLevel: LogLevel;
  private sessionId: string;
  private userId: string | null;
  private startTime: number;

  constructor() {
    this.isEnabled = true;
    this.logLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.AUTH, 'User ID set', { userId });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LOG_LEVELS);
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private formatLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: Record<string, unknown> = {},
    error: Error | null = null
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const sessionDuration = Date.now() - this.startTime;
    
    const logEntry: LogEntry = {
      timestamp,
      sessionId: this.sessionId,
      userId: this.userId,
      sessionDuration,
      level,
      category,
      message,
      data: this.sanitizeData(data),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    return logEntry;
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive information from logs
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: Record<string, unknown> = {},
    error: Error | null = null
  ): void {
    if (!this.isEnabled || !this.shouldLog(level)) return;

    const logEntry = this.formatLogEntry(level, category, message, data, error);
    const prefix = `[${level}][${category}]`;
    
    // Console output with appropriate styling
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`🔴 ${prefix}`, message, logEntry);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`🟡 ${prefix}`, message, logEntry);
        break;
      case LOG_LEVELS.INFO:
        console.info(`🔵 ${prefix}`, message, logEntry);
        break;
      case LOG_LEVELS.DEBUG:
        console.debug(`🟢 ${prefix}`, message, logEntry);
        break;
      case LOG_LEVELS.TRACE:
        console.trace(`⚪ ${prefix}`, message, logEntry);
        break;
      default:
        console.log(`${prefix}`, message, logEntry);
    }

    // Store in session storage for debugging (keep last 100 entries)
    this.storeLogEntry(logEntry);
  }

  private storeLogEntry(logEntry: LogEntry): void {
    try {
      const stored = JSON.parse(sessionStorage.getItem('ph_logs') || '[]') as LogEntry[];
      stored.push(logEntry);
      
      // Keep only last 100 entries
      if (stored.length > 100) {
        stored.splice(0, stored.length - 100);
      }
      
      sessionStorage.setItem('ph_logs', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store log entry:', error);
    }
  }

  // Convenience methods for different log levels
  error(category: LogCategory, message: string, data: Record<string, unknown> = {}, error: Error | null = null): void {
    this.log(LOG_LEVELS.ERROR, category, message, data, error);
  }

  warn(category: LogCategory, message: string, data: Record<string, unknown> = {}): void {
    this.log(LOG_LEVELS.WARN, category, message, data);
  }

  info(category: LogCategory, message: string, data: Record<string, unknown> = {}): void {
    this.log(LOG_LEVELS.INFO, category, message, data);
  }

  debug(category: LogCategory, message: string, data: Record<string, unknown> = {}): void {
    this.log(LOG_LEVELS.DEBUG, category, message, data);
  }

  trace(category: LogCategory, message: string, data: Record<string, unknown> = {}): void {
    this.log(LOG_LEVELS.TRACE, category, message, data);
  }

  // Specialized logging methods for common operations
  logUserAction(action: string, details: Record<string, unknown> = {}): void {
    this.info(LOG_CATEGORIES.USER_ACTION, `User action: ${action}`, details);
  }

  logApiCall(
    method: string,
    url: string,
    payload: Record<string, unknown> = {},
    response: unknown = {},
    duration = 0
  ): void {
    this.info(LOG_CATEGORIES.API, `API ${method} ${url}`, {
      method,
      url,
      payload: this.sanitizeData(payload),
      response: typeof response === 'object' && response !== null ? { ...(response as Record<string, unknown>), data: '[TRUNCATED]' } : response,
      duration,
      status: (response as { status?: string })?.status || 'unknown'
    });
  }

  logFirebaseOperation(
    operation: string,
    collection: string,
    docId: string | null = null,
    data: Record<string, unknown> = {}
  ): void {
    this.info(LOG_CATEGORIES.FIREBASE, `Firebase ${operation}`, {
      operation,
      collection,
      docId,
      data: this.sanitizeData(data)
    });
  }

  logFormSubmission(
    formName: string,
    formData: Record<string, unknown> = {},
    validationErrors: string[] = []
  ): void {
    this.info(LOG_CATEGORIES.FORM, `Form submission: ${formName}`, {
      formName,
      formData: this.sanitizeData(formData),
      validationErrors,
      isValid: validationErrors.length === 0
    });
  }

  logNavigation(from: string, to: string, params: Record<string, unknown> = {}): void {
    this.info(LOG_CATEGORIES.NAVIGATION, `Navigation: ${from} → ${to}`, {
      from,
      to,
      params
    });
  }



  logAIOperation(
    operation: string,
    model: string,
    prompt: string,
    response: string,
    duration = 0
  ): void {
    this.info(LOG_CATEGORIES.AI, `AI ${operation}`, {
      operation,
      model,
      prompt: prompt?.substring(0, 100) + '...',
      response: response?.substring(0, 100) + '...',
      duration
    });
  }

  // Get stored logs for debugging
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(sessionStorage.getItem('ph_logs') || '[]') as LogEntry[];
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearLogs(): void {
    sessionStorage.removeItem('ph_logs');
    this.info(LOG_CATEGORIES.DATA, 'Logs cleared');
  }

  // Export logs for debugging
  exportLogs(): void {
    const logs = this.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-hub-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.info(LOG_CATEGORIES.EXPORT, 'Logs exported');
  }
}

// Create singleton instance
const logger = new Logger();

// Add global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error(LOG_CATEGORIES.ERROR, 'Global error caught', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }, event.error);
  });

  // Add unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logger.error(LOG_CATEGORIES.ERROR, 'Unhandled promise rejection', {
      reason: event.reason
    });
  });
}

export default logger;

