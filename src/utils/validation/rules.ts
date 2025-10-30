/**
 * Rules Validation Utilities
 * Validation for business rules and pricing rules
 */

import { Rule, PricingRule } from '@types';
import { ValidationError, ValidationResult, validateNumeric } from './common';

/**
 * Validate a business rule
 */
export function validateRule(rule: Partial<Rule>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!rule.name || rule.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Rule name is required',
      severity: 'error',
    });
  }

  if (!rule.condition || rule.condition.trim() === '') {
    errors.push({
      field: 'condition',
      message: 'Rule condition is required',
      severity: 'error',
    });
  }

  if (!rule.outcome || rule.outcome.trim() === '') {
    errors.push({
      field: 'outcome',
      message: 'Rule outcome is required',
      severity: 'error',
    });
  }

  if (!rule.status) {
    errors.push({
      field: 'status',
      message: 'Rule status is required',
      severity: 'error',
    });
  }

  // Priority validation
  if (rule.priority !== undefined) {
    errors.push(...validateNumeric(rule.priority, 'priority', { min: 0, allowZero: true }));
  }

  // Effective date validation
  if (rule.effectiveDate && rule.expirationDate) {
    const startDate = new Date(rule.effectiveDate);
    const endDate = new Date(rule.expirationDate);
    if (startDate > endDate) {
      errors.push({
        field: 'effectiveDate',
        message: 'Effective date must be before expiration date',
        severity: 'error',
      });
    }
  }

  // State validation
  if (rule.states && rule.states.length === 0) {
    warnings.push({
      field: 'states',
      message: 'Consider specifying states where this rule applies',
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
 * Validate a pricing rule
 */
export function validatePricingRule(rule: Partial<PricingRule>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!rule.name || rule.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Rule name is required',
      severity: 'error',
    });
  }

  if (!rule.ruleType) {
    errors.push({
      field: 'ruleType',
      message: 'Rule type is required',
      severity: 'error',
    });
  }

  if (rule.value === undefined || rule.value === null) {
    errors.push({
      field: 'value',
      message: 'Rule value is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateNumeric(rule.value, 'value', { allowZero: true }));
  }

  if (!rule.valueType) {
    errors.push({
      field: 'valueType',
      message: 'Value type is required',
      severity: 'error',
    });
  }

  // Priority validation
  if (rule.priority !== undefined) {
    errors.push(...validateNumeric(rule.priority, 'priority', { min: 0, allowZero: true }));
  }

  // Effective date validation
  if (rule.effectiveDate && rule.expirationDate) {
    const startDate = new Date(rule.effectiveDate);
    const endDate = new Date(rule.expirationDate);
    if (startDate > endDate) {
      errors.push({
        field: 'effectiveDate',
        message: 'Effective date must be before expiration date',
        severity: 'error',
      });
    }
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

