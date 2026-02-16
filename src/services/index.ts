/**
 * Services Index
 *
 * Centralized service exports for the P&C Insurance Product Management application.
 *
 * IMPORTANT: For optimal tree-shaking, prefer direct imports when you need only
 * one or two functions from a service. Use this barrel export for convenience
 * when importing multiple services.
 *
 * Example of direct import (preferred for single function):
 *   import { validateCoverageLimit } from '@services/validationService';
 *
 * Example of barrel import (convenient for multiple services):
 *   import { validateCoverageLimit, logAuditEvent } from '@services';
 */

// ============================================================================
// Validation Service - commonly used across components
// ============================================================================
export {
  validateCoverageLimit,
  validateCoverageDeductible,
  formatValidationResult,
  type ValidationResult
} from './validationService';

// ============================================================================
// Audit Service - commonly used for logging
// ============================================================================
export {
  logAuditEvent,
  type AuditAction,
  type AuditEntity
} from './auditService';

// ============================================================================
// Product 360 Read Model
// ============================================================================
export {
  getProduct360Summary,
  type Product360Summary
} from './product360ReadModel';

// ============================================================================
// Cache Service
// ============================================================================
export {
  CacheService,
  cacheServices,
  type CacheStats
} from './cacheService';

// ============================================================================
// AI Services - for AI-powered features
// ============================================================================
export { default as aiPromptOptimizer } from './aiPromptOptimizer';
export type { QueryType, ModelTier, ModelConfig } from './aiPromptOptimizer';

export { default as advancedRAGService } from './advancedRAGService';
export type {
  DocumentChunk,
  SummaryRequest,
  SummaryResult,
  SummaryType
} from './advancedRAGService';

export { default as responseFormatter } from './responseFormatter';

// ============================================================================
// Firebase Services
// ============================================================================
export { default as firebaseOptimized } from './firebaseOptimized';

// ============================================================================
// Coverage Services
// ============================================================================
export { fetchCoverageRules, fetchRulesByType, createRule, updateRule, deleteRule, toggleRuleEnabled, getRuleTypeInfo, createDependencyRuleTemplate } from './coverageRulesService';
export { searchCoverages, getPopularCoverages, getRelatedCoverages, suggestMissingCoverages, getCategories, getCoveragesByCategory } from './coverageSearch';
export { fetchCoverageFormLinks, fetchFormLinksByRole, createFormLink, updateFormLink, deleteFormLink, batchUpdateFormLinks, getFormRoleDisplayName, getFormRoleColor } from './coverageFormLinkService';
export { calculateCoverageReadiness, calculateProductCoveragesReadiness, getProductReadinessSummary } from './coverageReadinessService';

// ============================================================================
// State & Availability Services
// ============================================================================
export { US_STATES, fetchCoverageStateAvailability, fetchProductStateAvailability, setCoverageStateAvailability, batchUpdateStateAvailability, removeStateAvailability } from './stateAvailabilityService';

// ============================================================================
// Data Services
// ============================================================================
export { default as dataDictionaryService } from './dataDictionaryService';

// ============================================================================
// Rule Builder Service - AI-powered programmable rules
// ============================================================================
export {
  generateRuleFromText,
  saveRuleFromDraft,
  updateRuleLogic,
  refineRule,
  evaluateRule,
  type RuleBuilderRequest,
  type RuleBuilderResponse,
} from './ruleBuilderService';
