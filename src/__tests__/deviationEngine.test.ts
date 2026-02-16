/**
 * Deviation Engine – unit tests
 *
 * Tests for:
 *  1. Dot-path accessors (getNestedValue, setNestedValue, removeNestedValue)
 *  2. applyOverrides (merge base + overrides)
 *  3. computeDiff (inheritance diff)
 *  4. detectConflicts (base drift detection)
 *  5. validateOverrides (structural + type validation)
 *  6. hashObjectSync (deterministic hashing)
 *  7. Acceptance criteria: explain how NY differs and overrides survive base edits
 */

import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  getNestedValue,
  setNestedValue,
  removeNestedValue,
  applyOverrides,
  computeDiff,
  detectConflicts,
  validateOverrides,
  hashObjectSync,
  canonicalStringify,
  enumerateLeafPaths,
  pathToLabel,
  inferCategory,
  deepEqual,
} from '../engine/deviationEngine';
import type { Override } from '../types/deviation';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

const ts = Timestamp.now();

function makeOverride(path: string, baseValue: unknown, value: unknown, extra?: Partial<Override>): Override {
  return {
    path,
    baseValue,
    value,
    fieldLabel: path,
    category: 'general',
    updatedBy: 'test-user',
    updatedAt: ts,
    ...extra,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. Dot-path accessors
// ════════════════════════════════════════════════════════════════════════

describe('getNestedValue', () => {
  it('reads a top-level key', () => {
    expect(getNestedValue({ foo: 42 }, 'foo')).toBe(42);
  });
  it('reads a deeply nested key', () => {
    expect(getNestedValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
  });
  it('returns undefined for missing paths', () => {
    expect(getNestedValue({ a: 1 }, 'b.c.d')).toBeUndefined();
  });
  it('handles null/undefined objects', () => {
    expect(getNestedValue(null, 'a')).toBeUndefined();
    expect(getNestedValue(undefined, 'a')).toBeUndefined();
  });
});

describe('setNestedValue', () => {
  it('sets a top-level key', () => {
    const result = setNestedValue({ foo: 1 }, 'foo', 99);
    expect(result.foo).toBe(99);
  });
  it('sets a deeply nested key, creating intermediates', () => {
    const result = setNestedValue({}, 'a.b.c', 'new');
    expect((result as any).a.b.c).toBe('new');
  });
  it('does not mutate the original', () => {
    const original = { a: { b: 1 } };
    const result = setNestedValue(original, 'a.b', 2);
    expect(original.a.b).toBe(1);
    expect((result as any).a.b).toBe(2);
  });
});

describe('removeNestedValue', () => {
  it('removes a nested key', () => {
    const result = removeNestedValue({ a: { b: 1, c: 2 } }, 'a.b');
    expect((result as any).a.b).toBeUndefined();
    expect((result as any).a.c).toBe(2);
  });
  it('does not mutate the original', () => {
    const original = { a: { b: 1 } };
    removeNestedValue(original, 'a.b');
    expect(original.a.b).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. applyOverrides
// ════════════════════════════════════════════════════════════════════════

describe('applyOverrides', () => {
  const base = {
    coverages: {
      CGL: { limits: { perOccurrence: 1000000, aggregate: 2000000 } },
    },
    deductible: 500,
  };

  it('returns base unchanged when no overrides', () => {
    const result = applyOverrides(base, {});
    expect(result).toEqual(base);
  });

  it('applies a single override', () => {
    const overrides = {
      'coverages.CGL.limits.perOccurrence': makeOverride(
        'coverages.CGL.limits.perOccurrence', 1000000, 500000,
      ),
    };
    const result = applyOverrides(base, overrides);
    expect((result as any).coverages.CGL.limits.perOccurrence).toBe(500000);
    expect((result as any).coverages.CGL.limits.aggregate).toBe(2000000); // unchanged
  });

  it('applies multiple overrides', () => {
    const overrides = {
      'coverages.CGL.limits.perOccurrence': makeOverride(
        'coverages.CGL.limits.perOccurrence', 1000000, 500000,
      ),
      'deductible': makeOverride('deductible', 500, 1000),
    };
    const result = applyOverrides(base, overrides);
    expect((result as any).coverages.CGL.limits.perOccurrence).toBe(500000);
    expect((result as any).deductible).toBe(1000);
  });

  it('does not mutate the original base', () => {
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    applyOverrides(base, overrides);
    expect(base.deductible).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. computeDiff
// ════════════════════════════════════════════════════════════════════════

describe('computeDiff', () => {
  const base = {
    limits: { perOccurrence: 1000000, aggregate: 2000000 },
    deductible: 500,
    eligible: true,
  };

  it('marks everything as inherited when no overrides', () => {
    const diff = computeDiff(base, {}, 'CA', 'California');
    expect(diff.overrideCount).toBe(0);
    expect(diff.conflictCount).toBe(0);
    expect(diff.entries.every(e => e.status === 'inherited')).toBe(true);
    // 4 leaf paths: limits.perOccurrence, limits.aggregate, deductible, eligible
    expect(diff.entries.length).toBe(4);
  });

  it('marks an override as "overridden"', () => {
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    const diff = computeDiff(base, overrides, 'NY', 'New York');
    const ded = diff.entries.find(e => e.path === 'deductible');
    expect(ded?.status).toBe('overridden');
    expect(ded?.baseValue).toBe(500);
    expect(ded?.overrideValue).toBe(1000);
    expect(ded?.effectiveValue).toBe(1000);
  });

  it('detects conflicts when base has changed', () => {
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000), // baseValue was 500
    };
    // Simulate base having changed to 750
    const changedBase = { ...base, deductible: 750 };
    const diff = computeDiff(changedBase, overrides, 'NY', 'New York');
    const ded = diff.entries.find(e => e.path === 'deductible');
    expect(ded?.status).toBe('conflict');
    expect(ded?.conflictBaseValue).toBe(750);
    expect(ded?.originalBaseValue).toBe(500);
    expect(diff.conflictCount).toBe(1);
  });

  it('marks extra override paths as "added"', () => {
    const overrides = {
      'surcharge.windHail': makeOverride('surcharge.windHail', undefined, 0.15),
    };
    const diff = computeDiff(base, overrides, 'FL', 'Florida');
    const added = diff.entries.find(e => e.path === 'surcharge.windHail');
    expect(added?.status).toBe('added');
    expect(added?.effectiveValue).toBe(0.15);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. detectConflicts
// ════════════════════════════════════════════════════════════════════════

describe('detectConflicts', () => {
  it('returns empty when base has not changed', () => {
    const base = { deductible: 500 };
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    expect(detectConflicts(base, overrides)).toHaveLength(0);
  });

  it('detects when base has drifted', () => {
    const base = { deductible: 750 }; // changed from 500
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    const conflicts = detectConflicts(base, overrides);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].currentBaseValue).toBe(750);
  });

  it('handles nested path drift', () => {
    const base = { coverage: { limits: { per: 2000000 } } };
    const overrides = {
      'coverage.limits.per': makeOverride('coverage.limits.per', 1000000, 500000),
    };
    const conflicts = detectConflicts(base, overrides);
    expect(conflicts).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. validateOverrides
// ════════════════════════════════════════════════════════════════════════

describe('validateOverrides', () => {
  it('returns no errors for valid overrides', () => {
    const base = { deductible: 500 };
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors).toHaveLength(0);
  });

  it('flags orphaned overrides', () => {
    const base = { other: 1 };
    const overrides = {
      'removed.field': makeOverride('removed.field', 'old', 'new'),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors.some(e => e.type === 'orphaned_override')).toBe(true);
  });

  it('flags type mismatches', () => {
    const base = { deductible: 500 };
    const overrides = {
      'deductible': makeOverride('deductible', 500, 'not-a-number'),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors.some(e => e.type === 'type_mismatch')).toBe(true);
  });

  it('flags conflict when base drifted', () => {
    const base = { deductible: 750 };
    const overrides = {
      'deductible': makeOverride('deductible', 500, 1000),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors.some(e => e.type === 'conflict')).toBe(true);
  });

  it('flags required_field when override sets null', () => {
    const base = { deductible: 500 };
    const overrides = {
      'deductible': makeOverride('deductible', 500, null),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors.some(e => e.type === 'required_field')).toBe(true);
  });

  it('flags negative override on positive base', () => {
    const base = { premium: 1000 };
    const overrides = {
      'premium': makeOverride('premium', 1000, -500),
    };
    const errors = validateOverrides(base, overrides);
    expect(errors.some(e => e.type === 'out_of_range')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. Hashing
// ════════════════════════════════════════════════════════════════════════

describe('hashObjectSync', () => {
  it('produces consistent hashes', () => {
    const a = hashObjectSync({ x: 1, y: 2 });
    const b = hashObjectSync({ x: 1, y: 2 });
    expect(a).toBe(b);
  });

  it('produces different hashes for different values', () => {
    const a = hashObjectSync({ x: 1 });
    const b = hashObjectSync({ x: 2 });
    expect(a).not.toBe(b);
  });

  it('is key-order independent', () => {
    const a = hashObjectSync({ b: 2, a: 1 });
    const b = hashObjectSync({ a: 1, b: 2 });
    expect(a).toBe(b);
  });
});

describe('canonicalStringify', () => {
  it('sorts object keys', () => {
    const result = canonicalStringify({ z: 1, a: 2, m: 3 });
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Utility helpers
// ════════════════════════════════════════════════════════════════════════

describe('enumerateLeafPaths', () => {
  it('enumerates flat objects', () => {
    const result = enumerateLeafPaths({ a: 1, b: 2 });
    expect(result.map(r => r.path)).toEqual(['a', 'b']);
  });

  it('enumerates nested objects', () => {
    const result = enumerateLeafPaths({ a: { b: 1, c: { d: 2 } } });
    expect(result.map(r => r.path)).toEqual(['a.b', 'a.c.d']);
  });

  it('handles arrays as leaf values', () => {
    const result = enumerateLeafPaths({ tags: ['a', 'b'] });
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('tags');
    expect(result[0].value).toEqual(['a', 'b']);
  });
});

describe('pathToLabel', () => {
  it('converts camelCase to spaced words', () => {
    expect(pathToLabel('coverages.perOccurrence')).toBe('Per Occurrence');
  });
  it('converts underscores to spaces', () => {
    expect(pathToLabel('max_limit')).toBe('Max Limit');
  });
});

describe('inferCategory', () => {
  it('infers limits', () => expect(inferCategory('coverage.limits.per')).toBe('limits'));
  it('infers rates', () => expect(inferCategory('basePremium')).toBe('rates'));
  it('infers deductibles', () => expect(inferCategory('deductibleAmount')).toBe('deductibles'));
  it('defaults to general', () => expect(inferCategory('someField')).toBe('general'));
});

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'a')).toBe(true);
  });
  it('compares objects deeply', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
  it('handles null/undefined', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 8. Acceptance criteria
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance: explain how NY differs and overrides survive base edits', () => {
  const baseConfig = {
    coverages: {
      CGL: {
        limits: { perOccurrence: 1000000, aggregate: 2000000 },
        deductible: 500,
      },
    },
    eligibility: { minYearsInBusiness: 3 },
    basePremium: 5000,
  };

  it('ACCEPTANCE: NY deviations are fully enumerable and explainable', () => {
    const overrides: Record<string, Override> = {
      'coverages.CGL.limits.perOccurrence': makeOverride(
        'coverages.CGL.limits.perOccurrence', 1000000, 2000000,
        { fieldLabel: 'Per Occurrence Limit', category: 'limits', note: 'NY requires higher minimum limits' },
      ),
      'coverages.CGL.deductible': makeOverride(
        'coverages.CGL.deductible', 500, 1000,
        { fieldLabel: 'Deductible', category: 'deductibles', note: 'NY regulation 88-A' },
      ),
      'eligibility.minYearsInBusiness': makeOverride(
        'eligibility.minYearsInBusiness', 3, 5,
        { fieldLabel: 'Min Years in Business', category: 'eligibility', note: 'Stricter NY eligibility' },
      ),
    };

    const diff = computeDiff(baseConfig, overrides, 'NY', 'New York');

    // 1. Can enumerate all overrides
    expect(diff.overrideCount).toBe(3);

    // 2. Each entry shows the "why" (note) and the old vs new value
    const limitEntry = diff.entries.find(e => e.path === 'coverages.CGL.limits.perOccurrence');
    expect(limitEntry?.status).toBe('overridden');
    expect(limitEntry?.baseValue).toBe(1000000);
    expect(limitEntry?.effectiveValue).toBe(2000000);

    // 3. Inherited values are visible
    const inherited = diff.entries.filter(e => e.status === 'inherited');
    expect(inherited.length).toBeGreaterThan(0);
    const basePremEntry = inherited.find(e => e.path === 'basePremium');
    expect(basePremEntry?.effectiveValue).toBe(5000); // unchanged

    // 4. Categories are inferred
    expect(limitEntry?.category).toBe('limits');
    const dedEntry = diff.entries.find(e => e.path === 'coverages.CGL.deductible');
    expect(dedEntry?.category).toBe('deductibles');
  });

  it('ACCEPTANCE: overrides survive base edits with conflict detection', () => {
    // User set NY deductible to 1000 when base was 500
    const overrides: Record<string, Override> = {
      'coverages.CGL.deductible': makeOverride(
        'coverages.CGL.deductible', 500, 1000,
        { note: 'NY regulation 88-A' },
      ),
    };

    // Later: base is edited to 750
    const updatedBase = {
      ...baseConfig,
      coverages: {
        ...baseConfig.coverages,
        CGL: {
          ...baseConfig.coverages.CGL,
          deductible: 750,
        },
      },
    };

    // Override still exists and is applied
    const effective = applyOverrides(updatedBase, overrides);
    expect((effective as any).coverages.CGL.deductible).toBe(1000); // override wins

    // But a conflict is detected
    const diff = computeDiff(updatedBase, overrides, 'NY', 'New York');
    const dedEntry = diff.entries.find(e => e.path === 'coverages.CGL.deductible');
    expect(dedEntry?.status).toBe('conflict');
    expect(dedEntry?.conflictBaseValue).toBe(750);   // new base
    expect(dedEntry?.originalBaseValue).toBe(500);    // when override was created

    // Validation also flags it
    const errors = validateOverrides(updatedBase, overrides);
    expect(errors.some(e => e.type === 'conflict' && e.path === 'coverages.CGL.deductible')).toBe(true);

    // The override value survives safely
    expect(dedEntry?.effectiveValue).toBe(1000);
  });

  it('ACCEPTANCE: promote override makes it the new base and removes the override', () => {
    // After promotion: the override value becomes the base
    const overrides: Record<string, Override> = {
      'coverages.CGL.deductible': makeOverride(
        'coverages.CGL.deductible', 500, 1000,
      ),
    };

    // Simulate promotion: value goes into base, override is removed
    const newBase = setNestedValue(baseConfig as Record<string, unknown>, 'coverages.CGL.deductible', 1000);
    const remaining: Record<string, Override> = {}; // override removed

    const diff = computeDiff(newBase as Record<string, unknown>, remaining, 'NY', 'New York');
    const dedEntry = diff.entries.find(e => e.path === 'coverages.CGL.deductible');
    expect(dedEntry?.status).toBe('inherited');
    expect(dedEntry?.effectiveValue).toBe(1000);

    // All other states now get 1000 as their inherited value too
    const diffCA = computeDiff(newBase as Record<string, unknown>, {}, 'CA', 'California');
    const caDeductible = diffCA.entries.find(e => e.path === 'coverages.CGL.deductible');
    expect(caDeductible?.effectiveValue).toBe(1000);
  });
});
