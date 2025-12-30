/**
 * Services Index
 *
 * Note: Services are typically imported directly from their files.
 * This index provides convenient re-exports for commonly used services.
 */

// Validation Service - commonly used across components
export {
  validateCoverageLimit,
  validateCoverageDeductible,
  formatValidationResult,
  type ValidationResult
} from './validationService';

// Audit Service - commonly used for logging
export {
  logAuditEvent,
  type AuditAction,
  type AuditEntity
} from './auditService';

// Product 360 Read Model
export {
  getProduct360Summary,
  type Product360Summary
} from './product360ReadModel';

// Cache Service
export {
  cacheServices,
  type CacheStats
} from './cacheService';
