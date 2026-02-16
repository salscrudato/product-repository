/**
 * Regression Runner Engine
 *
 * Deterministic batch execution of QA scenarios against the rating engine.
 * Produces field-level diffs with tolerance comparison and baseline deltas.
 *
 * This is a pure engine — no Firestore dependencies.
 * Services orchestrate persistence; this module focuses on evaluation + diff.
 */

import { evaluate } from './ratingEngine';
import type {
  RatingStep,
  EvaluationContext,
  EvaluationResult,
  RatingTableData,
} from '../types/ratingEngine';
import type {
  Scenario,
  QARunScenarioResult,
  ScenarioFieldDiff,
  QARun,
  QARunStatus,
  QAGateConfig,
  QAPreflightResult,
  DEFAULT_QA_GATE_CONFIG,
} from '../types/scenario';

// ════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════

export interface RegressionRunInput {
  scenarios: Scenario[];
  /** Steps from the draft (current) version */
  draftSteps: RatingStep[];
  draftVersionId: string;
  /** Steps from the baseline (published) version, for comparison */
  baselineSteps?: RatingStep[];
  baselineVersionId?: string;
  /** Shared tables cache */
  tables?: Map<string, RatingTableData>;
}

export interface RegressionRunOutput {
  status: QARunStatus;
  results: QARunScenarioResult[];
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  errorCount: number;
  totalExecutionTimeMs: number;
}

// ════════════════════════════════════════════════════════════════════════
// Field-level diff
// ════════════════════════════════════════════════════════════════════════

export function computeFieldDiffs(
  expected: Record<string, number>,
  actual: Record<string, number>,
  tolerance: number,
): ScenarioFieldDiff[] {
  const diffs: ScenarioFieldDiff[] = [];
  const allFields = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  for (const fieldCode of allFields) {
    const exp = expected[fieldCode] ?? 0;
    const act = actual[fieldCode] ?? 0;
    const delta = act - exp;
    const absDelta = Math.abs(delta);
    const pctChange = exp !== 0 ? (delta / Math.abs(exp)) * 100 : (act !== 0 ? 100 : 0);
    const withinTolerance = absDelta <= tolerance;

    if (!withinTolerance) {
      diffs.push({ fieldCode, expected: exp, actual: act, delta, absDelta, pctChange, withinTolerance });
    }
  }

  return diffs;
}

// ════════════════════════════════════════════════════════════════════════
// Single scenario evaluation
// ════════════════════════════════════════════════════════════════════════

export function runSingleScenario(
  scenario: Scenario,
  draftSteps: RatingStep[],
  draftVersionId: string,
  baselineSteps?: RatingStep[],
  baselineVersionId?: string,
  tables?: Map<string, RatingTableData>,
): QARunScenarioResult {
  const startTime = performance.now();

  try {
    // Build evaluation context
    const context: EvaluationContext = {
      inputs: scenario.inputs,
      state: scenario.stateCode,
      effectiveDate: new Date(),
      tables,
    };

    // Evaluate against draft
    const draftResult = evaluate(draftSteps, context, draftVersionId);

    if (!draftResult.success) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        status: 'error',
        actualOutputs: draftResult.outputs,
        expectedOutputs: scenario.expectedOutputs,
        diffs: [],
        errorMessage: draftResult.errors.map(e => e.message).join('; '),
        executionTimeMs: performance.now() - startTime,
        resultHash: draftResult.resultHash,
      };
    }

    // Compute diffs against expected
    const diffs = computeFieldDiffs(scenario.expectedOutputs, draftResult.outputs, scenario.tolerance);

    // Evaluate baseline if provided (for comparison view)
    let baselineOutputs: Record<string, number> | undefined;
    if (baselineSteps && baselineVersionId) {
      try {
        const baselineResult = evaluate(baselineSteps, context, baselineVersionId);
        if (baselineResult.success) {
          baselineOutputs = baselineResult.outputs;
        }
      } catch {
        // Baseline eval failure is non-fatal; we still have draft vs expected
      }
    }

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: diffs.length === 0 ? 'pass' : 'fail',
      actualOutputs: draftResult.outputs,
      expectedOutputs: scenario.expectedOutputs,
      diffs,
      baselineOutputs,
      executionTimeMs: performance.now() - startTime,
      resultHash: draftResult.resultHash,
    };
  } catch (err: any) {
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: 'error',
      actualOutputs: {},
      expectedOutputs: scenario.expectedOutputs,
      diffs: [],
      errorMessage: err.message || 'Unexpected evaluation error',
      executionTimeMs: performance.now() - startTime,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════
// Batch regression run
// ════════════════════════════════════════════════════════════════════════

export function runRegression(input: RegressionRunInput): RegressionRunOutput {
  const { scenarios, draftSteps, draftVersionId, baselineSteps, baselineVersionId, tables } = input;

  const results: QARunScenarioResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let errorCount = 0;
  const batchStart = performance.now();

  for (const scenario of scenarios) {
    if (!scenario.isActive) continue;

    const result = runSingleScenario(
      scenario, draftSteps, draftVersionId,
      baselineSteps, baselineVersionId, tables,
    );
    results.push(result);

    switch (result.status) {
      case 'pass':  passedCount++;  break;
      case 'fail':  failedCount++;  break;
      case 'error': errorCount++;   break;
    }
  }

  const totalExecutionTimeMs = performance.now() - batchStart;
  const totalScenarios = results.length;

  let status: QARunStatus;
  if (errorCount > 0 && passedCount === 0 && failedCount === 0) {
    status = 'error';
  } else if (failedCount > 0 || errorCount > 0) {
    status = 'failed';
  } else {
    status = 'passed';
  }

  return { status, results, totalScenarios, passedCount, failedCount, errorCount, totalExecutionTimeMs };
}

// ════════════════════════════════════════════════════════════════════════
// QA Gate Evaluation
// ════════════════════════════════════════════════════════════════════════

export function evaluateQAGate(
  config: QAGateConfig,
  run: Pick<RegressionRunOutput, 'status' | 'totalScenarios' | 'passedCount' | 'failedCount' | 'errorCount' | 'results'>,
  scenarios: Scenario[],
): QAPreflightResult {
  const issues: { type: 'error' | 'warning'; message: string }[] = [];

  if (config.mode === 'disabled') {
    return { passed: true, mode: 'disabled', issues: [] };
  }

  const isBlocking = config.mode === 'required';
  const issueType = isBlocking ? 'error' : 'warning';

  // Check overall pass rate
  const passRate = run.totalScenarios > 0 ? run.passedCount / run.totalScenarios : 0;
  if (passRate < config.minPassRate) {
    issues.push({
      type: issueType,
      message: `QA pass rate ${(passRate * 100).toFixed(1)}% is below required ${(config.minPassRate * 100).toFixed(1)}% (${run.failedCount} failed, ${run.errorCount} errors)`,
    });
  }

  // Check mandatory scenarios
  if (config.requireMandatoryPass) {
    const mandatoryScenarioIds = new Set(
      scenarios.filter(s => s.isRequired && s.isActive).map(s => s.id),
    );
    const failedMandatory = run.results.filter(
      r => mandatoryScenarioIds.has(r.scenarioId) && r.status !== 'pass',
    );
    if (failedMandatory.length > 0) {
      const names = failedMandatory.map(r => r.scenarioName).join(', ');
      issues.push({
        type: issueType,
        message: `${failedMandatory.length} mandatory scenario(s) did not pass: ${names}`,
      });
    }
  }

  // Check for error status
  if (run.status === 'error') {
    issues.push({
      type: issueType,
      message: 'QA run encountered evaluation errors',
    });
  }

  const blockingIssues = issues.filter(i => i.type === 'error');
  return {
    passed: blockingIssues.length === 0,
    mode: config.mode,
    issues,
  };
}
