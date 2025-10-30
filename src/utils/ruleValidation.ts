/**
 * Rule Validation Utilities (DEPRECATED)
 *
 * ⚠️ DEPRECATED: This file is maintained for backward compatibility only.
 * All validation logic has been consolidated into validationService.ts
 *
 * Please import from validationService instead:
 * import { validateRule, isValidRuleType, ... } from '@services/validationService';
 */

// Re-export all functions from validationService for backward compatibility
export {
  validateRule,
  isValidRuleType,
  isValidRuleCategory,
  isValidRuleStatus,
  sanitizeRule,
  checkRuleConflicts,
  validateRuleDeletion,
  formatValidationResult as formatValidationErrors,
  validateStateSubset,
  validateStateApplicability
} from '../services/validationService';

// Re-export types
export type { ValidationResult as RuleValidationResult } from '../services/validationService';

