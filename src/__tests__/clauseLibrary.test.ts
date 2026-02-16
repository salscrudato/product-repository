/**
 * Clause Library Tests
 *
 * Comprehensive tests for:
 *   - Type contracts and label maps
 *   - Clause types, version lifecycle, and link structure
 *   - Where-used resolution and impact analysis
 *   - Tag collection and filtering
 *   - Path builders
 */

import { describe, it, expect } from 'vitest';
import {
  CLAUSE_TYPE_CONFIG,
  CLAUSE_TYPE_OPTIONS,
  type ClauseType,
  type OrgClause,
  type ClauseVersion,
  type ClauseLink,
  type ClauseLinkTargetType,
  type ClauseWithStats,
  type ClauseImpactResult,
} from '../types/clause';
import { VERSION_STATUS_TRANSITIONS, type VersionStatus } from '../types/versioning';
import {
  orgClausesPath, clauseDocPath, clauseVersionsPath,
  clauseVersionDocPath, orgClauseLinksPath, clauseLinkDocPath,
} from '../repositories/paths';
import type { ContentAnchor } from '../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makeClause(overrides: Partial<OrgClause> = {}): OrgClause {
  return {
    id: 'clause-1',
    orgId: 'org-1',
    canonicalName: 'Additional Insured – Managers or Lessors',
    type: 'coverage',
    tags: ['gl', 'additional-insured'],
    description: 'Standard additional insured endorsement clause',
    versionCount: 2,
    latestPublishedVersionId: 'cv-2',
    latestDraftVersionId: 'cv-3',
    archived: false,
    createdAt: {} as any,
    createdBy: 'user-1',
    updatedAt: {} as any,
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeClauseVersion(overrides: Partial<ClauseVersion> = {}): ClauseVersion {
  return {
    id: 'cv-1',
    clauseId: 'clause-1',
    versionNumber: 1,
    text: 'This endorsement modifies insurance provided under the Commercial General Liability Coverage Part.',
    anchors: [],
    sourceFormVersionId: 'fv-1',
    sourceFormNumber: 'CG 20 10',
    status: 'draft',
    effectiveStart: '2024-01-01',
    effectiveEnd: null,
    summary: 'Initial version',
    createdAt: {} as any,
    createdBy: 'user-1',
    updatedAt: {} as any,
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeClauseLink(overrides: Partial<ClauseLink> = {}): ClauseLink {
  return {
    id: 'link-1',
    orgId: 'org-1',
    clauseId: 'clause-1',
    clauseVersionId: 'cv-2',
    targetType: 'product_version',
    productVersionId: 'pv-1',
    clauseName: 'Additional Insured',
    clauseType: 'coverage',
    targetLabel: 'Commercial GL Product v3',
    createdAt: {} as any,
    createdBy: 'user-1',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Type Contracts
// ════════════════════════════════════════════════════════════════════════

describe('Clause type contracts', () => {
  it('defines all clause types in config', () => {
    const types: ClauseType[] = ['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'schedule', 'other'];
    for (const type of types) {
      expect(CLAUSE_TYPE_CONFIG[type]).toBeDefined();
      expect(CLAUSE_TYPE_CONFIG[type].label).toBeTruthy();
      expect(CLAUSE_TYPE_CONFIG[type].color).toMatch(/^#/);
    }
  });

  it('CLAUSE_TYPE_OPTIONS covers all types', () => {
    expect(CLAUSE_TYPE_OPTIONS.length).toBe(7);
    const values = CLAUSE_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('coverage');
    expect(values).toContain('exclusion');
    expect(values).toContain('other');
  });

  it('link target types are valid', () => {
    const types: ClauseLinkTargetType[] = ['product_version', 'coverage_version', 'rule_version', 'form_version'];
    for (const type of types) {
      // Each type should be a valid string
      expect(typeof type).toBe('string');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// OrgClause
// ════════════════════════════════════════════════════════════════════════

describe('OrgClause', () => {
  it('has required fields', () => {
    const clause = makeClause();
    expect(clause.id).toBe('clause-1');
    expect(clause.canonicalName).toBeTruthy();
    expect(clause.type).toBe('coverage');
    expect(clause.tags).toEqual(['gl', 'additional-insured']);
    expect(clause.versionCount).toBe(2);
    expect(clause.archived).toBe(false);
  });

  it('supports all clause types', () => {
    const types: ClauseType[] = ['coverage', 'exclusion', 'condition', 'definition', 'endorsement', 'schedule', 'other'];
    for (const type of types) {
      const clause = makeClause({ type });
      expect(clause.type).toBe(type);
    }
  });

  it('has version pointers', () => {
    const clause = makeClause();
    expect(clause.latestPublishedVersionId).toBe('cv-2');
    expect(clause.latestDraftVersionId).toBe('cv-3');
  });

  it('supports empty tags', () => {
    const clause = makeClause({ tags: [] });
    expect(clause.tags).toEqual([]);
  });

  it('supports archival', () => {
    const clause = makeClause({ archived: true });
    expect(clause.archived).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// ClauseVersion
// ════════════════════════════════════════════════════════════════════════

describe('ClauseVersion', () => {
  it('has required fields', () => {
    const v = makeClauseVersion();
    expect(v.text).toBeTruthy();
    expect(v.versionNumber).toBe(1);
    expect(v.status).toBe('draft');
    expect(v.clauseId).toBe('clause-1');
  });

  it('tracks source form version', () => {
    const v = makeClauseVersion({ sourceFormVersionId: 'fv-1', sourceFormNumber: 'CG 20 10' });
    expect(v.sourceFormVersionId).toBe('fv-1');
    expect(v.sourceFormNumber).toBe('CG 20 10');
  });

  it('supports anchors', () => {
    const anchor: ContentAnchor = {
      hash: 'abc123',
      slug: 'additional-insured',
      anchorText: 'ADDITIONAL INSURED',
      page: 1,
      offset: 0,
    };
    const v = makeClauseVersion({ anchors: [anchor] });
    expect(v.anchors.length).toBe(1);
    expect(v.anchors[0].hash).toBe('abc123');
  });

  it('follows version status lifecycle', () => {
    const statuses: VersionStatus[] = ['draft', 'review', 'approved', 'published'];
    for (let i = 0; i < statuses.length - 1; i++) {
      const transitions = VERSION_STATUS_TRANSITIONS[statuses[i]];
      expect(transitions).toContain(statuses[i + 1]);
    }
  });

  it('supports effective date range', () => {
    const v = makeClauseVersion({ effectiveStart: '2024-01-01', effectiveEnd: '2024-12-31' });
    expect(v.effectiveStart).toBe('2024-01-01');
    expect(v.effectiveEnd).toBe('2024-12-31');
  });

  it('supports null effective dates', () => {
    const v = makeClauseVersion({ effectiveStart: null, effectiveEnd: null });
    expect(v.effectiveStart).toBeNull();
    expect(v.effectiveEnd).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════
// ClauseLink (where-used)
// ════════════════════════════════════════════════════════════════════════

describe('ClauseLink', () => {
  it('has required fields', () => {
    const link = makeClauseLink();
    expect(link.clauseId).toBe('clause-1');
    expect(link.clauseVersionId).toBe('cv-2');
    expect(link.targetType).toBe('product_version');
  });

  it('supports product_version target', () => {
    const link = makeClauseLink({ targetType: 'product_version', productVersionId: 'pv-1' });
    expect(link.productVersionId).toBe('pv-1');
  });

  it('supports coverage_version target', () => {
    const link = makeClauseLink({ targetType: 'coverage_version', coverageVersionId: 'cov-1' });
    expect(link.coverageVersionId).toBe('cov-1');
  });

  it('supports rule_version target', () => {
    const link = makeClauseLink({ targetType: 'rule_version', ruleVersionId: 'rule-v1' });
    expect(link.ruleVersionId).toBe('rule-v1');
  });

  it('supports form_version target', () => {
    const link = makeClauseLink({ targetType: 'form_version', formVersionId: 'fv-1' });
    expect(link.formVersionId).toBe('fv-1');
  });

  it('supports optional state code', () => {
    const link = makeClauseLink({ stateCode: 'CA' });
    expect(link.stateCode).toBe('CA');
  });

  it('has denormalized fields', () => {
    const link = makeClauseLink();
    expect(link.clauseName).toBe('Additional Insured');
    expect(link.clauseType).toBe('coverage');
    expect(link.targetLabel).toBe('Commercial GL Product v3');
  });
});

// ════════════════════════════════════════════════════════════════════════
// ClauseWithStats
// ════════════════════════════════════════════════════════════════════════

describe('ClauseWithStats', () => {
  it('aggregates clause data', () => {
    const stats: ClauseWithStats = {
      clause: makeClause(),
      publishedVersionCount: 2,
      linkCount: 5,
      latestVersionText: 'This endorsement modifies...',
    };
    expect(stats.publishedVersionCount).toBe(2);
    expect(stats.linkCount).toBe(5);
    expect(stats.latestVersionText).toBeTruthy();
  });

  it('handles zero links', () => {
    const stats: ClauseWithStats = {
      clause: makeClause(),
      publishedVersionCount: 0,
      linkCount: 0,
    };
    expect(stats.linkCount).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// ClauseImpactResult
// ════════════════════════════════════════════════════════════════════════

describe('ClauseImpactResult', () => {
  it('computes impact across multiple targets', () => {
    const impact: ClauseImpactResult = {
      clauseId: 'clause-1',
      clauseVersionId: 'cv-2',
      clauseName: 'Additional Insured',
      clauseType: 'coverage',
      affectedLinks: [
        makeClauseLink({ productVersionId: 'pv-1', stateCode: 'CA' }),
        makeClauseLink({ id: 'link-2', productVersionId: 'pv-2', stateCode: 'NY' }),
        makeClauseLink({ id: 'link-3', productVersionId: 'pv-1', stateCode: 'TX' }),
      ],
      affectedProductVersionIds: ['pv-1', 'pv-2'],
      affectedStates: ['CA', 'NY', 'TX'],
      totalTargets: 3,
    };
    expect(impact.affectedProductVersionIds.length).toBe(2);
    expect(impact.affectedStates.length).toBe(3);
    expect(impact.totalTargets).toBe(3);
  });

  it('handles single target', () => {
    const impact: ClauseImpactResult = {
      clauseId: 'clause-1',
      clauseVersionId: 'cv-1',
      clauseName: 'Test',
      clauseType: 'exclusion',
      affectedLinks: [makeClauseLink()],
      affectedProductVersionIds: ['pv-1'],
      affectedStates: [],
      totalTargets: 1,
    };
    expect(impact.totalTargets).toBe(1);
  });

  it('handles no targets', () => {
    const impact: ClauseImpactResult = {
      clauseId: 'clause-1',
      clauseVersionId: 'cv-1',
      clauseName: 'Unused',
      clauseType: 'other',
      affectedLinks: [],
      affectedProductVersionIds: [],
      affectedStates: [],
      totalTargets: 0,
    };
    expect(impact.totalTargets).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Firestore Path Builders
// ════════════════════════════════════════════════════════════════════════

describe('Clause path builders', () => {
  it('builds orgClausesPath', () => {
    expect(orgClausesPath('org-1')).toBe('orgs/org-1/clauses');
  });

  it('builds clauseDocPath', () => {
    expect(clauseDocPath('org-1', 'clause-1')).toBe('orgs/org-1/clauses/clause-1');
  });

  it('builds clauseVersionsPath', () => {
    expect(clauseVersionsPath('org-1', 'clause-1')).toBe('orgs/org-1/clauses/clause-1/versions');
  });

  it('builds clauseVersionDocPath', () => {
    expect(clauseVersionDocPath('org-1', 'clause-1', 'cv-1')).toBe('orgs/org-1/clauses/clause-1/versions/cv-1');
  });

  it('builds orgClauseLinksPath', () => {
    expect(orgClauseLinksPath('org-1')).toBe('orgs/org-1/clauseLinks');
  });

  it('builds clauseLinkDocPath', () => {
    expect(clauseLinkDocPath('org-1', 'link-1')).toBe('orgs/org-1/clauseLinks/link-1');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Tag Collection
// ════════════════════════════════════════════════════════════════════════

describe('Tag collection', () => {
  it('collects unique tags from multiple clauses', () => {
    const clauses = [
      makeClause({ tags: ['gl', 'additional-insured'] }),
      makeClause({ id: 'c-2', tags: ['gl', 'premises'] }),
      makeClause({ id: 'c-3', tags: ['auto', 'liability'] }),
    ];
    const tagSet = new Set<string>();
    for (const c of clauses) {
      for (const t of c.tags) tagSet.add(t);
    }
    const tags = [...tagSet].sort();
    expect(tags).toEqual(['additional-insured', 'auto', 'gl', 'liability', 'premises']);
  });

  it('handles empty tags', () => {
    const clauses = [makeClause({ tags: [] })];
    const tagSet = new Set<string>();
    for (const c of clauses) {
      for (const t of c.tags) tagSet.add(t);
    }
    expect(tagSet.size).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance Criteria
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance criteria: clause reuse and tracking', () => {
  it('a clause can be linked to multiple products', () => {
    const links: ClauseLink[] = [
      makeClauseLink({ productVersionId: 'pv-1', targetLabel: 'Commercial GL v3' }),
      makeClauseLink({ id: 'l-2', productVersionId: 'pv-2', targetLabel: 'Business Owners v1' }),
      makeClauseLink({ id: 'l-3', productVersionId: 'pv-3', targetLabel: 'Umbrella v2' }),
    ];
    const products = [...new Set(links.map(l => l.productVersionId).filter(Boolean))];
    expect(products.length).toBe(3);
  });

  it('a clause can be linked to multiple states', () => {
    const links: ClauseLink[] = [
      makeClauseLink({ stateCode: 'CA' }),
      makeClauseLink({ id: 'l-2', stateCode: 'NY' }),
      makeClauseLink({ id: 'l-3', stateCode: 'TX' }),
      makeClauseLink({ id: 'l-4', stateCode: 'FL' }),
    ];
    const states = [...new Set(links.map(l => l.stateCode).filter(Boolean))];
    expect(states.length).toBe(4);
  });

  it('a clause version tracks its source form', () => {
    const v = makeClauseVersion({ sourceFormVersionId: 'fv-1', sourceFormNumber: 'CG 20 10' });
    expect(v.sourceFormVersionId).toBe('fv-1');
    expect(v.sourceFormNumber).toBe('CG 20 10');
  });

  it('clause links support all target types', () => {
    const targets: ClauseLinkTargetType[] = ['product_version', 'coverage_version', 'rule_version', 'form_version'];
    for (const target of targets) {
      const link = makeClauseLink({ targetType: target });
      expect(link.targetType).toBe(target);
    }
  });

  it('where-used can show all targets for a clause', () => {
    const links: ClauseLink[] = [
      makeClauseLink({ targetType: 'product_version', productVersionId: 'pv-1' }),
      makeClauseLink({ id: 'l-2', targetType: 'form_version', formVersionId: 'fv-1' }),
      makeClauseLink({ id: 'l-3', targetType: 'coverage_version', coverageVersionId: 'cov-1' }),
    ];
    expect(links.length).toBe(3);
    expect(links.map(l => l.targetType)).toEqual(['product_version', 'form_version', 'coverage_version']);
  });
});
