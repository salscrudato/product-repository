/**
 * Redline Compare – Comprehensive Tests
 *
 * Covers:
 *   - Redline types (SectionDiff, ChunkDiff, ImpactCandidate, RedlineComparisonResult)
 *   - Redline engine (diffSections, diffChunks, computeImpact, computeStats, runRedlineComparison)
 *   - Edge cases: empty inputs, identical editions, all-new, all-removed
 */

import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';

import type {
  SectionDiff,
  SectionDiffStatus,
  ChunkDiff,
  ChunkDiffStatus,
  ImpactCandidate,
  ImpactTargetType,
  RedlineComparisonResult,
  RedlineStats,
} from '../types/redline';
import {
  SECTION_DIFF_CONFIG,
  IMPACT_TARGET_CONFIG,
} from '../types/redline';
import type {
  FormIngestionSection,
  FormIngestionChunk,
} from '../types/ingestion';
import type { FormUse } from '../types/form';
import type { ClauseLink } from '../types/clause';
import {
  diffSections,
  diffChunks,
  computeImpact,
  computeStats,
  runRedlineComparison,
  type RedlineInput,
} from '../engine/redlineEngine';

// ════════════════════════════════════════════════════════════════════════
// Test helpers
// ════════════════════════════════════════════════════════════════════════

function makeSection(
  overrides: Partial<FormIngestionSection> & { id: string; path: string },
): FormIngestionSection {
  return {
    title: overrides.title || overrides.path,
    type: overrides.type || 'general',
    anchors: overrides.anchors || [],
    pageRefs: overrides.pageRefs || [1],
    summary: overrides.summary || '',
    order: overrides.order || 0,
    chunkIds: overrides.chunkIds || ['chunk-0'],
    ...overrides,
  };
}

function makeChunk(
  overrides: Partial<FormIngestionChunk> & { id: string; sectionPath: string; hash: string },
): FormIngestionChunk {
  return {
    index: overrides.index || 0,
    text: overrides.text || 'chunk text',
    pageStart: overrides.pageStart || 1,
    pageEnd: overrides.pageEnd || 1,
    anchors: overrides.anchors || [],
    charCount: overrides.charCount || 100,
    ...overrides,
  };
}

function makeFormUse(overrides: Partial<FormUse> & { id: string }): FormUse {
  return {
    orgId: 'org1',
    formId: 'form1',
    formVersionId: 'fv1',
    productVersionId: overrides.productVersionId || 'pv1',
    useType: 'attached' as any,
    createdAt: Timestamp.now(),
    createdBy: 'user1',
    ...overrides,
  };
}

function makeClauseLink(overrides: Partial<ClauseLink> & { id: string }): ClauseLink {
  return {
    orgId: 'org1',
    clauseId: overrides.clauseId || 'cl1',
    clauseVersionId: overrides.clauseVersionId || 'cv1',
    targetType: overrides.targetType || 'form_version',
    createdAt: Timestamp.now(),
    createdBy: 'user1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<RedlineInput> = {}): RedlineInput {
  return {
    formId: 'form1',
    formNumber: 'CG 00 01',
    formTitle: 'Commercial General Liability',
    leftVersionId: 'fv-old',
    leftEditionDate: '01/2020',
    rightVersionId: 'fv-new',
    rightEditionDate: '01/2024',
    leftSections: [],
    rightSections: [],
    leftChunks: [],
    rightChunks: [],
    formUses: [],
    clauseLinks: [],
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Type contract tests
// ════════════════════════════════════════════════════════════════════════

describe('Redline Types', () => {
  it('SectionDiffStatus includes all expected values', () => {
    const statuses: SectionDiffStatus[] = ['unchanged', 'modified', 'added', 'removed'];
    statuses.forEach(s => {
      expect(SECTION_DIFF_CONFIG[s]).toBeDefined();
      expect(SECTION_DIFF_CONFIG[s].label).toBeTruthy();
      expect(SECTION_DIFF_CONFIG[s].color).toMatch(/^#/);
    });
  });

  it('ImpactTargetType includes all expected values', () => {
    const targets: ImpactTargetType[] = ['product', 'coverage', 'rule', 'rate_program', 'clause', 'state'];
    targets.forEach(t => {
      expect(IMPACT_TARGET_CONFIG[t]).toBeDefined();
      expect(IMPACT_TARGET_CONFIG[t].label).toBeTruthy();
    });
  });

  it('SectionDiff interface has required fields', () => {
    const diff: SectionDiff = {
      matchKey: 'COVERAGE A',
      status: 'modified',
      leftSection: makeSection({ id: 's1', path: 'COVERAGE A', type: 'coverage' }),
      rightSection: makeSection({ id: 's2', path: 'COVERAGE A', type: 'coverage' }),
      sectionType: 'coverage',
      title: 'COVERAGE A',
      changedChunkHashes: [{ left: 'abc', right: 'def' }],
      leftPages: [1, 2],
      rightPages: [1, 3],
    };
    expect(diff.matchKey).toBe('COVERAGE A');
    expect(diff.changedChunkHashes).toHaveLength(1);
  });

  it('RedlineComparisonResult has required fields', () => {
    const result: RedlineComparisonResult = {
      formId: 'f1', formNumber: 'CG 00 01', formTitle: 'CGL',
      leftVersionId: 'v1', leftEditionDate: '01/2020',
      rightVersionId: 'v2', rightEditionDate: '01/2024',
      sectionDiffs: [], chunkDiffs: [], impactCandidates: [],
      stats: {
        totalSections: 0, unchangedSections: 0, modifiedSections: 0,
        addedSections: 0, removedSections: 0,
        totalChunks: 0, unchangedChunks: 0, modifiedChunks: 0,
        addedChunks: 0, removedChunks: 0,
        impactCandidateCount: 0,
      },
    };
    expect(result.formNumber).toBe('CG 00 01');
    expect(result.stats.totalSections).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// diffSections tests
// ════════════════════════════════════════════════════════════════════════

describe('diffSections', () => {
  it('returns empty array for empty inputs', () => {
    expect(diffSections([], [], [], [])).toEqual([]);
  });

  it('detects unchanged sections when chunk hashes match', () => {
    const ls = [makeSection({ id: 's1', path: 'COVERAGE A', type: 'coverage' })];
    const rs = [makeSection({ id: 's2', path: 'COVERAGE A', type: 'coverage' })];
    const lc = [makeChunk({ id: 'c1', sectionPath: 'COVERAGE A', hash: 'aaa', index: 0 })];
    const rc = [makeChunk({ id: 'c2', sectionPath: 'COVERAGE A', hash: 'aaa', index: 0 })];

    const diffs = diffSections(ls, rs, lc, rc);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('unchanged');
    expect(diffs[0].matchKey).toBe('COVERAGE A');
  });

  it('detects modified sections when chunk hashes differ', () => {
    const ls = [makeSection({ id: 's1', path: 'EXCLUSIONS', type: 'exclusion' })];
    const rs = [makeSection({ id: 's2', path: 'EXCLUSIONS', type: 'exclusion' })];
    const lc = [makeChunk({ id: 'c1', sectionPath: 'EXCLUSIONS', hash: 'old', index: 0 })];
    const rc = [makeChunk({ id: 'c2', sectionPath: 'EXCLUSIONS', hash: 'new', index: 0 })];

    const diffs = diffSections(ls, rs, lc, rc);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('modified');
    expect(diffs[0].changedChunkHashes).toBeDefined();
    expect(diffs[0].changedChunkHashes!.length).toBe(1);
  });

  it('detects removed sections (left only)', () => {
    const ls = [makeSection({ id: 's1', path: 'SCHEDULE', type: 'schedule' })];
    const diffs = diffSections(ls, [], [], []);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('removed');
    expect(diffs[0].rightSection).toBeNull();
  });

  it('detects added sections (right only)', () => {
    const rs = [makeSection({ id: 's2', path: 'ENDORSEMENT', type: 'endorsement' })];
    const diffs = diffSections([], rs, [], []);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('added');
    expect(diffs[0].leftSection).toBeNull();
  });

  it('handles mixed diff: unchanged + modified + added + removed', () => {
    const ls = [
      makeSection({ id: 's1', path: 'COVERAGE A', type: 'coverage', order: 0 }),
      makeSection({ id: 's2', path: 'EXCLUSIONS', type: 'exclusion', order: 1 }),
      makeSection({ id: 's3', path: 'OLD_SECTION', type: 'general', order: 2 }),
    ];
    const rs = [
      makeSection({ id: 's4', path: 'COVERAGE A', type: 'coverage', order: 0 }),
      makeSection({ id: 's5', path: 'EXCLUSIONS', type: 'exclusion', order: 1 }),
      makeSection({ id: 's6', path: 'NEW_SECTION', type: 'condition', order: 2 }),
    ];
    const lc = [
      makeChunk({ id: 'c1', sectionPath: 'COVERAGE A', hash: 'same', index: 0 }),
      makeChunk({ id: 'c2', sectionPath: 'EXCLUSIONS', hash: 'old-exc', index: 0 }),
      makeChunk({ id: 'c3', sectionPath: 'OLD_SECTION', hash: 'old-sec', index: 0 }),
    ];
    const rc = [
      makeChunk({ id: 'c4', sectionPath: 'COVERAGE A', hash: 'same', index: 0 }),
      makeChunk({ id: 'c5', sectionPath: 'EXCLUSIONS', hash: 'new-exc', index: 0 }),
      makeChunk({ id: 'c6', sectionPath: 'NEW_SECTION', hash: 'new-sec', index: 0 }),
    ];

    const diffs = diffSections(ls, rs, lc, rc);
    expect(diffs).toHaveLength(4);

    const statuses = diffs.map(d => d.status).sort();
    expect(statuses).toEqual(['added', 'modified', 'removed', 'unchanged']);
  });

  it('preserves section type and page refs', () => {
    const ls = [makeSection({ id: 's1', path: 'CONDITIONS', type: 'condition', pageRefs: [5, 6] })];
    const rs = [makeSection({ id: 's2', path: 'CONDITIONS', type: 'condition', pageRefs: [7, 8] })];
    const lc = [makeChunk({ id: 'c1', sectionPath: 'CONDITIONS', hash: 'x', index: 0 })];
    const rc = [makeChunk({ id: 'c2', sectionPath: 'CONDITIONS', hash: 'y', index: 0 })];

    const diffs = diffSections(ls, rs, lc, rc);
    expect(diffs[0].sectionType).toBe('condition');
    expect(diffs[0].leftPages).toEqual([5, 6]);
    expect(diffs[0].rightPages).toEqual([7, 8]);
  });
});

// ════════════════════════════════════════════════════════════════════════
// diffChunks tests
// ════════════════════════════════════════════════════════════════════════

describe('diffChunks', () => {
  it('returns empty for empty inputs', () => {
    expect(diffChunks([], [])).toEqual([]);
  });

  it('detects unchanged chunks', () => {
    const lc = [makeChunk({ id: 'c1', sectionPath: 'A', hash: 'h1', index: 0, text: 'text' })];
    const rc = [makeChunk({ id: 'c2', sectionPath: 'A', hash: 'h1', index: 0, text: 'text' })];
    const diffs = diffChunks(lc, rc);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('unchanged');
  });

  it('detects modified chunks', () => {
    const lc = [makeChunk({ id: 'c1', sectionPath: 'A', hash: 'old', index: 0, text: 'old' })];
    const rc = [makeChunk({ id: 'c2', sectionPath: 'A', hash: 'new', index: 0, text: 'new' })];
    const diffs = diffChunks(lc, rc);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('modified');
    expect(diffs[0].leftText).toBe('old');
    expect(diffs[0].rightText).toBe('new');
  });

  it('detects added chunks', () => {
    const rc = [makeChunk({ id: 'c2', sectionPath: 'B', hash: 'new', index: 0, text: 'new' })];
    const diffs = diffChunks([], rc);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('added');
    expect(diffs[0].leftText).toBe('');
  });

  it('detects removed chunks', () => {
    const lc = [makeChunk({ id: 'c1', sectionPath: 'B', hash: 'old', index: 0, text: 'old' })];
    const diffs = diffChunks(lc, []);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('removed');
    expect(diffs[0].rightText).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════════════
// computeImpact tests
// ════════════════════════════════════════════════════════════════════════

describe('computeImpact', () => {
  it('returns empty when no sections changed', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'A', status: 'unchanged', leftSection: null, rightSection: null, sectionType: 'general', title: 'A' },
    ];
    expect(computeImpact(diffs, [], [])).toEqual([]);
  });

  it('generates product impact from formUses', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'COV', status: 'modified', leftSection: null, rightSection: null, sectionType: 'coverage', title: 'COV' },
    ];
    const uses = [makeFormUse({ id: 'u1', productVersionId: 'pv1', productName: 'Auto' })];
    const impact = computeImpact(diffs, uses, []);
    const products = impact.filter(i => i.targetType === 'product');
    expect(products).toHaveLength(1);
    expect(products[0].targetLabel).toBe('Auto');
    expect(products[0].severity).toBe('high');
  });

  it('generates coverage impact from formUses', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'EXC', status: 'removed', leftSection: null, rightSection: null, sectionType: 'exclusion', title: 'EXC' },
    ];
    const uses = [makeFormUse({ id: 'u1', coverageVersionId: 'cv1', coverageName: 'Collision' })];
    const impact = computeImpact(diffs, uses, []);
    const covs = impact.filter(i => i.targetType === 'coverage');
    expect(covs).toHaveLength(1);
    expect(covs[0].targetLabel).toBe('Collision');
  });

  it('generates state impact from formUses', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'DEF', status: 'added', leftSection: null, rightSection: null, sectionType: 'definition', title: 'DEF' },
    ];
    const uses = [makeFormUse({ id: 'u1', stateCode: 'CA' })];
    const impact = computeImpact(diffs, uses, []);
    const states = impact.filter(i => i.targetType === 'state');
    expect(states).toHaveLength(1);
    expect(states[0].targetId).toBe('CA');
  });

  it('generates clause impact from clauseLinks', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'COND', status: 'modified', leftSection: null, rightSection: null, sectionType: 'condition', title: 'COND' },
    ];
    const links = [makeClauseLink({ id: 'l1', clauseId: 'cl1', clauseName: 'Subrogation' })];
    const impact = computeImpact(diffs, [], links);
    const clauses = impact.filter(i => i.targetType === 'clause');
    expect(clauses).toHaveLength(1);
    expect(clauses[0].targetLabel).toBe('Subrogation');
  });

  it('generates rule impact from clauseLinks with ruleVersionId', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'LIM', status: 'modified', leftSection: null, rightSection: null, sectionType: 'limits', title: 'LIM' },
    ];
    const links = [makeClauseLink({ id: 'l1', ruleVersionId: 'rv1', targetLabel: 'Rate Rule #5' })];
    const impact = computeImpact(diffs, [], links);
    const rules = impact.filter(i => i.targetType === 'rule');
    expect(rules).toHaveLength(1);
    expect(rules[0].targetLabel).toBe('Rate Rule #5');
  });

  it('deduplicates impact candidates', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'A', status: 'modified', leftSection: null, rightSection: null, sectionType: 'coverage', title: 'A' },
    ];
    const uses = [
      makeFormUse({ id: 'u1', productVersionId: 'pv1', productName: 'Auto' }),
      makeFormUse({ id: 'u2', productVersionId: 'pv1', productName: 'Auto' }), // duplicate
    ];
    const impact = computeImpact(diffs, uses, []);
    const products = impact.filter(i => i.targetType === 'product');
    expect(products).toHaveLength(1);
  });

  it('assigns correct severity based on section type', () => {
    const highDiffs: SectionDiff[] = [
      { matchKey: 'COV', status: 'modified', leftSection: null, rightSection: null, sectionType: 'coverage', title: 'COV' },
    ];
    const medDiffs: SectionDiff[] = [
      { matchKey: 'DEF', status: 'modified', leftSection: null, rightSection: null, sectionType: 'definition', title: 'DEF' },
    ];
    const lowDiffs: SectionDiff[] = [
      { matchKey: 'GEN', status: 'modified', leftSection: null, rightSection: null, sectionType: 'general', title: 'GEN' },
    ];
    const uses = [makeFormUse({ id: 'u1', productVersionId: 'pv1' })];

    expect(computeImpact(highDiffs, uses, [])[0].severity).toBe('high');
    expect(computeImpact(medDiffs, uses, [])[0].severity).toBe('medium');
    expect(computeImpact(lowDiffs, uses, [])[0].severity).toBe('low');
  });
});

// ════════════════════════════════════════════════════════════════════════
// computeStats tests
// ════════════════════════════════════════════════════════════════════════

describe('computeStats', () => {
  it('counts correctly', () => {
    const sectionDiffs: SectionDiff[] = [
      { matchKey: 'A', status: 'unchanged', leftSection: null, rightSection: null, sectionType: 'general', title: '' },
      { matchKey: 'B', status: 'modified', leftSection: null, rightSection: null, sectionType: 'general', title: '' },
      { matchKey: 'C', status: 'added', leftSection: null, rightSection: null, sectionType: 'general', title: '' },
      { matchKey: 'D', status: 'removed', leftSection: null, rightSection: null, sectionType: 'general', title: '' },
    ];
    const chunkDiffs: ChunkDiff[] = [
      { matchKey: 'x', status: 'unchanged', leftChunk: null, rightChunk: null, leftText: '', rightText: '' },
      { matchKey: 'y', status: 'modified', leftChunk: null, rightChunk: null, leftText: '', rightText: '' },
    ];
    const ic: ImpactCandidate[] = [
      { targetType: 'product', targetId: 'p1', targetLabel: 'P', reason: 'r', affectedSectionKeys: [], severity: 'high' },
    ];

    const stats = computeStats(sectionDiffs, chunkDiffs, ic);
    expect(stats.totalSections).toBe(4);
    expect(stats.unchangedSections).toBe(1);
    expect(stats.modifiedSections).toBe(1);
    expect(stats.addedSections).toBe(1);
    expect(stats.removedSections).toBe(1);
    expect(stats.totalChunks).toBe(2);
    expect(stats.unchangedChunks).toBe(1);
    expect(stats.modifiedChunks).toBe(1);
    expect(stats.impactCandidateCount).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// runRedlineComparison (full pipeline) tests
// ════════════════════════════════════════════════════════════════════════

describe('runRedlineComparison', () => {
  it('returns valid result for empty inputs', () => {
    const result = runRedlineComparison(makeInput());
    expect(result.formId).toBe('form1');
    expect(result.sectionDiffs).toEqual([]);
    expect(result.chunkDiffs).toEqual([]);
    expect(result.impactCandidates).toEqual([]);
    expect(result.stats.totalSections).toBe(0);
  });

  it('handles identical editions', () => {
    const sections = [makeSection({ id: 's1', path: 'COVERAGE A', type: 'coverage' })];
    const chunks = [makeChunk({ id: 'c1', sectionPath: 'COVERAGE A', hash: 'same', index: 0 })];
    const result = runRedlineComparison(makeInput({
      leftSections: sections,
      rightSections: sections,
      leftChunks: chunks,
      rightChunks: chunks,
    }));
    expect(result.stats.unchangedSections).toBe(1);
    expect(result.stats.modifiedSections).toBe(0);
    expect(result.impactCandidates).toEqual([]);
  });

  it('handles all-new edition (left empty)', () => {
    const rs = [makeSection({ id: 's1', path: 'NEW', type: 'endorsement' })];
    const rc = [makeChunk({ id: 'c1', sectionPath: 'NEW', hash: 'h', index: 0 })];
    const result = runRedlineComparison(makeInput({
      rightSections: rs, rightChunks: rc,
    }));
    expect(result.stats.addedSections).toBe(1);
    expect(result.stats.removedSections).toBe(0);
  });

  it('handles all-removed edition (right empty)', () => {
    const ls = [makeSection({ id: 's1', path: 'OLD', type: 'schedule' })];
    const lc = [makeChunk({ id: 'c1', sectionPath: 'OLD', hash: 'h', index: 0 })];
    const result = runRedlineComparison(makeInput({
      leftSections: ls, leftChunks: lc,
    }));
    expect(result.stats.removedSections).toBe(1);
    expect(result.stats.addedSections).toBe(0);
  });

  it('full pipeline with mixed diffs and impact', () => {
    const ls = [
      makeSection({ id: 's1', path: 'COVERAGE A', type: 'coverage', order: 0 }),
      makeSection({ id: 's2', path: 'EXCLUSIONS', type: 'exclusion', order: 1 }),
    ];
    const rs = [
      makeSection({ id: 's3', path: 'COVERAGE A', type: 'coverage', order: 0 }),
      makeSection({ id: 's4', path: 'CONDITIONS', type: 'condition', order: 1 }),
    ];
    const lc = [
      makeChunk({ id: 'c1', sectionPath: 'COVERAGE A', hash: 'same', index: 0 }),
      makeChunk({ id: 'c2', sectionPath: 'EXCLUSIONS', hash: 'exc', index: 0 }),
    ];
    const rc = [
      makeChunk({ id: 'c3', sectionPath: 'COVERAGE A', hash: 'same', index: 0 }),
      makeChunk({ id: 'c4', sectionPath: 'CONDITIONS', hash: 'cond', index: 0 }),
    ];
    const uses = [makeFormUse({ id: 'u1', productVersionId: 'pv1', productName: 'GL Product' })];

    const result = runRedlineComparison(makeInput({
      leftSections: ls, rightSections: rs,
      leftChunks: lc, rightChunks: rc,
      formUses: uses,
    }));

    expect(result.stats.unchangedSections).toBe(1);
    expect(result.stats.removedSections).toBe(1);
    expect(result.stats.addedSections).toBe(1);
    expect(result.impactCandidates.length).toBeGreaterThan(0);
    expect(result.impactCandidates[0].targetLabel).toBe('GL Product');
  });

  it('preserves form metadata on result', () => {
    const result = runRedlineComparison(makeInput({
      formNumber: 'HO 00 03',
      formTitle: 'Homeowners',
      leftEditionDate: '04/2020',
      rightEditionDate: '04/2024',
    }));
    expect(result.formNumber).toBe('HO 00 03');
    expect(result.formTitle).toBe('Homeowners');
    expect(result.leftEditionDate).toBe('04/2020');
    expect(result.rightEditionDate).toBe('04/2024');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance criteria tests
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance Criteria', () => {
  it('compliance can identify exactly what changed between editions', () => {
    const ls = [
      makeSection({ id: 's1', path: 'COVERAGE A - BODILY INJURY', type: 'coverage', order: 0 }),
      makeSection({ id: 's2', path: 'EXCLUSION - POLLUTION', type: 'exclusion', order: 1 }),
      makeSection({ id: 's3', path: 'GENERAL CONDITIONS', type: 'condition', order: 2 }),
    ];
    const rs = [
      makeSection({ id: 's4', path: 'COVERAGE A - BODILY INJURY', type: 'coverage', order: 0 }),
      makeSection({ id: 's5', path: 'EXCLUSION - POLLUTION', type: 'exclusion', order: 1 }),
      makeSection({ id: 's6', path: 'GENERAL CONDITIONS', type: 'condition', order: 2 }),
    ];
    const lc = [
      makeChunk({ id: 'c1', sectionPath: 'COVERAGE A - BODILY INJURY', hash: 'covA-old', index: 0 }),
      makeChunk({ id: 'c2', sectionPath: 'EXCLUSION - POLLUTION', hash: 'poll-same', index: 0 }),
      makeChunk({ id: 'c3', sectionPath: 'GENERAL CONDITIONS', hash: 'gc-old', index: 0 }),
    ];
    const rc = [
      makeChunk({ id: 'c4', sectionPath: 'COVERAGE A - BODILY INJURY', hash: 'covA-new', index: 0 }),
      makeChunk({ id: 'c5', sectionPath: 'EXCLUSION - POLLUTION', hash: 'poll-same', index: 0 }),
      makeChunk({ id: 'c6', sectionPath: 'GENERAL CONDITIONS', hash: 'gc-new', index: 0 }),
    ];

    const result = runRedlineComparison(makeInput({
      leftSections: ls, rightSections: rs,
      leftChunks: lc, rightChunks: rc,
    }));

    // Compliance can see exactly which sections changed
    const modified = result.sectionDiffs.filter(d => d.status === 'modified');
    const unchanged = result.sectionDiffs.filter(d => d.status === 'unchanged');

    expect(modified).toHaveLength(2);
    expect(unchanged).toHaveLength(1);
    expect(unchanged[0].matchKey).toBe('EXCLUSION - POLLUTION');
    expect(modified.map(d => d.matchKey).sort()).toEqual([
      'COVERAGE A - BODILY INJURY', 'GENERAL CONDITIONS',
    ]);
  });

  it('where-used: compliance can see downstream impacts', () => {
    const diffs: SectionDiff[] = [
      { matchKey: 'COV', status: 'modified', leftSection: null, rightSection: null, sectionType: 'coverage', title: 'COV' },
    ];
    const uses: FormUse[] = [
      makeFormUse({ id: 'u1', productVersionId: 'pv1', productName: 'Auto Liability', stateCode: 'NY' }),
      makeFormUse({ id: 'u2', productVersionId: 'pv2', productName: 'GL', coverageVersionId: 'cv1', coverageName: 'BI' }),
    ];
    const links: ClauseLink[] = [
      makeClauseLink({ id: 'l1', clauseId: 'cl1', clauseName: 'Additional Insured', ruleVersionId: 'rv1', targetLabel: 'Rate Rule' }),
    ];

    const impact = computeImpact(diffs, uses, links);

    const products = impact.filter(i => i.targetType === 'product');
    const coverages = impact.filter(i => i.targetType === 'coverage');
    const states = impact.filter(i => i.targetType === 'state');
    const rules = impact.filter(i => i.targetType === 'rule');
    const clauses = impact.filter(i => i.targetType === 'clause');

    expect(products).toHaveLength(2);
    expect(coverages).toHaveLength(1);
    expect(states).toHaveLength(1);
    expect(rules).toHaveLength(1);
    expect(clauses).toHaveLength(1);
  });
});
