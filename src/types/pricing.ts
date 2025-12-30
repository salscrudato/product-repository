/**
 * Pricing Engine Types
 * Defines types for pricing steps, rules, and calculations
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Value Types & Enums
// ============================================================================

/** How the step value is interpreted in calculations */
export type StepValueType = 'multiplier' | 'percentage' | 'flat' | 'table' | 'expression';

/** The scope at which a step applies */
export type StepScope = 'policy' | 'coverage' | 'location' | 'item';

/** Rounding modes for step results */
export type StepRoundingMode = 'none' | 'up' | 'down' | 'nearest' | 'bankers';

/** Template types for quick step creation */
export type StepTemplate =
  | 'base-rate'
  | 'exposure-basis'
  | 'factor'
  | 'modifier'
  | 'fee-surcharge'
  | 'minimum-premium'
  | 'rounding';

/** Step groups for UI organization */
export type StepGroup =
  | 'base-premium'
  | 'modifiers-factors'
  | 'fees-minimums'
  | 'final-adjustments'
  | 'ungrouped';

// ============================================================================
// Enhanced Rating Step
// ============================================================================

/**
 * Enhanced RatingStep with full configuration options
 * Backward compatible - new fields are optional
 */
export interface EnhancedRatingStep {
  id: string;
  stepType: 'factor' | 'operand';
  stepName?: string;
  value?: number;
  operand?: string;
  coverages?: string[];
  states?: string[];
  table?: string;
  rounding?: string;
  order: number;

  // NEW: Value type configuration
  /** How the value is interpreted (multiplier × 1.10, percentage +10%, flat $250) */
  valueType?: StepValueType;

  // NEW: Applicability scope
  /** At what level this step applies */
  scope?: StepScope;

  // NEW: Controls
  /** Whether step is enabled (disabled steps are skipped and visually muted) */
  enabled?: boolean;

  /** Notes/description for auditability */
  notes?: string;

  // NEW: Caps
  /** Minimum value cap for step result */
  minCap?: number;

  /** Maximum value cap for step result */
  maxCap?: number;

  // NEW: Step-level rounding
  /** Rounding mode for this step's result */
  stepRoundingMode?: StepRoundingMode;

  // NEW: Template origin
  /** Template this step was created from */
  template?: StepTemplate;

  // NEW: Grouping
  /** UI group for organization */
  group?: StepGroup;

  // NEW: Expression for calculated steps
  /** Expression formula for 'expression' valueType (e.g., 'Limit / 100') */
  expression?: string;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ============================================================================
// Scenario & Test/Debug Types
// ============================================================================

/**
 * Scenario inputs for testing/debugging pricing calculations
 */
export interface ScenarioInputs {
  /** Selected state for calculation */
  state?: string;

  /** Selected coverage or 'all' */
  coverage?: string | 'all';

  /** Building limit for property coverage */
  buildingLimit?: number;

  /** Contents limit */
  contentsLimit?: number;

  /** Deductible amount */
  deductible?: number;

  /** Territory code */
  territory?: string;

  /** Additional exposure inputs */
  [key: string]: string | number | undefined;
}

/**
 * Single step in the calculation trace
 */
export interface CalculationTraceStep {
  /** Step number (1-based, factor steps only) */
  stepNum: number;

  /** Step ID for linking to builder */
  stepId: string;

  /** Step name */
  name: string;

  /** Operation display (e.g., '× 1.10', '+ $250') */
  operation: string;

  /** Input value for this step */
  inputValue: number;

  /** Running total after this step */
  runningTotal: number;

  /** Impact in dollars */
  impactDollar: number;

  /** Impact as percentage of final premium */
  impactPercent: number;

  /** Whether this step was applied (false for disabled or non-applicable) */
  applied: boolean;

  /** Reason if not applied */
  skipReason?: string;
}

/**
 * Full calculation result with trace
 */
export interface CalculationResult {
  /** Final calculated premium */
  finalPremium: number;

  /** Premium before rounding */
  preRoundedPremium: number;

  /** Whether minimum premium was applied */
  minimumApplied: boolean;

  /** Minimum premium value if applied */
  minimumPremiumValue?: number;

  /** Step-by-step execution trace */
  trace: CalculationTraceStep[];

  /** Scenario context used for calculation */
  scenarioContext?: ScenarioInputs;

  /** Calculation metadata */
  calculatedAt: Date;
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  /** Unique issue ID */
  id: string;

  /** Error or warning */
  severity: ValidationSeverity;

  /** Issue message */
  message: string;

  /** Step ID that has the issue (for linking) */
  stepId?: string;

  /** Issue code for categorization */
  code: string;
}

// ============================================================================
// Data Dictionary Field
// ============================================================================

/**
 * DataDictionaryField represents a field used in pricing inputs and calculations
 * Stored in: products/{productId}/dataDictionary/{fieldId}
 */
export interface DataDictionaryField {
  id: string;
  productId: string;

  // Field Identification
  /** Unique field name (e.g., 'buildingSquareFootage', 'protectionClass') */
  name: string;
  /** Display label for UI (e.g., 'Building Square Footage') */
  label: string;
  /** Field description */
  description?: string;

  // Type & Validation
  /** Field data type */
  type: 'number' | 'string' | 'boolean' | 'enum' | 'date';
  /** Enum options if type='enum' */
  enumOptions?: string[];
  /** Minimum value for numeric fields */
  min?: number;
  /** Maximum value for numeric fields */
  max?: number;
  /** Whether field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: string | number | boolean;

  // Display & Organization
  /** Category for grouping in UI (e.g., 'Building', 'Operations', 'Claims') */
  category?: string;
  /** Display order within category */
  displayOrder?: number;

  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/**
 * RatingInput represents user-provided input for rating calculation
 */
export interface RatingInput {
  [fieldName: string]: string | number | boolean | undefined;
}

/**
 * RatingResult represents the result of a rating calculation
 */
export interface RatingResult {
  /** Premium breakdown by step */
  stepBreakdown: Record<string, number>;
  /** Total premium */
  total: number;
  /** Calculation metadata */
  metadata?: {
    calculatedAt?: Date;
    productId?: string;
    coverageId?: string;
    inputsUsed?: RatingInput;
  };
}

