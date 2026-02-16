/**
 * Readiness Service Tests
 *
 * Tests for the Product 360 readiness computation logic:
 *  - VersionTimelineEntry construction
 *  - StateReadinessRow computation
 *  - ArtifactCategoryReadiness scoring
 *  - ImpactSummary diffing
 *  - Blocker generation (state-specific, date-specific)
 *  - whatsMissing convenience wrapper
 *  - Edge cases (empty data, missing versions, etc.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── We test the pure/computed shapes by importing types ──
import type {
  Product360Readiness,
  VersionTimelineEntry,
  StateReadinessRow,
  ArtifactCategoryReadiness,
  OpenChangeSetSummary,
  ImpactSummary,
  LinkedTask,
} from '../services/readinessService';

// ── Mock all external Firebase services before import ──

vi.mock('../services/versioningService', () => ({
  versioningService: {
    getVersions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/stateProgramService', () => ({
  fetchStatePrograms: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/changeSetService', () => ({
  listChangeSets: vi.fn().mockResolvedValue([]),
  getChangeSetItems: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/formService', () => ({
  checkFormReadiness: vi.fn().mockResolvedValue({
    totalForms: 0,
    publishedForms: 0,
    draftForms: 0,
    totalUses: 0,
    unpublishedFormIds: [],
    draftFormsInUse: [],
    orphanedForms: [],
    issues: [],
    healthy: true,
  }),
}));

vi.mock('../services/rulesEngineService', () => ({
  loadAllRulesForReadiness: vi.fn().mockResolvedValue([]),
}));

vi.mock('../engine/rulesEngine', () => ({
  checkRuleReadiness: vi.fn().mockReturnValue({
    totalRules: 0,
    publishedRules: 0,
    draftRules: 0,
    issues: [],
  }),
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  LOG_CATEGORIES: { DATA: 'data', ERROR: 'error', CACHE: 'cache' },
}));

// ── Import SUT after mocks ──
import { computeProduct360Readiness, whatsMissing } from '../services/readinessService';
import { versioningService } from '../services/versioningService';
import { fetchStatePrograms } from '../services/stateProgramService';
import { listChangeSets, getChangeSetItems } from '../services/changeSetService';
import { checkFormReadiness } from '../services/formService';
import { loadAllRulesForReadiness } from '../services/rulesEngineService';
import { checkRuleReadiness } from '../engine/rulesEngine';

// ============================================================================
// Fixtures
// ============================================================================

function makeVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    entityId: 'prod-1',
    versionNumber: 1,
    status: 'draft' as const,
    effectiveStart: '2026-01-01',
    effectiveEnd: null,
    createdAt: { toDate: () => new Date('2026-01-01') },
    createdBy: 'user-1',
    updatedAt: { toDate: () => new Date('2026-01-02') },
    updatedBy: 'user-1',
    summary: 'Initial draft',
    data: { name: 'Test Product', description: 'A test', category: 'Commercial' },
    ...overrides,
  };
}

function makePublishedVersion() {
  return makeVersion({
    id: 'v0',
    versionNumber: 0,
    status: 'published' as const,
    effectiveStart: '2025-06-01',
    data: { name: 'Test Product', description: 'Published desc', category: 'Commercial' },
  });
}

function makeStateProgram(overrides: Record<string, unknown> = {}) {
  return {
    stateCode: 'CA',
    stateName: 'California',
    status: 'active' as const,
    requiredArtifacts: {
      formVersionIds: ['f1'],
      ruleVersionIds: ['r1'],
      rateProgramVersionIds: ['rp1'],
    },
    validationErrors: [],
    createdAt: { toDate: () => new Date() },
    createdBy: 'user-1',
    updatedAt: { toDate: () => new Date() },
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeChangeSet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs-1',
    name: 'Sprint 1 changes',
    status: 'draft' as const,
    ownerUserId: 'user-1',
    createdAt: { toDate: () => new Date() },
    createdBy: 'user-1',
    updatedAt: { toDate: () => new Date() },
    updatedBy: 'user-1',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('readinessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic computation with empty data ─────────
  describe('computeProduct360Readiness – empty data', () => {
    it('returns a valid report with zero versions', async () => {
      const report = await computeProduct360Readiness('org-1', 'prod-1', null);

      expect(report.productId).toBe('prod-1');
      expect(report.selectedVersionId).toBeNull();
      expect(report.versionTimeline).toHaveLength(0);
      expect(report.stateReadiness).toHaveLength(0);
      expect(report.openChangeSets).toHaveLength(0);
      expect(report.overallReadinessScore).toBe(0);
      expect(report.impact.hasPublishedBaseline).toBe(false);
      expect(report.linkedTasks).toHaveLength(0);
      expect(report.computedAt).toBeInstanceOf(Date);
    });
  });

  // ── Version timeline ──────────────────────────
  describe('version timeline', () => {
    it('builds timeline entries from product versions', async () => {
      const draft = makeVersion();
      const published = makePublishedVersion();
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([draft, published] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.versionTimeline).toHaveLength(2);

      const current = report.versionTimeline.find(v => v.isCurrent);
      expect(current).toBeDefined();
      expect(current!.versionId).toBe('v1');
      expect(current!.status).toBe('draft');
      expect(current!.statusLabel).toBe('Draft');
      expect(current!.effectiveStart).toBe('2026-01-01');
    });

    it('auto-selects draft version when no versionId provided', async () => {
      const draft = makeVersion({ id: 'v-draft' });
      const published = makePublishedVersion();
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([draft, published] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', null);

      expect(report.selectedVersionId).toBe('v-draft');
    });

    it('falls back to published when no draft exists', async () => {
      const published = makePublishedVersion();
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([published] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', null);

      expect(report.selectedVersionId).toBe('v0');
    });
  });

  // ── State readiness matrix ────────────────────
  describe('state readiness', () => {
    it('maps state programs to readiness rows', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([
        makeStateProgram(),
        makeStateProgram({
          stateCode: 'NY',
          stateName: 'New York',
          status: 'draft',
          requiredArtifacts: { formVersionIds: [], ruleVersionIds: [], rateProgramVersionIds: [] },
        }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.stateReadiness).toHaveLength(2);
      expect(report.stateStats.active).toBe(1);
      expect(report.stateStats.total).toBe(2);

      const ny = report.stateReadiness.find(s => s.stateCode === 'NY');
      expect(ny).toBeDefined();
      expect(ny!.missingArtifacts.length).toBeGreaterThan(0);
    });

    it('detects blocked states with validation errors', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([
        makeStateProgram({
          stateCode: 'TX',
          stateName: 'Texas',
          status: 'approved',
          validationErrors: [{ type: 'missing_form', message: 'Missing form CP0010', artifactType: 'form' }],
        }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      const tx = report.stateReadiness.find(s => s.stateCode === 'TX');
      expect(tx).toBeDefined();
      expect(tx!.canActivate).toBe(false);
      expect(report.stateStats.blocked).toBe(1);
    });

    it('identifies ready-to-activate states (approved + no errors)', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([
        makeStateProgram({
          stateCode: 'IL',
          stateName: 'Illinois',
          status: 'approved',
          validationErrors: [],
        }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      const il = report.stateReadiness.find(s => s.stateCode === 'IL');
      expect(il!.canActivate).toBe(true);
      expect(report.stateStats.readyToActivate).toBe(1);
    });
  });

  // ── Artifact readiness ────────────────────────
  describe('artifact readiness', () => {
    it('incorporates form readiness data', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(checkFormReadiness).mockResolvedValueOnce({
        totalForms: 5,
        publishedForms: 3,
        draftForms: 2,
        totalUses: 10,
        unpublishedFormIds: ['f1', 'f2'],
        draftFormsInUse: [{ formId: 'f1', formNumber: 'CP0010', productVersionIds: ['v1'] }],
        orphanedForms: [],
        issues: ['Form CP0010 has no published edition'],
        healthy: false,
      } as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      const forms = report.artifacts.find(a => a.category === 'forms');
      expect(forms).toBeDefined();
      expect(forms!.total).toBe(5);
      expect(forms!.published).toBe(3);
      expect(forms!.draft).toBe(2);
      expect(forms!.score).toBeLessThan(100);
      expect(forms!.issues).toHaveLength(1);
    });

    it('incorporates rule readiness data', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(loadAllRulesForReadiness).mockResolvedValueOnce([] as any);
      vi.mocked(checkRuleReadiness).mockReturnValueOnce({
        totalRules: 4,
        publishedRules: 3,
        draftRules: 1,
        issues: [{ type: 'draft_only', severity: 'warning', message: 'Rule X is draft only' }],
      } as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      const rules = report.artifacts.find(a => a.category === 'rules');
      expect(rules).toBeDefined();
      expect(rules!.total).toBe(4);
      expect(rules!.published).toBe(3);
    });

    it('computes overall readiness as average of scored categories', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(checkFormReadiness).mockResolvedValueOnce({
        totalForms: 10,
        publishedForms: 10,
        draftForms: 0,
        totalUses: 20,
        unpublishedFormIds: [],
        draftFormsInUse: [],
        orphanedForms: [],
        issues: [],
        healthy: true,
      } as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      // forms = 100% (10/10, no issues), rules placeholder = default
      // overall should be 100 if forms is the only scored category
      const forms = report.artifacts.find(a => a.category === 'forms');
      expect(forms!.score).toBe(100);
      expect(report.overallReadinessScore).toBeGreaterThanOrEqual(50);
    });
  });

  // ── Open Change Sets ──────────────────────────
  describe('open change sets', () => {
    it('lists open change sets with approval info', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(listChangeSets).mockResolvedValueOnce([
        makeChangeSet({ status: 'ready_for_review' }),
      ] as any);
      vi.mocked(getChangeSetItems).mockResolvedValueOnce([
        { id: 'item-1', changeSetId: 'cs-1', artifactType: 'form', artifactId: 'f1', versionId: 'fv1', action: 'create', addedAt: {}, addedBy: 'user-1' },
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.openChangeSets).toHaveLength(1);
      expect(report.openChangeSets[0].statusLabel).toBe('Ready for Review');
      expect(report.openChangeSets[0].itemCount).toBe(1);
      expect(report.openChangeSets[0].pendingApprovals).toContain('compliance');
    });

    it('generates blocker when change sets are awaiting review', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(listChangeSets).mockResolvedValueOnce([
        makeChangeSet({ status: 'ready_for_review' }),
      ] as any);
      vi.mocked(getChangeSetItems).mockResolvedValueOnce([
        { id: 'item-1', changeSetId: 'cs-1', artifactType: 'product', artifactId: 'prod-1', versionId: 'v1', action: 'update', addedAt: {}, addedBy: 'user-1' },
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.blockers.some(b => b.includes('review'))).toBe(true);
    });
  });

  // ── Impact Summary (draft vs published) ───────
  describe('impact summary', () => {
    it('computes diffs between draft and published versions', async () => {
      const published = makePublishedVersion();
      const draft = makeVersion({
        data: { name: 'Updated Product', description: 'Changed desc', category: 'Commercial', newField: 'added' },
      });
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([draft, published] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.impact.hasPublishedBaseline).toBe(true);
      expect(report.impact.totalChanges).toBeGreaterThan(0);
      expect(report.impact.fieldsChanged).toBeGreaterThanOrEqual(1); // name changed
      expect(report.impact.fieldsAdded).toBeGreaterThanOrEqual(1); // newField added
    });

    it('reports no baseline when no published version exists', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.impact.hasPublishedBaseline).toBe(false);
      expect(report.impact.totalChanges).toBe(0);
    });
  });

  // ── State-specific blockers ───────────────────
  describe('state-specific blockers', () => {
    it('reports blockers for unconfigured target state', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', 'CA');

      expect(report.blockers.some(b => b.includes('CA') && b.includes('not configured'))).toBe(true);
    });

    it('reports blockers for a state marked not_offered', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([
        makeStateProgram({ stateCode: 'CA', status: 'not_offered' }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', 'CA');

      expect(report.blockers.some(b => b.includes('Not Offered'))).toBe(true);
    });

    it('reports validation error blockers for target state', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([
        makeStateProgram({
          stateCode: 'CA',
          status: 'draft',
          validationErrors: [{ type: 'missing_form', message: 'Missing required form', artifactType: 'form' }],
        }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', 'CA');

      expect(report.blockers.some(b => b.includes('[CA]') && b.includes('Missing required form'))).toBe(true);
    });
  });

  // ── Date-specific blockers ────────────────────
  describe('date-specific blockers', () => {
    it('flags when version effective date is after target date', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([
        makeVersion({ effectiveStart: '2027-01-01' }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', undefined, '2026-06-01');

      expect(report.blockers.some(b => b.includes('effective date') && b.includes('after target'))).toBe(true);
    });

    it('flags when version has no effective start date', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([
        makeVersion({ effectiveStart: null }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', undefined, '2026-06-01');

      expect(report.blockers.some(b => b.includes('No effective start date'))).toBe(true);
    });

    it('flags when version is still in draft status', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([
        makeVersion({ status: 'draft' }),
      ] as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1', undefined, '2026-06-01');

      expect(report.blockers.some(b => b.includes('Draft') && b.includes('published'))).toBe(true);
    });
  });

  // ── whatsMissing convenience wrapper ───────────
  describe('whatsMissing', () => {
    it('returns only the blockers array', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(fetchStatePrograms).mockResolvedValueOnce([] as any);

      const blockers = await whatsMissing('org-1', 'prod-1', 'v1', 'NY', '2026-12-01');

      expect(Array.isArray(blockers)).toBe(true);
      expect(blockers.length).toBeGreaterThan(0);
      expect(blockers.some(b => b.includes('NY'))).toBe(true);
    });
  });

  // ── Form readiness blocker generation ─────────
  describe('form readiness blockers', () => {
    it('adds blocker when draft forms are in use', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(checkFormReadiness).mockResolvedValueOnce({
        totalForms: 3,
        publishedForms: 1,
        draftForms: 2,
        totalUses: 5,
        unpublishedFormIds: ['f1', 'f2'],
        draftFormsInUse: [
          { formId: 'f1', formNumber: 'CP0010', productVersionIds: ['v1'] },
          { formId: 'f2', formNumber: 'CP0020', productVersionIds: ['v1'] },
        ],
        orphanedForms: [],
        issues: ['Form CP0010 missing', 'Form CP0020 missing'],
        healthy: false,
      } as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.blockers.some(b => b.includes('form(s) in use without'))).toBe(true);
    });
  });

  // ── Rule readiness blocker generation ─────────
  describe('rule readiness blockers', () => {
    it('adds blocker when rule errors exist', async () => {
      vi.mocked(versioningService.getVersions).mockResolvedValueOnce([makeVersion()] as any);
      vi.mocked(loadAllRulesForReadiness).mockResolvedValueOnce([] as any);
      vi.mocked(checkRuleReadiness).mockReturnValueOnce({
        totalRules: 3,
        publishedRules: 2,
        draftRules: 1,
        issues: [
          { type: 'invalid_field_ref', severity: 'error', message: 'Rule X references unknown field "foo"' },
        ],
      } as any);

      const report = await computeProduct360Readiness('org-1', 'prod-1', 'v1');

      expect(report.blockers.some(b => b.includes('rule error'))).toBe(true);
    });
  });
});
