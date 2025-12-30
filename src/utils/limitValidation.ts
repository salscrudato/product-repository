/**
 * Limit Option Validation Utilities
 * 
 * Validation functions for CoverageLimitOptionSet and CoverageLimitOption
 * with support for draft and publish modes.
 */

import {
  CoverageLimitOptionSet,
  CoverageLimitOption,
  LimitOptionSetValidationResult,
  LimitValidationError,
  LimitValidationWarning,
  LimitOptionValue,
  LimitBasisConfig
} from '../types';

type ValidationMode = 'draft' | 'publish';

/**
 * Validate a complete limit option set with its options
 */
export function validateLimitOptionSet(
  optionSet: CoverageLimitOptionSet,
  options: CoverageLimitOption[],
  mode: ValidationMode = 'draft'
): LimitOptionSetValidationResult {
  const errors: LimitValidationError[] = [];
  const warnings: LimitValidationWarning[] = [];

  // Validate option set fields
  if (!optionSet.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Option set name is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!optionSet.structure) {
    errors.push({
      field: 'structure',
      message: 'Limit structure must be selected',
      code: 'REQUIRED_FIELD'
    });
  }

  // Split structure requires component definitions
  if (optionSet.structure === 'split') {
    if (!optionSet.splitComponents || optionSet.splitComponents.length === 0) {
      errors.push({
        field: 'splitComponents',
        message: 'Split limit structure requires component definitions',
        code: 'MISSING_SPLIT_COMPONENTS'
      });
    }
  }

  // Validate basis config for non-custom structures
  if (optionSet.structure !== 'custom') {
    const basisErrors = validateBasisConfig(optionSet.basisConfig, optionSet.structure, mode);
    errors.push(...basisErrors);
  }

  // Publish mode: require at least one option
  if (mode === 'publish' && options.length === 0) {
    errors.push({
      field: 'options',
      message: 'At least one limit option is required for publishing',
      code: 'NO_OPTIONS'
    });
  }

  // Validate each option
  options.forEach((option, index) => {
    const optionErrors = validateLimitOption(option, optionSet.structure, mode);
    optionErrors.forEach(err => {
      errors.push({
        ...err,
        optionId: option.id,
        field: `options[${index}].${err.field}`
      });
    });
  });

  // Check for exactly one default (if required)
  if (optionSet.isRequired && mode === 'publish') {
    const defaultCount = options.filter(o => o.isDefault).length;
    if (defaultCount === 0) {
      warnings.push({
        field: 'options',
        message: 'Required option sets should have a default selection',
        code: 'NO_DEFAULT'
      });
    } else if (defaultCount > 1 && optionSet.selectionMode === 'single') {
      errors.push({
        field: 'options',
        message: 'Single-select option sets can only have one default',
        code: 'MULTIPLE_DEFAULTS'
      });
    }
  }

  // Check for duplicate display values
  const displayValues = options.map(o => o.displayValue || o.label);
  const duplicates = displayValues.filter((v, i) => displayValues.indexOf(v) !== i);
  if (duplicates.length > 0) {
    warnings.push({
      field: 'options',
      message: `Duplicate display values found: ${[...new Set(duplicates)].join(', ')}`,
      code: 'DUPLICATE_VALUES'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a single limit option
 */
export function validateLimitOption(
  option: CoverageLimitOption,
  structure: string,
  mode: ValidationMode = 'draft'
): LimitValidationError[] {
  const errors: LimitValidationError[] = [];

  // Validate based on structure
  switch (structure) {
    case 'single':
    case 'csl':
      if (mode === 'publish' && (!option.amount || option.amount <= 0)) {
        errors.push({
          field: 'amount',
          message: 'Limit amount must be greater than 0',
          code: 'INVALID_AMOUNT'
        });
      }
      break;

    case 'occAgg':
      if (mode === 'publish') {
        const occAgg = option as any;
        if (!occAgg.perOccurrence || occAgg.perOccurrence <= 0) {
          errors.push({
            field: 'perOccurrence',
            message: 'Per occurrence limit must be greater than 0',
            code: 'INVALID_AMOUNT'
          });
        }
        if (!occAgg.aggregate || occAgg.aggregate <= 0) {
          errors.push({
            field: 'aggregate',
            message: 'Aggregate limit must be greater than 0',
            code: 'INVALID_AMOUNT'
          });
        }
        if (occAgg.perOccurrence > occAgg.aggregate) {
          errors.push({
            field: 'aggregate',
            message: 'Aggregate should be greater than or equal to per occurrence',
            code: 'INVALID_RATIO'
          });
        }
      }
      break;

    case 'split':
      const split = option as any;
      if (mode === 'publish' && (!split.components || split.components.length === 0)) {
        errors.push({
          field: 'components',
          message: 'Split limit requires component values',
          code: 'MISSING_COMPONENTS'
        });
      }
      break;

    case 'sublimit':
      const sublimit = option as any;
      if (mode === 'publish' && (!sublimit.amount || sublimit.amount <= 0)) {
        errors.push({
          field: 'amount',
          message: 'Sublimit amount must be greater than 0',
          code: 'INVALID_AMOUNT'
        });
      }
      break;
  }

  // Validate constraints if present
  if (option.constraints) {
    const { min, max } = option.constraints;
    const amount = (option as any).amount;
    
    if (min !== undefined && amount !== undefined && amount < min) {
      errors.push({
        field: 'amount',
        message: `Amount must be at least ${formatCurrency(min)}`,
        code: 'BELOW_MIN'
      });
    }
    
    if (max !== undefined && amount !== undefined && amount > max) {
      errors.push({
        field: 'amount',
        message: `Amount must not exceed ${formatCurrency(max)}`,
        code: 'ABOVE_MAX'
      });
    }
  }

  return errors;
}

/**
 * Validate basis configuration
 */
export function validateBasisConfig(
  basisConfig: LimitBasisConfig | undefined,
  structure: string,
  mode: ValidationMode = 'draft'
): LimitValidationError[] {
  const errors: LimitValidationError[] = [];

  // In publish mode, basis is required for non-custom structures
  if (mode === 'publish' && structure !== 'custom') {
    if (!basisConfig || !basisConfig.primaryBasis) {
      errors.push({
        field: 'basisConfig.primaryBasis',
        message: 'Limit basis must be selected',
        code: 'REQUIRED_FIELD'
      });
      return errors; // Can't validate further without primary basis
    }
  }

  if (!basisConfig) {
    return errors; // No config to validate in draft mode
  }

  // Validate "other" requires customBasisDescription
  if (basisConfig.primaryBasis === 'other' || basisConfig.aggregateBasis === 'other') {
    if (!basisConfig.customBasisDescription?.trim()) {
      errors.push({
        field: 'basisConfig.customBasisDescription',
        message: 'Custom basis description is required when "Other" is selected',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  // Validate aggregate basis for occAgg/claimAgg structures
  if ((structure === 'occAgg' || structure === 'claimAgg') && mode === 'publish') {
    if (!basisConfig.aggregateBasis) {
      errors.push({
        field: 'basisConfig.aggregateBasis',
        message: 'Aggregate basis must be selected for this structure',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  // Validate scheduled structure has item basis
  if (structure === 'scheduled' && mode === 'publish') {
    if (!basisConfig.itemBasis) {
      errors.push({
        field: 'basisConfig.itemBasis',
        message: 'Item basis must be selected for scheduled limits',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  return errors;
}

/**
 * Format currency for error messages
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Check if an option set is ready for publishing
 */
export function isReadyToPublish(
  optionSet: CoverageLimitOptionSet,
  options: CoverageLimitOption[]
): boolean {
  const result = validateLimitOptionSet(optionSet, options, 'publish');
  return result.isValid;
}

/**
 * Get validation summary for display
 */
export function getValidationSummary(
  result: LimitOptionSetValidationResult
): { type: 'success' | 'warning' | 'error'; message: string } {
  if (result.errors.length > 0) {
    return {
      type: 'error',
      message: `${result.errors.length} error${result.errors.length > 1 ? 's' : ''} found`
    };
  }
  
  if (result.warnings.length > 0) {
    return {
      type: 'warning',
      message: `${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`
    };
  }
  
  return {
    type: 'success',
    message: 'Valid'
  };
}

