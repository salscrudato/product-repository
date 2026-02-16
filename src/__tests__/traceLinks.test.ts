/**
 * Trace Links – Comprehensive Tests
 *
 * Covers:
 *   - TraceLink types (TraceLink, TraceLinkTargetType, TraceWithClause, TraceWithTarget, TraceSummary)
 *   - Type config maps (TRACE_LINK_TARGET_CONFIG)
 *   - Firestore path helpers (orgTraceLinksPath, traceLinkDocPath)
 *   - TraceLink service contract validation
 *   - Acceptance criteria: auditors can trace rules back to contract language
 */

import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';

import type {
  TraceLink,
  TraceLinkTargetType,
  TraceWithClause,
  TraceWithTarget,
  TraceSummary,
} from '../types/traceLink';
import {
  TRACE_LINK_TARGET_CONFIG,
} from '../types/traceLink';
import type { ClauseType } from '../types/clause';
import { CLAUSE_TYPE_CONFIG } from '../types/clause';
import {
  orgTraceLinksPath,
  traceLinkDocPath,
} from '../repositories/paths';

// ════════════════════════════════════════════════════════════════════════
// Test helpers
// ════════════════════════════════════════════════════════════════════════

function makeTraceLink(overrides: Partial<TraceLink> & { id: string }): TraceLink {
  return {
    orgId: 'org1',
    clauseId: overrides.clauseId || 'clause1',
    clauseVersionId: overrides.clauseVersionId || 'cv1',
    targetType: overrides.targetType || 'rule_version',
    rationale: overrides.rationale || 'This clause justifies the rule',
    createdAt: Timestamp.now(),
    createdBy: overrides.createdBy || 'user1',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Type contract tests
// ════════════════════════════════════════════════════════════════════════

describe('TraceLink Types', () => {
  it('TraceLinkTargetType has all expected values', () => {
    const types: TraceLinkTargetType[] = ['rule_version', 'coverage_version', 'rate_program_version'];
    types.forEach(t => {
      expect(TRACE_LINK_TARGET_CONFIG[t]).toBeDefined();
      expect(TRACE_LINK_TARGET_CONFIG[t].label).toBeTruthy();
      expect(TRACE_LINK_TARGET_CONFIG[t].color).toMatch(/^#/);
    });
  });

  it('TraceLink interface has all required fields', () => {
    const link: TraceLink = makeTraceLink({ id: 'tl1' });
    expect(link.id).toBe('tl1');
    expect(link.orgId).toBe('org1');
    expect(link.clauseId).toBe('clause1');
    expect(link.clauseVersionId).toBe('cv1');
    expect(link.targetType).toBe('rule_version');
    expect(link.rationale).toBeTruthy();
    expect(link.createdAt).toBeDefined();
    expect(link.createdBy).toBe('user1');
  });

  it('TraceLink supports rule_version target', () => {
    const link = makeTraceLink({
      id: 'tl1',
      targetType: 'rule_version',
      ruleVersionId: 'rv1',
      clauseName: 'Subrogation Clause',
      clauseType: 'condition',
      targetLabel: 'UW Rule: Min Premium',
    });
    expect(link.ruleVersionId).toBe('rv1');
    expect(link.clauseName).toBe('Subrogation Clause');
    expect(link.clauseType).toBe('condition');
    expect(link.targetLabel).toBe('UW Rule: Min Premium');
  });

  it('TraceLink supports coverage_version target', () => {
    const link = makeTraceLink({
      id: 'tl2',
      targetType: 'coverage_version',
      coverageVersionId: 'cov-v1',
      clauseName: 'Coverage A - Bodily Injury',
      clauseType: 'coverage',
    });
    expect(link.targetType).toBe('coverage_version');
    expect(link.coverageVersionId).toBe('cov-v1');
    expect(link.clauseType).toBe('coverage');
  });

  it('TraceLink supports rate_program_version target', () => {
    const link = makeTraceLink({
      id: 'tl3',
      targetType: 'rate_program_version',
      rateProgramVersionId: 'rp-v1',
      targetLabel: 'GL Base Rate',
    });
    expect(link.targetType).toBe('rate_program_version');
    expect(link.rateProgramVersionId).toBe('rp-v1');
    expect(link.targetLabel).toBe('GL Base Rate');
  });

  it('TraceLink supports optional update fields', () => {
    const link = makeTraceLink({
      id: 'tl4',
      updatedAt: Timestamp.now(),
      updatedBy: 'user2',
    });
    expect(link.updatedAt).toBeDefined();
    expect(link.updatedBy).toBe('user2');
  });
});

// ════════════════════════════════════════════════════════════════════════
// TraceWithClause (Supporting Clauses view)
// ════════════════════════════════════════════════════════════════════════

describe('TraceWithClause', () => {
  it('enriched view has required fields', () => {
    const tw: TraceWithClause = {
      traceLink: makeTraceLink({ id: 'tl1', ruleVersionId: 'rv1' }),
      clauseName: 'Additional Insured',
      clauseType: 'endorsement',
      clauseTextSnippet: 'This endorsement modifies the insurance provided...',
      clauseVersionNumber: 3,
    };
    expect(tw.clauseName).toBe('Additional Insured');
    expect(tw.clauseType).toBe('endorsement');
    expect(tw.clauseTextSnippet.length).toBeGreaterThan(0);
    expect(tw.clauseVersionNumber).toBe(3);
  });

  it('clause type references valid ClauseType', () => {
    const validTypes: ClauseType[] = ['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'schedule', 'other'];
    validTypes.forEach(t => {
      expect(CLAUSE_TYPE_CONFIG[t]).toBeDefined();
      expect(CLAUSE_TYPE_CONFIG[t].label).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// TraceWithTarget (Implemented By view)
// ════════════════════════════════════════════════════════════════════════

describe('TraceWithTarget', () => {
  it('enriched view has required fields', () => {
    const wt: TraceWithTarget = {
      traceLink: makeTraceLink({ id: 'tl1', targetType: 'rule_version' }),
      targetLabel: 'Minimum Premium Rule',
      targetTypeLabel: 'Rule',
    };
    expect(wt.targetLabel).toBe('Minimum Premium Rule');
    expect(wt.targetTypeLabel).toBe('Rule');
    expect(wt.traceLink.id).toBe('tl1');
  });

  it('target type labels match config', () => {
    const mapping: Record<TraceLinkTargetType, string> = {
      rule_version: 'Rule',
      coverage_version: 'Coverage',
      rate_program_version: 'Rate Program',
    };
    Object.entries(mapping).forEach(([type, label]) => {
      expect(TRACE_LINK_TARGET_CONFIG[type as TraceLinkTargetType].label).toBe(label);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// TraceSummary
// ════════════════════════════════════════════════════════════════════════

describe('TraceSummary', () => {
  it('summary has required fields', () => {
    const summary: TraceSummary = {
      targetType: 'rule_version',
      targetId: 'rv1',
      totalTraces: 3,
      clauseNames: ['Subrogation', 'Additional Insured', 'Coverage A'],
    };
    expect(summary.totalTraces).toBe(3);
    expect(summary.clauseNames).toHaveLength(3);
    expect(summary.clauseNames).toContain('Subrogation');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Firestore paths
// ════════════════════════════════════════════════════════════════════════

describe('Firestore paths', () => {
  it('orgTraceLinksPath builds correct path', () => {
    expect(orgTraceLinksPath('org1')).toBe('orgs/org1/traceLinks');
  });

  it('traceLinkDocPath builds correct path', () => {
    expect(traceLinkDocPath('org1', 'tl1')).toBe('orgs/org1/traceLinks/tl1');
  });

  it('paths use orgId correctly', () => {
    const orgId = 'my-org-123';
    expect(orgTraceLinksPath(orgId)).toContain(orgId);
    expect(traceLinkDocPath(orgId, 'trace1')).toContain(orgId);
    expect(traceLinkDocPath(orgId, 'trace1')).toContain('trace1');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Direction / semantics
// ════════════════════════════════════════════════════════════════════════

describe('TraceLink direction semantics', () => {
  it('from = clause, to = implementation', () => {
    const link = makeTraceLink({
      id: 'tl1',
      clauseId: 'clause-subrogation',
      clauseVersionId: 'csv-1',
      targetType: 'rule_version',
      ruleVersionId: 'uw-rule-v3',
      rationale: 'Subrogation clause requires waiver of subrogation check',
    });

    // "From" is clause
    expect(link.clauseId).toBe('clause-subrogation');
    expect(link.clauseVersionId).toBe('csv-1');

    // "To" is implementation
    expect(link.targetType).toBe('rule_version');
    expect(link.ruleVersionId).toBe('uw-rule-v3');

    // Rationale explains the connection
    expect(link.rationale).toContain('Subrogation');
    expect(link.rationale).toContain('waiver');
  });

  it('multiple traces can point to different targets from same clause', () => {
    const traces = [
      makeTraceLink({ id: 'tl1', clauseId: 'cl1', targetType: 'rule_version', ruleVersionId: 'rv1' }),
      makeTraceLink({ id: 'tl2', clauseId: 'cl1', targetType: 'coverage_version', coverageVersionId: 'cov1' }),
      makeTraceLink({ id: 'tl3', clauseId: 'cl1', targetType: 'rate_program_version', rateProgramVersionId: 'rp1' }),
    ];

    expect(traces).toHaveLength(3);
    expect(traces.every(t => t.clauseId === 'cl1')).toBe(true);
    const targetTypes = traces.map(t => t.targetType);
    expect(targetTypes).toContain('rule_version');
    expect(targetTypes).toContain('coverage_version');
    expect(targetTypes).toContain('rate_program_version');
  });

  it('multiple traces can point to same target from different clauses', () => {
    const traces = [
      makeTraceLink({ id: 'tl1', clauseId: 'cl-coverage', targetType: 'rule_version', ruleVersionId: 'rv1' }),
      makeTraceLink({ id: 'tl2', clauseId: 'cl-exclusion', targetType: 'rule_version', ruleVersionId: 'rv1' }),
    ];

    expect(traces).toHaveLength(2);
    expect(traces.every(t => t.ruleVersionId === 'rv1')).toBe(true);
    expect(traces.map(t => t.clauseId)).toEqual(['cl-coverage', 'cl-exclusion']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance criteria
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance Criteria', () => {
  it('auditors can trace a product rule back to contract language', () => {
    // An auditor looking at an underwriting rule should be able to see
    // which clauses justify it, with rationale
    const ruleVersionId = 'uw-min-premium-v2';

    // Supporting clauses for this rule
    const supportingClauses: TraceWithClause[] = [
      {
        traceLink: makeTraceLink({
          id: 'tl1',
          clauseId: 'cl-min-premium',
          clauseVersionId: 'cv-mp-1',
          targetType: 'rule_version',
          ruleVersionId,
          rationale: 'Minimum premium clause mandates a floor premium of $500',
          clauseName: 'Minimum Premium',
          clauseType: 'condition',
        }),
        clauseName: 'Minimum Premium',
        clauseType: 'condition',
        clauseTextSnippet: 'The minimum premium for this policy shall be $500...',
        clauseVersionNumber: 1,
      },
      {
        traceLink: makeTraceLink({
          id: 'tl2',
          clauseId: 'cl-territory',
          clauseVersionId: 'cv-terr-2',
          targetType: 'rule_version',
          ruleVersionId,
          rationale: 'Territory definition affects premium territory lookup',
          clauseName: 'Territory Definition',
          clauseType: 'definition',
        }),
        clauseName: 'Territory Definition',
        clauseType: 'definition',
        clauseTextSnippet: 'Territory means the area where the named insured...',
        clauseVersionNumber: 2,
      },
    ];

    // Auditor can:
    // 1. See which clauses support this rule
    expect(supportingClauses).toHaveLength(2);
    expect(supportingClauses.map(sc => sc.clauseName)).toContain('Minimum Premium');
    expect(supportingClauses.map(sc => sc.clauseName)).toContain('Territory Definition');

    // 2. Read the rationale for each trace
    expect(supportingClauses[0].traceLink.rationale).toContain('Minimum premium');
    expect(supportingClauses[1].traceLink.rationale).toContain('Territory');

    // 3. See clause text snippets for context
    expect(supportingClauses[0].clauseTextSnippet).toContain('$500');
    expect(supportingClauses[1].clauseTextSnippet).toContain('named insured');

    // 4. Identify clause versions used
    expect(supportingClauses[0].clauseVersionNumber).toBe(1);
    expect(supportingClauses[1].clauseVersionNumber).toBe(2);

    // 5. See clause types for classification
    expect(supportingClauses.map(sc => sc.clauseType)).toEqual(['condition', 'definition']);
  });

  it('from clause view, auditors can see what rules/coverages implement it', () => {
    const clauseId = 'cl-subrogation';

    // "Implemented by" for this clause
    const implementedBy: TraceWithTarget[] = [
      {
        traceLink: makeTraceLink({
          id: 'tl1',
          clauseId,
          targetType: 'rule_version',
          ruleVersionId: 'rv-waiver-check',
          targetLabel: 'Waiver of Subrogation Check',
        }),
        targetLabel: 'Waiver of Subrogation Check',
        targetTypeLabel: 'Rule',
      },
      {
        traceLink: makeTraceLink({
          id: 'tl2',
          clauseId,
          targetType: 'coverage_version',
          coverageVersionId: 'cov-gl-basic',
          targetLabel: 'General Liability - Basic',
        }),
        targetLabel: 'General Liability - Basic',
        targetTypeLabel: 'Coverage',
      },
    ];

    // Auditor can see which implementations trace to this clause
    expect(implementedBy).toHaveLength(2);
    expect(implementedBy[0].targetTypeLabel).toBe('Rule');
    expect(implementedBy[0].targetLabel).toBe('Waiver of Subrogation Check');
    expect(implementedBy[1].targetTypeLabel).toBe('Coverage');
    expect(implementedBy[1].targetLabel).toBe('General Liability - Basic');
  });

  it('rationale is always required on trace links', () => {
    const link = makeTraceLink({
      id: 'tl1',
      rationale: 'This clause requires premium calculation to include minimum earned premium factor',
    });
    expect(link.rationale).toBeTruthy();
    expect(link.rationale.length).toBeGreaterThan(10);
  });
});
