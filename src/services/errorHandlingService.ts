// src/services/errorHandlingService.js
/**
 * Modern Error Handling Service
 * Provides user-friendly error messages and logging for Firebase and application errors
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

/**
 * Custom AppError class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  FIREBASE_AUTH: 'firebase_auth',
  FIREBASE_FIRESTORE: 'firebase_firestore',
  FIREBASE_STORAGE: 'firebase_storage',
  FIREBASE_FUNCTIONS: 'firebase_functions',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  UNKNOWN: 'unknown'
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  // Firebase Auth errors
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to access this data. Please ensure you\'re logged in.',
  'not-found': 'The requested data could not be found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please try again in a moment.',
  'failed-precondition': 'Operation failed. Please refresh and try again.',
  'aborted': 'Operation was cancelled. Please try again.',
  'out-of-range': 'Invalid data range provided.',
  'unimplemented': 'This feature is not yet available.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'data-loss': 'Data may have been lost. Please contact support.',
  'unauthenticated': 'Please log in to continue.',
  
  // Storage errors
  'storage/unauthorized': 'You don\'t have permission to access this file.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/unknown': 'An unknown error occurred during file operation.',
  'storage/object-not-found': 'File not found.',
  'storage/bucket-not-found': 'Storage bucket not found.',
  'storage/project-not-found': 'Firebase project not found.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/unauthenticated': 'Please log in to upload files.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',
  'storage/invalid-checksum': 'File upload failed. Please try again.',
  'storage/canceled': 'File operation was cancelled.',
  
  // Network errors
  'network-error': 'Network connection error. Please check your internet connection.',
  'timeout': 'Request timed out. Please try again.',
  
  // Generic fallback
  'default': 'An unexpected error occurred. Please try again.'
};

/**
 * Categorize error by type
 */
const categorizeError = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  const code = error.code || '';
  const message = error.message || '';
  
  if (code.startsWith('auth/')) return ERROR_TYPES.FIREBASE_AUTH;
  if (code.startsWith('storage/')) return ERROR_TYPES.FIREBASE_STORAGE;
  if (code.startsWith('functions/')) return ERROR_TYPES.FIREBASE_FUNCTIONS;
  if (code === 'permission-denied' || code === 'unauthenticated') return ERROR_TYPES.PERMISSION;
  if (code === 'not-found') return ERROR_TYPES.NOT_FOUND;
  if (message.toLowerCase().includes('network')) return ERROR_TYPES.NETWORK;
  if (code.includes('firestore') || code.includes('failed-precondition')) return ERROR_TYPES.FIREBASE_FIRESTORE;
  
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error) => {
  if (!error) return ERROR_MESSAGES.default;
  
  const code = error.code || '';
  
  // Check for specific error code
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  
  // Check for partial matches
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (code.includes(key)) {
      return message;
    }
  }
  
  // Return default message
  return ERROR_MESSAGES.default;
};

/**
 * Handle Firebase error with logging and user-friendly message
 */
export const handleFirebaseError = (error, context = {}) => {
  const errorType = categorizeError(error);
  const userMessage = getUserFriendlyMessage(error);
  
  // Log error with context
  logger.error(
    LOG_CATEGORIES.FIREBASE,
    `Firebase error: ${errorType}`,
    {
      errorCode: error.code,
      errorType,
      context,
      timestamp: new Date().toISOString()
    },
    error
  );
  
  return {
    type: errorType,
    message: userMessage,
    originalError: error,
    code: error.code
  };
};

/**
 * Handle network error
 */
export const handleNetworkError = (error, context = {}) => {
  logger.error(
    LOG_CATEGORIES.NETWORK,
    'Network error occurred',
    {
      context,
      timestamp: new Date().toISOString()
    },
    error
  );
  
  return {
    type: ERROR_TYPES.NETWORK,
    message: ERROR_MESSAGES['network-error'],
    originalError: error
  };
};

/**
 * Handle validation error
 */
export const handleValidationError = (message, context = {}) => {
  logger.warn(
    LOG_CATEGORIES.VALIDATION,
    'Validation error',
    {
      message,
      context,
      timestamp: new Date().toISOString()
    }
  );
  
  return {
    type: ERROR_TYPES.VALIDATION,
    message,
    context
  };
};

/**
 * Check if error is a permissions error
 */
export const isPermissionError = (error) => {
  if (!error) return false;
  const code = error.code || '';
  return code === 'permission-denied' || 
         code === 'unauthenticated' || 
         code.includes('unauthorized');
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const code = error.code || '';
  return message.includes('network') || 
         message.includes('offline') ||
         code === 'unavailable' ||
         code === 'network-request-failed';
};

/**
 * Retry operation with exponential backoff
 */
export const retryWithBackoff = async (
  operation,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000
) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on permission errors
      if (isPermissionError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      
      logger.warn(
        LOG_CATEGORIES.NETWORK,
        `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        { attempt, delay }
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  throw lastError;
};

/**
 * Create error boundary fallback component
 */
export const createErrorFallback = (error, resetError) => {
  const errorInfo = handleFirebaseError(error);
  
  return {
    message: errorInfo.message,
    type: errorInfo.type,
    canRetry: !isPermissionError(error),
    reset: resetError
  };
};

export default {
  AppError,
  ERROR_TYPES,
  getUserFriendlyMessage,
  handleFirebaseError,
  handleNetworkError,
  handleValidationError,
  isPermissionError,
  isNetworkError,
  retryWithBackoff,
  createErrorFallback
};

