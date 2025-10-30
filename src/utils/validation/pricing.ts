/**
 * Pricing Validation Utilities
 * Validation for pricing steps and pricing configurations
 */

import { PricingStep } from '@types';
import { ValidationError, ValidationResult, validateNumeric } from './common';

/**
 * Validate a pricing step
 */
export function validatePricingStep(step: Partial<PricingStep>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!step.name || step.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Step name is required',
      severity: 'error',
    });
  }

  if (!step.stepType) {
    errors.push({
      field: 'stepType',
      message: 'Step type is required',
      severity: 'error',
    });
  }

  // Order validation
  if (step.order === undefined || step.order === null) {
    errors.push({
      field: 'order',
      message: 'Step order is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateNumeric(step.order, 'order', { min: 0, allowZero: true }));
  }



  // Effective date validation
  if (step.effectiveDate && step.expirationDate) {
    const startDate = new Date(step.effectiveDate);
    const endDate = new Date(step.expirationDate);
    if (startDate > endDate) {
      errors.push({
        field: 'effectiveDate',
        message: 'Effective date must be before expiration date',
        severity: 'error',
      });
    }
  }

  // State validation
  if (step.states && step.states.length === 0) {
    warnings.push({
      field: 'states',
      message: 'Consider specifying states where this step applies',
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
 * Validate pricing step order uniqueness
 */
export function validatePricingStepOrder(
  steps: Partial<PricingStep>[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const orders = new Set<number>();

  steps.forEach((step, index) => {
    if (step.order !== undefined && step.order !== null) {
      if (orders.has(step.order)) {
        errors.push({
          field: `steps[${index}].order`,
          message: `Step order ${step.order} is already used`,
          severity: 'error',
        });
      }
      orders.add(step.order);
    }
  });

  return errors;
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

