/**
 * Consolidated Validation Service
 * Comprehensive validation for all insurance product data
 * Merged from: validationService.ts, dataValidationService.ts, coverageValidation.ts, ruleValidation.ts, stateValidation.ts
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Coverage, Form, PricingStep, Rule, StateApplicability } from '../types';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, unknown>;
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

export interface ReferentialIntegrityReport {
  orphanedCoverages: string[];
  orphanedForms: string[];
  orphanedRules: string[];
  brokenFormMappings: string[];
  invalidStateReferences: string[];
  totalIssues: number;
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

// ============================================================================
// Referential Integrity Validation (from dataValidationService)
// ============================================================================

/**
 * Validate a product and all its relationships
 */
export async function validateProductIntegrity(productId: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Check product exists
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      errors.push({
        field: 'productId',
        message: `Product ${productId} does not exist`,
        severity: 'error',
        code: 'PRODUCT_NOT_FOUND'
      });
      return { isValid: false, errors, warnings };
    }

    const product = productDoc.data() as Product;

    // Validate product fields
    if (!product.name || product.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Product name is required and cannot be empty',
        severity: 'error',
        code: 'PRODUCT_NAME_EMPTY'
      });
    }

    if (product.effectiveDate && product.expirationDate) {
      const effectiveDate = product.effectiveDate instanceof Timestamp
        ? product.effectiveDate.toDate()
        : new Date(product.effectiveDate);
      const expirationDate = product.expirationDate instanceof Timestamp
        ? product.expirationDate.toDate()
        : new Date(product.expirationDate);

      if (effectiveDate >= expirationDate) {
        errors.push({
          field: 'dates',
          message: 'Product effective date must be before expiration date',
          severity: 'error',
          code: 'INVALID_DATE_RANGE'
        });
      }
    }

    // Validate coverages exist
    const coveragesSnap = await getDocs(
      collection(db, `products/${productId}/coverages`)
    );
    if (coveragesSnap.empty) {
      warnings.push({
        field: 'coverages',
        message: 'Product has no coverages defined',
        severity: 'warning',
        code: 'NO_COVERAGES'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: { productId, coverageCount: coveragesSnap.size }
    };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Product integrity validation failed',
      { productId }, error as Error);
    errors.push({
      field: 'validation',
      message: 'Failed to validate product integrity',
      severity: 'error',
      code: 'VALIDATION_ERROR'
    });
    return { isValid: false, errors, warnings };
  }
}

/**
 * Check referential integrity across all entities
 */
export async function checkReferentialIntegrity(productId: string): Promise<ReferentialIntegrityReport> {
  const report: ReferentialIntegrityReport = {
    orphanedCoverages: [],
    orphanedForms: [],
    orphanedRules: [],
    brokenFormMappings: [],
    invalidStateReferences: [],
    totalIssues: 0
  };

  try {
    // Check for orphaned coverages
    const coveragesSnap = await getDocs(
      collection(db, `products/${productId}/coverages`)
    );

    for (const coverageDoc of coveragesSnap.docs) {
      const coverage = coverageDoc.data() as Coverage;
      if (!coverage.name || !coverage.coverageType) {
        report.orphanedCoverages.push(coverageDoc.id);
      }
    }

    // Check for orphaned forms
    const formsSnap = await getDocs(
      query(collection(db, 'forms'), where('productId', '==', productId))
    );

    for (const formDoc of formsSnap.docs) {
      const form = formDoc.data() as Form;
      if (!form.formName || !form.formNumber) {
        report.orphanedForms.push(formDoc.id);
      }
    }

    // Check for orphaned rules
    const rulesSnap = await getDocs(
      query(collection(db, 'rules'), where('productId', '==', productId))
    );

    for (const ruleDoc of rulesSnap.docs) {
      const rule = ruleDoc.data() as Rule;
      if (!rule.name || !rule.condition) {
        report.orphanedRules.push(ruleDoc.id);
      }
    }

    report.totalIssues =
      report.orphanedCoverages.length +
      report.orphanedForms.length +
      report.orphanedRules.length +
      report.brokenFormMappings.length +
      report.invalidStateReferences.length;

    return report;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Referential integrity check failed',
      { productId }, error as Error);
    return report;
  }
}

/**
 * Validate state code
 */
export function validateStateCode(state: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const validStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                       'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                       'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                       'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                       'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  if (!state || state.trim().length === 0) {
    errors.push({
      field: 'state',
      message: 'State code is required',
      severity: 'error',
      code: 'STATE_REQUIRED'
    });
  } else if (!validStates.includes(state.toUpperCase())) {
    errors.push({
      field: 'state',
      message: `Invalid state code: ${state}`,
      severity: 'error',
      code: 'INVALID_STATE_CODE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a coverage limit
 */
export function validateCoverageLimit(limit: Partial<CoverageLimit>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!limit.limitType) {
    errors.push({
      field: 'limitType',
      message: 'Limit type is required',
      severity: 'error'
    });
  }

  if (limit.amount === undefined || limit.amount === null) {
    errors.push({
      field: 'amount',
      message: 'Limit amount is required',
      severity: 'error'
    });
  } else if (typeof limit.amount === 'number' && limit.amount < 0) {
    errors.push({
      field: 'amount',
      message: 'Limit amount must be a positive number',
      severity: 'error'
    });
  }

  if (!limit.displayValue || limit.displayValue.trim() === '') {
    warnings.push({
      field: 'displayValue',
      message: 'Display value is recommended for better readability',
      severity: 'warning'
    });
  }

  // Min/max validation
  if (limit.minAmount !== undefined && limit.maxAmount !== undefined) {
    if (limit.minAmount > limit.maxAmount) {
      errors.push({
        field: 'minAmount',
        message: 'Minimum amount cannot be greater than maximum amount',
        severity: 'error'
      });
    }
  }

  if (limit.amount !== undefined && limit.minAmount !== undefined && limit.amount < limit.minAmount) {
    errors.push({
      field: 'amount',
      message: 'Amount cannot be less than minimum amount',
      severity: 'error'
    });
  }

  if (limit.amount !== undefined && limit.maxAmount !== undefined && limit.amount > limit.maxAmount) {
    errors.push({
      field: 'amount',
      message: 'Amount cannot be greater than maximum amount',
      severity: 'error'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a coverage deductible
 */
export function validateCoverageDeductible(deductible: Partial<CoverageDeductible>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!deductible.deductibleType) {
    errors.push({
      field: 'deductibleType',
      message: 'Deductible type is required',
      severity: 'error'
    });
  }

  if (deductible.amount === undefined || deductible.amount === null) {
    errors.push({
      field: 'amount',
      message: 'Deductible amount is required',
      severity: 'error'
    });
  } else if (typeof deductible.amount === 'number' && deductible.amount < 0) {
    errors.push({
      field: 'amount',
      message: 'Deductible amount must be a positive number',
      severity: 'error'
    });
  }

  // Percentage validation
  if (deductible.deductibleType === 'percentage' && deductible.amount !== undefined) {
    if (typeof deductible.amount === 'number' && (deductible.amount < 0 || deductible.amount > 100)) {
      errors.push({
        field: 'amount',
        message: 'Percentage must be between 0 and 100',
        severity: 'error'
      });
    }
    if (typeof deductible.amount === 'number' && deductible.amount > 50) {
      warnings.push({
        field: 'amount',
        message: 'Percentage deductible above 50% is unusual',
        severity: 'warning'
      });
    }
  }

  if (!deductible.displayValue || deductible.displayValue.trim() === '') {
    warnings.push({
      field: 'displayValue',
      message: 'Display value is recommended for better readability',
      severity: 'warning'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format validation result into a readable string
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

// ============================================================================
// Rule Helper Functions (from ruleValidation.ts)
// ============================================================================

/**
 * Validate rule type
 */
export function isValidRuleType(ruleType: string): boolean {
  return ['Product', 'Coverage', 'Forms', 'Pricing'].includes(ruleType);
}

/**
 * Validate rule category
 */
export function isValidRuleCategory(category: string): boolean {
  return ['Eligibility', 'Pricing', 'Compliance', 'Coverage', 'Forms'].includes(category);
}

/**
 * Validate rule status
 */
export function isValidRuleStatus(status: string): boolean {
  return ['Active', 'Inactive', 'Draft', 'Under Review', 'Archived'].includes(status);
}

/**
 * Sanitize rule data before saving
 */
export function sanitizeRule(rule: Partial<Rule>): Partial<Rule> {
  const sanitized: Partial<Rule> = { ...rule };

  // Trim string fields
  if (sanitized.name) sanitized.name = sanitized.name.trim();
  if (sanitized.condition) sanitized.condition = sanitized.condition.trim();
  if (sanitized.outcome) sanitized.outcome = sanitized.outcome.trim();
  if (sanitized.reference) sanitized.reference = sanitized.reference.trim();
  if (sanitized.productId) sanitized.productId = sanitized.productId.trim();
  if (sanitized.targetId) sanitized.targetId = sanitized.targetId.trim();

  // Remove targetId if rule type is Product
  if (sanitized.ruleType === 'Product') {
    delete sanitized.targetId;
  }

  // Set default values
  if (sanitized.proprietary === undefined) sanitized.proprietary = false;
  if (sanitized.status === undefined) sanitized.status = 'Draft';

  return sanitized;
}

/**
 * Check if a rule conflicts with existing rules
 */
export function checkRuleConflicts(
  newRule: Partial<Rule>,
  existingRules: Rule[]
): { hasConflict: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  // Check for duplicate names in same product
  const duplicateName = existingRules.find(
    rule =>
      rule.productId === newRule.productId &&
      rule.name.toLowerCase() === newRule.name?.toLowerCase() &&
      rule.id !== newRule.id
  );

  if (duplicateName) {
    conflicts.push(`A rule with the name "${newRule.name}" already exists for this product`);
  }

  // Check for identical conditions and outcomes
  const identicalRule = existingRules.find(
    rule =>
      rule.productId === newRule.productId &&
      rule.ruleType === newRule.ruleType &&
      rule.targetId === newRule.targetId &&
      rule.condition === newRule.condition &&
      rule.outcome === newRule.outcome &&
      rule.id !== newRule.id
  );

  if (identicalRule) {
    conflicts.push(`An identical rule already exists: "${identicalRule.name}"`);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Validate rule before deletion
 */
export function validateRuleDeletion(rule: Rule): { canDelete: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (rule.status === 'Active') {
    warnings.push('This is an active rule. Deleting it may affect product behavior.');
  }

  if (rule.proprietary) {
    warnings.push('This is a proprietary rule. Make sure you have a backup.');
  }

  if (rule.priority !== undefined && rule.priority >= 80) {
    warnings.push('This is a high-priority rule. Verify it is safe to delete.');
  }

  return {
    canDelete: true,
    warnings
  };
}

// ============================================================================
// State Applicability Validation
// ============================================================================

/**
 * Validate that child entity states are a subset of parent entity states
 * Used for hierarchical state applicability (e.g., coverage states must be subset of product states)
 */
export function validateStateSubset(
  childStates: string[] | undefined,
  parentStates: string[] | undefined,
  entityName: string = 'Entity'
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // If child has no states, it's valid (inherits parent)
  if (!childStates || childStates.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // If parent has no states, child can't have states
  if (!parentStates || parentStates.length === 0) {
    errors.push({
      field: 'states',
      message: `${entityName} cannot have state restrictions when parent has no state restrictions`,
      severity: 'error',
      code: 'STATE_SUBSET_INVALID'
    });
    return { isValid: false, errors, warnings };
  }

  // Check if all child states are in parent states
  const invalidStates = childStates.filter(state => !parentStates.includes(state));

  if (invalidStates.length > 0) {
    errors.push({
      field: 'states',
      message: `${entityName} states must be a subset of parent states. Invalid states: ${invalidStates.join(', ')}`,
      severity: 'error',
      code: 'STATE_SUBSET_MISMATCH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate state applicability record
 */
export function validateStateApplicability(stateApp: Partial<StateApplicability>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!stateApp.state || stateApp.state.trim().length === 0) {
    errors.push({
      field: 'state',
      message: 'State code is required',
      severity: 'error',
      code: 'STATE_CODE_REQUIRED'
    });
  }

  if (!stateApp.entityId || stateApp.entityId.trim().length === 0) {
    errors.push({
      field: 'entityId',
      message: 'Entity ID is required',
      severity: 'error',
      code: 'ENTITY_ID_REQUIRED'
    });
  }

  if (!stateApp.entityType) {
    errors.push({
      field: 'entityType',
      message: 'Entity type is required',
      severity: 'error',
      code: 'ENTITY_TYPE_REQUIRED'
    });
  }

  // Validate state code format (2-letter US state code)
  if (stateApp.state && !/^[A-Z]{2}$/.test(stateApp.state)) {
    errors.push({
      field: 'state',
      message: 'State code must be a 2-letter US state abbreviation',
      severity: 'error',
      code: 'INVALID_STATE_CODE_FORMAT'
    });
  }

  // Validate subset if parent states are provided
  if (stateApp.isSubsetOf && stateApp.isSubsetOf.length > 0 && stateApp.state) {
    if (!stateApp.isSubsetOf.includes(stateApp.state)) {
      errors.push({
        field: 'state',
        message: `State ${stateApp.state} is not in the allowed parent states`,
        severity: 'error',
        code: 'STATE_NOT_IN_PARENT_SET'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  validateProduct,
  validateCoverage,
  validateForm,
  validatePricingStep,
  validateRule,
  validateBatch,
  validateProductIntegrity,
  checkReferentialIntegrity,
  validateStateCode,
  validateCoverageLimit,
  validateCoverageDeductible,
  formatValidationResult,
  isValidRuleType,
  isValidRuleCategory,
  isValidRuleStatus,
  sanitizeRule,
  checkRuleConflicts,
  validateRuleDeletion,
  validateStateSubset,
  validateStateApplicability
};

