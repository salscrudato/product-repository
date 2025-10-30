/**
 * Forms Validation Utilities
 * Validation for form templates and form-coverage mappings
 */

import { FormTemplate, FormCoverageMapping } from '@types';
import { ValidationError, ValidationResult } from './common';

/**
 * Validate a form template
 */
export function validateFormTemplate(form: Partial<FormTemplate>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!form.formNumber || form.formNumber.trim() === '') {
    errors.push({
      field: 'formNumber',
      message: 'Form number is required',
      severity: 'error',
    });
  }

  if (!form.formName && !form.name) {
    warnings.push({
      field: 'formName',
      message: 'Form name is recommended for better identification',
      severity: 'warning',
    });
  }

  // File validation
  if (!form.filePath && !form.downloadUrl) {
    warnings.push({
      field: 'filePath',
      message: 'Form file is recommended for document management',
      severity: 'warning',
    });
  }

  // Effective date validation
  if (form.effectiveDate && form.expirationDate) {
    const startDate = new Date(form.effectiveDate);
    const endDate = new Date(form.expirationDate);
    if (startDate > endDate) {
      errors.push({
        field: 'effectiveDate',
        message: 'Effective date must be before expiration date',
        severity: 'error',
      });
    }
  }

  // State validation
  if (form.states && form.states.length === 0) {
    warnings.push({
      field: 'states',
      message: 'Consider specifying states where this form is available',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a form-coverage mapping
 */
export function validateFormCoverageMapping(
  mapping: Partial<FormCoverageMapping>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!mapping.formId) {
    errors.push({
      field: 'formId',
      message: 'Form ID is required',
      severity: 'error',
    });
  }

  if (!mapping.coverageId) {
    errors.push({
      field: 'coverageId',
      message: 'Coverage ID is required',
      severity: 'error',
    });
  }

  if (!mapping.productId) {
    errors.push({
      field: 'productId',
      message: 'Product ID is required',
      severity: 'error',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
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

