/**
 * Rating Engine Types
 * 
 * Defines types for the deterministic rating engine that actuaries trust.
 * Supports topological sorting, cycle detection, and full evaluation traces.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Step Types
// ============================================================================

/** Types of rating steps supported by the engine */
export type RatingStepType = 
  | 'input'        // Input from data dictionary field
  | 'constant'     // Fixed constant value
  | 'factor'       // Multiplier factor
  | 'tableLookup'  // Lookup from rating table
  | 'expression'   // Mathematical expression
  | 'minmax'       // Min/max capping
  | 'fee'          // Fixed fee or surcharge
  | 'conditional'; // Conditional logic

/** Rounding modes for step results */
export type RoundingMode = 
  | 'none'         // No rounding
  | 'up'           // Always round up (ceiling)
  | 'down'         // Always round down (floor)
  | 'nearest'      // Round to nearest (half up)
  | 'bankers'      // Banker's rounding (half to even)
  | 'truncate';    // Truncate decimal places

/** Status of a rate program version */
export type RateProgramVersionStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';

// ============================================================================
// Rate Program & Version
// ============================================================================

/** Rate program container */
export interface RateProgram {
  id: string;
  orgId: string;
  productId: string;
  name: string;
  description?: string;
  scope: 'product' | 'coverage' | 'state';
  scopeId?: string; // coverageId or stateCode if scoped
  status: 'active' | 'inactive';
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}

/** Versioned snapshot of a rate program */
export interface RateProgramVersion {
  id: string;
  rateProgramId: string;
  versionNumber: number;
  status: RateProgramVersionStatus;
  effectiveStart?: Timestamp | Date;
  effectiveEnd?: Timestamp | Date;
  createdAt: Timestamp | Date;
  createdBy: string;
  publishedAt?: Timestamp | Date;
  publishedBy?: string;
  /** Hash of steps for determinism verification */
  stepsHash?: string;
}

// ============================================================================
// Rating Step Definition
// ============================================================================

/** A single step in the rating algorithm */
export interface RatingStep {
  id: string;
  rateProgramVersionId: string;
  order: number;
  type: RatingStepType;
  name: string;
  description?: string;
  
  /** Output field code from Data Dictionary */
  outputFieldCode: string;
  
  /** Input field codes this step depends on */
  inputs: string[];
  
  /** Whether this step is enabled */
  enabled: boolean;
  
  // Type-specific configuration
  /** For 'constant' type: the constant value */
  constantValue?: number;
  
  /** For 'factor' type: the multiplier value or field code */
  factorValue?: number;
  factorFieldCode?: string;
  
  /** For 'tableLookup' type: table reference and lookup config */
  tableVersionId?: string;
  lookupDimensions?: TableLookupDimension[];
  
  /** For 'expression' type: the formula */
  expression?: string;
  
  /** For 'minmax' type: cap configuration */
  minValue?: number;
  maxValue?: number;
  minFieldCode?: string;
  maxFieldCode?: string;
  
  /** For 'fee' type: fee amount */
  feeAmount?: number;
  feeFieldCode?: string;
  
  /** For 'conditional' type: condition and branches */
  condition?: StepCondition;
  thenValue?: number;
  elseValue?: number;
  
  // Rounding configuration
  roundingMode: RoundingMode;
  roundingPrecision: number; // decimal places
  
  // State applicability
  states?: string[];
  allStates: boolean;
  
  // Metadata
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

/** Dimension configuration for table lookup */
export interface TableLookupDimension {
  dimensionName: string;
  fieldCode: string;
}

/** Condition for conditional steps */
export interface StepCondition {
  fieldCode: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'between';
  value: string | number | boolean | (string | number)[];
  valueEnd?: number; // For 'between' operator
}

// ============================================================================
// Evaluation Context & Results
// ============================================================================

/** Input context for rating evaluation */
export interface EvaluationContext {
  /** Input values keyed by field code */
  inputs: Record<string, string | number | boolean | null>;
  /** State code for state-specific steps */
  state?: string;
  /** Effective date for the calculation */
  effectiveDate: Date;
  /** Table data cache (tableVersionId -> table data) */
  tables?: Map<string, RatingTableData>;
}

/** Rating table data structure */
export interface RatingTableData {
  tableVersionId: string;
  dimensions: RatingTableDimension[];
  /** Values keyed by dimension value combination (e.g., "A-1-High" -> 1.25) */
  values: Record<string, number>;
}

/** Table dimension definition */
export interface RatingTableDimension {
  name: string;
  fieldCode: string;
  values: string[];
}

// ============================================================================
// Evaluation Trace
// ============================================================================

/** Trace entry for a single step evaluation */
export interface StepTraceEntry {
  stepId: string;
  stepName: string;
  stepType: RatingStepType;
  order: number;

  /** Input values used for this step */
  inputValues: Record<string, string | number | boolean | null>;

  /** Resolved/computed values during evaluation */
  resolvedValues: Record<string, string | number | boolean | null>;

  /** Output value produced */
  outputValue: number | null;
  outputFieldCode: string;

  /** Whether the step was applied */
  applied: boolean;

  /** Reason if step was skipped */
  skipReason?: string;

  /** For table lookups: the lookup key used */
  tableLookupKey?: string;

  /** For expressions: the evaluated expression */
  evaluatedExpression?: string;

  /** Rounding applied */
  preRoundingValue?: number;
  roundingMode?: RoundingMode;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Any warnings during evaluation */
  warnings?: string[];
}

/** Full evaluation result with trace */
export interface EvaluationResult {
  /** Whether evaluation succeeded */
  success: boolean;

  /** Final computed values keyed by field code */
  outputs: Record<string, number>;

  /** The final premium (if applicable) */
  finalPremium?: number;

  /** Step-by-step execution trace */
  trace: StepTraceEntry[];

  /** Errors encountered during evaluation */
  errors: EvaluationError[];

  /** Warnings encountered during evaluation */
  warnings: string[];

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Determinism hash for verification */
  resultHash: string;

  /** Metadata */
  evaluatedAt: Date;
  rateProgramVersionId: string;
  stepsHash: string;
}

/** Evaluation error */
export interface EvaluationError {
  code: string;
  message: string;
  stepId?: string;
  stepName?: string;
  fieldCode?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/** Result of validating a rate program for determinism */
export interface DeterminismValidationResult {
  isValid: boolean;
  errors: DeterminismError[];
  warnings: DeterminismWarning[];
  /** Dependency graph for visualization */
  dependencyGraph: DependencyNode[];
}

/** Determinism validation error */
export interface DeterminismError {
  code: 'CYCLE_DETECTED' | 'MISSING_INPUT' | 'UNDEFINED_FIELD' | 'INVALID_EXPRESSION' | 'TABLE_NOT_FOUND';
  message: string;
  stepIds?: string[];
  fieldCodes?: string[];
}

/** Determinism validation warning */
export interface DeterminismWarning {
  code: 'UNUSED_STEP' | 'REDUNDANT_CALCULATION' | 'POTENTIAL_OVERFLOW';
  message: string;
  stepId?: string;
}

/** Node in the dependency graph */
export interface DependencyNode {
  stepId: string;
  stepName: string;
  outputFieldCode: string;
  dependsOn: string[]; // stepIds
  dependedOnBy: string[]; // stepIds
  order: number;
}

// ============================================================================
// Test Harness Types
// ============================================================================

/** Test case for regression testing */
export interface RatingTestCase {
  id: string;
  name: string;
  description?: string;
  rateProgramVersionId: string;
  inputs: Record<string, string | number | boolean | null>;
  state?: string;
  expectedOutputs: Record<string, number>;
  expectedFinalPremium?: number;
  tolerance?: number; // For floating point comparison
  createdAt: Date;
  createdBy: string;
}

/** Test run result */
export interface TestRunResult {
  testCaseId: string;
  passed: boolean;
  actualOutputs: Record<string, number>;
  actualFinalPremium?: number;
  differences: TestDifference[];
  executionTimeMs: number;
  runAt: Date;
}

/** Difference between expected and actual */
export interface TestDifference {
  fieldCode: string;
  expected: number;
  actual: number;
  difference: number;
  withinTolerance: boolean;
}

