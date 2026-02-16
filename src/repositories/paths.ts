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

// ============================================================================
// Org-Scoped Versioned Path Builders
// ============================================================================

/**
 * Build path to an org's products collection
 */
export function orgProductsPath(orgId: string): string {
  return `orgs/${orgId}/products`;
}

/**
 * Build path to a product's versions subcollection
 */
export function productVersionsPath(orgId: string, productId: string): string {
  return `orgs/${orgId}/products/${productId}/versions`;
}

/**
 * Build path to a specific product version document
 */
export function productVersionDocPath(orgId: string, productId: string, versionId: string): string {
  return `orgs/${orgId}/products/${productId}/versions/${versionId}`;
}

/**
 * Build path to coverages for a product version
 */
export function orgCoveragesPath(orgId: string, productId: string): string {
  return `orgs/${orgId}/products/${productId}/coverages`;
}

/**
 * Build path to a coverage's versions subcollection
 */
export function coverageVersionsPath(orgId: string, productId: string, coverageId: string): string {
  return `orgs/${orgId}/products/${productId}/coverages/${coverageId}/versions`;
}

/**
 * Build path to org forms collection
 */
export function orgFormsPath(orgId: string): string {
  return `orgs/${orgId}/forms`;
}

/**
 * Build path to a form's versions subcollection
 */
export function formVersionsPath(orgId: string, formId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions`;
}

/**
 * Build path to org rules collection
 */
export function orgRulesPath(orgId: string): string {
  return `orgs/${orgId}/rules`;
}

/**
 * Build path to a rule's versions subcollection
 */
export function ruleVersionsPath(orgId: string, ruleId: string): string {
  return `orgs/${orgId}/rules/${ruleId}/versions`;
}

/**
 * Build path to a specific rule version document
 */
export function ruleVersionDocPath(orgId: string, ruleId: string, versionId: string): string {
  return `orgs/${orgId}/rules/${ruleId}/versions/${versionId}`;
}

/**
 * Build path to org rate programs collection
 */
export function orgRateProgramsPath(orgId: string): string {
  return `orgs/${orgId}/ratePrograms`;
}

/**
 * Build path to a rate program's versions subcollection
 */
export function rateProgramVersionsPath(orgId: string, rateProgramId: string): string {
  return `orgs/${orgId}/ratePrograms/${rateProgramId}/versions`;
}

/**
 * Build path to org tables collection
 */
export function orgTablesPath(orgId: string): string {
  return `orgs/${orgId}/tables`;
}

/**
 * Build path to a table's versions subcollection
 */
export function tableVersionsPath(orgId: string, tableId: string): string {
  return `orgs/${orgId}/tables/${tableId}/versions`;
}

/**
 * Build path to product data dictionary
 */
export function orgDataDictionaryPath(orgId: string, productId: string): string {
  return `orgs/${orgId}/products/${productId}/dataDictionary`;
}

/**
 * Build path to a data dictionary field's versions subcollection
 */
export function dataDictionaryVersionsPath(orgId: string, productId: string, fieldId: string): string {
  return `orgs/${orgId}/products/${productId}/dataDictionary/${fieldId}/versions`;
}

/**
 * Build path to a specific form version document
 */
export function formVersionDocPath(orgId: string, formId: string, versionId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions/${versionId}`;
}

/**
 * Build path to org formUses collection
 */
export function orgFormUsesPath(orgId: string): string {
  return `orgs/${orgId}/formUses`;
}

/**
 * Build path to a specific formUse document
 */
export function formUseDocPath(orgId: string, useId: string): string {
  return `orgs/${orgId}/formUses/${useId}`;
}

/**
 * Build path to org claimsAnalyses collection
 */
export function orgClaimsAnalysesPath(orgId: string): string {
  return `orgs/${orgId}/claimsAnalyses`;
}

/**
 * Build path to a specific claims analysis document
 */
export function claimsAnalysisDocPath(orgId: string, analysisId: string): string {
  return `orgs/${orgId}/claimsAnalyses/${analysisId}`;
}

/**
 * Build path to org aiSuggestions collection
 */
export function orgAiSuggestionsPath(orgId: string): string {
  return `orgs/${orgId}/aiSuggestions`;
}

/**
 * Build path to a specific AI suggestion document
 */
export function aiSuggestionDocPath(orgId: string, suggestionId: string): string {
  return `orgs/${orgId}/aiSuggestions/${suggestionId}`;
}

// ============================================================================
// Search Index
// ============================================================================

/**
 * Build path to org search index collection
 */
export function orgSearchIndexPath(orgId: string): string {
  return `orgs/${orgId}/searchIndex`;
}

/**
 * Build path to a specific search index document
 */
export function searchIndexDocPath(orgId: string, docId: string): string {
  return `orgs/${orgId}/searchIndex/${docId}`;
}

// ============================================================================
// Collaboration: Threads, Comments, Subscriptions, Notifications
// ============================================================================

export function orgThreadsPath(orgId: string): string {
  return `orgs/${orgId}/threads`;
}

export function threadDocPath(orgId: string, threadId: string): string {
  return `orgs/${orgId}/threads/${threadId}`;
}

export function threadCommentsPath(orgId: string, threadId: string): string {
  return `orgs/${orgId}/threads/${threadId}/comments`;
}

export function commentDocPath(orgId: string, threadId: string, commentId: string): string {
  return `orgs/${orgId}/threads/${threadId}/comments/${commentId}`;
}

export function orgSubscriptionsPath(orgId: string): string {
  return `orgs/${orgId}/subscriptions`;
}

export function orgNotificationsPath(orgId: string): string {
  return `orgs/${orgId}/notifications`;
}

export function notificationDocPath(orgId: string, notificationId: string): string {
  return `orgs/${orgId}/notifications/${notificationId}`;
}

// ============================================================================
// Tasks (Governed Workflow Engine)
// ============================================================================

export function orgTasksPath(orgId: string): string {
  return `orgs/${orgId}/tasks`;
}

export function orgTaskDocPath(orgId: string, taskId: string): string {
  return `orgs/${orgId}/tasks/${taskId}`;
}

export function taskActivityPath(orgId: string, taskId: string): string {
  return `orgs/${orgId}/tasks/${taskId}/activity`;
}

export function taskActivityDocPath(orgId: string, taskId: string, activityId: string): string {
  return `orgs/${orgId}/tasks/${taskId}/activity/${activityId}`;
}

// ============================================================================
// Filing Packages
// ============================================================================

export function orgFilingPackagesPath(orgId: string): string {
  return `orgs/${orgId}/filingPackages`;
}

export function filingPackageDocPath(orgId: string, packageId: string): string {
  return `orgs/${orgId}/filingPackages/${packageId}`;
}

export function filingPackageStoragePath(orgId: string, packageId: string): string {
  return `orgs/${orgId}/filingPackages/${packageId}`;
}

// ============================================================================
// Wizard Manifests
// ============================================================================

export function orgWizardManifestsPath(orgId: string): string {
  return `orgs/${orgId}/wizardManifests`;
}

export function wizardManifestDocPath(orgId: string, manifestId: string): string {
  return `orgs/${orgId}/wizardManifests/${manifestId}`;
}

// ============================================================================
// Coverage Templates
// ============================================================================

export function orgCoverageTemplatesPath(orgId: string): string {
  return `orgs/${orgId}/coverageTemplates`;
}

export function coverageTemplateDocPath(orgId: string, templateId: string): string {
  return `orgs/${orgId}/coverageTemplates/${templateId}`;
}

// ============================================================================
// Endorsements
// ============================================================================

export function orgEndorsementsPath(orgId: string): string {
  return `orgs/${orgId}/endorsements`;
}

export function endorsementDocPath(orgId: string, endorsementId: string): string {
  return `orgs/${orgId}/endorsements/${endorsementId}`;
}

export function endorsementVersionsPath(orgId: string, endorsementId: string): string {
  return `orgs/${orgId}/endorsements/${endorsementId}/versions`;
}

export function endorsementVersionDocPath(orgId: string, endorsementId: string, versionId: string): string {
  return `orgs/${orgId}/endorsements/${endorsementId}/versions/${versionId}`;
}

// ============================================================================
// QA Scenarios
// ============================================================================

export function orgScenariosPath(orgId: string): string {
  return `orgs/${orgId}/scenarios`;
}

export function scenarioDocPath(orgId: string, scenarioId: string): string {
  return `orgs/${orgId}/scenarios/${scenarioId}`;
}

// ============================================================================
// QA Runs
// ============================================================================

export function orgQARunsPath(orgId: string): string {
  return `orgs/${orgId}/qaRuns`;
}

export function qaRunDocPath(orgId: string, runId: string): string {
  return `orgs/${orgId}/qaRuns/${runId}`;
}

// ============================================================================
// Simulations
// ============================================================================

export function orgSimulationsPath(orgId: string): string {
  return `orgs/${orgId}/simulations`;
}

export function simulationDocPath(orgId: string, simulationId: string): string {
  return `orgs/${orgId}/simulations/${simulationId}`;
}

// ============================================================================
// Analytics
// ============================================================================

export function orgAnalyticsPath(orgId: string): string {
  return `orgs/${orgId}/analytics`;
}export function analyticsDocPath(orgId: string, docId: string): string {
  return `orgs/${orgId}/analytics/${docId}`;
}

// ============================================================================
// Ingestion – Chunks & Sections (sub-collections of form versions)
// ============================================================================

export function formVersionChunksPath(orgId: string, formId: string, versionId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions/${versionId}/chunks`;
}

export function formVersionChunkDocPath(orgId: string, formId: string, versionId: string, chunkId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions/${versionId}/chunks/${chunkId}`;
}

export function formVersionSectionsPath(orgId: string, formId: string, versionId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions/${versionId}/sections`;
}

export function formVersionSectionDocPath(orgId: string, formId: string, versionId: string, sectionId: string): string {
  return `orgs/${orgId}/forms/${formId}/versions/${versionId}/sections/${sectionId}`;
}

// ============================================================================
// Clause Library
// ============================================================================

export function orgClausesPath(orgId: string): string {
  return `orgs/${orgId}/clauses`;
}

export function clauseDocPath(orgId: string, clauseId: string): string {
  return `orgs/${orgId}/clauses/${clauseId}`;
}

export function clauseVersionsPath(orgId: string, clauseId: string): string {
  return `orgs/${orgId}/clauses/${clauseId}/versions`;
}

export function clauseVersionDocPath(orgId: string, clauseId: string, versionId: string): string {
  return `orgs/${orgId}/clauses/${clauseId}/versions/${versionId}`;
}

export function orgClauseLinksPath(orgId: string): string {
  return `orgs/${orgId}/clauseLinks`;
}

export function clauseLinkDocPath(orgId: string, linkId: string): string {
  return `orgs/${orgId}/clauseLinks/${linkId}`;
}

// ============================================================================
// Trace Links (clause → implementation traceability)
// ============================================================================

export function orgTraceLinksPath(orgId: string): string {
  return `orgs/${orgId}/traceLinks`;
}

export function traceLinkDocPath(orgId: string, traceId: string): string {
  return `orgs/${orgId}/traceLinks/${traceId}`;
}
