/**
 * Rating Engine Tests
 * 
 * Tests for the deterministic rating engine including:
 * - Topological sorting and cycle detection
 * - Rounding functions
 * - Expression evaluation
 * - Step evaluation
 * - Full evaluation with trace
 * - Determinism verification
 */

import { describe, it, expect } from 'vitest';
import {
  topologicalSort,
  applyRounding,
  evaluateExpression,
  tableLookup,
  evaluate,
  validateDeterminism,
  runTestCase,
} from '../engine/ratingEngine';
import {
  createHash,
  canonicalStringify,
  hashSteps,
  hashInputs,
  hashOutputs,
  combineHashes,
} from '../engine/hashUtils';
import type {
  RatingStep,
  EvaluationContext,
  RatingTableData,
  RatingTestCase,
} from '../types/ratingEngine';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestStep(overrides: Partial<RatingStep> = {}): RatingStep {
  return {
    id: 'step-1',
    rateProgramVersionId: 'rpv-1',
    order: 1,
    type: 'constant',
    name: 'Test Step',
    outputFieldCode: 'test_output',
    inputs: [],
    enabled: true,
    roundingMode: 'none',
    roundingPrecision: 2,
    allStates: true,
    ...overrides,
  };
}

// ============================================================================
// Topological Sort Tests
// ============================================================================

describe('topologicalSort', () => {
  it('sorts independent steps by order', () => {
    const steps = [
      createTestStep({ id: 'c', order: 3, outputFieldCode: 'c_out' }),
      createTestStep({ id: 'a', order: 1, outputFieldCode: 'a_out' }),
      createTestStep({ id: 'b', order: 2, outputFieldCode: 'b_out' }),
    ];

    const result = topologicalSort(steps);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('respects dependencies over order', () => {
    const steps = [
      createTestStep({ id: 'c', order: 1, outputFieldCode: 'c_out', inputs: ['b_out'] }),
      createTestStep({ id: 'a', order: 3, outputFieldCode: 'a_out', inputs: [] }),
      createTestStep({ id: 'b', order: 2, outputFieldCode: 'b_out', inputs: ['a_out'] }),
    ];

    const result = topologicalSort(steps);
    expect(result.hasCycle).toBe(false);
    // a must come before b, b must come before c
    const order = result.sorted.map(s => s.id);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('detects cycles', () => {
    const steps = [
      createTestStep({ id: 'a', outputFieldCode: 'a_out', inputs: ['c_out'] }),
      createTestStep({ id: 'b', outputFieldCode: 'b_out', inputs: ['a_out'] }),
      createTestStep({ id: 'c', outputFieldCode: 'c_out', inputs: ['b_out'] }),
    ];

    const result = topologicalSort(steps);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleSteps).toBeDefined();
    expect(result.cycleSteps?.length).toBe(3);
  });

  it('handles empty input', () => {
    const result = topologicalSort([]);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted).toEqual([]);
  });
});

// ============================================================================
// Rounding Tests
// ============================================================================

describe('applyRounding', () => {
  it('returns value unchanged when mode is none', () => {
    expect(applyRounding(1.567, 'none', 2)).toBe(1.567);
  });

  it('rounds up (ceiling)', () => {
    expect(applyRounding(1.001, 'up', 2)).toBe(1.01);
    expect(applyRounding(1.999, 'up', 2)).toBe(2.00);
  });

  it('rounds down (floor)', () => {
    expect(applyRounding(1.009, 'down', 2)).toBe(1.00);
    expect(applyRounding(1.999, 'down', 2)).toBe(1.99);
  });

  it('rounds nearest (half up)', () => {
    // Use integer precision to avoid floating-point representation issues
    expect(applyRounding(1.5, 'nearest', 0)).toBe(2);
    expect(applyRounding(1.4, 'nearest', 0)).toBe(1);
    expect(applyRounding(2.5, 'nearest', 0)).toBe(3);
    expect(applyRounding(2.4, 'nearest', 0)).toBe(2);
    // Single decimal precision (safe from binary representation issues)
    expect(applyRounding(1.25, 'nearest', 1)).toBe(1.3);
    expect(applyRounding(1.24, 'nearest', 1)).toBe(1.2);
  });

  it('applies bankers rounding (half to even)', () => {
    expect(applyRounding(2.5, 'bankers', 0)).toBe(2);
    expect(applyRounding(3.5, 'bankers', 0)).toBe(4);
    expect(applyRounding(2.25, 'bankers', 1)).toBe(2.2);
    expect(applyRounding(2.35, 'bankers', 1)).toBe(2.4);
  });

  it('truncates decimals', () => {
    expect(applyRounding(1.999, 'truncate', 2)).toBe(1.99);
    expect(applyRounding(-1.999, 'truncate', 2)).toBe(-1.99);
  });

  it('handles precision correctly', () => {
    expect(applyRounding(123.456789, 'nearest', 0)).toBe(123);
    expect(applyRounding(123.456789, 'nearest', 3)).toBe(123.457);
    expect(applyRounding(123.456789, 'nearest', 5)).toBe(123.45679);
  });
});

// ============================================================================
// Expression Evaluation Tests
// ============================================================================

describe('evaluateExpression', () => {
  it('evaluates simple arithmetic', () => {
    const result = evaluateExpression('10 + 20', {});
    expect(result.result).toBe(30);
  });

  it('substitutes field codes', () => {
    const values = { base_rate: 100, factor: 1.5 };
    const result = evaluateExpression('base_rate * factor', values);
    expect(result.result).toBe(150);
    expect(result.evaluatedExpression).toContain('100');
    expect(result.evaluatedExpression).toContain('1.5');
  });

  it('handles complex expressions', () => {
    const values = { a: 10, b: 5, c: 2 };
    const result = evaluateExpression('(a + b) * c', values);
    expect(result.result).toBe(30);
  });

  it('supports exponentiation', () => {
    const result = evaluateExpression('2 ^ 3', {});
    expect(result.result).toBe(8);
  });

  it('throws on invalid expressions', () => {
    expect(() => evaluateExpression('invalid()', {})).toThrow();
  });
});

// ============================================================================
// Table Lookup Tests
// ============================================================================

describe('tableLookup', () => {
  const testTable: RatingTableData = {
    tableVersionId: 'table-v1',
    dimensions: [
      { name: 'Age', fieldCode: 'driver_age', values: ['young', 'middle', 'senior'] },
      { name: 'Territory', fieldCode: 'territory', values: ['urban', 'rural'] },
    ],
    values: {
      'young-urban': 1.5,
      'young-rural': 1.3,
      'middle-urban': 1.0,
      'middle-rural': 0.9,
      'senior-urban': 1.2,
      'senior-rural': 1.1,
    },
  };

  it('returns correct value for matching dimensions', () => {
    const result = tableLookup(testTable, { driver_age: 'young', territory: 'urban' });
    expect(result).not.toBeNull();
    expect(result?.value).toBe(1.5);
    expect(result?.lookupKey).toBe('young-urban');
  });

  it('returns null for missing dimension value', () => {
    const result = tableLookup(testTable, { driver_age: 'young' });
    expect(result).toBeNull();
  });

  it('returns null for non-existent combination', () => {
    const result = tableLookup(testTable, { driver_age: 'unknown', territory: 'urban' });
    expect(result).toBeNull();
  });
});

// ============================================================================
// Full Evaluation Tests
// ============================================================================

describe('evaluate', () => {
  it('evaluates a simple constant step', () => {
    const steps = [
      createTestStep({
        id: 'const-step',
        type: 'constant',
        outputFieldCode: 'base_premium',
        constantValue: 1000,
      }),
    ];

    const context: EvaluationContext = {
      inputs: {},
      effectiveDate: new Date(),
    };

    const result = evaluate(steps, context, 'rpv-1');
    expect(result.success).toBe(true);
    expect(result.outputs['base_premium']).toBe(1000);
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0].applied).toBe(true);
  });

  it('evaluates a factor step', () => {
    const steps = [
      createTestStep({
        id: 'base',
        order: 1,
        type: 'constant',
        outputFieldCode: 'base_premium',
        constantValue: 1000,
      }),
      createTestStep({
        id: 'factor',
        order: 2,
        type: 'factor',
        outputFieldCode: 'adjusted_premium',
        inputs: ['base_premium'],
        factorValue: 1.25,
      }),
    ];

    const context: EvaluationContext = {
      inputs: {},
      effectiveDate: new Date(),
    };

    const result = evaluate(steps, context, 'rpv-1');
    expect(result.success).toBe(true);
    expect(result.outputs['adjusted_premium']).toBe(1250);
  });

  it('evaluates an expression step', () => {
    const steps = [
      createTestStep({
        id: 'base',
        order: 1,
        type: 'constant',
        outputFieldCode: 'base',
        constantValue: 100,
      }),
      createTestStep({
        id: 'expr',
        order: 2,
        type: 'expression',
        outputFieldCode: 'result',
        inputs: ['base'],
        expression: 'base * 2 + 50',
      }),
    ];

    const context: EvaluationContext = {
      inputs: {},
      effectiveDate: new Date(),
    };

    const result = evaluate(steps, context, 'rpv-1');
    expect(result.success).toBe(true);
    expect(result.outputs['result']).toBe(250);
  });

  it('skips disabled steps', () => {
    const steps = [
      createTestStep({
        id: 'disabled',
        type: 'constant',
        outputFieldCode: 'disabled_output',
        constantValue: 999,
        enabled: false,
      }),
    ];

    const context: EvaluationContext = {
      inputs: {},
      effectiveDate: new Date(),
    };

    const result = evaluate(steps, context, 'rpv-1');
    expect(result.trace[0].applied).toBe(false);
    expect(result.trace[0].skipReason).toContain('disabled');
    expect(result.outputs['disabled_output']).toBeUndefined();
  });

  it('applies rounding correctly', () => {
    const steps = [
      createTestStep({
        id: 'base',
        order: 1,
        type: 'constant',
        outputFieldCode: 'base',
        constantValue: 100.567,
        roundingMode: 'nearest',
        roundingPrecision: 2,
      }),
    ];

    const context: EvaluationContext = {
      inputs: {},
      effectiveDate: new Date(),
    };

    const result = evaluate(steps, context, 'rpv-1');
    expect(result.outputs['base']).toBe(100.57);
    expect(result.trace[0].preRoundingValue).toBe(100.567);
  });

  it('produces deterministic results', () => {
    const steps = [
      createTestStep({
        id: 'base',
        order: 1,
        type: 'constant',
        outputFieldCode: 'base',
        constantValue: 500,
      }),
      createTestStep({
        id: 'factor',
        order: 2,
        type: 'factor',
        outputFieldCode: 'premium',
        inputs: ['base'],
        factorValue: 1.15,
      }),
    ];

    const context: EvaluationContext = {
      inputs: { driver_age: 35 },
      effectiveDate: new Date('2024-01-01'),
    };

    // Run multiple times and verify same result hash
    const result1 = evaluate(steps, context, 'rpv-1');
    const result2 = evaluate(steps, context, 'rpv-1');
    const result3 = evaluate(steps, context, 'rpv-1');

    expect(result1.resultHash).toBe(result2.resultHash);
    expect(result2.resultHash).toBe(result3.resultHash);
    expect(result1.outputs).toEqual(result2.outputs);
  });
});

// ============================================================================
// Determinism Validation Tests
// ============================================================================

describe('validateDeterminism', () => {
  it('validates a valid program', () => {
    const steps = [
      createTestStep({ id: 'a', outputFieldCode: 'a_out', inputs: [] }),
      createTestStep({ id: 'b', outputFieldCode: 'b_out', inputs: ['a_out'] }),
    ];

    const result = validateDeterminism(steps, []);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects cycles', () => {
    const steps = [
      createTestStep({ id: 'a', outputFieldCode: 'a_out', inputs: ['b_out'] }),
      createTestStep({ id: 'b', outputFieldCode: 'b_out', inputs: ['a_out'] }),
    ];

    const result = validateDeterminism(steps, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('detects undefined fields', () => {
    const steps = [
      createTestStep({ id: 'a', outputFieldCode: 'a_out', inputs: ['nonexistent'] }),
    ];

    const result = validateDeterminism(steps, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'UNDEFINED_FIELD')).toBe(true);
  });

  it('allows fields from data dictionary', () => {
    const steps = [
      createTestStep({ id: 'a', outputFieldCode: 'a_out', inputs: ['driver_age'] }),
    ];

    const result = validateDeterminism(steps, ['driver_age']);
    expect(result.isValid).toBe(true);
  });

  it('builds dependency graph', () => {
    const steps = [
      createTestStep({ id: 'a', order: 1, outputFieldCode: 'a_out', inputs: [] }),
      createTestStep({ id: 'b', order: 2, outputFieldCode: 'b_out', inputs: ['a_out'] }),
      createTestStep({ id: 'c', order: 3, outputFieldCode: 'c_out', inputs: ['b_out'] }),
    ];

    const result = validateDeterminism(steps, []);
    expect(result.dependencyGraph).toHaveLength(3);

    const nodeA = result.dependencyGraph.find(n => n.stepId === 'a');
    expect(nodeA?.dependsOn).toEqual([]);
    expect(nodeA?.dependedOnBy).toContain('b');
  });
});

// ============================================================================
// Hash Utilities Tests
// ============================================================================

describe('hashUtils', () => {
  it('creates consistent hashes', () => {
    const value = { a: 1, b: 'test', c: [1, 2, 3] };
    const hash1 = createHash(value);
    const hash2 = createHash(value);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different values', () => {
    const hash1 = createHash({ a: 1 });
    const hash2 = createHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it('canonicalStringify orders object keys', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
  });

  it('hashSteps creates consistent step hashes', () => {
    const steps = [
      { id: 'a', order: 1, type: 'constant', outputFieldCode: 'a_out' },
      { id: 'b', order: 2, type: 'factor', outputFieldCode: 'b_out' },
    ];
    const hash1 = hashSteps(steps);
    const hash2 = hashSteps(steps);
    expect(hash1).toBe(hash2);
  });

  it('combineHashes creates deterministic combined hash', () => {
    const combined1 = combineHashes('abc', 'def', 'ghi');
    const combined2 = combineHashes('abc', 'def', 'ghi');
    expect(combined1).toBe(combined2);
  });
});

// ============================================================================
// Test Case Runner Tests
// ============================================================================

describe('runTestCase', () => {
  it('passes when outputs match', () => {
    const steps = [
      createTestStep({
        type: 'constant',
        outputFieldCode: 'premium',
        constantValue: 1000,
      }),
    ];

    const testCase: RatingTestCase = {
      id: 'test-1',
      name: 'Basic Premium Test',
      rateProgramVersionId: 'rpv-1',
      inputs: {},
      expectedOutputs: { premium: 1000 },
      tolerance: 0.01,
      createdAt: new Date(),
      createdBy: 'test',
    };

    const result = runTestCase(testCase, steps, new Map());
    expect(result.passed).toBe(true);
    expect(result.differences[0].withinTolerance).toBe(true);
  });

  it('fails when outputs differ beyond tolerance', () => {
    const steps = [
      createTestStep({
        type: 'constant',
        outputFieldCode: 'premium',
        constantValue: 1000,
      }),
    ];

    const testCase: RatingTestCase = {
      id: 'test-1',
      name: 'Basic Premium Test',
      rateProgramVersionId: 'rpv-1',
      inputs: {},
      expectedOutputs: { premium: 2000 }, // Wrong expected value
      tolerance: 0.01,
      createdAt: new Date(),
      createdBy: 'test',
    };

    const result = runTestCase(testCase, steps, new Map());
    expect(result.passed).toBe(false);
    expect(result.differences[0].withinTolerance).toBe(false);
    expect(result.differences[0].difference).toBe(1000);
  });
});

