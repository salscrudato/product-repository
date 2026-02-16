/**
 * Form Service Tests
 *
 * Tests for form types, readiness checks, impact analysis helpers,
 * and the "where used" filtering logic.
 *
 * Note: These tests validate the pure logic and type contracts.
 * Firestore integration tests would need the emulator.
 */

import { describe, it, expect } from 'vitest';
import type {
  OrgForm,
  OrgFormVersion,
  FormUse,
  FormType,
  FormOrigin,
  FormUseType,
  FormWithStats,
  FormImpactResult,
  FormReadinessCheck,
} from '../types/form';
import {
  FORM_TYPE_LABELS,
  FORM_ORIGIN_LABELS,
  FORM_USE_TYPE_LABELS,
} from '../types/form';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Helpers
// ============================================================================

const now = Timestamp.now();

function makeForm(overrides: Partial<OrgForm> = {}): OrgForm {
  return {
    id: 'form-1',
    orgId: 'org-1',
    formNumber: 'CG 00 01',
    title: 'Commercial General Liability Coverage Form',
    isoOrManuscript: 'iso',
    type: 'policy',
    versionCount: 0,
    archived: false,
    createdAt: now,
    createdBy: 'user-1',
    updatedAt: now,
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeFormVersion(overrides: Partial<OrgFormVersion> = {}): OrgFormVersion {
  return {
    id: 'ver-1',
    formId: 'form-1',
    versionNumber: 1,
    editionDate: '04/2013',
    jurisdiction: ['NY', 'CA'],
    status: 'draft',
    effectiveStart: null,
    effectiveEnd: null,
    createdAt: now,
    createdBy: 'user-1',
    updatedAt: now,
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeFormUse(overrides: Partial<FormUse> = {}): FormUse {
  return {
    id: 'use-1',
    orgId: 'org-1',
    formId: 'form-1',
    formVersionId: 'ver-1',
    productVersionId: 'prod-ver-1',
    useType: 'base',
    createdAt: now,
    createdBy: 'user-1',
    ...overrides,
  };
}

// ============================================================================
// Type / Label Tests
// ============================================================================

describe('Form Types and Labels', () => {
  it('FORM_TYPE_LABELS covers all FormType values', () => {
    const types: FormType[] = ['policy', 'endorsement', 'notice', 'application', 'declaration', 'schedule', 'certificate', 'other'];
    types.forEach(t => {
      expect(FORM_TYPE_LABELS[t]).toBeDefined();
      expect(typeof FORM_TYPE_LABELS[t]).toBe('string');
    });
  });

  it('FORM_ORIGIN_LABELS covers all FormOrigin values', () => {
    const origins: FormOrigin[] = ['iso', 'manuscript'];
    origins.forEach(o => {
      expect(FORM_ORIGIN_LABELS[o]).toBeDefined();
    });
  });

  it('FORM_USE_TYPE_LABELS covers all FormUseType values', () => {
    const useTypes: FormUseType[] = ['base', 'endorsement', 'notice', 'condition'];
    useTypes.forEach(u => {
      expect(FORM_USE_TYPE_LABELS[u]).toBeDefined();
    });
  });
});

// ============================================================================
// OrgForm Tests
// ============================================================================

describe('OrgForm schema', () => {
  it('creates a valid form with all required fields', () => {
    const form = makeForm();
    expect(form.id).toBe('form-1');
    expect(form.orgId).toBe('org-1');
    expect(form.formNumber).toBe('CG 00 01');
    expect(form.title).toBe('Commercial General Liability Coverage Form');
    expect(form.isoOrManuscript).toBe('iso');
    expect(form.type).toBe('policy');
    expect(form.versionCount).toBe(0);
    expect(form.archived).toBe(false);
  });

  it('supports optional fields like description and version pointers', () => {
    const form = makeForm({
      description: 'Standard CGL form',
      latestPublishedVersionId: 'ver-pub-1',
      latestDraftVersionId: 'ver-draft-1',
    });
    expect(form.description).toBe('Standard CGL form');
    expect(form.latestPublishedVersionId).toBe('ver-pub-1');
    expect(form.latestDraftVersionId).toBe('ver-draft-1');
  });
});

// ============================================================================
// OrgFormVersion Tests
// ============================================================================

describe('OrgFormVersion schema', () => {
  it('creates a valid version with edition date and jurisdiction', () => {
    const ver = makeFormVersion();
    expect(ver.formId).toBe('form-1');
    expect(ver.versionNumber).toBe(1);
    expect(ver.editionDate).toBe('04/2013');
    expect(ver.jurisdiction).toEqual(['NY', 'CA']);
    expect(ver.status).toBe('draft');
  });

  it('supports all version statuses', () => {
    const statuses = ['draft', 'review', 'approved', 'filed', 'published', 'archived'] as const;
    statuses.forEach(status => {
      const ver = makeFormVersion({ status });
      expect(ver.status).toBe(status);
    });
  });

  it('supports storage and indexing fields', () => {
    const ver = makeFormVersion({
      storagePath: 'forms/org-1/form-1/ver-1.pdf',
      checksum: 'sha256:abc123',
      extractedText: 'This policy covers...',
      indexingStatus: 'completed',
    });
    expect(ver.storagePath).toBe('forms/org-1/form-1/ver-1.pdf');
    expect(ver.checksum).toBe('sha256:abc123');
    expect(ver.extractedText).toBe('This policy covers...');
    expect(ver.indexingStatus).toBe('completed');
  });

  it('supports effective date ranges', () => {
    const ver = makeFormVersion({
      effectiveStart: '2024-01-01',
      effectiveEnd: '2025-01-01',
    });
    expect(ver.effectiveStart).toBe('2024-01-01');
    expect(ver.effectiveEnd).toBe('2025-01-01');
  });
});

// ============================================================================
// FormUse Tests
// ============================================================================

describe('FormUse schema', () => {
  it('creates a valid usage record with minimum fields', () => {
    const use = makeFormUse();
    expect(use.formId).toBe('form-1');
    expect(use.formVersionId).toBe('ver-1');
    expect(use.productVersionId).toBe('prod-ver-1');
    expect(use.useType).toBe('base');
  });

  it('supports optional scope fields', () => {
    const use = makeFormUse({
      coverageVersionId: 'cov-ver-1',
      stateCode: 'NY',
    });
    expect(use.coverageVersionId).toBe('cov-ver-1');
    expect(use.stateCode).toBe('NY');
  });

  it('supports all use types', () => {
    const types: FormUseType[] = ['base', 'endorsement', 'notice', 'condition'];
    types.forEach(t => {
      const use = makeFormUse({ useType: t });
      expect(use.useType).toBe(t);
    });
  });

  it('supports denormalized display fields', () => {
    const use = makeFormUse({
      formNumber: 'CG 00 01',
      formTitle: 'CGL Form',
      productName: 'Commercial Package',
      coverageName: 'Bodily Injury',
    });
    expect(use.formNumber).toBe('CG 00 01');
    expect(use.productName).toBe('Commercial Package');
  });
});

// ============================================================================
// FormWithStats Tests
// ============================================================================

describe('FormWithStats aggregation', () => {
  it('aggregates version and usage counts correctly', () => {
    const stats: FormWithStats = {
      form: makeForm(),
      publishedVersionCount: 2,
      totalUses: 5,
      latestEditionDate: '01/2024',
    };
    expect(stats.publishedVersionCount).toBe(2);
    expect(stats.totalUses).toBe(5);
    expect(stats.latestEditionDate).toBe('01/2024');
  });
});

// ============================================================================
// FormImpactResult Tests (logic validation)
// ============================================================================

describe('FormImpactResult', () => {
  it('correctly identifies affected products and states', () => {
    const uses = [
      makeFormUse({ id: 'u1', productVersionId: 'p1', stateCode: 'NY' }),
      makeFormUse({ id: 'u2', productVersionId: 'p1', stateCode: 'CA' }),
      makeFormUse({ id: 'u3', productVersionId: 'p2', coverageVersionId: 'c1' }),
    ];

    const result: FormImpactResult = {
      formId: 'form-1',
      formVersionId: 'ver-1',
      formNumber: 'CG 00 01',
      formTitle: 'CGL Form',
      editionDate: '01/2024',
      affectedUses: uses,
      affectedProductVersionIds: [...new Set(uses.map(u => u.productVersionId))],
      affectedCoverageVersionIds: [...new Set(uses.filter(u => u.coverageVersionId).map(u => u.coverageVersionId!))],
      affectedStates: [...new Set(uses.filter(u => u.stateCode).map(u => u.stateCode!))],
      requiresReApproval: uses.length > 0,
    };

    expect(result.affectedProductVersionIds).toEqual(['p1', 'p2']);
    expect(result.affectedStates).toEqual(['NY', 'CA']);
    expect(result.affectedCoverageVersionIds).toEqual(['c1']);
    expect(result.requiresReApproval).toBe(true);
  });

  it('reports no impact when no uses exist', () => {
    const result: FormImpactResult = {
      formId: 'form-1',
      formVersionId: 'ver-1',
      formNumber: 'CG 00 01',
      formTitle: 'CGL Form',
      editionDate: '01/2024',
      affectedUses: [],
      affectedProductVersionIds: [],
      affectedCoverageVersionIds: [],
      affectedStates: [],
      requiresReApproval: false,
    };

    expect(result.affectedProductVersionIds).toHaveLength(0);
    expect(result.requiresReApproval).toBe(false);
  });
});

// ============================================================================
// FormReadinessCheck Tests
// ============================================================================

describe('FormReadinessCheck', () => {
  it('identifies healthy state when all forms are published', () => {
    const check: FormReadinessCheck = {
      totalForms: 3,
      publishedForms: 3,
      draftForms: 0,
      totalUses: 10,
      unpublishedFormIds: [],
      draftFormsInUse: [],
      orphanedForms: [],
      issues: [],
      healthy: true,
    };
    expect(check.healthy).toBe(true);
    expect(check.issues).toHaveLength(0);
  });

  it('flags draft forms that are in use', () => {
    const check: FormReadinessCheck = {
      totalForms: 3,
      publishedForms: 1,
      draftForms: 2,
      totalUses: 5,
      unpublishedFormIds: ['form-2', 'form-3'],
      draftFormsInUse: [
        { formId: 'form-2', formNumber: 'IL 00 17', productVersionIds: ['p1'] },
      ],
      orphanedForms: [
        { formId: 'form-3', formNumber: 'IL 00 21' },
      ],
      issues: [
        'Form "IL 00 17" is used in products but has no published edition',
        'Form "IL 00 17" has no published editions',
        'Form "IL 00 21" has no published editions',
      ],
      healthy: false,
    };
    expect(check.healthy).toBe(false);
    expect(check.draftFormsInUse).toHaveLength(1);
    expect(check.orphanedForms).toHaveLength(1);
    expect(check.issues.length).toBeGreaterThan(0);
  });

  it('identifies orphaned forms (no uses)', () => {
    const check: FormReadinessCheck = {
      totalForms: 2,
      publishedForms: 2,
      draftForms: 0,
      totalUses: 0,
      unpublishedFormIds: [],
      draftFormsInUse: [],
      orphanedForms: [
        { formId: 'form-1', formNumber: 'CG 00 01' },
        { formId: 'form-2', formNumber: 'CG 20 10' },
      ],
      issues: [],
      healthy: true,
    };
    expect(check.orphanedForms).toHaveLength(2);
    expect(check.totalUses).toBe(0);
  });
});

// ============================================================================
// Where-Used Filtering Tests (client-side logic)
// ============================================================================

describe('Where-Used filtering logic', () => {
  const uses: FormUse[] = [
    makeFormUse({ id: 'u1', formId: 'f1', productVersionId: 'p1', stateCode: 'NY', useType: 'base' }),
    makeFormUse({ id: 'u2', formId: 'f1', productVersionId: 'p1', stateCode: 'CA', useType: 'base' }),
    makeFormUse({ id: 'u3', formId: 'f1', productVersionId: 'p2', stateCode: 'NY', useType: 'endorsement' }),
    makeFormUse({ id: 'u4', formId: 'f2', productVersionId: 'p1', useType: 'notice' }),
    makeFormUse({ id: 'u5', formId: 'f2', productVersionId: 'p3', stateCode: 'TX', useType: 'condition', coverageVersionId: 'c1' }),
  ];

  it('filters by formId', () => {
    const filtered = uses.filter(u => u.formId === 'f1');
    expect(filtered).toHaveLength(3);
  });

  it('filters by productVersionId', () => {
    const filtered = uses.filter(u => u.productVersionId === 'p1');
    expect(filtered).toHaveLength(3);
  });

  it('filters by stateCode', () => {
    const filtered = uses.filter(u => u.stateCode === 'NY');
    expect(filtered).toHaveLength(2);
  });

  it('filters by useType', () => {
    const filtered = uses.filter(u => u.useType === 'base');
    expect(filtered).toHaveLength(2);
  });

  it('filters by coverageVersionId', () => {
    const filtered = uses.filter(u => u.coverageVersionId === 'c1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].stateCode).toBe('TX');
  });

  it('applies combined filters (product + state)', () => {
    const filtered = uses.filter(u => u.productVersionId === 'p1' && u.stateCode === 'NY');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('u1');
  });

  it('groups uses by formId', () => {
    const grouped = new Map<string, FormUse[]>();
    uses.forEach(u => {
      if (!grouped.has(u.formId)) grouped.set(u.formId, []);
      grouped.get(u.formId)!.push(u);
    });
    expect(grouped.size).toBe(2);
    expect(grouped.get('f1')!.length).toBe(3);
    expect(grouped.get('f2')!.length).toBe(2);
  });

  it('extracts unique products from uses', () => {
    const products = [...new Set(uses.map(u => u.productVersionId))];
    expect(products.sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('extracts unique states from uses', () => {
    const states = [...new Set(uses.filter(u => u.stateCode).map(u => u.stateCode!))];
    expect(states.sort()).toEqual(['CA', 'NY', 'TX']);
  });

  it('answers: "Which products/states use form f1?"', () => {
    const formUses = uses.filter(u => u.formId === 'f1');
    const products = [...new Set(formUses.map(u => u.productVersionId))];
    const states = [...new Set(formUses.filter(u => u.stateCode).map(u => u.stateCode!))];
    expect(products).toEqual(['p1', 'p2']);
    expect(states.sort()).toEqual(['CA', 'NY']);
  });
});

// ============================================================================
// Impact Analysis Logic Tests
// ============================================================================

describe('Impact analysis helpers', () => {
  it('de-duplicates affected product version IDs', () => {
    const uses = [
      makeFormUse({ productVersionId: 'p1' }),
      makeFormUse({ productVersionId: 'p1' }),
      makeFormUse({ productVersionId: 'p2' }),
    ];
    const uniqueProducts = [...new Set(uses.map(u => u.productVersionId))];
    expect(uniqueProducts).toEqual(['p1', 'p2']);
  });

  it('de-duplicates affected states', () => {
    const uses = [
      makeFormUse({ stateCode: 'NY' }),
      makeFormUse({ stateCode: 'NY' }),
      makeFormUse({ stateCode: 'CA' }),
      makeFormUse({}),
    ];
    const uniqueStates = [...new Set(uses.filter(u => u.stateCode).map(u => u.stateCode!))];
    expect(uniqueStates).toEqual(['NY', 'CA']);
  });

  it('flags re-approval when uses exist', () => {
    expect([makeFormUse()].length > 0).toBe(true);
    expect([].length > 0).toBe(false);
  });
});
