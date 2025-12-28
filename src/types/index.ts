/**
 * Core Type Definitions for Insurance Product Hub
 * Centralized type definitions for the entire application
 *
 * Enhancements:
 * - Normalized data structures with relational mappings
 * - Strong typing with required fields and generics
 * - Comprehensive audit trails and versioning
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  /** Product code for internal reference (e.g., 'CP-001') */
  productCode?: string;
  name: string;
  description?: string;
  /** Product category (e.g., 'Commercial Property', 'BOP', 'Auto') */
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
  /** Whether this product is archived (soft delete) */
  archived?: boolean;

  // State Availability
  states?: string[];                // State codes where product is available (e.g., ['CA', 'NY', 'TX'])
  excludedStates?: string[];        // State codes where product is NOT available
  availableStates?: string[];       // Alias for states (for consistency)

  // Versioning & Effective Dates
  version?: number;                 // Version number for tracking changes
  effectiveDate?: Timestamp | Date;  // When this product becomes effective
  expirationDate?: Timestamp | Date; // When this product expires

  // Denormalized Statistics (maintained by CF triggers)
  /** Count of coverages in this product */
  coverageCount?: number;
  /** Count of forms linked to this product */
  formCount?: number;
  /** Count of rules for this product */
  ruleCount?: number;
  /** Count of packages for this product */
  packageCount?: number;

  // Relational mappings (normalized for scalability)
  coverageIds?: string[];           // Array of coverage IDs linked to this product
  formIds?: string[];               // Array of form IDs linked to this product
  ruleIds?: string[];               // Array of rule IDs linked to this product
  packageIds?: string[];            // Array of package IDs linked to this product

  // Audit Trail
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;               // User who created this product
  updatedBy?: string;               // User who last updated this product
  changeReason?: string;            // Reason for last change

  metadata?: Record<string, unknown>;
}

export interface ProductFormData {
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
}

// ============================================================================
// Coverage Types
// ============================================================================

// Limit Types
export type LimitType =
  | 'perOccurrence'      // Per occurrence/per claim limit
  | 'aggregate'          // Annual aggregate limit
  | 'perPerson'          // Per person limit (liability)
  | 'perLocation'        // Per location limit (property)
  | 'sublimit'           // Sublimit for specific perils/property
  | 'combined'           // Combined single limit
  | 'split';             // Split limits (e.g., 100/300/100)

// Deductible Types
export type DeductibleType =
  | 'flat'               // Fixed dollar amount
  | 'percentage'         // Percentage of insured value or loss
  | 'franchise'          // Nothing if loss < deductible, full if >
  | 'disappearing'       // Reduces as loss increases
  | 'perOccurrence'      // Applied per claim
  | 'aggregate'          // Annual aggregate deductible
  | 'waiting';           // Waiting period (time deductible)



// Coverage Trigger Types
export type CoverageTrigger =
  | 'occurrence'      // Standard occurrence-based trigger
  | 'claimsMade'      // Claims-made trigger
  | 'hybrid'          // Combination of occurrence and claims-made
  | 'manifestation'   // Coverage triggered when injury/damage manifests
  | 'exposure'        // Coverage triggered when exposure to cause occurs
  | 'continuous'      // Coverage triggered over continuous period
  | 'injuryInFact';   // Coverage triggered when actual injury occurs

// Valuation Methods
export type ValuationMethod = 'ACV' | 'RC' | 'agreedValue' | 'marketValue' | 'functionalRC' | 'statedAmount';

// Depreciation Methods
export type DepreciationMethod = 'straightLine' | 'decliningBalance' | 'none';

// Territory Types
export type TerritoryType = 'worldwide' | 'USA' | 'stateSpecific' | 'custom';

// Endorsement Types
export type EndorsementType = 'broadening' | 'restrictive' | 'clarifying' | 'additional';

// Premium Basis
export type PremiumBasis = 'flat' | 'perUnit' | 'rated' | 'manual';

// Underwriter Approval Type
export type UnderwriterApprovalType = 'required' | 'not_required' | 'conditional';

// ========== NEW: Coverage Kind & Draft Types ==========

/**
 * CoverageKind distinguishes the nature of the coverage item
 * - coverage: Standard insurance coverage providing protection
 * - endorsement: Modifies or extends an existing coverage
 * - exclusion: Specifically excludes certain risks
 * - notice: Informational notice or disclosure
 * - condition: Policy condition affecting coverage
 */
export type CoverageKind = 'coverage' | 'endorsement' | 'exclusion' | 'notice' | 'condition';

/**
 * Draft status for coverage creation workflow
 */
export type CoverageDraftStatus = 'draft' | 'published';

/**
 * Source of coverage creation
 */
export type CoverageDraftSource = 'manual' | 'ai' | 'template' | 'clone' | 'form_import';

/**
 * Coverage draft stored in products/{productId}/coverageDrafts/{draftId}
 */
export interface CoverageDraft {
  id: string;
  productId: string;

  // Draft state
  draft: Partial<Coverage>;
  status: CoverageDraftStatus;
  source: CoverageDraftSource;

  // Template/clone reference
  sourceTemplateId?: string;
  sourceCloneId?: string;
  sourceFormId?: string;

  // Completeness tracking
  completenessScore?: number;
  missingRequiredFields?: string[];
  validationWarnings?: string[];

  // Last AI interaction
  lastAIPatchAt?: Timestamp | Date;
  aiPatchHistory?: Array<{
    patchedAt: Timestamp | Date;
    fieldsChanged: string[];
    messageId?: string;
  }>;

  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Conversation message for coverage copilot
 * Stored in products/{productId}/coverageDrafts/{draftId}/messages/{messageId}
 */
export interface CoverageCopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp | Date;

  // AI response metadata
  patch?: Partial<Coverage>;
  questions?: Array<{
    id: string;
    text: string;
    fieldHints?: string[];
  }>;
  suggestions?: string[];
  warnings?: string[];
}

/**
 * AI response from coverageAssistant cloud function
 */
export interface CoverageCopilotResponse {
  assistant_message: string;
  patch: Partial<Coverage>;
  questions: Array<{
    id: string;
    text: string;
    fieldHints?: string[];
  }>;
  missing_required_for_publish: string[];
  suggested_template_ids?: string[];
  near_matches?: Array<{
    coverageId: string;
    name: string;
    similarity: number;
    why: string;
  }>;
  warnings?: string[];
}

/**
 * Coverage similarity match for duplicate detection
 */
export interface CoverageSimilarityMatch {
  coverageId: string;
  name: string;
  coverageCode?: string;
  similarity: number;
  why: string;
  matchedFields: string[];
}

/**
 * CoverageLimit represents a structured limit for a coverage
 * Stored in subcollection: products/{productId}/coverages/{coverageId}/limits/{limitId}
 */
export interface CoverageLimit {
  id: string;
  coverageId: string;
  productId: string;

  // Limit Details
  limitType: LimitType;
  amount: number;
  displayValue: string;  // '$1,000,000' or '100/300/100'

  // Applicability
  appliesTo?: string[];  // Specific perils, property types, or situations
  description?: string;
  states?: string[];    // State-specific applicability

  // Behavior
  isDefault?: boolean;
  isRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;

  // Relationships
  parentLimitId?: string;  // For sublimits that reduce from parent

  // Versioning & Effective Dates
  version?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  displayOrder?: number;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * CoverageDeductible represents a structured deductible for a coverage
 * Stored in subcollection: products/{productId}/coverages/{coverageId}/deductibles/{deductibleId}
 */
export interface CoverageDeductible {
  id: string;
  coverageId: string;
  productId: string;

  // Deductible Details
  deductibleType: DeductibleType;
  amount?: number;           // For flat deductibles
  percentage?: number;       // For percentage deductibles (e.g., 2 for 2%)
  displayValue: string;      // '$1,000' or '2%' or '30 days'

  // Applicability
  appliesTo?: string[];      // Specific perils or situations
  description?: string;
  states?: string[];         // State-specific applicability

  // Behavior
  isDefault?: boolean;
  isRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;

  // Special Rules for Percentage Deductibles
  minimumRetained?: number;  // Minimum dollar amount retained
  maximumRetained?: number;  // Maximum dollar amount retained

  // Special Rules for Disappearing Deductibles
  disappearingSchedule?: {
    lossAmount: number;
    deductibleAmount: number;
  }[];

  // Versioning & Effective Dates
  version?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  displayOrder?: number;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}



/**
 * Coverage represents an insurance coverage that can be part of a product.
 * Coverages can be hierarchical - a coverage with parentCoverageId is a sub-coverage.
 *
 * Database Structure:
 * - Stored in: products/{productId}/coverages/{coverageId}
 * - Sub-coverages use parentCoverageId to reference their parent
 * - Forms are linked via formCoverages junction table (not stored here)
 * - Limits stored in subcollection: limits/{limitId}
 * - Deductibles stored in subcollection: deductibles/{deductibleId}
 */
export interface Coverage {
  // ========== Identity & Hierarchy ==========
  id: string;
  productId: string;
  name: string;
  description?: string;
  coverageCode?: string;

  // Hierarchical structure - if set, this is a sub-coverage
  parentCoverageId?: string;

  // ========== Classification ==========
  type?: string;
  isOptional?: boolean;

  /**
   * Kind of coverage item - distinguishes standard coverages from endorsements, exclusions, etc.
   * Default: 'coverage'
   */
  coverageKind?: CoverageKind;

  // ========== Coverage Scope ==========
  scopeOfCoverage?: string;
  perilsCovered?: string[];
  exclusions?: string[];           // Specific exclusions for this coverage
  insurableObjects?: string[];     // Types of property/objects covered (e.g., 'buildings', 'contents', 'equipment')
  excludedObjects?: string[];      // Types of property/objects NOT covered

  // ========== Financial Structure ==========
  /**
   * @deprecated Use Limits subcollection instead
   * Kept for backward compatibility during migration
   */
  limits?: string[];

  /**
   * @deprecated Use Deductibles subcollection instead
   * Kept for backward compatibility during migration
   */
  deductibles?: string[];

  // Premium Structure
  premiumBasis?: PremiumBasis;
  ratePerUnit?: number;
  minimumPremium?: number;
  premium?: number;

  // ========== Coinsurance & Participation ==========
  coinsurancePercentage?: number;  // Legacy single value - 80, 90, 100
  coinsuranceOptions?: number[];   // Available coinsurance percentages (e.g., [80, 90, 100])
  coinsuranceMinimum?: number;     // Minimum coinsurance percentage allowed
  coinsuranceMaximum?: number;     // Maximum coinsurance percentage allowed
  hasCoinsurancePenalty?: boolean;
  insuredParticipation?: number;   // Percentage insured pays (copay)
  coinsuranceWaiver?: boolean;     // Whether coinsurance can be waived

  // ========== Coverage Triggers & Periods ==========
  coverageTrigger?: CoverageTrigger;
  waitingPeriod?: number;
  waitingPeriodUnit?: 'days' | 'months';
  allowRetroactiveDate?: boolean;
  extendedReportingPeriod?: number;  // Months

  // ========== Valuation ==========
  valuationMethod?: ValuationMethod;
  depreciationMethod?: DepreciationMethod;
  valuationMethods?: ValuationMethod[];  // Multiple valuation methods allowed
  agreedValueAmount?: number;      // For agreed value valuation

  // ========== Territory ==========
  territoryType?: TerritoryType;
  /**
   * @deprecated Use availabilityStates for product availability.
   * states field maintained for backward compatibility.
   * For policy territory clauses, use territoryType + includedTerritories/excludedTerritories.
   */
  states?: string[];
  excludedTerritories?: string[];
  includedTerritories?: string[];

  /**
   * Product availability by state - which states this coverage is available for sale
   * Preferred over legacy 'states' field for new coverages.
   */
  availabilityStates?: string[];

  // ========== Endorsement Metadata ==========
  modifiesCoverageId?: string;      // Which coverage this endorsement modifies
  endorsementType?: EndorsementType;
  supersedes?: string[];            // Coverage IDs this replaces

  // ========== Underwriting ==========
  /**
   * Underwriter approval requirement:
   * - 'yes' = Always requires underwriter approval
   * - 'no' = Auto-approved, no underwriter review needed
   * - 'conditional' = Requires approval based on eligibility criteria
   * @deprecated Use underwriterApprovalType instead (kept for backward compatibility)
   */
  requiresUnderwriterApproval?: boolean;

  /**
   * Underwriter approval type (preferred over requiresUnderwriterApproval):
   * - 'required' = Always requires underwriter approval
   * - 'not_required' = Auto-approved, no underwriter review needed
   * - 'conditional' = Requires approval based on eligibility criteria
   */
  underwriterApprovalType?: UnderwriterApprovalType;
  eligibilityCriteria?: string[];
  prohibitedClasses?: string[];     // Business classes that can't buy this
  underwritingGuidelines?: string;  // Free-form underwriting notes/guidelines

  /**
   * @deprecated Use requiredCoverageIds for ID-based references
   * Kept for backward compatibility - contains coverage names
   */
  requiredCoverages?: string[];

  /**
   * @deprecated Use incompatibleCoverageIds for ID-based references
   * Kept for backward compatibility - contains coverage names
   */
  incompatibleCoverages?: string[];

  /**
   * Coverage IDs that must be purchased with this coverage (preferred over requiredCoverages)
   */
  requiredCoverageIds?: string[];

  /**
   * Coverage IDs that cannot be purchased with this coverage (preferred over incompatibleCoverages)
   */
  incompatibleCoverageIds?: string[];

  // ========== Claims ==========
  claimsReportingPeriod?: number;   // Days to report claim
  proofOfLossDeadline?: number;     // Days to submit proof
  hasSubrogationRights?: boolean;
  hasSalvageRights?: boolean;

  // ========== Versioning & Effective Dates ==========
  version?: number;                 // Version number for tracking changes
  effectiveDate?: Timestamp | Date;  // When this coverage becomes effective
  expirationDate?: Timestamp | Date; // When this coverage expires
  displayOrder?: number;            // Order for UI display

  // ========== Coverage Metadata & Classification ==========
  coverageCategory?: 'Liability' | 'Property' | 'Medical' | 'Other';
  lineOfBusiness?: string;          // e.g., "Commercial Auto", "Homeowners"
  dependsOnCoverageId?: string[];   // Coverage IDs this depends on

  // ========== Relationships & Counts (Normalized) ==========
  // Relational mappings for scalability
  formIds?: string[];               // Linked form IDs (denormalized for quick access)
  limitIds?: string[];              // Array of limit IDs in this coverage
  deductibleIds?: string[];         // Array of deductible IDs in this coverage
  subCoverageIds?: string[];        // Array of sub-coverage IDs under this coverage
  ruleIds?: string[];               // Array of rule IDs for this coverage

  // Cached counts (computed by Cloud Functions)
  ruleCount?: number;               // Cached count of rules for this coverage (computed)
  limitCount?: number;              // Count of limits in this coverage (computed)
  deductibleCount?: number;         // Count of deductibles in this coverage (computed)
  subCoverageCount?: number;        // Count of sub-coverages under this coverage (computed)
  formMappingCount?: number;        // Count of form mappings for this coverage (computed)

  // ========== Metadata ==========
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;               // User who created this coverage
  updatedBy?: string;               // User who last updated this coverage
  changeReason?: string;            // Reason for last change
  metadata?: Record<string, unknown>;

  // ========== Audit Trail (subcollection: auditLogs) ==========
  // Audit logs are stored in: products/{productId}/coverages/{coverageId}/auditLogs/{logId}
  // This field is for reference only; actual logs are in subcollection
  lastAuditLogId?: string;          // Reference to most recent audit log
}



export interface CoverageFormData {
  productId: string;
  name: string;
  description?: string;
  type?: string;
  parentCoverageId?: string;
  limits?: string[];
  deductibles?: string[];
  premium?: number;
  isOptional?: boolean;
  states?: string[];
}

/**
 * CoverageVersion represents a version of a coverage for regulatory compliance
 * Stored in subcollection: products/{productId}/coverages/{coverageId}/versions/{versionId}
 */
export interface CoverageVersion {
  id: string;
  coverageId: string;
  productId: string;

  // Version Info
  versionNumber: string;        // '1.0', '2.0', etc.
  effectiveDate: Date | Timestamp;
  expirationDate?: Date | Timestamp;

  // Change Tracking
  changes: string;              // Description of what changed
  changedBy?: string;           // User who made the change
  approvedBy?: string;          // Underwriter/manager who approved

  // Regulatory
  regulatoryFilingNumber?: string;
  stateApprovals?: {
    state: string;
    approvalDate: Date;
    filingNumber: string;
  }[];

  // Snapshot
  snapshot: Coverage;           // Full coverage data at this version

  // Metadata
  createdAt: Timestamp | Date;
}

/**
 * PackageType for coverage packages
 */
export type PackageType = 'required' | 'recommended' | 'popular' | 'custom';

/**
 * CoveragePackage represents a bundle of coverages
 * Stored in: products/{productId}/packages/{packageId}
 */
export interface CoveragePackage {
  id: string;
  productId: string;

  // Package Info
  name: string;
  description?: string;
  packageType: PackageType;

  // Coverages
  coverageIds: string[];

  // Pricing
  discountPercentage?: number;  // Package discount
  packagePremium?: number;      // Override individual premiums

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingRule {
  id: string;
  productId: string;
  coverageId?: string;
  name: string;
  description?: string;
  ruleType: 'base' | 'modifier' | 'discount' | 'surcharge';
  value: number;
  valueType: 'percentage' | 'fixed';
  conditions?: PricingCondition[];
  priority?: number;
  isActive?: boolean;

  // Versioning & Effective Dates
  version?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;

  // State Applicability
  states?: string[];  // State-specific pricing rules
  dependsOnRuleId?: string[];  // Rule dependencies

  // Audit Trail
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
  changeReason?: string;
}

export interface PricingCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'between';
  value: string | number | boolean | [number, number];
}

/**
 * PricingRuleRef represents a reference to a pricing rule within a pricing step
 */
export interface PricingRuleRef {
  /** ID of the pricing rule */
  ruleId: string;
  /** Optional weight/priority for this rule in the step */
  weight?: number;
}

/**
 * PricingStep represents a step in the pricing calculation process
 * Stored in: products/{productId}/pricingSteps/{stepId}
 */
export interface PricingStep {
  id: string;
  productId: string;

  // Step Identification
  /** Name of the pricing step (e.g., "Base Rate", "Territory Factor", "Protection Class") */
  name: string;
  /** Alternative name field for backward compatibility */
  stepName?: string;
  description?: string;

  // Step Type & Execution
  /** Type of pricing step: 'factor' applies a multiplier, 'operand' performs an operation */
  stepType?: 'factor' | 'operand';
  /** Order in which this step executes (0, 1, 2, ...) */
  order: number;
  /** Scope of this step: 'product' applies to all coverages, 'coverage' applies to specific coverage */
  scope: 'product' | 'coverage';
  /** Coverage ID when scope='coverage' */
  targetId?: string;

  // Factor Step Properties
  /** Coverages this step applies to (for factor steps) */
  coverages?: string[];
  /** Numeric value for the step (e.g., factor multiplier) */
  value?: number;

  // Operand Step Properties
  /** Mathematical operand for operand steps */
  operand?: '+' | '-' | '*' | '/' | '=';

  // Rules
  /** Ordered list of pricing rule references */
  rules: PricingRuleRef[];

  // Versioning & Effective Dates
  version?: string;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;
  isActive?: boolean;

  // Audit Trail
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * PremiumBreakdown represents the result of pricing calculation
 */
export interface PremiumBreakdown {
  /** Premium amount for each step */
  stepBreakdown: Record<string, number>;
  /** Total premium before adjustments */
  subtotal: number;
  /** Total adjustments (discounts/surcharges) */
  adjustments: number;
  /** Final premium */
  total: number;
  /** Metadata about the calculation */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'textarea';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  dependsOn?: string;
  metadata?: Record<string, unknown>;
}

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

/**
 * FormTemplate represents an insurance form (policy form, endorsement, etc.)
 *
 * Database Structure:
 * - Stored in: forms/{formId}
 * - Linked to coverages via formCoverages junction table
 * - Do NOT store coverageIds or productIds arrays here (use formCoverages instead)
 */
export interface FormTemplate {
  id: string;

  // Form identification
  formNumber: string;
  formName?: string;
  formEditionDate?: string;

  // Primary product association (optional, for organizational purposes)
  productId?: string;

  // Form metadata
  name?: string;  // Deprecated: use formName instead
  description?: string;
  type?: string;  // e.g., 'coverage', 'endorsement', 'exclusion', 'notice'
  category?: string;

  // Form fields (for dynamic forms)
  fields?: FormField[];

  // Versioning & Effective Dates
  version?: string;
  effectiveDate?: string | Timestamp | Date;
  expirationDate?: string | Timestamp | Date;  // When this form version expires

  // State availability (informational - actual coverage availability via formCoverages)
  states?: string[];

  // File storage
  filePath?: string;
  downloadUrl?: string;

  // Status
  isActive?: boolean;

  // Audit Trail
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;               // User who created this form
  updatedBy?: string;               // User who last updated this form
  changeReason?: string;            // Reason for last change
}

/** @deprecated Use FormTemplate instead. Alias for backward compatibility. */
export type Form = FormTemplate;

/**
 * FormCoverageMapping represents the many-to-many relationship between forms and coverages.
 * This is the SINGLE SOURCE OF TRUTH for form-coverage relationships.
 *
 * Database Structure:
 * - Stored in: formCoverages/{mappingId}
 */
export interface FormCoverageMapping {
  id: string;
  formId: string;
  coverageId: string;
  productId: string;  // Denormalized for efficient querying

  // Mapping Metadata
  isPrimary?: boolean;  // Indicates primary form for coverage
  displayOrder?: number;  // Order for UI display
  notes?: string;  // Mapping-specific notes

  // State Applicability
  states?: string[];  // State-specific form-coverage mappings

  // Applicability Conditions
  applicabilityConditions?: {
    field: string;
    operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'between';
    value: string | number | boolean | [number, number];
  }[];

  // Versioning & Effective Dates
  version?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;

  // Audit Trail
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// State/Geography Types
// ============================================================================

export interface StateAvailability {
  id: string;
  productId: string;
  stateCode: string;
  stateName: string;
  isAvailable: boolean;
  effectiveDate?: Date | Timestamp;
  expirationDate?: Date | Timestamp;
  restrictions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Rules Types
// ============================================================================

/**
 * Rule Type - defines what the rule applies to
 */
export type RuleType = 'Product' | 'Coverage' | 'Forms' | 'Pricing';

/**
 * Rule Category - defines the functional category of the rule
 */
export type RuleCategory = 'Eligibility' | 'Pricing' | 'Compliance' | 'Coverage' | 'Forms';

/**
 * Rule Status - defines the current state of the rule
 */
export type RuleStatus = 'Active' | 'Inactive' | 'Draft' | 'Under Review' | 'Archived';

/**
 * Rule represents a business rule in the insurance product system.
 * Rules can apply to products, coverages, forms, or pricing.
 *
 * Database Structure:
 * - Stored in: rules/{ruleId}
 * - Linked to products via productId
 * - Linked to specific entities via targetId (when ruleType is not 'Product')
 */
export interface Rule {
  id: string;
  productId: string;

  // Rule Classification
  ruleType: RuleType;
  ruleCategory: RuleCategory;

  // Target Entity (optional - only for Coverage, Forms, Pricing rules)
  targetId?: string;  // coverageId, formId, or pricingStepId depending on ruleType

  // Rule Content
  name: string;
  condition: string;      // The condition that triggers the rule
  outcome: string;        // The result when the condition is met
  reference?: string;     // Reference to policy language, form section, etc.

  // Rule Properties
  proprietary?: boolean;  // Is this a proprietary/custom rule?
  status: RuleStatus;
  priority?: number;      // For rule execution order

  // Versioning & Effective Dates
  version?: number;
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;

  // State Applicability
  states?: string[];  // State-specific rules
  dependsOnRuleId?: string[];  // Rule dependencies

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
  changeReason?: string;
}



/**
 * Rule Template for quick rule creation
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  ruleCategory: RuleCategory;
  conditionTemplate: string;
  outcomeTemplate: string;
  isBuiltIn?: boolean;
  createdAt?: Timestamp | Date;
}

/**
 * Rule Validation Result
 */
export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

// ============================================================================
// Comprehensive State Applicability Types
// ============================================================================

/**
 * StateApplicability represents comprehensive state-specific information for products, coverages, and forms.
 * This is the SINGLE SOURCE OF TRUTH for state-specific data.
 *
 * Database Structure:
 * - Stored in: stateApplicability/{applicabilityId}
 * - Linked to products, coverages, or forms via entityId and entityType
 */
export interface StateApplicability {
  id: string;
  entityId: string;  // productId, coverageId, or formId
  entityType: 'product' | 'coverage' | 'form';
  productId: string;  // Denormalized for efficient querying

  // State Information
  state: string;  // State code (e.g., 'CA', 'NY')
  stateName: string;  // Full state name

  // Filing & Approval Status
  filingStatus?: 'pending' | 'filed' | 'approved' | 'rejected' | 'withdrawn';
  rateApprovalStatus?: 'pending' | 'approved' | 'denied' | 'conditional';
  complianceStatus?: 'compliant' | 'non-compliant' | 'under-review';

  // Effective Dates
  effectiveDate?: Timestamp | Date;
  expirationDate?: Timestamp | Date;

  // State-Specific Rules
  stateSpecificRules?: string[];  // Rule IDs that apply to this state
  stateSpecificForms?: string[];  // Form IDs specific to this state
  stateSpecificLimits?: string[];  // Limit IDs specific to this state
  stateSpecificDeductibles?: string[];  // Deductible IDs specific to this state

  // Regulatory Information
  regulatoryNotes?: string;
  filingNumber?: string;
  approvalDate?: Timestamp | Date;
  regulatoryAgency?: string;

  // Restrictions & Conditions
  restrictions?: string[];  // Any state-specific restrictions
  conditions?: string[];  // Any state-specific conditions

  // Subset Validation (for hierarchical entities)
  // When a coverage is state-specific, it must be a subset of product's states
  parentEntityId?: string;  // Reference to parent entity (e.g., productId for coverage state)
  isSubsetOf?: string[];    // State codes this must be a subset of
  validationStatus?: 'valid' | 'invalid' | 'pending-review';
  validationErrors?: string[];  // Errors if subset validation fails

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: number;
    requestId?: string;
    cached?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface TableColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string | number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  value: unknown;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T, E = Error> = Promise<{ data: T; error: null } | { data: null; error: E }>;

// ============================================================================
// Re-export Domain-Specific Types
// ============================================================================

// Pricing Types
export * from './pricing';