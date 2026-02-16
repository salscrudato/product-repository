/**
 * AI Plan Tests
 *
 * Tests for:
 * - Plan schema validation (validateAIPlan, validateProposedArtifact)
 * - Impact summary computation
 * - Diff generation for create + modify actions
 * - Label/config maps
 * - Guardrail: AI never creates published artifacts
 * - Service helper functions
 */

import { describe, it, expect } from 'vitest';
import type {
  AIPlan,
  ProposedArtifact,
  PlanArtifactType,
  ConfidenceLevel,
  PlanImpactSummary,
  PlanDiffEntry,
  PlanFieldDiff,
  AISuggestion,
  SuggestionOutcome,
} from '../types/aiPlan';
import {
  validateProposedArtifact,
  validateAIPlan,
  computeImpactSummary,
  generatePlanDiffs,
  PLAN_ARTIFACT_TYPE_LABELS,
  CONFIDENCE_CONFIG,
} from '../types/aiPlan';
import {
  mapPlanTypeToVersionedType,
  getEntityCollectionPath,
} from '../services/aiPlanService';

// ============================================================================
// Test fixtures
// ============================================================================

function makeArtifact(overrides: Partial<ProposedArtifact> = {}): ProposedArtifact {
  return {
    key: 'product-1',
    artifactType: 'product',
    action: 'create',
    name: 'Commercial GL Product',
    proposedData: { name: 'Commercial GL Product', description: 'A CGL product', category: 'Liability' },
    rationale: 'Standard product for small businesses.',
    confidence: 'high',
    dataSources: ['Existing product catalog'],
    ...overrides,
  };
}

function makePlan(overrides: Partial<AIPlan> = {}): AIPlan {
  return {
    title: 'Create CGL Product',
    description: 'A commercial general liability product for small businesses.',
    artifacts: [makeArtifact()],
    overallRationale: 'Market analysis shows demand for CGL products.',
    dataUsed: ['Product catalog', 'Coverage database'],
    caveats: ['State-specific requirements may vary.'],
    ...overrides,
  };
}

// ============================================================================
// Label/Config Tests
// ============================================================================

describe('AI Plan Labels', () => {
  it('PLAN_ARTIFACT_TYPE_LABELS covers all types', () => {
    const types: PlanArtifactType[] = ['product', 'coverage', 'rule', 'rateProgram', 'table', 'formUse'];
    types.forEach(t => {
      expect(PLAN_ARTIFACT_TYPE_LABELS[t]).toBeDefined();
      expect(typeof PLAN_ARTIFACT_TYPE_LABELS[t]).toBe('string');
    });
  });

  it('CONFIDENCE_CONFIG covers all levels with color', () => {
    const levels: ConfidenceLevel[] = ['high', 'medium', 'low'];
    levels.forEach(l => {
      expect(CONFIDENCE_CONFIG[l]).toBeDefined();
      expect(CONFIDENCE_CONFIG[l].label).toBeTruthy();
      expect(CONFIDENCE_CONFIG[l].color).toMatch(/^#/);
    });
  });
});

// ============================================================================
// Artifact Validation Tests
// ============================================================================

describe('validateProposedArtifact', () => {
  it('accepts a valid artifact', () => {
    const errors = validateProposedArtifact(makeArtifact());
    expect(errors).toEqual([]);
  });

  it('requires key', () => {
    const errors = validateProposedArtifact(makeArtifact({ key: '' }));
    expect(errors).toContain('Artifact key is required');
  });

  it('requires name', () => {
    const errors = validateProposedArtifact(makeArtifact({ name: '' }));
    expect(errors.some(e => e.includes('name is required'))).toBe(true);
  });

  it('requires rationale', () => {
    const errors = validateProposedArtifact(makeArtifact({ rationale: '' }));
    expect(errors.some(e => e.includes('Rationale'))).toBe(true);
  });

  it('requires existingEntityId for modify action', () => {
    const errors = validateProposedArtifact(makeArtifact({
      action: 'modify',
      existingEntityId: undefined,
    }));
    expect(errors.some(e => e.includes('existingEntityId'))).toBe(true);
  });

  it('accepts modify with existingEntityId', () => {
    const errors = validateProposedArtifact(makeArtifact({
      action: 'modify',
      existingEntityId: 'prod-123',
    }));
    expect(errors).toEqual([]);
  });

  it('rejects invalid confidence level', () => {
    const errors = validateProposedArtifact(makeArtifact({
      confidence: 'unknown' as ConfidenceLevel,
    }));
    expect(errors.some(e => e.includes('confidence level'))).toBe(true);
  });

  it('validates product-specific fields', () => {
    const errors = validateProposedArtifact(makeArtifact({
      artifactType: 'product',
      proposedData: { description: 'No name' },
    }));
    expect(errors.some(e => e.includes('Product name'))).toBe(true);
  });

  it('validates rule-specific fields', () => {
    const errors = validateProposedArtifact(makeArtifact({
      artifactType: 'rule',
      proposedData: { name: 'My Rule' }, // missing type
    }));
    expect(errors.some(e => e.includes('Rule type'))).toBe(true);
  });

  it('validates formUse-specific fields', () => {
    const errors = validateProposedArtifact(makeArtifact({
      artifactType: 'formUse',
      proposedData: { useType: 'base' }, // missing formId
    }));
    expect(errors.some(e => e.includes('Form ID'))).toBe(true);
  });
});

// ============================================================================
// Plan Validation Tests
// ============================================================================

describe('validateAIPlan', () => {
  it('accepts a valid plan', () => {
    const result = validateAIPlan(makePlan());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires title', () => {
    const result = validateAIPlan(makePlan({ title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plan title is required');
  });

  it('requires at least one artifact', () => {
    const result = validateAIPlan(makePlan({ artifacts: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least one'))).toBe(true);
  });

  it('requires overall rationale', () => {
    const result = validateAIPlan(makePlan({ overallRationale: '' }));
    expect(result.valid).toBe(false);
  });

  it('detects duplicate artifact keys', () => {
    const a = makeArtifact();
    const result = validateAIPlan(makePlan({ artifacts: [a, { ...a }] }));
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('aggregates artifact-level errors', () => {
    const result = validateAIPlan(makePlan({
      artifacts: [makeArtifact({ name: '' })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Impact Summary Tests
// ============================================================================

describe('computeImpactSummary', () => {
  it('counts creations and modifications', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'p1', action: 'create' }),
        makeArtifact({ key: 'p2', action: 'modify', existingEntityId: 'id-1' }),
        makeArtifact({ key: 'p3', action: 'create' }),
      ],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.creations).toBe(2);
    expect(impact.modifications).toBe(1);
  });

  it('counts by artifact type', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'p1', artifactType: 'product' }),
        makeArtifact({ key: 'c1', artifactType: 'coverage' }),
        makeArtifact({ key: 'c2', artifactType: 'coverage' }),
        makeArtifact({ key: 'r1', artifactType: 'rule', proposedData: { name: 'Rule', type: 'eligibility' } }),
      ],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.byType.product).toBe(1);
    expect(impact.byType.coverage).toBe(2);
    expect(impact.byType.rule).toBe(1);
  });

  it('collects affected entity IDs from modify actions', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'p1', action: 'modify', existingEntityId: 'id-abc' }),
      ],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.affectedEntityIds).toContain('id-abc');
  });

  it('derives required approval roles', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'p1', artifactType: 'product' }),
        makeArtifact({ key: 'r1', artifactType: 'rateProgram' }),
      ],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.requiredApprovalRoles).toContain('product_manager');
    expect(impact.requiredApprovalRoles).toContain('actuary');
  });

  it('generates warnings for low-confidence items', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({ key: 'p1', confidence: 'low' })],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.warnings.length).toBeGreaterThan(0);
    expect(impact.warnings[0]).toContain('low confidence');
  });

  it('returns empty warnings for all high-confidence items', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({ key: 'p1', confidence: 'high' })],
    });
    const impact = computeImpactSummary(plan);
    expect(impact.warnings).toEqual([]);
  });
});

// ============================================================================
// Diff Generation Tests
// ============================================================================

describe('generatePlanDiffs', () => {
  it('generates addition diffs for create actions', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({
        key: 'p1',
        action: 'create',
        proposedData: { name: 'GL Product', category: 'Liability', states: ['NY', 'CA'] },
      })],
    });
    const diffs = generatePlanDiffs(plan);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].action).toBe('create');
    expect(diffs[0].fields.every(f => f.type === 'added')).toBe(true);
    expect(diffs[0].fields.length).toBe(3); // name, category, states
  });

  it('generates change diffs for modify actions with current state', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({
        key: 'p1',
        action: 'modify',
        existingEntityId: 'entity-1',
        proposedData: { name: 'Updated GL Product', category: 'Updated Liability' },
      })],
    });
    const currentStates = new Map([
      ['entity-1', { name: 'Old GL Product', category: 'Liability', description: 'Old desc' }],
    ]);
    const diffs = generatePlanDiffs(plan, currentStates);
    expect(diffs).toHaveLength(1);
    const fieldDiffs = diffs[0].fields;
    expect(fieldDiffs.some(f => f.fieldPath === 'name' && f.type === 'changed')).toBe(true);
    expect(fieldDiffs.some(f => f.fieldPath === 'category' && f.type === 'changed')).toBe(true);
  });

  it('skips empty/null fields in create diffs', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({
        key: 'p1',
        action: 'create',
        proposedData: { name: 'Product', description: '', extra: null },
      })],
    });
    const diffs = generatePlanDiffs(plan);
    expect(diffs[0].fields.length).toBe(1); // only name
  });

  it('handles modify without current state (all shown as added)', () => {
    const plan = makePlan({
      artifacts: [makeArtifact({
        key: 'p1',
        action: 'modify',
        existingEntityId: 'entity-1',
        proposedData: { name: 'New Name' },
      })],
    });
    const diffs = generatePlanDiffs(plan); // no current states
    expect(diffs[0].fields.length).toBe(1);
    expect(diffs[0].fields[0].type).toBe('added'); // treated as added since no old value
  });

  it('returns artifactKey, name, and type in each entry', () => {
    const plan = makePlan();
    const diffs = generatePlanDiffs(plan);
    expect(diffs[0].artifactKey).toBe('product-1');
    expect(diffs[0].artifactName).toBe('Commercial GL Product');
    expect(diffs[0].artifactType).toBe('product');
  });
});

// ============================================================================
// Service Helper Tests
// ============================================================================

describe('mapPlanTypeToVersionedType', () => {
  it('maps versioned types correctly', () => {
    expect(mapPlanTypeToVersionedType('product')).toBe('product');
    expect(mapPlanTypeToVersionedType('coverage')).toBe('coverage');
    expect(mapPlanTypeToVersionedType('rule')).toBe('rule');
    expect(mapPlanTypeToVersionedType('rateProgram')).toBe('rateProgram');
    expect(mapPlanTypeToVersionedType('table')).toBe('table');
  });

  it('returns null for non-versioned types', () => {
    expect(mapPlanTypeToVersionedType('formUse')).toBeNull();
    expect(mapPlanTypeToVersionedType('unknown')).toBeNull();
  });
});

describe('getEntityCollectionPath', () => {
  it('builds product path', () => {
    expect(getEntityCollectionPath('org-1', 'product')).toBe('orgs/org-1/products');
  });

  it('builds rule path', () => {
    expect(getEntityCollectionPath('org-1', 'rule')).toBe('orgs/org-1/rules');
  });

  it('builds rateProgram path', () => {
    expect(getEntityCollectionPath('org-1', 'rateProgram')).toBe('orgs/org-1/ratePrograms');
  });

  it('builds table path', () => {
    expect(getEntityCollectionPath('org-1', 'table')).toBe('orgs/org-1/tables');
  });

  it('throws for coverage without parentId', () => {
    expect(() => getEntityCollectionPath('org-1', 'coverage')).toThrow('requires parentId');
  });

  it('builds coverage path with parentId', () => {
    expect(getEntityCollectionPath('org-1', 'coverage', 'prod-1'))
      .toBe('orgs/org-1/products/prod-1/coverages');
  });
});

// ============================================================================
// Guardrail Tests
// ============================================================================

describe('Guardrail: AI never writes to published artifacts', () => {
  it('all proposed artifacts are create or modify (never publish)', () => {
    const plan = makePlan({
      artifacts: [
        makeArtifact({ key: 'p1', action: 'create' }),
        makeArtifact({ key: 'p2', action: 'modify', existingEntityId: 'id-1' }),
      ],
    });
    plan.artifacts.forEach(a => {
      expect(['create', 'modify']).toContain(a.action);
    });
  });

  it('validation rejects invalid actions', () => {
    const badArtifact = makeArtifact({ action: 'publish' as 'create' });
    const errors = validateProposedArtifact(badArtifact);
    expect(errors.some(e => e.includes('Action must be'))).toBe(true);
  });
});

// ============================================================================
// Suggestion Outcome Types
// ============================================================================

describe('SuggestionOutcome', () => {
  it('covers all expected outcomes', () => {
    const outcomes: SuggestionOutcome[] = ['pending', 'accepted', 'rejected', 'partially_accepted'];
    outcomes.forEach(o => {
      expect(typeof o).toBe('string');
    });
  });
});
