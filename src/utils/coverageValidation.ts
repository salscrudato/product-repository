/**
 * Coverage Validation Utilities
 * Comprehensive validation for coverage data
 */

import { Coverage, CoverageLimit, CoverageDeductible } from '../types';

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
    if (coverage.coinsurancePercentage < 0 || coverage.coinsurancePercentage > 100) {
      errors.push({
        field: 'coinsurancePercentage',
        message: 'Coinsurance percentage must be between 0 and 100',
        severity: 'error',
      });
    }

    if (coverage.coinsurancePercentage > 0 && coverage.coinsurancePercentage < 50) {
      warnings.push({
        field: 'coinsurancePercentage',
        message: 'Coinsurance percentage below 50% is unusual',
        severity: 'warning',
      });
    }
  }

  // Waiting period validation
  if (coverage.waitingPeriod !== undefined && coverage.waitingPeriod < 0) {
    errors.push({
      field: 'waitingPeriod',
      message: 'Waiting period cannot be negative',
      severity: 'error',
    });
  }

  // Claims reporting period validation
  if (coverage.claimsReportingPeriod !== undefined && coverage.claimsReportingPeriod < 0) {
    errors.push({
      field: 'claimsReportingPeriod',
      message: 'Claims reporting period cannot be negative',
      severity: 'error',
    });
  }

  // Endorsement validation
  if (coverage.category === 'Endorsement Coverage') {
    if (!coverage.endorsementType) {
      warnings.push({
        field: 'endorsementType',
        message: 'Endorsement type is recommended for endorsement coverages',
        severity: 'warning',
      });
    }

    if (!coverage.modifiesCoverageId) {
      warnings.push({
        field: 'modifiesCoverageId',
        message: 'Consider specifying which coverage this endorsement modifies',
        severity: 'warning',
      });
    }
  } else {
    // Not an endorsement
    if (coverage.endorsementType) {
      warnings.push({
        field: 'endorsementType',
        message: 'Endorsement type should only be set for Endorsement Coverage category',
        severity: 'warning',
      });
    }

    if (coverage.modifiesCoverageId) {
      warnings.push({
        field: 'modifiesCoverageId',
        message: 'Modifies coverage should only be set for Endorsement Coverage category',
        severity: 'warning',
      });
    }
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

  // Premium validation
  if (coverage.basePremium !== undefined && coverage.basePremium < 0) {
    errors.push({
      field: 'basePremium',
      message: 'Base premium cannot be negative',
      severity: 'error',
    });
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
  } else if (limit.amount < 0) {
    errors.push({
      field: 'amount',
      message: 'Limit amount cannot be negative',
      severity: 'error',
    });
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
  } else if (deductible.amount < 0) {
    errors.push({
      field: 'amount',
      message: 'Deductible amount cannot be negative',
      severity: 'error',
    });
  }

  // Percentage validation
  if (deductible.deductibleType === 'percentage' && deductible.amount !== undefined) {
    if (deductible.amount > 100) {
      errors.push({
        field: 'amount',
        message: 'Percentage deductible cannot exceed 100%',
        severity: 'error',
      });
    }

    if (deductible.amount > 50) {
      warnings.push({
        field: 'amount',
        message: 'Percentage deductible above 50% is unusual',
        severity: 'warning',
      });
    }
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

