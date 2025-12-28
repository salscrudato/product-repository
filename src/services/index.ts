/**
 * Services Index
 * Centralized exports for all service modules
 * 
 * Organization:
 * - AI Services: RAG, prompt optimization, response formatting, claims analysis
 * - Data Services: Firebase optimized queries, caching, data dictionary
 * - Validation Services: Product, coverage, form, rule validation
 * - Monitoring: Connection monitoring, audit logging
 */

// ============================================================================
// AI Services
// ============================================================================

export {
  advancedRAGService,
  default as ragService,
  type DocumentChunk,
  type ChunkMetadata,
  type SummaryRequest,
  type SummaryResult
} from './advancedRAGService';

export {
  aiPromptOptimizer,
  default as promptOptimizer,
  MODEL_CONFIGS,
  TOKEN_BUDGETS,
  type QueryType,
  type ModelTier,
  type ModelConfig
} from './aiPromptOptimizer';

export {
  responseFormatter,
  default as formatter,
  type ResponseMetadata,
  type FormattedResponse,
  type ResponseSection
} from './responseFormatter';

export {
  analyzeClaimCoverage,
  analyzeClaimWithChunking
} from './claimsAnalysisService';

// ============================================================================
// Data Services
// ============================================================================

export { default as firebaseOptimized } from './firebaseOptimized';

export {
  cacheServices,
  type CacheStats
} from './cacheService';

export { default as dataDictionaryService } from './dataDictionaryService';

export {
  getProduct360Summary,
  invalidateProduct360Cache,
  getProductStats,
  getCoverageSummary,
  getFormSummary,
  type Product360Summary
} from './product360ReadModel';

// ============================================================================
// Validation Services
// ============================================================================

export {
  // Validation functions
  validateProduct,
  validateCoverage,
  validateCoverageBasic,
  calculateCoverageCompleteness,
  validateForm,
  validatePricingStep,
  validateRule,
  validateBatch,
  validateProductIntegrity,
  validateCoverageLimit,
  validateCoverageDeductible,
  validateStateCode,
  validateStateSubset,
  validateStateApplicability,
  // Referential integrity
  checkReferentialIntegrity,
  // Rule validation
  isValidRuleType,
  isValidRuleCategory,
  isValidRuleStatus,
  sanitizeRule,
  checkRuleConflicts,
  validateRuleDeletion,
  // Utilities
  formatValidationResult,
  // Types
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ReferentialIntegrityReport,
  type CoverageValidationOptions,
  type CoverageValidationResult
} from './validationService';

// ============================================================================
// Coverage Model Service
// ============================================================================

export {
  normalizeCoverageDraft,
  denormalizeForSave,
  calculateStepProgress,
  calculateOverallProgress,
  getMissingRequiredFields,
  isReadyToPublish,
  WIZARD_STEP_FIELDS,
  FIELD_LABELS,
  type NormalizedCoverageDraft,
  type WizardFieldConfig
} from './coverageModel';

// ============================================================================
// Monitoring & Audit Services
// ============================================================================

export { default as connectionMonitor } from './firebaseConnectionMonitor';

export {
  logAuditEvent,
  getAuditHistory,
  getProductAuditActivity,
  getUserActivity,
  detectChanges,
  formatAuditEntry,
  type AuditAction,
  type AuditEntity,
  type AuditChange,
  type AuditLogEntry
} from './auditService';

