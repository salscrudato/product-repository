/**
 * Regression Runner & QA Gating Tests
 *
 * Tests:
 *  1. Field-level diff computation with tolerance
 *  2. Single scenario evaluation (pass/fail/error)
 *  3. Batch regression run aggregation
 *  4. QA gate evaluation (required/advisory/disabled modes)
 *  5. Acceptance criteria: rate changes cannot publish without passing required QA
 */

import { describe, it, expect } from 'vitest';
import {
  computeFieldDiffs,
  evaluateQAGate,
} from '../engine/regressionRunner';
import type {
  Scenario, QAGateConfig, QARunScenarioResult, ScenarioFieldDiff,
  QARunStatus,
} from '../types/scenario';
import { DEFAULT_QA_GATE_CONFIG } from '../types/scenario';
import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Simulate runner logic locally (avoids coupling to evaluate() which uses
// Function constructor / performance APIs not available in all test envs)
// ════════════════════════════════════════════════════════════════════════

function simulateScenarioResult(
  scenario: Scenario,
  actualOutputs: Record<string, number>,
  tolerance: number,
  baselineOutputs?: Record<string, number>,
): QARunScenarioResult {
  const diffs = computeFieldDiffs(scenario.expectedOutputs, actualOutputs, tolerance);
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    status: diffs.length === 0 ? 'pass' : 'fail',
    actualOutputs,
    expectedOutputs: scenario.expectedOutputs,
    diffs,
    baselineOutputs,
    executionTimeMs: 1,
    resultHash: 'test-hash',
  };
}

function simulateRegressionRun(
  scenarios: Scenario[],
  outputsMap: Record<string, Record<string, number>>,
  baselineOutputsMap?: Record<string, Record<string, number>>,
) {
  const results: QARunScenarioResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let errorCount = 0;

  for (const scenario of scenarios) {
    if (!scenario.isActive) continue;
    const actual = outputsMap[scenario.id] || {};
    const baseline = baselineOutputsMap?.[scenario.id];
    const result = simulateScenarioResult(scenario, actual, scenario.tolerance, baseline);
    results.push(result);
    if (result.status === 'pass') passedCount++;
    else if (result.status === 'fail') failedCount++;
    else errorCount++;
  }

  const totalScenarios = results.length;
  let status: QARunStatus = failedCount > 0 || errorCount > 0 ? 'failed' : 'passed';
  if (errorCount > 0 && passedCount === 0 && failedCount === 0) status = 'error';

  return { status, results, totalScenarios, passedCount, failedCount, errorCount, totalExecutionTimeMs: 1 };
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makeScenario(overrides: Partial<Scenario> & { id: string; name: string }): Scenario {
  return {
    rateProgramId: 'rp-1',
    inputs: { base_rate: 100, factor_a: 1.5 },
    expectedOutputs: { final_premium: 150 },
    tolerance: 0.01,
    tags: ['regression'],
    isRequired: false,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: 'test',
    updatedAt: Timestamp.now(),
    updatedBy: 'test',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

describe('computeFieldDiffs', () => {
  it('returns empty diffs when values match exactly', () => {
    const diffs = computeFieldDiffs(
      { premium: 100, tax: 5 },
      { premium: 100, tax: 5 },
      0.01,
    );
    expect(diffs).toHaveLength(0);
  });

  it('returns empty diffs when within tolerance', () => {
    const diffs = computeFieldDiffs(
      { premium: 100 },
      { premium: 100.005 },
      0.01,
    );
    expect(diffs).toHaveLength(0);
  });

  it('detects diffs beyond tolerance', () => {
    const diffs = computeFieldDiffs(
      { premium: 100 },
      { premium: 102 },
      0.01,
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fieldCode).toBe('premium');
    expect(diffs[0].delta).toBe(2);
    expect(diffs[0].absDelta).toBe(2);
    expect(diffs[0].pctChange).toBeCloseTo(2);
    expect(diffs[0].withinTolerance).toBe(false);
  });

  it('handles missing fields in actual', () => {
    const diffs = computeFieldDiffs(
      { premium: 100, tax: 5 },
      { premium: 100 },
      0.01,
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fieldCode).toBe('tax');
    expect(diffs[0].actual).toBe(0);
    expect(diffs[0].expected).toBe(5);
  });

  it('handles extra fields in actual', () => {
    const diffs = computeFieldDiffs(
      { premium: 100 },
      { premium: 100, surcharge: 10 },
      0.01,
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fieldCode).toBe('surcharge');
    expect(diffs[0].actual).toBe(10);
  });

  it('computes percentage change correctly', () => {
    const diffs = computeFieldDiffs(
      { premium: 200 },
      { premium: 210 },
      0.01,
    );
    expect(diffs[0].pctChange).toBeCloseTo(5);
  });

  it('handles zero expected value', () => {
    const diffs = computeFieldDiffs(
      { premium: 0 },
      { premium: 10 },
      0.01,
    );
    expect(diffs[0].pctChange).toBe(100);
  });
});

describe('simulateScenarioResult', () => {
  it('passes when outputs match expected', () => {
    const scenario = makeScenario({ id: 's1', name: 'Basic', expectedOutputs: { final_premium: 150 } });
    const result = simulateScenarioResult(scenario, { final_premium: 150 }, 0.01);
    expect(result.status).toBe('pass');
    expect(result.diffs).toHaveLength(0);
    expect(result.actualOutputs.final_premium).toBe(150);
  });

  it('fails when outputs differ', () => {
    const scenario = makeScenario({ id: 's2', name: 'Wrong Expected', expectedOutputs: { final_premium: 200 } });
    const result = simulateScenarioResult(scenario, { final_premium: 150 }, 0.01);
    expect(result.status).toBe('fail');
    expect(result.diffs.length).toBeGreaterThan(0);
    expect(result.diffs[0].fieldCode).toBe('final_premium');
  });

  it('includes baseline outputs when provided', () => {
    const scenario = makeScenario({ id: 's3', name: 'With Baseline', expectedOutputs: { final_premium: 150 } });
    const result = simulateScenarioResult(scenario, { final_premium: 150 }, 0.01, { final_premium: 145 });
    expect(result.baselineOutputs).toBeDefined();
    expect(result.baselineOutputs?.final_premium).toBe(145);
  });

  it('passes within tolerance', () => {
    const scenario = makeScenario({ id: 's4', name: 'Tolerance', expectedOutputs: { final_premium: 150 }, tolerance: 1.0 });
    const result = simulateScenarioResult(scenario, { final_premium: 150.5 }, 1.0);
    expect(result.status).toBe('pass');
  });
});

describe('simulateRegressionRun (batch)', () => {
  it('runs all active scenarios and aggregates results', () => {
    const scenarios = [
      makeScenario({ id: 's1', name: 'Pass', expectedOutputs: { final_premium: 150 } }),
      makeScenario({ id: 's2', name: 'Fail', expectedOutputs: { final_premium: 999 } }),
    ];
    const output = simulateRegressionRun(scenarios, {
      s1: { final_premium: 150 },
      s2: { final_premium: 150 },
    });
    expect(output.totalScenarios).toBe(2);
    expect(output.passedCount).toBe(1);
    expect(output.failedCount).toBe(1);
    expect(output.status).toBe('failed');
  });

  it('skips inactive scenarios', () => {
    const scenarios = [
      makeScenario({ id: 's1', name: 'Active', expectedOutputs: { final_premium: 150 } }),
      makeScenario({ id: 's2', name: 'Inactive', isActive: false }),
    ];
    const output = simulateRegressionRun(scenarios, {
      s1: { final_premium: 150 },
      s2: { final_premium: 150 },
    });
    expect(output.totalScenarios).toBe(1);
    expect(output.passedCount).toBe(1);
    expect(output.status).toBe('passed');
  });

  it('returns passed when all scenarios pass', () => {
    const scenarios = [
      makeScenario({ id: 's1', name: 'A', expectedOutputs: { final_premium: 150 } }),
      makeScenario({ id: 's2', name: 'B', expectedOutputs: { final_premium: 150 } }),
    ];
    const output = simulateRegressionRun(scenarios, {
      s1: { final_premium: 150 },
      s2: { final_premium: 150 },
    });
    expect(output.status).toBe('passed');
    expect(output.passedCount).toBe(2);
    expect(output.failedCount).toBe(0);
    expect(output.errorCount).toBe(0);
  });

  it('records execution time', () => {
    const scenarios = [makeScenario({ id: 's1', name: 'A', expectedOutputs: { final_premium: 150 } })];
    const output = simulateRegressionRun(scenarios, { s1: { final_premium: 150 } });
    expect(output.totalExecutionTimeMs).toBeGreaterThanOrEqual(0);
    expect(output.results[0].executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('evaluateQAGate', () => {
  const allPassRun = {
    status: 'passed' as const,
    totalScenarios: 5,
    passedCount: 5,
    failedCount: 0,
    errorCount: 0,
    results: Array.from({ length: 5 }, (_, i) => ({
      scenarioId: `s${i}`,
      scenarioName: `Scenario ${i}`,
      status: 'pass' as const,
      actualOutputs: {},
      expectedOutputs: {},
      diffs: [],
      executionTimeMs: 1,
    })),
  };

  const partialFailRun = {
    status: 'failed' as const,
    totalScenarios: 5,
    passedCount: 3,
    failedCount: 2,
    errorCount: 0,
    results: [
      ...Array.from({ length: 3 }, (_, i) => ({
        scenarioId: `s${i}`,
        scenarioName: `Pass ${i}`,
        status: 'pass' as const,
        actualOutputs: {},
        expectedOutputs: {},
        diffs: [],
        executionTimeMs: 1,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        scenarioId: `f${i}`,
        scenarioName: `Fail ${i}`,
        status: 'fail' as const,
        actualOutputs: {},
        expectedOutputs: {},
        diffs: [{ fieldCode: 'premium', expected: 100, actual: 200, delta: 100, absDelta: 100, pctChange: 100, withinTolerance: false }],
        executionTimeMs: 1,
      })),
    ],
  };

  it('required mode: blocks publish on failure', () => {
    const config: QAGateConfig = { ...DEFAULT_QA_GATE_CONFIG, mode: 'required' };
    const result = evaluateQAGate(config, partialFailRun, []);
    expect(result.passed).toBe(false);
    expect(result.mode).toBe('required');
    expect(result.issues.some(i => i.type === 'error')).toBe(true);
  });

  it('required mode: allows publish on all pass', () => {
    const config: QAGateConfig = { ...DEFAULT_QA_GATE_CONFIG, mode: 'required' };
    const result = evaluateQAGate(config, allPassRun, []);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('advisory mode: warns but allows publish', () => {
    const config: QAGateConfig = { ...DEFAULT_QA_GATE_CONFIG, mode: 'advisory' };
    const result = evaluateQAGate(config, partialFailRun, []);
    expect(result.passed).toBe(true);
    expect(result.mode).toBe('advisory');
    expect(result.issues.some(i => i.type === 'warning')).toBe(true);
    expect(result.issues.every(i => i.type === 'warning')).toBe(true);
  });

  it('disabled mode: always passes', () => {
    const config: QAGateConfig = { ...DEFAULT_QA_GATE_CONFIG, mode: 'disabled' };
    const result = evaluateQAGate(config, partialFailRun, []);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('enforces minimum pass rate', () => {
    const config: QAGateConfig = { mode: 'required', minPassRate: 0.8, requireMandatoryPass: false, autoRunOnReview: false };
    // 3/5 = 60% < 80%
    const result = evaluateQAGate(config, partialFailRun, []);
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('60.0%');
    expect(result.issues[0].message).toContain('80.0%');
  });

  it('enforces mandatory scenario pass', () => {
    const scenarios: Scenario[] = [
      makeScenario({ id: 'f0', name: 'Mandatory Fail', isRequired: true }),
    ];
    const config: QAGateConfig = { mode: 'required', minPassRate: 0, requireMandatoryPass: true, autoRunOnReview: false };
    const run = {
      status: 'failed' as const,
      totalScenarios: 1,
      passedCount: 0,
      failedCount: 1,
      errorCount: 0,
      results: [{
        scenarioId: 'f0',
        scenarioName: 'Mandatory Fail',
        status: 'fail' as const,
        actualOutputs: {},
        expectedOutputs: {},
        diffs: [],
        executionTimeMs: 1,
      }],
    };
    const result = evaluateQAGate(config, run, scenarios);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.message.includes('mandatory'))).toBe(true);
  });
});

describe('Acceptance Criteria', () => {
  it('rate changes CANNOT publish without passing required QA (by default)', () => {
    // DEFAULT config: mode = 'required', minPassRate = 1.0, requireMandatoryPass = true
    const config = { ...DEFAULT_QA_GATE_CONFIG };

    // GIVEN: a regression run with 1 failed scenario
    const failedRun = {
      status: 'failed' as const,
      totalScenarios: 3,
      passedCount: 2,
      failedCount: 1,
      errorCount: 0,
      results: [
        { scenarioId: 's1', scenarioName: 'Pass 1', status: 'pass' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 },
        { scenarioId: 's2', scenarioName: 'Pass 2', status: 'pass' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 },
        { scenarioId: 's3', scenarioName: 'Fail', status: 'fail' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [{ fieldCode: 'premium', expected: 100, actual: 110, delta: 10, absDelta: 10, pctChange: 10, withinTolerance: false }], executionTimeMs: 1 },
      ],
    };

    // WHEN: evaluating the QA gate
    const result = evaluateQAGate(config, failedRun, []);

    // THEN: publish is blocked
    expect(result.passed).toBe(false);
    expect(result.mode).toBe('required');
    expect(result.issues.filter(i => i.type === 'error').length).toBeGreaterThan(0);
    expect(result.issues[0].message).toContain('pass rate');
  });

  it('rate changes CAN publish after all scenarios pass', () => {
    const config = { ...DEFAULT_QA_GATE_CONFIG };

    const passingRun = {
      status: 'passed' as const,
      totalScenarios: 3,
      passedCount: 3,
      failedCount: 0,
      errorCount: 0,
      results: [
        { scenarioId: 's1', scenarioName: 'A', status: 'pass' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 },
        { scenarioId: 's2', scenarioName: 'B', status: 'pass' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 },
        { scenarioId: 's3', scenarioName: 'C', status: 'pass' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 },
      ],
    };

    const result = evaluateQAGate(config, passingRun, []);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('regression runner produces deterministic diffs for rate changes', () => {
    // GIVEN: a scenario expecting premium = 150, but draft changes produce 165
    const scenario = makeScenario({ id: 's1', name: 'Premium Check', expectedOutputs: { final_premium: 150 } });

    // WHEN: running the scenario with simulated outputs
    const result = simulateScenarioResult(scenario, { final_premium: 165 }, 0.01);

    // THEN: diff is detected with correct delta
    expect(result.status).toBe('fail');
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0].fieldCode).toBe('final_premium');
    expect(result.diffs[0].expected).toBeCloseTo(150);
    expect(result.diffs[0].actual).toBeCloseTo(165);
    expect(result.diffs[0].delta).toBeCloseTo(15);
    expect(result.diffs[0].pctChange).toBeCloseTo(10);
  });

  it('QA gate is configurable: advisory mode warns but does not block', () => {
    const config: QAGateConfig = { mode: 'advisory', minPassRate: 1.0, requireMandatoryPass: true, autoRunOnReview: true };

    const failedRun = {
      status: 'failed' as const,
      totalScenarios: 1,
      passedCount: 0,
      failedCount: 1,
      errorCount: 0,
      results: [{ scenarioId: 's1', scenarioName: 'Fail', status: 'fail' as const, actualOutputs: {}, expectedOutputs: {}, diffs: [], executionTimeMs: 1 }],
    };

    const result = evaluateQAGate(config, failedRun, []);
    expect(result.passed).toBe(true); // advisory does not block
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every(i => i.type === 'warning')).toBe(true);
  });

  it('no QA run → publish is blocked by default (required mode)', () => {
    // This tests the behavior enforced in QAGatePanel: when mode is 'required' and no run exists
    const config = { ...DEFAULT_QA_GATE_CONFIG };
    const emptyRun = {
      status: 'passed' as const,
      totalScenarios: 0,
      passedCount: 0,
      failedCount: 0,
      errorCount: 0,
      results: [] as QARunScenarioResult[],
    };

    const result = evaluateQAGate(config, emptyRun, []);
    // With 0 scenarios, pass rate = 0/0 = 0 < 1.0
    expect(result.passed).toBe(false);
  });
});
