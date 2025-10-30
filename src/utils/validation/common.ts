/**
 * Common Validation Utilities
 * Reusable validators for numeric, percentage, code, and date fields
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a numeric value
 */
export function validateNumeric(
  value: number | undefined | null,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    required?: boolean;
    allowZero?: boolean;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (options?.required && (value === undefined || value === null)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      severity: 'error',
    });
    return errors;
  }

  if (value === undefined || value === null) {
    return errors;
  }

  if (!Number.isFinite(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      severity: 'error',
    });
    return errors;
  }

  if (!options?.allowZero && value === 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot be zero`,
      severity: 'error',
    });
  }

  if (value < 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot be negative`,
      severity: 'error',
    });
  }

  if (options?.min !== undefined && value < options.min) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at least ${options.min}`,
      severity: 'error',
    });
  }

  if (options?.max !== undefined && value > options.max) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must not exceed ${options.max}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate a percentage value (0-100)
 */
export function validatePercentage(
  value: number | undefined | null,
  fieldName: string,
  options?: { required?: boolean; warnAbove?: number }
): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (options?.required && (value === undefined || value === null)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      severity: 'error',
    });
    return { errors, warnings };
  }

  if (value === undefined || value === null) {
    return { errors, warnings };
  }

  if (!Number.isFinite(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      severity: 'error',
    });
    return { errors, warnings };
  }

  if (value < 0 || value > 100) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be between 0 and 100`,
      severity: 'error',
    });
  }

  if (options?.warnAbove !== undefined && value > options.warnAbove) {
    warnings.push({
      field: fieldName,
      message: `${fieldName} above ${options.warnAbove}% is unusual`,
      severity: 'warning',
    });
  }

  return { errors, warnings };
}

/**
 * Validate a code (alphanumeric, hyphens, underscores)
 */
export function validateCode(
  value: string | undefined,
  fieldName: string,
  options?: { required?: boolean; maxLength?: number }
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (options?.required && (!value || value.trim() === '')) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      severity: 'error',
    });
    return errors;
  }

  if (!value || value.trim() === '') {
    return errors;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} can only contain letters, numbers, hyphens, and underscores`,
      severity: 'error',
    });
  }

  if (options?.maxLength && value.length > options.maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must not exceed ${options.maxLength} characters`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate a date range
 */
export function validateDateRange(
  startDate: Date | undefined,
  endDate: Date | undefined,
  fieldName: string = 'Date range'
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (startDate && endDate && startDate > endDate) {
    errors.push({
      field: fieldName,
      message: `Start date must be before end date`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('Errors:');
    result.errors.forEach(error => {
      messages.push(`  • ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    if (messages.length > 0) messages.push('');
    messages.push('Warnings:');
    result.warnings.forEach(warning => {
      messages.push(`  • ${warning.message}`);
    });
  }

  return messages.join('\n');
}

