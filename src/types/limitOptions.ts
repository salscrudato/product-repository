/**
 * Limit Option Set Types
 * 
 * New data model for coverage-level limit configuration.
 * Supports multi-dimensional limits (split, occ+agg, etc.)
 * with structured applicability (states, perils, coverage parts).
 * 
 * Database Structure:
 * - products/{productId}/coverages/{coverageId}/limitOptionSets/{setId}
 * - products/{productId}/coverages/{coverageId}/limitOptionSets/{setId}/options/{optionId}
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Limit Structure Types
// ============================================================================

/**
 * LimitStructure defines the shape of limit options for a coverage
 * Note: 'sublimit' was removed as a primary structure - sublimits are now
 * a toggle/section under any primary structure via sublimitsEnabled flag
 */
export type LimitStructure =
  | 'single'     // Single amount (e.g., $1,000,000)
  | 'occAgg'     // Occurrence + Aggregate pair (e.g., $1M/$2M)
  | 'claimAgg'   // Each Claim + Aggregate (e.g., $1M/$3M) - for claims-made coverages
  | 'split'      // Split limits (e.g., 100/300/100 for BI per person/BI per occ/PD)
  | 'csl'        // Combined Single Limit
  | 'scheduled'  // Per-item / scheduled limits (like inland marine)
  | 'custom';    // Advanced/custom configuration

/**
 * LimitBasis defines what the limit applies to
 * Used in conjunction with LimitStructure
 *
 * NOTE: The basis captures the insurance semantics (what the limit applies to),
 * while the LimitStructure captures the shape (single vs paired vs split).
 */
export type LimitBasis =
  | 'perOccurrence'   // Per occurrence/per event - common for GL, Property
  | 'perClaim'        // Per claim (claims-made) - common for E&O, D&O, Cyber
  | 'perAccident'     // Per accident - common for Auto liability
  | 'perPerson'       // Per person - common for BI component
  | 'perLocation'     // Per location - common for Property
  | 'perItem'         // Per scheduled item - common for Inland Marine
  | 'policyTerm'      // Policy term aggregate
  | 'annual'          // Annual aggregate
  | 'lifetime'        // Lifetime aggregate
  | 'other';          // Other (custom description) - requires otherLabel

/**
 * Human-readable labels for LimitBasis values
 */
export const LIMIT_BASIS_LABELS: Record<LimitBasis, string> = {
  perOccurrence: 'Per Occurrence',
  perClaim: 'Per Claim',
  perAccident: 'Per Accident',
  perPerson: 'Per Person',
  perLocation: 'Per Location',
  perItem: 'Per Item',
  policyTerm: 'Policy Term',
  annual: 'Annual',
  lifetime: 'Lifetime',
  other: 'Other',
};

/**
 * Default split component bases for Auto Liability
 * Used when no component bases are explicitly configured
 */
export const DEFAULT_SPLIT_COMPONENT_BASES: Record<string, LimitBasis> = {
  biPerPerson: 'perPerson',
  biPerAccident: 'perAccident',
  biPerOccurrence: 'perOccurrence',
  pd: 'perAccident',
};

/**
 * Basis configuration for a limit structure
 * Captures the insurance semantics (what limits apply to) separately from structure
 */
export interface LimitBasisConfig {
  /** Primary limit basis (for single/csl: the one basis, for occAgg: occurrence basis) */
  primaryBasis: LimitBasis;
  /** Aggregate basis (for occAgg/claimAgg) */
  aggregateBasis?: LimitBasis;
  /** Custom description if primaryBasis or aggregateBasis is 'other' */
  customBasisDescription?: string;
  /**
   * For split limits - basis per component
   * Keys match the component keys (e.g., 'biPerPerson', 'biPerAccident', 'pd')
   */
  splitComponentBases?: Record<string, LimitBasis>;
  /**
   * For scheduled/per-item limits - basis for each item
   * @default 'perItem'
   */
  itemBasis?: LimitBasis;
  /**
   * For scheduled limits with a total cap - basis for the cap
   * @default 'policyTerm'
   */
  scheduleCapBasis?: LimitBasis;
}

/**
 * Sublimit entry for when sublimits are enabled
 */
export interface SublimitEntry {
  id: string;
  /** Display label (e.g., "Theft Sublimit") */
  label: string;
  /** Amount for this sublimit */
  amount: number;
  /** What this sublimit applies to (e.g., "Theft", "Water Damage", "Earthquake") */
  appliesTo: string;
  /** Optional peril or category tag */
  perilTag?: string;
  /** Whether this is enabled */
  isEnabled: boolean;
  /** Display order */
  displayOrder: number;
}

/**
 * Selection mode for limit options
 */
export type LimitSelectionMode = 'single' | 'multi';

// ============================================================================
// Applicability Types (Structured, not free-text)
// ============================================================================

/**
 * Common coverage parts for applicability
 */
export type CoveragePart = 
  | 'Building'
  | 'BPP'           // Business Personal Property
  | 'BI'            // Business Income / Bodily Injury (context-dependent)
  | 'EE'            // Extra Expense
  | 'Contents'
  | 'Equipment'
  | 'Inventory'
  | 'Stock'
  | 'Improvements'
  | 'All';

/**
 * Common loss types
 */
export type LossType = 
  | 'BodilyInjury'
  | 'PropertyDamage'
  | 'MedicalPayments'
  | 'PersonalInjury'
  | 'AdvertisingInjury'
  | 'ProductsCompletedOps'
  | 'All';

/**
 * Common perils
 */
export type Peril = 
  | 'Fire'
  | 'Lightning'
  | 'WindHail'
  | 'Water'
  | 'Theft'
  | 'Vandalism'
  | 'Flood'
  | 'Earthquake'
  | 'AllRisk'
  | 'NamedPerils';

/**
 * Structured applicability for limit options
 */
export interface LimitApplicability {
  /** State codes where this option applies (empty = all states) */
  states?: string[];
  /** Whether this applies to all states */
  allStates?: boolean;
  /** Coverage parts this applies to */
  coverageParts?: CoveragePart[];
  /** Loss types this applies to */
  lossTypes?: LossType[];
  /** Perils this applies to */
  perils?: Peril[];
  /** Custom tags for additional categorization */
  customTags?: string[];
}

// ============================================================================
// Display Format Types
// ============================================================================

export type DisplayFormat = 
  | 'currency'           // $1,000,000
  | 'currencyPair'       // $1,000,000 / $2,000,000
  | 'splitNotation'      // 100/300/100
  | 'currencyWithLabel'  // $50,000 Sublimit – Theft
  | 'custom';            // User-defined

export interface LimitDisplayConfig {
  format?: DisplayFormat;
  /** Custom format template (e.g., "{amount1} / {amount2}") */
  customTemplate?: string;
  /** Allow manual override of generated display */
  allowOverride?: boolean;
  /** Manually overridden display value */
  overrideValue?: string;
}

// ============================================================================
// Global Constraints
// ============================================================================

export interface LimitConstraints {
  min?: number;
  max?: number;
  /** Allowed increments (e.g., [25000, 50000, 100000]) */
  increments?: number[];
  /** Require amount to be a multiple of this value */
  stepSize?: number;
}

// ============================================================================
// Split Limit Component
// ============================================================================

/**
 * Component of a split limit (e.g., BI per person, BI per accident, PD)
 */
export interface SplitLimitComponent {
  key: string;       // Unique key (e.g., 'biPerPerson')
  label: string;     // Display label (e.g., 'BI Per Person')
  amount: number;
  order: number;     // Display order
}

/**
 * Preset split limit configurations for common use cases
 */
export const SPLIT_LIMIT_PRESETS = {
  autoLiability: [
    { key: 'biPerPerson', label: 'BI Per Person', order: 0 },
    { key: 'biPerAccident', label: 'BI Per Accident', order: 1 },
    { key: 'pd', label: 'Property Damage', order: 2 },
  ],
  bodilyInjury: [
    { key: 'biPerPerson', label: 'Per Person', order: 0 },
    { key: 'biPerOccurrence', label: 'Per Occurrence', order: 1 },
  ],
} as const;

// ============================================================================
// Limit Option Value Types (Discriminated Union)
// ============================================================================

/** Single limit value */
export interface SingleLimitValue {
  structure: 'single';
  amount: number;
}

/** Occurrence + Aggregate pair */
export interface OccAggLimitValue {
  structure: 'occAgg';
  perOccurrence: number;
  aggregate: number;
}

/** Each Claim + Aggregate pair (for claims-made coverages like E&O, D&O, Cyber) */
export interface ClaimAggLimitValue {
  structure: 'claimAgg';
  perClaim: number;
  aggregate: number;
}

/** Split limits with multiple components */
export interface SplitLimitValue {
  structure: 'split';
  components: SplitLimitComponent[];
}

/** Combined Single Limit */
export interface CSLLimitValue {
  structure: 'csl';
  amount: number;
}

/** Sublimit value */
export interface SublimitValue {
  structure: 'sublimit';
  amount: number;
  /** Reference to parent option */
  parentOptionId?: string;
  /** Tag for what this sublimit applies to (e.g., 'Theft', 'Water Damage') */
  sublimitTag?: string;
}

/** Scheduled/per-item limit */
export interface ScheduledLimitValue {
  structure: 'scheduled';
  perItemMin?: number;
  perItemMax?: number;
  totalCap?: number;
}

/** Custom limit value for advanced cases */
export interface CustomLimitValue {
  structure: 'custom';
  /** Flexible key-value storage */
  values: Record<string, number | string>;
  /** Description of the custom structure */
  description?: string;
}

/** Union type for all limit values */
export type LimitOptionValue =
  | SingleLimitValue
  | OccAggLimitValue
  | ClaimAggLimitValue
  | SplitLimitValue
  | CSLLimitValue
  | ScheduledLimitValue
  | CustomLimitValue;

/**
 * @deprecated Use sublimitsEnabled + sublimits[] on CoverageLimitOptionSet instead
 * Kept for backward compatibility during migration
 * SublimitValue is already exported from its interface definition above.
 */

// ============================================================================
// Coverage Limit Option (Individual selectable option)
// ============================================================================

/**
 * Base fields common to all limit options
 */
export interface LimitOptionBase {
  id: string;
  /** Display label (auto-generated or user-defined) */
  label: string;
  /** Whether this is the default selection */
  isDefault: boolean;
  /** Whether this option is enabled/active */
  isEnabled: boolean;
  /** Display order in the option list */
  displayOrder: number;
  /** Applicability constraints */
  applicability?: LimitApplicability;
  /** Per-option constraints (overrides set-level) */
  constraints?: LimitConstraints;
  /** Computed display value */
  displayValue?: string;
  /** Timestamps */
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * Complete Limit Option combining base + value
 * Stored in: limitOptionSets/{setId}/options/{optionId}
 */
export type CoverageLimitOption = LimitOptionBase & LimitOptionValue;

// ============================================================================
// Coverage Limit Option Set (Container for options)
// ============================================================================

/**
 * CoverageLimitOptionSet defines the limit configuration for a coverage
 * Stored in: products/{productId}/coverages/{coverageId}/limitOptionSets/{setId}
 */
export interface CoverageLimitOptionSet {
  id: string;
  coverageId: string;
  productId: string;

  /** Limit structure for this set */
  structure: LimitStructure;

  /** Name of this option set (default: "Primary Limits") */
  name: string;

  /** Whether at least one option must be selected */
  isRequired?: boolean;

  /** Single or multi-select */
  selectionMode: LimitSelectionMode;

  /** Display configuration */
  display?: LimitDisplayConfig;

  /** Set-level constraints applied to all options */
  globalConstraints?: LimitConstraints;

  /** Split limit component definitions (for split structure) */
  splitComponents?: Omit<SplitLimitComponent, 'amount'>[];

  /**
   * Limit basis configuration
   * Specifies what the limits apply to (per occurrence, per claim, etc.)
   */
  basisConfig?: LimitBasisConfig;

  /**
   * Whether sublimits are enabled for this option set
   * When true, shows sublimits section for peril/category-specific caps
   */
  sublimitsEnabled?: boolean;

  /**
   * Sublimit entries when sublimitsEnabled is true
   * These are peril/category-specific caps within the primary limit
   */
  sublimits?: SublimitEntry[];

  /** Feature flag for UI mode */
  useLegacyUI?: boolean;

  /** Timestamps */
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Legacy Adapter Types
// ============================================================================

/**
 * Result of migrating legacy CoverageLimit to new option set
 */
export interface LegacyMigrationResult {
  optionSet: CoverageLimitOptionSet;
  options: CoverageLimitOption[];
  /** Warnings about data that couldn't be fully migrated */
  warnings: string[];
  /** Whether migration detected the structure automatically */
  structureInferred: boolean;
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * Template option type — relaxed to allow any limit value shape
 * without discriminated-union excess-property checks.
 */
export type LimitOptionTemplateEntry = Omit<LimitOptionBase, 'id' | 'createdAt' | 'updatedAt'> & Record<string, unknown>;

export interface LimitOptionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Property' | 'Liability' | 'Auto' | 'WC' | 'Specialty';
  structure: LimitStructure;
  options: LimitOptionTemplateEntry[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface LimitOptionSetValidationResult {
  isValid: boolean;
  errors: LimitValidationError[];
  warnings: LimitValidationWarning[];
}

export interface LimitValidationError {
  field: string;
  optionId?: string;
  message: string;
  code: string;
}

export interface LimitValidationWarning {
  field: string;
  optionId?: string;
  message: string;
  code: string;
}

