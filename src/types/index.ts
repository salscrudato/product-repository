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
export type CoverageTrigger = 'occurrence' | 'claimsMade' | 'hybrid';

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
  coinsurancePercentage?: number;  // 80, 90, 100
  hasCoinsurancePenalty?: boolean;
  insuredParticipation?: number;   // Percentage insured pays (copay)
  coinsuranceWaiver?: boolean;     // Whether coinsurance can be waived
  coinsuranceMinimum?: number;     // Minimum coinsurance percentage

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
  states?: string[];  // State availability
  excludedTerritories?: string[];
  includedTerritories?: string[];

  // ========== Endorsement Metadata ==========
  modifiesCoverageId?: string;      // Which coverage this endorsement modifies
  endorsementType?: EndorsementType;
  supersedes?: string[];            // Coverage IDs this replaces

  // ========== Underwriting ==========
  requiresUnderwriterApproval?: boolean;
  eligibilityCriteria?: string[];
  prohibitedClasses?: string[];     // Business classes that can't buy this
  requiredCoverages?: string[];     // Must be purchased with these
  incompatibleCoverages?: string[]; // Can't be purchased with these

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

/**
 * @deprecated SubCoverage is now just a Coverage with parentCoverageId set.
 * Use Coverage interface instead and filter by parentCoverageId.
 * This interface is kept for backward compatibility only.
 */
export interface SubCoverage {
  id: string;
  parentCoverageId: string;  // Renamed from coverageId for clarity
  productId: string;
  name: string;
  description?: string;
  limits?: string[];
  deductibles?: string[];
  premium?: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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
  description?: string;

  // Execution
  /** Order in which this step executes (0, 1, 2, ...) */
  order: number;
  /** Scope of this step: 'product' applies to all coverages, 'coverage' applies to specific coverage */
  scope: 'product' | 'coverage';
  /** Coverage ID when scope='coverage' */
  targetId?: string;

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
 * @deprecated BusinessRule is being replaced by the simpler Rule interface.
 * This interface represents a more complex rule structure with conditions/actions arrays.
 * Kept for backward compatibility only.
 */
export interface BusinessRule {
  id: string;
  productId: string;
  name: string;
  description?: string;
  ruleType: 'eligibility' | 'underwriting' | 'validation' | 'calculation';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority?: number;
  isActive?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * @deprecated Part of deprecated BusinessRule interface
 */
export interface RuleCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in' | 'between';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * @deprecated Part of deprecated BusinessRule interface
 */
export interface RuleAction {
  type: 'set' | 'calculate' | 'validate' | 'reject' | 'approve';
  target: string;
  value?: unknown;
  message?: string;
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
// Audit Log Types
// ============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ARCHIVE' | 'RESTORE';

export interface AuditLogEntry {
  id: string;
  entityType: 'Product' | 'Coverage' | 'Form' | 'Rule' | 'PricingStep' | 'StateApplicability';
  entityId: string;
  parentId?: string;  // For nested entities (e.g., productId for coverage)

  // Action Details
  action: AuditAction;
  userId: string;
  userEmail?: string;
  timestamp: Timestamp | Date;

  // Change Details
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];

  // Context
  reason?: string;
  ipAddress?: string;
  userAgent?: string;

  // Metadata
  metadata?: Record<string, unknown>;
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

