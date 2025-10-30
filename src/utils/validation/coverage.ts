/**
 * Coverage Validation Utilities
 * Comprehensive validation for coverage, limits, and deductibles
 */

import { Coverage, CoverageLimit, CoverageDeductible } from '@types';
import {
  ValidationError,
  ValidationResult,
  validateNumeric,
  validatePercentage,
  formatValidationResult,
} from './common';

/**
 * Validate a coverage object
 */
export function validateCoverage(coverage: Partial<Coverage>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!coverage.name || coverage.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Coverage name is required',
      severity: 'error',
    });
  }

  if (!coverage.coverageCode || coverage.coverageCode.trim() === '') {
    warnings.push({
      field: 'coverageCode',
      message: 'Coverage code is recommended for easier identification',
      severity: 'warning',
    });
  }

  // Valuation method validation
  if (coverage.depreciationMethod && coverage.valuationMethod !== 'ACV') {
    errors.push({
      field: 'depreciationMethod',
      message: 'Depreciation method can only be set when valuation method is ACV',
      severity: 'error',
    });
  }

  // Coinsurance validation
  if (coverage.coinsurancePercentage !== undefined) {
    const { errors: coinsErrors, warnings: coinsWarnings } = validatePercentage(
      coverage.coinsurancePercentage,
      'coinsurancePercentage',
      { warnAbove: 50 }
    );
    errors.push(...coinsErrors);
    warnings.push(...coinsWarnings);
  }

  // Waiting period validation
  if (coverage.waitingPeriod !== undefined) {
    errors.push(...validateNumeric(coverage.waitingPeriod, 'waitingPeriod', { allowZero: true }));
  }

  // Claims reporting period validation
  if (coverage.claimsReportingPeriod !== undefined) {
    errors.push(...validateNumeric(coverage.claimsReportingPeriod, 'claimsReportingPeriod', { allowZero: true }));
  }



  // Territory validation
  if (coverage.territoryType === 'stateSpecific' || coverage.territoryType === 'custom') {
    if (!coverage.includedTerritories || coverage.includedTerritories.length === 0) {
      warnings.push({
        field: 'includedTerritories',
        message: 'Consider specifying included territories for state-specific or custom territory types',
        severity: 'warning',
      });
    }
  }

  // Underwriting validation
  if (coverage.requiresUnderwriterApproval) {
    if (!coverage.eligibilityCriteria || coverage.eligibilityCriteria.length === 0) {
      warnings.push({
        field: 'eligibilityCriteria',
        message: 'Consider adding eligibility criteria for coverages requiring underwriter approval',
        severity: 'warning',
      });
    }
  }



  // Exclusions validation
  if (coverage.exclusions && coverage.exclusions.length > 0) {
    coverage.exclusions.forEach((exclusion, index) => {
      if (!exclusion.name || exclusion.name.trim() === '') {
        errors.push({
          field: `exclusions[${index}].name`,
          message: `Exclusion ${index + 1} must have a name`,
          severity: 'error',
        });
      }
    });
  }

  // Conditions validation
  if (coverage.conditions && coverage.conditions.length > 0) {
    coverage.conditions.forEach((condition, index) => {
      if (!condition.name || condition.name.trim() === '') {
        errors.push({
          field: `conditions[${index}].name`,
          message: `Condition ${index + 1} must have a name`,
          severity: 'error',
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a coverage limit
 */
export function validateCoverageLimit(limit: Partial<CoverageLimit>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!limit.limitType) {
    errors.push({
      field: 'limitType',
      message: 'Limit type is required',
      severity: 'error',
    });
  }

  if (limit.amount === undefined || limit.amount === null) {
    errors.push({
      field: 'amount',
      message: 'Limit amount is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateNumeric(limit.amount, 'amount'));
  }

  if (!limit.displayValue || limit.displayValue.trim() === '') {
    warnings.push({
      field: 'displayValue',
      message: 'Display value is recommended for better readability',
      severity: 'warning',
    });
  }

  // Min/max validation
  if (limit.minAmount !== undefined && limit.maxAmount !== undefined) {
    if (limit.minAmount > limit.maxAmount) {
      errors.push({
        field: 'minAmount',
        message: 'Minimum amount cannot be greater than maximum amount',
        severity: 'error',
      });
    }
  }

  if (limit.amount !== undefined && limit.minAmount !== undefined && limit.amount < limit.minAmount) {
    errors.push({
      field: 'amount',
      message: 'Amount cannot be less than minimum amount',
      severity: 'error',
    });
  }

  if (limit.amount !== undefined && limit.maxAmount !== undefined && limit.amount > limit.maxAmount) {
    errors.push({
      field: 'amount',
      message: 'Amount cannot be greater than maximum amount',
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
 * Validate a coverage deductible
 */
export function validateCoverageDeductible(deductible: Partial<CoverageDeductible>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!deductible.deductibleType) {
    errors.push({
      field: 'deductibleType',
      message: 'Deductible type is required',
      severity: 'error',
    });
  }

  if (deductible.amount === undefined || deductible.amount === null) {
    errors.push({
      field: 'amount',
      message: 'Deductible amount is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateNumeric(deductible.amount, 'amount'));
  }

  // Percentage validation
  if (deductible.deductibleType === 'percentage' && deductible.amount !== undefined) {
    const { errors: percErrors, warnings: percWarnings } = validatePercentage(
      deductible.amount,
      'amount',
      { warnAbove: 50 }
    );
    errors.push(...percErrors);
    warnings.push(...percWarnings);
  }

  if (!deductible.displayValue || deductible.displayValue.trim() === '') {
    warnings.push({
      field: 'displayValue',
      message: 'Display value is recommended for better readability',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Re-export common formatter
export { formatValidationResult };

