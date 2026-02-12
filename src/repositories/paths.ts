/**
 * Centralized Firestore Collection Paths
 * Single source of truth for all collection paths
 */

// ============================================================================
// Top-level Collections
// ============================================================================

export const COLLECTIONS = {
  PRODUCTS: 'products',
  FORMS: 'forms',
  RULES: 'rules',
  TASKS: 'tasks',
  USERS: 'users',
  AUDIT_LOG: 'auditLog',
  SYSTEM_CONFIG: 'systemConfig',
  PRICING_TABLES: 'pricingTables',
} as const;

// ============================================================================
// Subcollection Names
// ============================================================================

export const SUBCOLLECTIONS = {
  COVERAGES: 'coverages',
  COVERAGE_RULES: 'coverageRules',
  COVERAGE_FORM_LINKS: 'coverageFormLinks',
  PRICING_STEPS: 'pricingSteps',
  DATA_DICTIONARY: 'dataDictionary',
  VERSIONS: 'versions',
  PACKAGES: 'packages',
  PACKAGE_COVERAGES: 'packageCoverages',
} as const;

// ============================================================================
// Path Builders
// ============================================================================

/**
 * Build path to a product's coverages subcollection
 */
export function coveragesPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.COVERAGES}`;
}

/**
 * Build path to a coverage's rules subcollection
 */
export function coverageRulesPath(productId: string, coverageId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.COVERAGES}/${coverageId}/${SUBCOLLECTIONS.COVERAGE_RULES}`;
}

/**
 * Build path to a coverage's form links subcollection
 */
export function coverageFormLinksPath(productId: string, coverageId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.COVERAGES}/${coverageId}/${SUBCOLLECTIONS.COVERAGE_FORM_LINKS}`;
}

/**
 * Build path to a product's pricing steps subcollection
 */
export function pricingStepsPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.PRICING_STEPS}`;
}

/**
 * Build path to a product's data dictionary subcollection
 */
export function dataDictionaryPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.DATA_DICTIONARY}`;
}

/**
 * Build path to a product's packages subcollection
 */
export function packagesPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.PACKAGES}`;
}

/**
 * Build path to a package's coverages subcollection
 */
export function packageCoveragesPath(productId: string, packageId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.PACKAGES}/${packageId}/${SUBCOLLECTIONS.PACKAGE_COVERAGES}`;
}

/**
 * Build path to a product's versions subcollection
 */
export function versionsPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}/${SUBCOLLECTIONS.VERSIONS}`;
}

// ============================================================================
// Document Path Builders
// ============================================================================

export function productDocPath(productId: string): string {
  return `${COLLECTIONS.PRODUCTS}/${productId}`;
}

export function coverageDocPath(productId: string, coverageId: string): string {
  return `${coveragesPath(productId)}/${coverageId}`;
}

export function formDocPath(formId: string): string {
  return `${COLLECTIONS.FORMS}/${formId}`;
}

export function ruleDocPath(ruleId: string): string {
  return `${COLLECTIONS.RULES}/${ruleId}`;
}

export function taskDocPath(taskId: string): string {
  return `${COLLECTIONS.TASKS}/${taskId}`;
}

