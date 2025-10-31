/**
 * Input Validation Utilities
 * 
 * Comprehensive validation for form inputs, ensuring data integrity and security
 * Includes sanitization, type checking, and business rule validation
 */

import logger, { LOG_CATEGORIES } from './logger';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate product name
 */
export function validateProductName(name: string): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return {
      field: 'name',
      message: 'Product name is required',
      code: 'PRODUCT_NAME_REQUIRED'
    };
  }

  if (name.length > 255) {
    return {
      field: 'name',
      message: 'Product name must be 255 characters or less',
      code: 'PRODUCT_NAME_TOO_LONG'
    };
  }

  // Check for invalid characters
  if (!/^[a-zA-Z0-9\s\-&().,]+$/.test(name)) {
    return {
      field: 'name',
      message: 'Product name contains invalid characters',
      code: 'PRODUCT_NAME_INVALID_CHARS'
    };
  }

  return null;
}

/**
 * Validate numeric limit
 */
export function validateLimit(value: number | string): ValidationError | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return {
      field: 'limit',
      message: 'Limit must be a valid number',
      code: 'LIMIT_INVALID_NUMBER'
    };
  }

  if (num <= 0) {
    return {
      field: 'limit',
      message: 'Limit must be greater than 0',
      code: 'LIMIT_NOT_POSITIVE'
    };
  }

  if (num > 999999999) {
    return {
      field: 'limit',
      message: 'Limit exceeds maximum allowed value',
      code: 'LIMIT_TOO_LARGE'
    };
  }

  return null;
}

/**
 * Validate deductible
 */
export function validateDeductible(value: number | string): ValidationError | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return {
      field: 'deductible',
      message: 'Deductible must be a valid number',
      code: 'DEDUCTIBLE_INVALID_NUMBER'
    };
  }

  if (num < 0) {
    return {
      field: 'deductible',
      message: 'Deductible cannot be negative',
      code: 'DEDUCTIBLE_NEGATIVE'
    };
  }

  return null;
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value: number | string): ValidationError | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return {
      field: 'percentage',
      message: 'Percentage must be a valid number',
      code: 'PERCENTAGE_INVALID_NUMBER'
    };
  }

  if (num < 0 || num > 100) {
    return {
      field: 'percentage',
      message: 'Percentage must be between 0 and 100',
      code: 'PERCENTAGE_OUT_OF_RANGE'
    };
  }

  return null;
}

/**
 * Validate effective date (must be future or today)
 */
export function validateEffectiveDate(date: Date | string): ValidationError | null {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return {
      field: 'effectiveDate',
      message: 'Effective date must be a valid date',
      code: 'EFFECTIVE_DATE_INVALID'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateObj < today) {
    return {
      field: 'effectiveDate',
      message: 'Effective date cannot be in the past',
      code: 'EFFECTIVE_DATE_IN_PAST'
    };
  }

  return null;
}

/**
 * Validate expiration date (must be after effective date)
 */
export function validateExpirationDate(
  expirationDate: Date | string,
  effectiveDate?: Date | string
): ValidationError | null {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;

  if (isNaN(expDate.getTime())) {
    return {
      field: 'expirationDate',
      message: 'Expiration date must be a valid date',
      code: 'EXPIRATION_DATE_INVALID'
    };
  }

  if (effectiveDate) {
    const effDate = typeof effectiveDate === 'string' ? new Date(effectiveDate) : effectiveDate;
    if (expDate <= effDate) {
      return {
        field: 'expirationDate',
        message: 'Expiration date must be after effective date',
        code: 'EXPIRATION_DATE_BEFORE_EFFECTIVE'
      };
    }
  }

  return null;
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Please enter a valid email address',
      code: 'EMAIL_INVALID'
    };
  }

  return null;
}

/**
 * Validate state code (US states)
 */
export function validateStateCode(code: string): ValidationError | null {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  if (!code || !validStates.includes(code.toUpperCase())) {
    return {
      field: 'state',
      message: 'Invalid state code',
      code: 'STATE_CODE_INVALID'
    };
  }

  return null;
}

/**
 * Log validation error
 */
export function logValidationError(error: ValidationError): void {
  logger.warn(LOG_CATEGORIES.DATA, 'Validation error', {
    field: error.field,
    code: error.code,
    message: error.message
  });
}

