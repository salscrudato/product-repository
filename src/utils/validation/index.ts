/**
 * Validation Module Index
 * Centralized exports for all validation utilities
 */

// Common validators
export {
  ValidationError,
  ValidationResult,
  validateNumeric,
  validatePercentage,
  validateCode,
  validateDateRange,
  formatValidationResult,
} from './common';

// Coverage validators
export {
  validateCoverage,
  validateCoverageLimit,
  validateCoverageDeductible,
} from './coverage';

// Forms validators
export {
  validateFormTemplate,
  validateFormCoverageMapping,
  formatValidationErrors as formatFormValidationErrors,
} from './forms';

// Rules validators
export {
  validateRule,
  validatePricingRule,
  formatValidationErrors as formatRuleValidationErrors,
} from './rules';

// Pricing validators
export {
  validatePricingStep,
  validatePricingStepOrder,
  formatValidationErrors as formatPricingValidationErrors,
} from './pricing';

