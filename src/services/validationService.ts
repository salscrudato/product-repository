/**
 * Validation Service
 * Comprehensive validation for insurance product data
 */

import { Product, Coverage, Form, PricingStep, Rule } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  code: string;
}

// ============================================================================
// Product Validation
// ============================================================================

export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!product.name || product.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Product name is required',
      severity: 'error',
      code: 'PRODUCT_NAME_REQUIRED'
    });
  }

  // Name length validation
  if (product.name && product.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Product name must be 100 characters or less',
      severity: 'error',
      code: 'PRODUCT_NAME_TOO_LONG'
    });
  }

  // Status validation
  if (product.status && !['active', 'inactive', 'draft'].includes(product.status)) {
    errors.push({
      field: 'status',
      message: 'Invalid product status',
      severity: 'error',
      code: 'INVALID_PRODUCT_STATUS'
    });
  }

  // Category validation
  if (product.category && product.category.length > 50) {
    warnings.push({
      field: 'category',
      message: 'Category name is unusually long',
      severity: 'warning',
      code: 'CATEGORY_NAME_LONG'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Coverage Validation
// ============================================================================

export function validateCoverage(coverage: Partial<Coverage>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!coverage.name || coverage.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Coverage name is required',
      severity: 'error',
      code: 'COVERAGE_NAME_REQUIRED'
    });
  }

  if (!coverage.productId) {
    errors.push({
      field: 'productId',
      message: 'Product ID is required',
      severity: 'error',
      code: 'PRODUCT_ID_REQUIRED'
    });
  }

  // Coverage code validation
  if (coverage.coverageCode && !/^[A-Z0-9-]+$/.test(coverage.coverageCode)) {
    warnings.push({
      field: 'coverageCode',
      message: 'Coverage code should contain only uppercase letters, numbers, and hyphens',
      severity: 'warning',
      code: 'INVALID_COVERAGE_CODE_FORMAT'
    });
  }

  // Premium validation
  if (coverage.basePremium !== undefined && coverage.basePremium < 0) {
    errors.push({
      field: 'basePremium',
      message: 'Premium cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_PREMIUM'
    });
  }

  // Coinsurance validation
  if (coverage.coinsurancePercentage !== undefined) {
    if (coverage.coinsurancePercentage < 0 || coverage.coinsurancePercentage > 100) {
      errors.push({
        field: 'coinsurancePercentage',
        message: 'Coinsurance percentage must be between 0 and 100',
        severity: 'error',
        code: 'INVALID_COINSURANCE_PERCENTAGE'
      });
    }
  }

  // Waiting period validation
  if (coverage.waitingPeriod !== undefined && coverage.waitingPeriod < 0) {
    errors.push({
      field: 'waitingPeriod',
      message: 'Waiting period cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_WAITING_PERIOD'
    });
  }

  // Claims reporting period validation
  if (coverage.claimsReportingPeriod !== undefined && coverage.claimsReportingPeriod < 0) {
    errors.push({
      field: 'claimsReportingPeriod',
      message: 'Claims reporting period cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_CLAIMS_REPORTING_PERIOD'
    });
  }

  // Logical validations
  if (coverage.minimumPremium !== undefined && coverage.basePremium !== undefined) {
    if (coverage.minimumPremium > coverage.basePremium) {
      warnings.push({
        field: 'minimumPremium',
        message: 'Minimum premium is higher than base premium',
        severity: 'warning',
        code: 'MIN_PREMIUM_EXCEEDS_BASE'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Form Validation
// ============================================================================

export function validateForm(form: Partial<Form>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!form.formName || form.formName.trim().length === 0) {
    errors.push({
      field: 'formName',
      message: 'Form name is required',
      severity: 'error',
      code: 'FORM_NAME_REQUIRED'
    });
  }

  if (!form.formNumber || form.formNumber.trim().length === 0) {
    errors.push({
      field: 'formNumber',
      message: 'Form number is required',
      severity: 'error',
      code: 'FORM_NUMBER_REQUIRED'
    });
  }

  // Form number format validation (ISO standard: XX XX XX)
  if (form.formNumber && !/^[A-Z]{2}\s?\d{2}\s?\d{2}/.test(form.formNumber)) {
    warnings.push({
      field: 'formNumber',
      message: 'Form number does not match ISO standard format (e.g., CP 00 10)',
      severity: 'warning',
      code: 'NON_STANDARD_FORM_NUMBER'
    });
  }

  // Edition date validation
  if (form.edition && !/^\d{2}\/\d{2}$/.test(form.edition)) {
    warnings.push({
      field: 'edition',
      message: 'Edition should be in MM/YY format (e.g., 05/16)',
      severity: 'warning',
      code: 'INVALID_EDITION_FORMAT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Pricing Step Validation
// ============================================================================

export function validatePricingStep(step: Partial<PricingStep>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Step type validation
  if (!step.stepType || !['factor', 'operand'].includes(step.stepType)) {
    errors.push({
      field: 'stepType',
      message: 'Step type must be either "factor" or "operand"',
      severity: 'error',
      code: 'INVALID_STEP_TYPE'
    });
  }

  // Factor step validation
  if (step.stepType === 'factor') {
    if (!step.stepName || step.stepName.trim().length === 0) {
      errors.push({
        field: 'stepName',
        message: 'Step name is required for factor steps',
        severity: 'error',
        code: 'STEP_NAME_REQUIRED'
      });
    }

    if (!step.coverages || step.coverages.length === 0) {
      errors.push({
        field: 'coverages',
        message: 'At least one coverage must be selected',
        severity: 'error',
        code: 'NO_COVERAGES_SELECTED'
      });
    }

    if (step.value !== undefined && step.value < 0) {
      warnings.push({
        field: 'value',
        message: 'Negative pricing factor may produce unexpected results',
        severity: 'warning',
        code: 'NEGATIVE_PRICING_FACTOR'
      });
    }
  }

  // Operand step validation
  if (step.stepType === 'operand') {
    if (!step.operand || !['+', '-', '*', '/', '='].includes(step.operand)) {
      errors.push({
        field: 'operand',
        message: 'Operand must be one of: +, -, *, /, =',
        severity: 'error',
        code: 'INVALID_OPERAND'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Rule Validation
// ============================================================================

export function validateRule(rule: Partial<Rule>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Rule name is required',
      severity: 'error',
      code: 'RULE_NAME_REQUIRED'
    });
  }

  if (!rule.condition || rule.condition.trim().length === 0) {
    errors.push({
      field: 'condition',
      message: 'Rule condition is required',
      severity: 'error',
      code: 'RULE_CONDITION_REQUIRED'
    });
  }

  if (!rule.outcome || rule.outcome.trim().length === 0) {
    errors.push({
      field: 'outcome',
      message: 'Rule outcome is required',
      severity: 'error',
      code: 'RULE_OUTCOME_REQUIRED'
    });
  }

  if (!rule.ruleType) {
    errors.push({
      field: 'ruleType',
      message: 'Rule type is required',
      severity: 'error',
      code: 'RULE_TYPE_REQUIRED'
    });
  }

  // Priority validation
  if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
    warnings.push({
      field: 'priority',
      message: 'Priority should typically be between 0 and 100',
      severity: 'warning',
      code: 'UNUSUAL_PRIORITY_VALUE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Batch Validation
// ============================================================================

export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult
): { valid: T[]; invalid: Array<{ item: T; result: ValidationResult }> } {
  const valid: T[] = [];
  const invalid: Array<{ item: T; result: ValidationResult }> = [];

  for (const item of items) {
    const result = validator(item);
    if (result.isValid) {
      valid.push(item);
    } else {
      invalid.push({ item, result });
    }
  }

  return { valid, invalid };
}

