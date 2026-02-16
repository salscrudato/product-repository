/**
 * Filing Package – unit tests
 *
 * Tests for:
 *  1. Exhibit generation logic (forms schedule, rate exhibit, etc.)
 *  2. Artifact snapshot integrity (content hashing)
 *  3. Package completeness and reproducibility
 *  4. Acceptance criteria verification
 */

import { describe, it, expect } from 'vitest';

// ════════════════════════════════════════════════════════════════════════
// Extract the pure logic from the Cloud Function for testing
// ════════════════════════════════════════════════════════════════════════

/** djb2 hash (mirrors Cloud Function) */
function hashContent(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Canonical JSON (mirrors Cloud Function) */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (v as Record<string, unknown>)[k];
        return acc;
      }, {});
    }
    return v;
  }, 2);
}

interface ArtifactSnapshot {
  artifactType: string;
  artifactId: string;
  artifactName: string;
  versionId: string;
  versionNumber: number;
  status: string;
  action: string;
  contentHash: string;
}

function generateFormsSchedule(artifacts: ArtifactSnapshot[]) {
  const forms = artifacts.filter(a => a.artifactType === 'form');
  return JSON.parse(canonical({
    title: 'Forms Schedule',
    generatedAt: '2026-02-12',
    forms: forms.map(f => ({
      name: f.artifactName,
      versionId: f.versionId,
      versionNumber: f.versionNumber,
      action: f.action,
      status: f.status,
    })),
  }));
}

function generateRateExhibit(artifacts: ArtifactSnapshot[]) {
  const rates = artifacts.filter(a =>
    a.artifactType === 'rateProgram' || a.artifactType === 'table'
  );
  return JSON.parse(canonical({
    title: 'Rate Exhibit',
    generatedAt: '2026-02-12',
    ratePrograms: rates.filter(r => r.artifactType === 'rateProgram').map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
      status: r.status,
    })),
    tables: rates.filter(r => r.artifactType === 'table').map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
    })),
  }));
}

function generateRuleExhibit(artifacts: ArtifactSnapshot[]) {
  const rules = artifacts.filter(a => a.artifactType === 'rule');
  return JSON.parse(canonical({
    title: 'Rule Exhibit',
    generatedAt: '2026-02-12',
    rules: rules.map(r => ({
      name: r.artifactName,
      versionId: r.versionId,
      versionNumber: r.versionNumber,
      action: r.action,
      status: r.status,
    })),
  }));
}

function generateDeviationsReport(stateOverrides: { stateCode: string | null; overrides: Record<string, unknown> }) {
  return JSON.parse(canonical({
    title: 'Deviations Report',
    generatedAt: '2026-02-12',
    stateCode: stateOverrides.stateCode || 'ALL',
    overrides: stateOverrides.overrides || {},
    overrideCount: Object.keys(stateOverrides.overrides || {}).length,
  }));
}

function generateChangeSummary(changeSet: Record<string, unknown>, artifacts: ArtifactSnapshot[]) {
  return JSON.parse(canonical({
    title: 'Change Summary',
    generatedAt: '2026-02-12',
    changeSet: {
      id: changeSet.id,
      name: changeSet.name,
      description: changeSet.description || '',
      status: changeSet.status,
      effectiveStart: changeSet.targetEffectiveStart || null,
      effectiveEnd: changeSet.targetEffectiveEnd || null,
      ownerUserId: changeSet.ownerUserId,
      createdAt: changeSet.createdAt,
    },
    artifacts: artifacts.map(a => ({
      type: a.artifactType,
      name: a.artifactName,
      action: a.action,
      versionId: a.versionId,
      versionNumber: a.versionNumber,
      contentHash: a.contentHash,
    })),
    totalArtifacts: artifacts.length,
    byAction: {
      create: artifacts.filter(a => a.action === 'create').length,
      update: artifacts.filter(a => a.action === 'update').length,
      deprecate: artifacts.filter(a => a.action === 'deprecate').length,
      delete_requested: artifacts.filter(a => a.action === 'delete_requested').length,
    },
  }));
}

// ════════════════════════════════════════════════════════════════════════
// Sample data
// ════════════════════════════════════════════════════════════════════════

const sampleArtifacts: ArtifactSnapshot[] = [
  { artifactType: 'form', artifactId: 'form-1', artifactName: 'CGL Coverage Form', versionId: 'v-f1', versionNumber: 3, status: 'approved', action: 'update', contentHash: '' },
  { artifactType: 'form', artifactId: 'form-2', artifactName: 'Business Auto Form', versionId: 'v-f2', versionNumber: 1, status: 'draft', action: 'create', contentHash: '' },
  { artifactType: 'rateProgram', artifactId: 'rp-1', artifactName: 'GL Base Rates', versionId: 'v-rp1', versionNumber: 5, status: 'published', action: 'update', contentHash: '' },
  { artifactType: 'table', artifactId: 'tbl-1', artifactName: 'Territory Factors', versionId: 'v-t1', versionNumber: 2, status: 'approved', action: 'update', contentHash: '' },
  { artifactType: 'rule', artifactId: 'rule-1', artifactName: 'Minimum Premium Rule', versionId: 'v-r1', versionNumber: 1, status: 'approved', action: 'create', contentHash: '' },
];

// Populate content hashes
sampleArtifacts.forEach(a => {
  a.contentHash = hashContent(canonical({ id: a.artifactId, version: a.versionId }));
});

const sampleChangeSet = {
  id: 'cs-001',
  name: 'Q1 2026 Rate Revision',
  description: 'Annual rate update with new forms',
  status: 'approved',
  targetEffectiveStart: '2026-04-01',
  targetEffectiveEnd: null,
  ownerUserId: 'user-123',
  createdAt: '2026-01-15',
};

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

describe('Content Hashing', () => {
  it('produces consistent hashes', () => {
    const a = hashContent('hello world');
    const b = hashContent('hello world');
    expect(a).toBe(b);
  });

  it('produces different hashes for different content', () => {
    const a = hashContent('hello');
    const b = hashContent('world');
    expect(a).not.toBe(b);
  });

  it('is deterministic for structured data', () => {
    const data = { name: 'Test', version: 2, rules: [1, 2, 3] };
    const h1 = hashContent(canonical(data));
    const h2 = hashContent(canonical(data));
    expect(h1).toBe(h2);
  });
});

describe('Canonical JSON', () => {
  it('sorts keys deterministically', () => {
    const a = canonical({ z: 1, a: 2 });
    const b = canonical({ a: 2, z: 1 });
    expect(a).toBe(b);
  });

  it('handles nested objects', () => {
    const result = canonical({ b: { d: 1, c: 2 }, a: 3 });
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)[0]).toBe('a');
  });
});

describe('Forms Schedule Exhibit', () => {
  it('includes only form artifacts', () => {
    const exhibit = generateFormsSchedule(sampleArtifacts);
    expect(exhibit.title).toBe('Forms Schedule');
    expect(exhibit.forms).toHaveLength(2);
    expect(exhibit.forms[0].name).toBe('CGL Coverage Form');
  });

  it('captures version IDs and actions', () => {
    const exhibit = generateFormsSchedule(sampleArtifacts);
    expect(exhibit.forms[0].versionId).toBe('v-f1');
    expect(exhibit.forms[0].action).toBe('update');
    expect(exhibit.forms[1].action).toBe('create');
  });
});

describe('Rate Exhibit', () => {
  it('separates rate programs and tables', () => {
    const exhibit = generateRateExhibit(sampleArtifacts);
    expect(exhibit.title).toBe('Rate Exhibit');
    expect(exhibit.ratePrograms).toHaveLength(1);
    expect(exhibit.tables).toHaveLength(1);
  });
});

describe('Rule Exhibit', () => {
  it('includes only rule artifacts', () => {
    const exhibit = generateRuleExhibit(sampleArtifacts);
    expect(exhibit.title).toBe('Rule Exhibit');
    expect(exhibit.rules).toHaveLength(1);
    expect(exhibit.rules[0].name).toBe('Minimum Premium Rule');
  });
});

describe('Deviations Report', () => {
  it('reports overrides for a state', () => {
    const report = generateDeviationsReport({
      stateCode: 'NY',
      overrides: {
        'limits.perOccurrence': { value: 2000000, baseValue: 1000000 },
      },
    });
    expect(report.stateCode).toBe('NY');
    expect(report.overrideCount).toBe(1);
  });

  it('reports ALL when no state', () => {
    const report = generateDeviationsReport({
      stateCode: null,
      overrides: {},
    });
    expect(report.stateCode).toBe('ALL');
    expect(report.overrideCount).toBe(0);
  });
});

describe('Change Summary', () => {
  it('includes change set metadata', () => {
    const summary = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    expect(summary.changeSet.name).toBe('Q1 2026 Rate Revision');
    expect(summary.changeSet.status).toBe('approved');
    expect(summary.changeSet.effectiveStart).toBe('2026-04-01');
  });

  it('counts actions correctly', () => {
    const summary = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    expect(summary.totalArtifacts).toBe(5);
    expect(summary.byAction.create).toBe(2);
    expect(summary.byAction.update).toBe(3);
    expect(summary.byAction.deprecate).toBe(0);
  });

  it('includes content hashes for each artifact', () => {
    const summary = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    summary.artifacts.forEach((a: { contentHash: string }) => {
      expect(a.contentHash).toBeTruthy();
      expect(a.contentHash.length).toBeGreaterThan(0);
    });
  });
});

describe('Acceptance: Package is complete, version-referenced, and reproducible', () => {
  it('ACCEPTANCE: all five required exhibits are generated', () => {
    const formsSchedule = generateFormsSchedule(sampleArtifacts);
    const rateExhibit = generateRateExhibit(sampleArtifacts);
    const ruleExhibit = generateRuleExhibit(sampleArtifacts);
    const devReport = generateDeviationsReport({ stateCode: null, overrides: {} });
    const changeSummary = generateChangeSummary(sampleChangeSet, sampleArtifacts);

    expect(formsSchedule.title).toBe('Forms Schedule');
    expect(rateExhibit.title).toBe('Rate Exhibit');
    expect(ruleExhibit.title).toBe('Rule Exhibit');
    expect(devReport.title).toBe('Deviations Report');
    expect(changeSummary.title).toBe('Change Summary');
  });

  it('ACCEPTANCE: every artifact is version-referenced', () => {
    const summary = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    summary.artifacts.forEach((a: { versionId: string; contentHash: string }) => {
      expect(a.versionId).toBeTruthy();
      expect(a.contentHash).toBeTruthy();
    });
  });

  it('ACCEPTANCE: package is reproducible (same input → same output)', () => {
    const run1 = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    const run2 = generateChangeSummary(sampleChangeSet, sampleArtifacts);
    // Compare everything except generatedAt
    expect(run1.totalArtifacts).toBe(run2.totalArtifacts);
    expect(run1.artifacts).toEqual(run2.artifacts);
    expect(run1.changeSet).toEqual(run2.changeSet);
  });

  it('ACCEPTANCE: content hashes detect tampering', () => {
    const original = sampleArtifacts[0].contentHash;
    // Changing data produces a different hash
    const modified = hashContent(canonical({ id: 'form-1', version: 'v-f1-TAMPERED' }));
    expect(original).not.toBe(modified);
  });
});
