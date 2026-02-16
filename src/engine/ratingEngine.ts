/**
 * Deterministic Rating Engine
 * 
 * A trustworthy rating engine for actuaries that guarantees:
 * - Same inputs + same published versions => identical premium and trace every time
 * - Topological sorting with cycle detection
 * - Full evaluation trace for auditability
 * - Consistent rounding rules
 */

import {
  RatingStep,
  RatingStepType,
  RoundingMode,
  EvaluationContext,
  EvaluationResult,
  EvaluationError,
  StepTraceEntry,
  DeterminismValidationResult,
  DeterminismError,
  DeterminismWarning,
  DependencyNode,
  RatingTableData,
} from '../types/ratingEngine';
import { createHash, hashSteps, hashInputs, hashOutputs, combineHashes } from './hashUtils';

// ============================================================================
// Topological Sort & Cycle Detection
// ============================================================================

interface TopologicalSortResult {
  sorted: RatingStep[];
  hasCycle: boolean;
  cycleSteps?: string[];
}

/**
 * Perform topological sort on rating steps based on field dependencies.
 * Uses Kahn's algorithm for deterministic ordering.
 */
export function topologicalSort(steps: RatingStep[]): TopologicalSortResult {
  // Build dependency graph: outputFieldCode -> step
  const outputToStep = new Map<string, RatingStep>();
  steps.forEach(step => {
    outputToStep.set(step.outputFieldCode, step);
  });

  // Build adjacency list and in-degree count
  const adjacency = new Map<string, Set<string>>(); // stepId -> dependent stepIds
  const inDegree = new Map<string, number>(); // stepId -> number of dependencies

  steps.forEach(step => {
    adjacency.set(step.id, new Set());
    inDegree.set(step.id, 0);
  });

  // For each step, find which steps depend on its output
  steps.forEach(step => {
    step.inputs.forEach(inputFieldCode => {
      const dependencyStep = outputToStep.get(inputFieldCode);
      if (dependencyStep) {
        // This step depends on dependencyStep
        adjacency.get(dependencyStep.id)?.add(step.id);
        inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1);
      }
    });
  });

  // Kahn's algorithm
  const queue: RatingStep[] = [];
  const sorted: RatingStep[] = [];

  // Start with steps that have no dependencies (in-degree = 0)
  steps.forEach(step => {
    if (inDegree.get(step.id) === 0) {
      queue.push(step);
    }
  });

  // Sort queue by order for deterministic results when multiple steps have same in-degree
  queue.sort((a, b) => a.order - b.order);

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Reduce in-degree for all dependent steps
    const dependents = adjacency.get(current.id) || new Set();
    const newlyReady: RatingStep[] = [];

    dependents.forEach(dependentId => {
      const newDegree = (inDegree.get(dependentId) || 1) - 1;
      inDegree.set(dependentId, newDegree);

      if (newDegree === 0) {
        const dependentStep = steps.find(s => s.id === dependentId);
        if (dependentStep) {
          newlyReady.push(dependentStep);
        }
      }
    });

    // Sort newly ready steps by order for determinism
    newlyReady.sort((a, b) => a.order - b.order);
    queue.push(...newlyReady);
  }

  // Check for cycle
  if (sorted.length !== steps.length) {
    // Find steps involved in cycle
    const sortedIds = new Set(sorted.map(s => s.id));
    const cycleSteps = steps
      .filter(s => !sortedIds.has(s.id))
      .map(s => s.id);

    return {
      sorted: [],
      hasCycle: true,
      cycleSteps,
    };
  }

  return {
    sorted,
    hasCycle: false,
  };
}

// ============================================================================
// Rounding Functions
// ============================================================================

/**
 * Apply rounding to a value based on the specified mode and precision.
 * All rounding is deterministic and follows IEEE 754 standards.
 */
export function applyRounding(
  value: number,
  mode: RoundingMode,
  precision: number
): number {
  if (mode === 'none' || !Number.isFinite(value)) {
    return value;
  }

  const multiplier = Math.pow(10, precision);
  const shifted = value * multiplier;

  let rounded: number;

  switch (mode) {
    case 'up':
      rounded = Math.ceil(shifted);
      break;
    case 'down':
      rounded = Math.floor(shifted);
      break;
    case 'nearest':
      rounded = Math.round(shifted);
      break;
    case 'bankers':
      // Banker's rounding: round half to even
      rounded = bankersRound(shifted);
      break;
    case 'truncate':
      rounded = Math.trunc(shifted);
      break;
    default:
      rounded = shifted;
  }

  return rounded / multiplier;
}

/**
 * Banker's rounding (round half to even).
 * IEEE 754 compliant rounding for financial calculations.
 */
function bankersRound(value: number): number {
  const floor = Math.floor(value);
  const decimal = value - floor;

  // If exactly 0.5, round to nearest even
  if (Math.abs(decimal - 0.5) < Number.EPSILON) {
    return floor % 2 === 0 ? floor : floor + 1;
  }

  return Math.round(value);
}

// ============================================================================
// Expression Parser
// ============================================================================

/**
 * Parse and evaluate a mathematical expression with variable substitution.
 * Supports: +, -, *, /, ^, parentheses, and field code references.
 */
export function evaluateExpression(
  expression: string,
  values: Record<string, number>
): { result: number; evaluatedExpression: string } {
  // Substitute field codes with values
  let evaluatedExpression = expression;

  // Find all field codes (alphanumeric with underscores)
  const fieldCodePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;

  while ((match = fieldCodePattern.exec(expression)) !== null) {
    const fieldCode = match[1];
    // Skip math functions and constants
    if (['Math', 'PI', 'E', 'abs', 'min', 'max', 'pow', 'sqrt', 'floor', 'ceil', 'round'].includes(fieldCode)) {
      continue;
    }

    if (fieldCode in values) {
      const value = values[fieldCode];
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\b${fieldCode}\\b`, 'g'),
        String(value)
      );
    }
  }

  // Safe evaluation using Function constructor (no eval)
  try {
    // Only allow safe mathematical operations
    const sanitized = evaluatedExpression
      .replace(/Math\./g, 'Math.')
      .replace(/[^0-9+\-*/().^,\s]/g, '');

    // Convert ^ to ** for exponentiation
    const withExponent = sanitized.replace(/\^/g, '**');

    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${withExponent})`);
    const result = fn();

    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error(`Expression evaluated to invalid result: ${result}`);
    }

    return { result, evaluatedExpression };
  } catch (error) {
    throw new Error(`Failed to evaluate expression "${expression}": ${error}`);
  }
}

// ============================================================================
// Table Lookup
// ============================================================================

/**
 * Perform a table lookup with the given dimension values.
 */
export function tableLookup(
  table: RatingTableData,
  dimensionValues: Record<string, string | number>
): { value: number; lookupKey: string } | null {
  // Build lookup key from dimension values in order
  const keyParts: string[] = [];

  for (const dimension of table.dimensions) {
    const value = dimensionValues[dimension.fieldCode];
    if (value === undefined || value === null) {
      return null; // Missing dimension value
    }
    keyParts.push(String(value));
  }

  const lookupKey = keyParts.join('-');
  const value = table.values[lookupKey];

  if (value === undefined) {
    return null; // No value found for this combination
  }

  return { value, lookupKey };
}

// ============================================================================
// Step Evaluation Functions
// ============================================================================

interface StepEvaluationResult {
  value: number | null;
  applied: boolean;
  skipReason?: string;
  tableLookupKey?: string;
  evaluatedExpression?: string;
  warnings?: string[];
}

/**
 * Evaluate a single rating step.
 */
function evaluateStep(
  step: RatingStep,
  context: EvaluationContext,
  computedValues: Record<string, number>
): StepEvaluationResult {
  // Check if step is enabled
  if (!step.enabled) {
    return { value: null, applied: false, skipReason: 'Step is disabled' };
  }

  // Check state applicability
  if (!step.allStates && step.states && step.states.length > 0 && context.state) {
    if (!step.states.includes(context.state)) {
      return { value: null, applied: false, skipReason: `Not applicable for state ${context.state}` };
    }
  }

  // Gather all available values (inputs + computed)
  const allValues: Record<string, number> = { ...computedValues };
  for (const [key, val] of Object.entries(context.inputs)) {
    if (typeof val === 'number') {
      allValues[key] = val;
    } else if (typeof val === 'string' && !isNaN(Number(val))) {
      allValues[key] = Number(val);
    } else if (typeof val === 'boolean') {
      allValues[key] = val ? 1 : 0;
    }
  }

  const warnings: string[] = [];
  let result: StepEvaluationResult;

  try {
    switch (step.type) {
      case 'input':
        result = evaluateInputStep(step, context);
        break;
      case 'constant':
        result = evaluateConstantStep(step);
        break;
      case 'factor':
        result = evaluateFactorStep(step, allValues);
        break;
      case 'tableLookup':
        result = evaluateTableLookupStep(step, context, allValues);
        break;
      case 'expression':
        result = evaluateExpressionStep(step, allValues);
        break;
      case 'minmax':
        result = evaluateMinMaxStep(step, allValues);
        break;
      case 'fee':
        result = evaluateFeeStep(step, allValues);
        break;
      case 'conditional':
        result = evaluateConditionalStep(step, context, allValues);
        break;
      default:
        result = { value: null, applied: false, skipReason: `Unknown step type: ${step.type}` };
    }
  } catch (error) {
    return {
      value: null,
      applied: false,
      skipReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      warnings,
    };
  }

  return { ...result, warnings: [...(result.warnings || []), ...warnings] };
}

/** Evaluate an input step - get value from context inputs */
function evaluateInputStep(step: RatingStep, context: EvaluationContext): StepEvaluationResult {
  const inputCode = step.inputs[0];
  if (!inputCode) {
    return { value: null, applied: false, skipReason: 'No input field specified' };
  }

  const inputValue = context.inputs[inputCode];
  if (inputValue === undefined || inputValue === null) {
    return { value: null, applied: false, skipReason: `Input field ${inputCode} not provided` };
  }

  const numValue = typeof inputValue === 'number' ? inputValue : Number(inputValue);
  if (isNaN(numValue)) {
    return { value: null, applied: false, skipReason: `Input field ${inputCode} is not a valid number` };
  }

  return { value: numValue, applied: true };
}

/** Evaluate a constant step - return fixed value */
function evaluateConstantStep(step: RatingStep): StepEvaluationResult {
  if (step.constantValue === undefined || step.constantValue === null) {
    return { value: null, applied: false, skipReason: 'No constant value specified' };
  }
  return { value: step.constantValue, applied: true };
}

/** Evaluate a factor step - multiply base by factor */
function evaluateFactorStep(
  step: RatingStep,
  values: Record<string, number>
): StepEvaluationResult {
  // Get the base value from first input
  const baseCode = step.inputs[0];
  if (!baseCode || !(baseCode in values)) {
    return { value: null, applied: false, skipReason: `Base field ${baseCode} not available` };
  }
  const baseValue = values[baseCode];

  // Get factor value
  let factorValue: number;
  if (step.factorFieldCode && step.factorFieldCode in values) {
    factorValue = values[step.factorFieldCode];
  } else if (step.factorValue !== undefined) {
    factorValue = step.factorValue;
  } else {
    return { value: null, applied: false, skipReason: 'No factor value specified' };
  }

  return { value: baseValue * factorValue, applied: true };
}

/** Evaluate a table lookup step */
function evaluateTableLookupStep(
  step: RatingStep,
  context: EvaluationContext,
  values: Record<string, number>
): StepEvaluationResult {
  if (!step.tableVersionId) {
    return { value: null, applied: false, skipReason: 'No table version specified' };
  }

  const table = context.tables?.get(step.tableVersionId);
  if (!table) {
    return { value: null, applied: false, skipReason: `Table ${step.tableVersionId} not loaded` };
  }

  // Build dimension values from lookup config
  const dimensionValues: Record<string, string | number> = {};
  for (const dim of step.lookupDimensions || []) {
    const value = context.inputs[dim.fieldCode] ?? values[dim.fieldCode];
    if (value !== undefined && value !== null) {
      dimensionValues[dim.fieldCode] = value as string | number;
    }
  }

  const lookupResult = tableLookup(table, dimensionValues);
  if (!lookupResult) {
    return {
      value: null,
      applied: false,
      skipReason: 'Table lookup failed - no matching value',
      tableLookupKey: Object.values(dimensionValues).join('-'),
    };
  }

  return {
    value: lookupResult.value,
    applied: true,
    tableLookupKey: lookupResult.lookupKey,
  };
}

/** Evaluate an expression step */
function evaluateExpressionStep(
  step: RatingStep,
  values: Record<string, number>
): StepEvaluationResult {
  if (!step.expression) {
    return { value: null, applied: false, skipReason: 'No expression specified' };
  }

  try {
    const { result, evaluatedExpression } = evaluateExpression(step.expression, values);
    return { value: result, applied: true, evaluatedExpression };
  } catch (error) {
    return {
      value: null,
      applied: false,
      skipReason: `Expression error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Evaluate a min/max step */
function evaluateMinMaxStep(
  step: RatingStep,
  values: Record<string, number>
): StepEvaluationResult {
  // Get the input value to cap
  const inputCode = step.inputs[0];
  if (!inputCode || !(inputCode in values)) {
    return { value: null, applied: false, skipReason: `Input field ${inputCode} not available` };
  }

  let value = values[inputCode];
  const warnings: string[] = [];

  // Apply min cap
  const minValue = step.minFieldCode && step.minFieldCode in values
    ? values[step.minFieldCode]
    : step.minValue;

  if (minValue !== undefined && value < minValue) {
    warnings.push(`Value ${value} capped to minimum ${minValue}`);
    value = minValue;
  }

  // Apply max cap
  const maxValue = step.maxFieldCode && step.maxFieldCode in values
    ? values[step.maxFieldCode]
    : step.maxValue;

  if (maxValue !== undefined && value > maxValue) {
    warnings.push(`Value ${value} capped to maximum ${maxValue}`);
    value = maxValue;
  }

  return { value, applied: true, warnings };
}

/** Evaluate a fee step */
function evaluateFeeStep(
  step: RatingStep,
  values: Record<string, number>
): StepEvaluationResult {
  let feeAmount: number;

  if (step.feeFieldCode && step.feeFieldCode in values) {
    feeAmount = values[step.feeFieldCode];
  } else if (step.feeAmount !== undefined) {
    feeAmount = step.feeAmount;
  } else {
    return { value: null, applied: false, skipReason: 'No fee amount specified' };
  }

  // If there's an input, add fee to it
  const inputCode = step.inputs[0];
  if (inputCode && inputCode in values) {
    return { value: values[inputCode] + feeAmount, applied: true };
  }

  return { value: feeAmount, applied: true };
}

/** Evaluate a conditional step */
function evaluateConditionalStep(
  step: RatingStep,
  context: EvaluationContext,
  values: Record<string, number>
): StepEvaluationResult {
  if (!step.condition) {
    return { value: null, applied: false, skipReason: 'No condition specified' };
  }

  const conditionMet = evaluateCondition(step.condition, context, values);

  const value = conditionMet ? step.thenValue : step.elseValue;
  if (value === undefined) {
    return {
      value: null,
      applied: false,
      skipReason: `No ${conditionMet ? 'then' : 'else'} value specified`,
    };
  }

  return { value, applied: true };
}

/** Evaluate a step condition */
function evaluateCondition(
  condition: RatingStep['condition'],
  context: EvaluationContext,
  values: Record<string, number>
): boolean {
  if (!condition) return true;

  const fieldValue = context.inputs[condition.fieldCode] ?? values[condition.fieldCode];
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const { operator, value: condValue, valueEnd } = condition;

  switch (operator) {
    case 'eq':
      return fieldValue === condValue;
    case 'ne':
      return fieldValue !== condValue;
    case 'gt':
      return Number(fieldValue) > Number(condValue);
    case 'gte':
      return Number(fieldValue) >= Number(condValue);
    case 'lt':
      return Number(fieldValue) < Number(condValue);
    case 'lte':
      return Number(fieldValue) <= Number(condValue);
    case 'in':
      return Array.isArray(condValue) && condValue.includes(fieldValue as string | number);
    case 'notIn':
      return Array.isArray(condValue) && !condValue.includes(fieldValue as string | number);
    case 'between':
      return Number(fieldValue) >= Number(condValue) && Number(fieldValue) <= Number(valueEnd);
    default:
      return false;
  }
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate a rate program with the given context.
 * Returns a fully traced, deterministic result.
 */
export function evaluate(
  steps: RatingStep[],
  context: EvaluationContext,
  rateProgramVersionId: string
): EvaluationResult {
  const startTime = performance.now();
  const errors: EvaluationError[] = [];
  const warnings: string[] = [];
  const trace: StepTraceEntry[] = [];
  const computedValues: Record<string, number> = {};

  // Topological sort to determine execution order
  const sortResult = topologicalSort(steps);

  if (sortResult.hasCycle) {
    return {
      success: false,
      outputs: {},
      trace: [],
      errors: [{
        code: 'CYCLE_DETECTED',
        message: `Circular dependency detected involving steps: ${sortResult.cycleSteps?.join(', ')}`,
      }],
      warnings: [],
      executionTimeMs: performance.now() - startTime,
      resultHash: '',
      evaluatedAt: new Date(),
      rateProgramVersionId,
      stepsHash: hashSteps(steps as unknown as { id: string; [key: string]: unknown }[]),
    };
  }

  // Execute steps in sorted order
  for (const step of sortResult.sorted) {
    const stepStartTime = performance.now();

    // Gather input values for trace
    const inputValues: Record<string, string | number | boolean | null> = {};
    for (const inputCode of step.inputs) {
      inputValues[inputCode] = context.inputs[inputCode] ?? computedValues[inputCode] ?? null;
    }

    // Evaluate the step
    const evalResult = evaluateStep(step, context, computedValues);

    // Apply rounding if step was applied and has a value
    let finalValue = evalResult.value;
    let preRoundingValue: number | undefined;

    if (evalResult.applied && finalValue !== null) {
      preRoundingValue = finalValue;
      finalValue = applyRounding(finalValue, step.roundingMode, step.roundingPrecision);
      computedValues[step.outputFieldCode] = finalValue;
    }

    // Build trace entry
    const traceEntry: StepTraceEntry = {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      order: step.order,
      inputValues,
      resolvedValues: { ...computedValues },
      outputValue: finalValue,
      outputFieldCode: step.outputFieldCode,
      applied: evalResult.applied,
      skipReason: evalResult.skipReason,
      tableLookupKey: evalResult.tableLookupKey,
      evaluatedExpression: evalResult.evaluatedExpression,
      preRoundingValue,
      roundingMode: step.roundingMode,
      executionTimeMs: performance.now() - stepStartTime,
      warnings: evalResult.warnings,
    };

    trace.push(traceEntry);

    // Collect warnings
    if (evalResult.warnings) {
      warnings.push(...evalResult.warnings);
    }

    // If step failed and was required, add error
    if (!evalResult.applied && step.enabled && evalResult.skipReason) {
      // Check if this is a critical failure
      const isCritical = step.type === 'input' ||
        sortResult.sorted.some(s => s.inputs.includes(step.outputFieldCode));

      if (isCritical) {
        errors.push({
          code: 'STEP_FAILED',
          message: evalResult.skipReason,
          stepId: step.id,
          stepName: step.name,
          fieldCode: step.outputFieldCode,
        });
      }
    }
  }

  // Generate result hash for determinism verification
  const outputsHash = hashOutputs(computedValues);
  const inputsHash = hashInputs(context.inputs);
  const stepsHash = hashSteps(steps as unknown as { id: string; [key: string]: unknown }[]);
  const resultHash = combineHashes(inputsHash, stepsHash, outputsHash);

  return {
    success: errors.length === 0,
    outputs: computedValues,
    finalPremium: computedValues['final_premium'] ?? computedValues['total_premium'],
    trace,
    errors,
    warnings,
    executionTimeMs: performance.now() - startTime,
    resultHash,
    evaluatedAt: new Date(),
    rateProgramVersionId,
    stepsHash,
  };
}

// ============================================================================
// Determinism Validation
// ============================================================================

/**
 * Validate a rate program for determinism issues.
 * Checks for cycles, missing inputs, and other issues that could cause
 * non-deterministic behavior.
 */
export function validateDeterminism(
  steps: RatingStep[],
  availableFieldCodes: string[]
): DeterminismValidationResult {
  const errors: DeterminismError[] = [];
  const warnings: DeterminismWarning[] = [];
  const dependencyGraph: DependencyNode[] = [];

  // Build output to step mapping
  const outputToStep = new Map<string, RatingStep>();
  steps.forEach(step => {
    outputToStep.set(step.outputFieldCode, step);
  });

  // Check for cycles
  const sortResult = topologicalSort(steps);
  if (sortResult.hasCycle) {
    errors.push({
      code: 'CYCLE_DETECTED',
      message: `Circular dependency detected in steps: ${sortResult.cycleSteps?.join(', ')}`,
      stepIds: sortResult.cycleSteps,
    });
  }

  // Check each step
  const availableFieldSet = new Set(availableFieldCodes);
  const producedFields = new Set<string>();

  for (const step of steps) {
    // Check for undefined input fields
    const missingInputs: string[] = [];
    for (const inputCode of step.inputs) {
      // Check if it's from data dictionary or produced by another step
      const isFromDictionary = availableFieldSet.has(inputCode);
      const isFromStep = outputToStep.has(inputCode);

      if (!isFromDictionary && !isFromStep) {
        missingInputs.push(inputCode);
      }
    }

    if (missingInputs.length > 0) {
      errors.push({
        code: 'UNDEFINED_FIELD',
        message: `Step "${step.name}" references undefined fields: ${missingInputs.join(', ')}`,
        stepIds: [step.id],
        fieldCodes: missingInputs,
      });
    }

    // Check for invalid expressions
    if (step.type === 'expression' && step.expression) {
      try {
        // Test parse the expression with dummy values
        const testValues: Record<string, number> = {};
        step.inputs.forEach(code => { testValues[code] = 1; });
        evaluateExpression(step.expression, testValues);
      } catch (error) {
        errors.push({
          code: 'INVALID_EXPRESSION',
          message: `Step "${step.name}" has invalid expression: ${error}`,
          stepIds: [step.id],
        });
      }
    }

    // Check for table references
    if (step.type === 'tableLookup' && !step.tableVersionId) {
      errors.push({
        code: 'TABLE_NOT_FOUND',
        message: `Step "${step.name}" references a table lookup but no table version is specified`,
        stepIds: [step.id],
      });
    }

    producedFields.add(step.outputFieldCode);
  }

  // Check for unused steps (warning only)
  for (const step of steps) {
    const isUsedByOther = steps.some(s =>
      s.id !== step.id && s.inputs.includes(step.outputFieldCode)
    );
    const isFinalOutput = step.outputFieldCode.includes('premium') ||
                          step.outputFieldCode.includes('total');

    if (!isUsedByOther && !isFinalOutput) {
      warnings.push({
        code: 'UNUSED_STEP',
        message: `Step "${step.name}" output "${step.outputFieldCode}" is not used by any other step`,
        stepId: step.id,
      });
    }
  }

  // Build dependency graph
  for (const step of steps) {
    const dependsOn: string[] = [];
    const dependedOnBy: string[] = [];

    // Find steps this one depends on
    for (const inputCode of step.inputs) {
      const dependencyStep = outputToStep.get(inputCode);
      if (dependencyStep) {
        dependsOn.push(dependencyStep.id);
      }
    }

    // Find steps that depend on this one
    for (const otherStep of steps) {
      if (otherStep.inputs.includes(step.outputFieldCode)) {
        dependedOnBy.push(otherStep.id);
      }
    }

    dependencyGraph.push({
      stepId: step.id,
      stepName: step.name,
      outputFieldCode: step.outputFieldCode,
      dependsOn,
      dependedOnBy,
      order: step.order,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    dependencyGraph,
  };
}

/**
 * Run a test case and compare results.
 */
export function runTestCase(
  testCase: import('../types/ratingEngine').RatingTestCase,
  steps: RatingStep[],
  tables: Map<string, RatingTableData>
): import('../types/ratingEngine').TestRunResult {
  const context: EvaluationContext = {
    inputs: testCase.inputs,
    state: testCase.state,
    effectiveDate: new Date(),
    tables,
  };

  const result = evaluate(steps, context, testCase.rateProgramVersionId);
  const tolerance = testCase.tolerance ?? 0.001;
  const differences: import('../types/ratingEngine').TestDifference[] = [];
  let passed = true;

  // Compare expected outputs
  for (const [fieldCode, expected] of Object.entries(testCase.expectedOutputs)) {
    const actual = result.outputs[fieldCode] ?? 0;
    const diff = Math.abs(expected - actual);
    const withinTolerance = diff <= tolerance;

    if (!withinTolerance) {
      passed = false;
    }

    differences.push({
      fieldCode,
      expected,
      actual,
      difference: diff,
      withinTolerance,
    });
  }

  // Check final premium if specified
  if (testCase.expectedFinalPremium !== undefined) {
    const actualPremium = result.finalPremium ?? 0;
    const diff = Math.abs(testCase.expectedFinalPremium - actualPremium);
    if (diff > tolerance) {
      passed = false;
      differences.push({
        fieldCode: 'final_premium',
        expected: testCase.expectedFinalPremium,
        actual: actualPremium,
        difference: diff,
        withinTolerance: false,
      });
    }
  }

  return {
    testCaseId: testCase.id,
    passed,
    actualOutputs: result.outputs,
    actualFinalPremium: result.finalPremium,
    differences,
    executionTimeMs: result.executionTimeMs,
    runAt: new Date(),
  };
}
