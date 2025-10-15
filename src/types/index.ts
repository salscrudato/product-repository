/**
 * Core Type Definitions for Insurance Product Hub
 * Centralized type definitions for the entire application
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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

// Exclusion Types
export type ExclusionType =
  | 'named'              // Named peril or situation excluded
  | 'general'            // Broad category exclusion
  | 'conditional'        // Excluded unless conditions met
  | 'absolute'           // Cannot be bought back
  | 'buyback';           // Can be bought back via endorsement

// Condition Types
export type ConditionType =
  | 'eligibility'        // Who/what is eligible for coverage
  | 'claims'             // Claims handling requirements
  | 'duties'             // Insured's duties after loss
  | 'general'            // General policy conditions
  | 'suspension'         // Conditions that suspend coverage
  | 'cancellation';      // Cancellation conditions

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

  // Behavior
  isDefault?: boolean;
  isRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;

  // Relationships
  parentLimitId?: string;  // For sublimits that reduce from parent

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * CoverageExclusion represents an exclusion for a coverage
 */
export interface CoverageExclusion {
  id: string;
  name: string;
  description: string;
  type: ExclusionType;

  // Reference
  reference?: string;         // Form number or section reference
  formId?: string;            // Link to form document

  // Classification
  isStandard?: boolean;       // ISO standard vs. proprietary
  isAbsolute?: boolean;       // Cannot be bought back
  buybackEndorsementId?: string;  // Endorsement that removes this exclusion

  // Applicability
  appliesTo?: string[];       // Specific situations or perils

  // Metadata
  createdAt?: Timestamp | Date;
}

/**
 * CoverageCondition represents a condition for a coverage
 */
export interface CoverageCondition {
  id: string;
  name: string;
  description: string;
  type: ConditionType;

  // Behavior
  isRequired?: boolean;       // Must be met for coverage
  isSuspending?: boolean;     // Suspends coverage if not met

  // Reference
  reference?: string;         // Form number or section reference
  formId?: string;            // Link to form document

  // Metadata
  createdAt?: Timestamp | Date;
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
  category?: 'base' | 'endorsement' | 'optional';
  type?: string;
  isOptional?: boolean;

  // ========== Coverage Scope ==========
  scopeOfCoverage?: string;
  perilsCovered?: string[];

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
  basePremium?: number;
  premiumBasis?: PremiumBasis;
  ratePerUnit?: number;
  minimumPremium?: number;
  premium?: number;  // Deprecated: use basePremium instead

  // ========== Coinsurance & Participation ==========
  coinsurancePercentage?: number;  // 80, 90, 100
  hasCoinsurancePenalty?: boolean;
  insuredParticipation?: number;   // Percentage insured pays (copay)

  // ========== Coverage Triggers & Periods ==========
  coverageTrigger?: CoverageTrigger;
  waitingPeriod?: number;
  waitingPeriodUnit?: 'days' | 'months';
  allowRetroactiveDate?: boolean;
  extendedReportingPeriod?: number;  // Months

  // ========== Valuation ==========
  valuationMethod?: ValuationMethod;
  depreciationMethod?: DepreciationMethod;

  // ========== Territory ==========
  territoryType?: TerritoryType;
  states?: string[];  // State availability
  excludedTerritories?: string[];
  includedTerritories?: string[];

  // ========== Exclusions & Conditions ==========
  exclusions?: CoverageExclusion[];
  conditions?: CoverageCondition[];

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

  // ========== Metadata ==========
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  metadata?: Record<string, unknown>;
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
  category?: 'base' | 'endorsement' | 'optional';
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
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface PricingCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'between';
  value: string | number | boolean | [number, number];
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

  // Versioning
  version?: string;
  effectiveDate?: string | Timestamp | Date;

  // State availability (informational - actual coverage availability via formCoverages)
  states?: string[];

  // File storage
  filePath?: string;
  downloadUrl?: string;

  // Status
  isActive?: boolean;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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
  createdAt?: Timestamp | Date;
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

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in' | 'between';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'set' | 'calculate' | 'validate' | 'reject' | 'approve';
  target: string;
  value?: unknown;
  message?: string;
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

