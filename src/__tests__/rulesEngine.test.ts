/**
 * Underwriting Rules Engine Tests
 *
 * Comprehensive test suite covering:
 * - Leaf condition evaluation (all operators)
 * - Group evaluation (AND / OR / nested)
 * - Scope filtering (product version, state, coverage, effective dates)
 * - Full evaluation with trace & determinism
 * - Validation
 * - Product 360 readiness checks
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateRules,
  validateRuleVersion,
  checkRuleReadiness,
  extractFieldCodes,
} from '../engine/rulesEngine';
import type { RuleWithVersion } from '../engine/rulesEngine';
import type {
  ConditionGroup,
  ConditionLeaf,
  RuleEvaluationContext,
  UnderwritingRuleVersion,
  RuleOutcome,
  RuleScope,
} from '../types/rulesEngine';
import { createEmptyGroup, createEmptyLeaf, generateConditionId } from '../types/rulesEngine';

// ============================================================================
// Helpers
// ============================================================================

function leaf(overrides: Partial<ConditionLeaf> = {}): ConditionLeaf {
  return {
    kind: 'leaf',
    id: generateConditionId(),
    fieldCode: 'test_field',
    operator: 'eq',
    value: '',
    ...overrides,
  };
}

function group(
  op: 'AND' | 'OR',
  ...children: (ConditionLeaf | ConditionGroup)[]
): ConditionGroup {
  return {
    kind: 'group',
    id: generateConditionId(),
    operator: op,
    conditions: children,
  };
}

function makeOutcome(overrides: Partial<RuleOutcome> = {}): RuleOutcome {
  return {
    action: 'flag',
    message: 'Test outcome',
    severity: 'warning',
    requiredDocs: [],
    ...overrides,
  };
}

function makeScope(overrides: Partial<RuleScope> = {}): RuleScope {
  return {
    productVersionId: 'pv-1',
    stateCode: null,
    coverageVersionId: null,
    ...overrides,
  };
}

function makeVersion(overrides: Partial<UnderwritingRuleVersion> = {}): UnderwritingRuleVersion {
  return {
    id: 'rv-1',
    ruleId: 'rule-1',
    versionNumber: 1,
    status: 'published',
    conditions: group('AND', leaf({ fieldCode: 'building_age', operator: 'gt', value: 50 })),
    outcome: makeOutcome(),
    scope: makeScope(),
    effectiveStart: null,
    effectiveEnd: null,
    createdAt: new Date(),
    createdBy: 'test',
    updatedAt: new Date(),
    updatedBy: 'test',
    ...overrides,
  };
}

function makeRuleWithVersion(overrides: Partial<RuleWithVersion> & { version?: Partial<UnderwritingRuleVersion> } = {}): RuleWithVersion {
  const { version: versionOverrides, ...rest } = overrides;
  return {
    ruleId: 'rule-1',
    ruleName: 'Test Rule',
    ruleType: 'eligibility',
    version: makeVersion(versionOverrides),
    ...rest,
  };
}

function makeContext(overrides: Partial<RuleEvaluationContext> = {}): RuleEvaluationContext {
  return {
    inputs: {},
    productVersionId: 'pv-1',
    effectiveDate: new Date('2025-06-15'),
    ...overrides,
  };
}

// ============================================================================
// Leaf Condition Operator Tests
// ============================================================================

describe('Condition operators', () => {
  it('eq – matches equal values', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'status', operator: 'eq', value: 'active' })) },
    });
    const result = evaluateRules([rule], makeContext({ inputs: { status: 'active' } }));
    expect(result.firedRules).toHaveLength(1);
  });

  it('eq – does not match unequal values', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'status', operator: 'eq', value: 'active' })) },
    });
    const result = evaluateRules([rule], makeContext({ inputs: { status: 'inactive' } }));
    expect(result.firedRules).toHaveLength(0);
  });

  it('ne – matches unequal values', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'status', operator: 'ne', value: 'active' })) },
    });
    const result = evaluateRules([rule], makeContext({ inputs: { status: 'inactive' } }));
    expect(result.firedRules).toHaveLength(1);
  });

  it('gt – numeric comparison', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'age', operator: 'gt', value: 30 })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { age: 31 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { age: 30 } })).firedRules).toHaveLength(0);
    expect(evaluateRules([rule], makeContext({ inputs: { age: 29 } })).firedRules).toHaveLength(0);
  });

  it('gte – numeric comparison', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'age', operator: 'gte', value: 30 })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { age: 30 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { age: 29 } })).firedRules).toHaveLength(0);
  });

  it('lt / lte – numeric comparison', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'sqft', operator: 'lt', value: 1000 })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { sqft: 999 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { sqft: 1000 } })).firedRules).toHaveLength(0);

    const ruleLte = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'sqft', operator: 'lte', value: 1000 })) },
    });
    expect(evaluateRules([ruleLte], makeContext({ inputs: { sqft: 1000 } })).firedRules).toHaveLength(1);
  });

  it('between – inclusive range', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'score', operator: 'between', value: 10, valueEnd: 20 })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { score: 10 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { score: 15 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { score: 20 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { score: 9 } })).firedRules).toHaveLength(0);
    expect(evaluateRules([rule], makeContext({ inputs: { score: 21 } })).firedRules).toHaveLength(0);
  });

  it('in – value in list', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'state', operator: 'in', value: ['CA', 'NY', 'TX'] })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { state: 'CA' } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { state: 'FL' } })).firedRules).toHaveLength(0);
  });

  it('notIn – value not in list', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'state', operator: 'notIn', value: ['CA', 'NY'] })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { state: 'TX' } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { state: 'CA' } })).firedRules).toHaveLength(0);
  });

  it('contains – string substring', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'desc', operator: 'contains', value: 'flood' })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: { desc: 'flood zone A' } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { desc: 'wind zone' } })).firedRules).toHaveLength(0);
  });

  it('isTrue / isFalse – boolean checks', () => {
    const ruleTrue = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'is_commercial', operator: 'isTrue', value: '' })) },
    });
    expect(evaluateRules([ruleTrue], makeContext({ inputs: { is_commercial: true } })).firedRules).toHaveLength(1);
    expect(evaluateRules([ruleTrue], makeContext({ inputs: { is_commercial: false } })).firedRules).toHaveLength(0);

    const ruleFalse = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'is_commercial', operator: 'isFalse', value: '' })) },
    });
    expect(evaluateRules([ruleFalse], makeContext({ inputs: { is_commercial: false } })).firedRules).toHaveLength(1);
  });

  it('missing field – evaluates to false (except isFalse)', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'missing_field', operator: 'eq', value: 'anything' })) },
    });
    expect(evaluateRules([rule], makeContext({ inputs: {} })).firedRules).toHaveLength(0);

    const ruleFalse = makeRuleWithVersion({
      version: { conditions: group('AND', leaf({ fieldCode: 'missing_field', operator: 'isFalse', value: '' })) },
    });
    expect(evaluateRules([ruleFalse], makeContext({ inputs: {} })).firedRules).toHaveLength(1);
  });
});

// ============================================================================
// Group Logic Tests
// ============================================================================

describe('Group logic (AND / OR / nested)', () => {
  it('AND – requires all children to be true', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND',
          leaf({ fieldCode: 'a', operator: 'eq', value: 1 }),
          leaf({ fieldCode: 'b', operator: 'eq', value: 2 }),
        ),
      },
    });

    expect(evaluateRules([rule], makeContext({ inputs: { a: 1, b: 2 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { a: 1, b: 3 } })).firedRules).toHaveLength(0);
    expect(evaluateRules([rule], makeContext({ inputs: { a: 0, b: 2 } })).firedRules).toHaveLength(0);
  });

  it('OR – requires at least one child to be true', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('OR',
          leaf({ fieldCode: 'a', operator: 'eq', value: 1 }),
          leaf({ fieldCode: 'b', operator: 'eq', value: 2 }),
        ),
      },
    });

    expect(evaluateRules([rule], makeContext({ inputs: { a: 1, b: 99 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { a: 99, b: 2 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { a: 99, b: 99 } })).firedRules).toHaveLength(0);
  });

  it('Nested – AND containing OR', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND',
          leaf({ fieldCode: 'building_age', operator: 'gt', value: 50 }),
          group('OR',
            leaf({ fieldCode: 'state', operator: 'eq', value: 'FL' }),
            leaf({ fieldCode: 'state', operator: 'eq', value: 'TX' }),
          ),
        ),
      },
    });

    // building_age > 50 AND (state = FL OR state = TX)
    expect(evaluateRules([rule], makeContext({ inputs: { building_age: 60, state: 'FL' } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { building_age: 60, state: 'TX' } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ inputs: { building_age: 60, state: 'CA' } })).firedRules).toHaveLength(0);
    expect(evaluateRules([rule], makeContext({ inputs: { building_age: 40, state: 'FL' } })).firedRules).toHaveLength(0);
  });

  it('Empty group evaluates to true (vacuously true)', () => {
    const rule = makeRuleWithVersion({
      version: { conditions: { kind: 'group', id: 'g1', operator: 'AND', conditions: [] } },
    });
    expect(evaluateRules([rule], makeContext({ inputs: {} })).firedRules).toHaveLength(1);
  });
});

// ============================================================================
// Scope Filtering Tests
// ============================================================================

describe('Scope filtering', () => {
  it('filters by product version', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
        scope: makeScope({ productVersionId: 'pv-A' }),
      },
    });

    // Matching product version
    expect(evaluateRules([rule], makeContext({ productVersionId: 'pv-A', inputs: { x: 1 } })).firedRules).toHaveLength(1);
    // Non-matching
    const result = evaluateRules([rule], makeContext({ productVersionId: 'pv-B', inputs: { x: 1 } }));
    expect(result.firedRules).toHaveLength(0);
    expect(result.trace[0].skipReason).toContain('Product version mismatch');
  });

  it('filters by state code', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
        scope: makeScope({ stateCode: 'CA' }),
      },
    });

    expect(evaluateRules([rule], makeContext({ state: 'CA', inputs: { x: 1 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ state: 'NY', inputs: { x: 1 } })).firedRules).toHaveLength(0);
  });

  it('null state scope means all states', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
        scope: makeScope({ stateCode: null }),
      },
    });

    expect(evaluateRules([rule], makeContext({ state: 'CA', inputs: { x: 1 } })).firedRules).toHaveLength(1);
    expect(evaluateRules([rule], makeContext({ state: 'NY', inputs: { x: 1 } })).firedRules).toHaveLength(1);
  });

  it('filters by effective date range', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
        effectiveStart: '2025-01-01',
        effectiveEnd: '2025-12-31',
      },
    });

    // Within range
    expect(evaluateRules([rule], makeContext({ effectiveDate: new Date('2025-06-15'), inputs: { x: 1 } })).firedRules).toHaveLength(1);
    // Before range
    expect(evaluateRules([rule], makeContext({ effectiveDate: new Date('2024-12-31'), inputs: { x: 1 } })).firedRules).toHaveLength(0);
    // After range
    expect(evaluateRules([rule], makeContext({ effectiveDate: new Date('2026-01-01'), inputs: { x: 1 } })).firedRules).toHaveLength(0);
  });
});

// ============================================================================
// Full Evaluation Tests
// ============================================================================

describe('Full evaluation', () => {
  it('produces a complete trace', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND',
          leaf({ fieldCode: 'building_age', operator: 'gt', value: 50 }),
          leaf({ fieldCode: 'protection_class', operator: 'lte', value: 5 }),
        ),
        outcome: makeOutcome({ action: 'refer', message: 'Old building', severity: 'warning' }),
      },
    });

    const result = evaluateRules([rule], makeContext({ inputs: { building_age: 60, protection_class: 3 } }));

    expect(result.success).toBe(true);
    expect(result.firedRules).toHaveLength(1);
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0].conditionTrace).toHaveLength(2);
    expect(result.trace[0].conditionTrace[0].result).toBe(true);
    expect(result.trace[0].conditionTrace[1].result).toBe(true);
    expect(result.aggregateAction).toBe('refer');
    expect(result.aggregateSeverity).toBe('warning');
  });

  it('evaluates multiple rules and picks highest severity', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleId: 'r1',
        ruleName: 'Low severity',
        version: {
          id: 'rv-1',
          conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
          outcome: makeOutcome({ action: 'flag', severity: 'info' }),
        },
      }),
      makeRuleWithVersion({
        ruleId: 'r2',
        ruleName: 'High severity',
        version: {
          id: 'rv-2',
          conditions: group('AND', leaf({ fieldCode: 'x', operator: 'eq', value: 1 })),
          outcome: makeOutcome({ action: 'decline', severity: 'block' }),
        },
      }),
    ];

    const result = evaluateRules(rules, makeContext({ inputs: { x: 1 } }));
    expect(result.firedRules).toHaveLength(2);
    expect(result.aggregateSeverity).toBe('block');
    expect(result.aggregateAction).toBe('decline');
  });

  it('is deterministic – same inputs produce same hash', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'a', operator: 'gt', value: 10 })),
        outcome: makeOutcome({ action: 'refer', severity: 'warning' }),
      },
    });
    const ctx = makeContext({ inputs: { a: 20 } });

    const r1 = evaluateRules([rule], ctx);
    const r2 = evaluateRules([rule], ctx);
    const r3 = evaluateRules([rule], ctx);

    expect(r1.resultHash).toBe(r2.resultHash);
    expect(r2.resultHash).toBe(r3.resultHash);
    expect(r1.firedRules.length).toBe(r2.firedRules.length);
  });

  it('passes rules that do not fire', () => {
    const rule = makeRuleWithVersion({
      version: {
        conditions: group('AND', leaf({ fieldCode: 'a', operator: 'gt', value: 100 })),
        outcome: makeOutcome({ action: 'decline', severity: 'block' }),
      },
    });

    const result = evaluateRules([rule], makeContext({ inputs: { a: 5 } }));
    expect(result.firedRules).toHaveLength(0);
    expect(result.passedRules).toHaveLength(1);
    expect(result.aggregateAction).toBeNull();
    expect(result.aggregateSeverity).toBeNull();
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateRuleVersion', () => {
  it('passes valid rule version', () => {
    const version = makeVersion({
      conditions: group('AND', leaf({ fieldCode: 'building_age', operator: 'gt', value: 50 })),
      outcome: makeOutcome({ message: 'Old building' }),
    });

    const result = validateRuleVersion(version, ['building_age']);
    expect(result.isValid).toBe(true);
    expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
    expect(result.referencedFieldCodes).toContain('building_age');
  });

  it('reports unknown field codes', () => {
    const version = makeVersion({
      conditions: group('AND', leaf({ fieldCode: 'nonexistent_field', operator: 'eq', value: 'x' })),
    });

    const result = validateRuleVersion(version, ['building_age']);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.type === 'error' && i.fieldCode === 'nonexistent_field')).toBe(true);
  });

  it('reports empty field code', () => {
    const version = makeVersion({
      conditions: group('AND', leaf({ fieldCode: '', operator: 'eq', value: 'x' })),
    });

    const result = validateRuleVersion(version, []);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.message.includes('no field selected'))).toBe(true);
  });

  it('reports between without end value', () => {
    const version = makeVersion({
      conditions: group('AND', leaf({ fieldCode: 'age', operator: 'between', value: 10 })),
    });

    const result = validateRuleVersion(version, ['age']);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.message.includes('end value'))).toBe(true);
  });

  it('reports missing product version scope', () => {
    const version = makeVersion({
      scope: makeScope({ productVersionId: '' }),
    });

    const result = validateRuleVersion(version, ['building_age']);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.message.includes('product version'))).toBe(true);
  });

  it('warns on empty outcome message', () => {
    const version = makeVersion({
      outcome: makeOutcome({ message: '' }),
    });

    const result = validateRuleVersion(version, ['building_age']);
    expect(result.issues.some(i => i.type === 'warning' && i.message.includes('Outcome message'))).toBe(true);
  });
});

// ============================================================================
// Readiness Check Tests
// ============================================================================

describe('checkRuleReadiness', () => {
  it('reports draft-only rules', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleId: 'r1',
        ruleName: 'Draft rule',
        version: makeVersion({ status: 'draft' }),
      }),
    ];

    const check = checkRuleReadiness(rules, 'pv-1', ['building_age']);
    expect(check.totalRules).toBe(1);
    expect(check.draftRules).toBe(1);
    expect(check.issues.some(i => i.type === 'draft_only')).toBe(true);
  });

  it('reports expired rules', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleId: 'r1',
        ruleName: 'Expired rule',
        version: makeVersion({ status: 'published', effectiveEnd: '2020-01-01' }),
      }),
    ];

    const check = checkRuleReadiness(rules, 'pv-1', ['building_age']);
    expect(check.issues.some(i => i.type === 'expired_rule')).toBe(true);
  });

  it('reports conflicting rules', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleId: 'r1',
        ruleName: 'Accept rule',
        ruleType: 'eligibility',
        version: makeVersion({ id: 'rv-1', outcome: makeOutcome({ action: 'accept' }), status: 'published' }),
      }),
      makeRuleWithVersion({
        ruleId: 'r2',
        ruleName: 'Decline rule',
        ruleType: 'eligibility',
        version: makeVersion({ id: 'rv-2', outcome: makeOutcome({ action: 'decline' }), status: 'published' }),
      }),
    ];

    const check = checkRuleReadiness(rules, 'pv-1', ['building_age']);
    expect(check.issues.some(i => i.type === 'conflicting_rules')).toBe(true);
  });

  it('reports missing eligibility rules', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleType: 'validation',
        version: makeVersion({ status: 'published' }),
      }),
    ];

    const check = checkRuleReadiness(rules, 'pv-1', ['building_age']);
    expect(check.issues.some(i => i.type === 'missing_rule')).toBe(true);
  });

  it('reports no issues for a healthy rule set', () => {
    const rules: RuleWithVersion[] = [
      makeRuleWithVersion({
        ruleType: 'eligibility',
        version: makeVersion({ status: 'published', effectiveEnd: '2030-12-31' }),
      }),
    ];

    const check = checkRuleReadiness(rules, 'pv-1', ['building_age']);
    expect(check.publishedRules).toBe(1);
    expect(check.issues.filter(i => i.severity === 'error')).toHaveLength(0);
  });
});

// ============================================================================
// Utility Tests
// ============================================================================

describe('extractFieldCodes', () => {
  it('extracts field codes from nested condition tree', () => {
    const tree = group('AND',
      leaf({ fieldCode: 'a' }),
      group('OR',
        leaf({ fieldCode: 'b' }),
        leaf({ fieldCode: 'c' }),
      ),
    );

    const codes = extractFieldCodes(tree);
    expect(codes).toContain('a');
    expect(codes).toContain('b');
    expect(codes).toContain('c');
    expect(codes).toHaveLength(3);
  });
});

describe('createEmptyGroup / createEmptyLeaf', () => {
  it('creates valid empty structures', () => {
    const g = createEmptyGroup('OR');
    expect(g.kind).toBe('group');
    expect(g.operator).toBe('OR');
    expect(g.conditions).toHaveLength(1);
    expect(g.conditions[0].kind).toBe('leaf');

    const l = createEmptyLeaf();
    expect(l.kind).toBe('leaf');
    expect(l.fieldCode).toBe('');
    expect(l.operator).toBe('eq');
  });
});
