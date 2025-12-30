/**
 * Deductible Option Set Types
 * 
 * Data model for coverage-level deductible configuration.
 * Supports flat/$, %, min/max, waiting-period, and peril-specific deductibles.
 * 
 * Database Structure:
 * - products/{productId}/coverages/{coverageId}/deductibleOptionSets/{setId}
 * - products/{productId}/coverages/{coverageId}/deductibleOptionSets/{setId}/options/{optionId}
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Deductible Structure Types
// ============================================================================

/**
 * DeductibleStructure defines the type of deductible option
 */
export type DeductibleStructure =
  | 'flat'              // Fixed dollar amount
  | 'percentage'        // Percentage of insured value
  | 'percentMinMax'     // Percentage with min/max bounds
  | 'waitingPeriod'     // Time-based deductible (days/hours)
  | 'perilSpecific'     // Different deductibles by peril (AOP, wind/hail, EQ)
  | 'disappearing'      // Reduces as loss increases
  | 'franchise'         // All or nothing based on threshold
  | 'aggregate'         // Annual aggregate deductible
  | 'custom';           // Advanced/custom configuration

/**
 * Peril types for peril-specific deductibles
 */
export type DeductiblePeril =
  | 'AOP'           // All Other Perils
  | 'WindHail'      // Wind/Hail
  | 'Earthquake'    // Earthquake
  | 'Flood'         // Flood
  | 'Fire'          // Fire
  | 'Theft'         // Theft
  | 'Water'         // Water damage
  | 'NamedStorm';   // Named Storm / Hurricane

/**
 * Waiting period units
 */
export type WaitingPeriodUnit = 'hours' | 'days' | 'weeks' | 'months';

/**
 * Selection mode for deductible options
 */
export type DeductibleSelectionMode = 'single' | 'multi';

// ============================================================================
// Applicability Types
// ============================================================================

export interface DeductibleApplicability {
  /** State codes where this option applies (empty = all states) */
  states?: string[];
  /** Whether this applies to all states */
  allStates?: boolean;
  /** Perils this applies to */
  perils?: DeductiblePeril[];
  /** Coverage parts this applies to */
  coverageParts?: string[];
  /** Custom tags for additional categorization */
  customTags?: string[];
}

// ============================================================================
// Deductible Option Value Types (Discriminated Union)
// ============================================================================

/** Flat dollar deductible */
export interface FlatDeductibleValue {
  structure: 'flat';
  amount: number;
}

/** Percentage deductible */
export interface PercentageDeductibleValue {
  structure: 'percentage';
  percentage: number; // e.g., 2 for 2%
  basis?: 'TIV' | 'loss' | 'limit' | 'buildingValue';
}

/** Percentage with min/max bounds */
export interface PercentMinMaxDeductibleValue {
  structure: 'percentMinMax';
  percentage: number;
  basis?: 'TIV' | 'loss' | 'limit' | 'buildingValue';
  minimumAmount: number;
  maximumAmount: number;
}

/** Waiting period deductible */
export interface WaitingPeriodDeductibleValue {
  structure: 'waitingPeriod';
  duration: number;
  unit: WaitingPeriodUnit;
}

/** Peril-specific deductible with multiple amounts */
export interface PerilSpecificDeductibleValue {
  structure: 'perilSpecific';
  perilDeductibles: Array<{
    peril: DeductiblePeril;
    amount?: number;
    percentage?: number;
    minimumAmount?: number;
    maximumAmount?: number;
  }>;
}

/** Disappearing deductible */
export interface DisappearingDeductibleValue {
  structure: 'disappearing';
  schedule: Array<{
    lossThreshold: number;
    deductibleAmount: number;
  }>;
}

/** Franchise deductible */
export interface FranchiseDeductibleValue {
  structure: 'franchise';
  threshold: number; // If loss >= threshold, no deductible; if < threshold, full loss retained
}

/** Aggregate annual deductible */
export interface AggregateDeductibleValue {
  structure: 'aggregate';
  annualAmount: number;
  perClaimMaximum?: number;
}

/** Custom deductible */
export interface CustomDeductibleValue {
  structure: 'custom';
  values: Record<string, number | string>;
  description?: string;
}

/** Union type for all deductible values */
export type DeductibleOptionValue =
  | FlatDeductibleValue
  | PercentageDeductibleValue
  | PercentMinMaxDeductibleValue
  | WaitingPeriodDeductibleValue
  | PerilSpecificDeductibleValue
  | DisappearingDeductibleValue
  | FranchiseDeductibleValue
  | AggregateDeductibleValue
  | CustomDeductibleValue;

// ============================================================================
// Coverage Deductible Option (Individual selectable option)
// ============================================================================

export interface DeductibleOptionBase {
  id: string;
  label: string;
  isDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  applicability?: DeductibleApplicability;
  displayValue?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type CoverageDeductibleOption = DeductibleOptionBase & DeductibleOptionValue;

// ============================================================================
// Coverage Deductible Option Set (Container for options)
// ============================================================================

/**
 * CoverageDeductibleOptionSet defines the deductible configuration for a coverage
 * Stored in: products/{productId}/coverages/{coverageId}/deductibleOptionSets/{setId}
 */
export interface CoverageDeductibleOptionSet {
  id: string;
  coverageId: string;
  productId: string;

  /** Deductible structure for this set */
  structure: DeductibleStructure;

  /** Name of this option set (default: "Primary Deductible") */
  name: string;

  /** Whether at least one option must be selected */
  isRequired?: boolean;

  /** Single or multi-select */
  selectionMode: DeductibleSelectionMode;

  /** Default peril this set applies to (for peril-specific) */
  defaultPeril?: DeductiblePeril;

  /** Feature flag for UI mode */
  useLegacyUI?: boolean;

  /** Timestamps */
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Template Types
// ============================================================================

export interface DeductibleOptionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Property' | 'Liability' | 'Auto' | 'WC' | 'Specialty';
  structure: DeductibleStructure;
  options: Omit<CoverageDeductibleOption, 'id' | 'createdAt' | 'updatedAt'>[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface DeductibleOptionSetValidationResult {
  isValid: boolean;
  errors: DeductibleValidationError[];
  warnings: DeductibleValidationWarning[];
}

export interface DeductibleValidationError {
  field: string;
  optionId?: string;
  message: string;
  code: string;
}

export interface DeductibleValidationWarning {
  field: string;
  optionId?: string;
  message: string;
  code: string;
}

// ============================================================================
// Migration Types
// ============================================================================

export interface DeductibleLegacyMigrationResult {
  optionSet: CoverageDeductibleOptionSet;
  options: CoverageDeductibleOption[];
  warnings: string[];
  structureInferred: boolean;
}

// ============================================================================
// Common Deductible Templates
// ============================================================================

export const PROPERTY_DEDUCTIBLE_TEMPLATES: Partial<CoverageDeductibleOption>[] = [
  { label: '$500', structure: 'flat', amount: 500, isDefault: false, isEnabled: true, displayOrder: 0 },
  { label: '$1,000', structure: 'flat', amount: 1000, isDefault: true, isEnabled: true, displayOrder: 1 },
  { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 2 },
  { label: '$5,000', structure: 'flat', amount: 5000, isDefault: false, isEnabled: true, displayOrder: 3 },
  { label: '$10,000', structure: 'flat', amount: 10000, isDefault: false, isEnabled: true, displayOrder: 4 },
];

export const GL_DEDUCTIBLE_TEMPLATES: Partial<CoverageDeductibleOption>[] = [
  { label: '$0', structure: 'flat', amount: 0, isDefault: true, isEnabled: true, displayOrder: 0 },
  { label: '$500', structure: 'flat', amount: 500, isDefault: false, isEnabled: true, displayOrder: 1 },
  { label: '$1,000', structure: 'flat', amount: 1000, isDefault: false, isEnabled: true, displayOrder: 2 },
  { label: '$2,500', structure: 'flat', amount: 2500, isDefault: false, isEnabled: true, displayOrder: 3 },
];

export const WIND_HAIL_DEDUCTIBLE_TEMPLATES: Partial<CoverageDeductibleOption>[] = [
  {
    label: '1% of TIV ($1K min)',
    structure: 'percentMinMax',
    percentage: 1,
    basis: 'TIV',
    minimumAmount: 1000,
    maximumAmount: 100000,
    isDefault: false,
    isEnabled: true,
    displayOrder: 0,
    applicability: { perils: ['WindHail'] }
  },
  {
    label: '2% of TIV ($2.5K min)',
    structure: 'percentMinMax',
    percentage: 2,
    basis: 'TIV',
    minimumAmount: 2500,
    maximumAmount: 250000,
    isDefault: true,
    isEnabled: true,
    displayOrder: 1,
    applicability: { perils: ['WindHail'] }
  },
  {
    label: '5% of TIV ($5K min)',
    structure: 'percentMinMax',
    percentage: 5,
    basis: 'TIV',
    minimumAmount: 5000,
    maximumAmount: 500000,
    isDefault: false,
    isEnabled: true,
    displayOrder: 2,
    applicability: { perils: ['WindHail'] }
  },
];

export const WC_DEDUCTIBLE_TEMPLATES: Partial<CoverageDeductibleOption>[] = [
  { label: 'None (Statutory)', structure: 'flat', amount: 0, isDefault: true, isEnabled: true, displayOrder: 0 },
];

