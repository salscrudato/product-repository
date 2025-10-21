/**
 * Error Handling Utilities
 * Provides comprehensive error handling, recovery, and user feedback
 */

import logger, { LOG_CATEGORIES } from './logger';

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public context: ErrorContext = {},
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Classify Firebase errors and determine if they're retryable
 */
export function classifyFirebaseError(error: unknown): {
  code: string;
  message: string;
  isRetryable: boolean;
  userMessage: string;
} {
  if (!(error instanceof Error)) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      isRetryable: false,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }

  const message = error.message.toLowerCase();

  // Network errors - retryable
  if (message.includes('network') || message.includes('timeout') || message.includes('offline')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      isRetryable: true,
      userMessage: 'Network connection issue. Please check your connection and try again.'
    };
  }

  // Authentication errors - not retryable
  if (message.includes('permission-denied') || message.includes('unauthenticated')) {
    return {
      code: 'AUTH_ERROR',
      message: error.message,
      isRetryable: false,
      userMessage: 'You do not have permission to perform this action. Please log in again.'
    };
  }

  // Validation errors - not retryable
  if (message.includes('invalid-argument') || message.includes('validation')) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      isRetryable: false,
      userMessage: 'Invalid input. Please check your data and try again.'
    };
  }

  // Not found errors - not retryable
  if (message.includes('not-found')) {
    return {
      code: 'NOT_FOUND_ERROR',
      message: error.message,
      isRetryable: false,
      userMessage: 'The requested resource was not found.'
    };
  }

  // Conflict errors - not retryable
  if (message.includes('already-exists') || message.includes('conflict')) {
    return {
      code: 'CONFLICT_ERROR',
      message: error.message,
      isRetryable: false,
      userMessage: 'This resource already exists. Please use a different name or ID.'
    };
  }

  // Rate limit errors - retryable
  if (message.includes('quota') || message.includes('rate-limit') || message.includes('too-many-requests')) {
    return {
      code: 'RATE_LIMIT_ERROR',
      message: error.message,
      isRetryable: true,
      userMessage: 'Too many requests. Please wait a moment and try again.'
    };
  }

  // Server errors - retryable
  if (message.includes('internal') || message.includes('service-unavailable') || message.includes('500')) {
    return {
      code: 'SERVER_ERROR',
      message: error.message,
      isRetryable: true,
      userMessage: 'Server error. Please try again in a moment.'
    };
  }

  // Default - retryable
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message,
    isRetryable: true,
    userMessage: 'An error occurred. Please try again.'
  };
}

/**
 * Handle and log errors with context
 */
export function handleError(
  error: unknown,
  context: ErrorContext = {}
): { userMessage: string; isRetryable: boolean } {
  const classified = classifyFirebaseError(error);

  logger.error(
    LOG_CATEGORIES.ERROR,
    `${classified.code}: ${classified.message}`,
    context,
    error instanceof Error ? error : new Error(String(error))
  );

  return {
    userMessage: classified.userMessage,
    isRetryable: classified.isRetryable
  };
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: ErrorContext = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const { userMessage } = handleError(error, { ...context, operation: operationName });
    return { success: false, error: userMessage };
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  requiredFields.forEach(field => {
    const value = data[field];
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      errors[field] = `${field} is required`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn(LOG_CATEGORIES.ERROR, 'Failed to parse JSON', { json: json.substring(0, 100) });
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(obj: unknown, fallback: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.warn(LOG_CATEGORIES.ERROR, 'Failed to stringify JSON', {});
    return fallback;
  }
}

