/**
 * Coverage Template & Endorsement – unit tests
 *
 * Tests:
 *  1. Template application logic (hydration of coverages, endorsements, forms)
 *  2. Endorsement toggle logic (enable/disable, ordering preservation)
 *  3. Template category faceting
 *  4. Acceptance criteria: PM can assemble from template quickly and consistently
 */

import { describe, it, expect } from 'vitest';
import type {
  CoverageTemplate,
  OrgEndorsement,
  TemplateApplicationResult,
  TemplateCategoryTag,
  LibraryFacet,
} from '../types/coverageTemplate';
import type { WizardCoverageItem } from '../types/productWizard';

// ════════════════════════════════════════════════════════════════════════
// Pure logic (mirrors service but without Firestore)
// ════════════════════════════════════════════════════════════════════════

/** Simulate applyTemplate result from a template + endorsements */
function simulateApplyTemplate(
  template: CoverageTemplate,
  endorsements: OrgEndorsement[],
): TemplateApplicationResult {
  const coverages: TemplateApplicationResult['coverages'] = [{
    name: template.name,
    coverageKind: template.coverageKind,
    coverageCode: template.coverageCode,
    isOptional: false,
    displayOrder: 0,
  }];

  const resolvedEndorsements: TemplateApplicationResult['endorsements'] = [];
  for (let i = 0; i < template.bundledEndorsementIds.length; i++) {
    const eid = template.bundledEndorsementIds[i];
    const end = endorsements.find(e => e.id === eid);
    if (end) {
      resolvedEndorsements.push({
        endorsementId: eid,
        title: end.title,
        endorsementCode: end.endorsementCode,
        endorsementType: end.endorsementType,
        enabled: true,
        displayOrder: i + 1,
      });
    }
  }

  return {
    templateId: template.id,
    templateName: template.name,
    coverages,
    endorsements: resolvedEndorsements,
    forms: template.bundledFormIds.map(fid => ({
      formId: fid,
      formTitle: `Form ${fid}`,
      formNumber: fid,
    })),
    limits: template.defaultLimits,
    deductibles: template.defaultDeductibles,
  };
}

/** Hydrate wizard coverages from template application result */
function hydrateWizardCoverages(result: TemplateApplicationResult): WizardCoverageItem[] {
  const covs: WizardCoverageItem[] = result.coverages.map((c, i) => ({
    coverageId: `tpl-cov-${i}`,
    name: c.name,
    coverageKind: c.coverageKind,
    isOptional: c.isOptional,
    displayOrder: c.displayOrder,
    fromTemplate: true,
  }));

  const ends: WizardCoverageItem[] = result.endorsements
    .filter(e => e.enabled)
    .map((e, i) => ({
      coverageId: `tpl-end-${e.endorsementId}`,
      name: e.title,
      coverageKind: 'endorsement' as const,
      isOptional: true,
      displayOrder: covs.length + i,
      fromTemplate: true,
    }));

  return [...covs, ...ends];
}

/** Toggle an endorsement on/off in the wizard coverage list */
function toggleEndorsement(
  current: WizardCoverageItem[],
  endorsement: OrgEndorsement,
  enabledIds: Set<string>,
): { items: WizardCoverageItem[]; enabledIds: Set<string> } {
  const isEnabled = enabledIds.has(endorsement.id);
  const newEnabledIds = new Set(enabledIds);

  if (isEnabled) {
    newEnabledIds.delete(endorsement.id);
    const items = current
      .filter(c => c.coverageId !== `tpl-end-${endorsement.id}`)
      .map((c, i) => ({ ...c, displayOrder: i }));
    return { items, enabledIds: newEnabledIds };
  } else {
    newEnabledIds.add(endorsement.id);
    const items = [...current, {
      coverageId: `tpl-end-${endorsement.id}`,
      name: endorsement.title,
      coverageKind: 'endorsement' as const,
      isOptional: true,
      displayOrder: current.length,
      fromTemplate: false,
    }];
    return { items, enabledIds: newEnabledIds };
  }
}

/** Filter templates/endorsements by facet */
function filterByFacet(
  templates: CoverageTemplate[],
  endorsements: OrgEndorsement[],
  facet: LibraryFacet,
): { templates: CoverageTemplate[]; endorsements: OrgEndorsement[] } {
  switch (facet) {
    case 'templates':
      return { templates, endorsements: [] };
    case 'endorsements':
      return { templates: [], endorsements };
    default:
      return { templates, endorsements };
  }
}

// ════════════════════════════════════════════════════════════════════════
// Fixtures
// ════════════════════════════════════════════════════════════════════════

const ts = { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any;

const sampleEndorsements: OrgEndorsement[] = [
  {
    id: 'end-1', orgId: 'org-1', endorsementCode: 'CG 24 04',
    title: 'Waiver of Transfer of Rights', endorsementType: 'broadening',
    description: 'Waives subrogation rights', targetCoverageKinds: ['coverage'],
    compatibilityTags: ['general_liability'], latestPublishedVersionId: 'v1',
    versionCount: 1, isActive: true, isBuiltIn: false, displayOrder: 0,
    usageCount: 5, archived: false, createdBy: 'u1', createdAt: ts,
    updatedBy: 'u1', updatedAt: ts,
  },
  {
    id: 'end-2', orgId: 'org-1', endorsementCode: 'CG 20 10',
    title: 'Additional Insured – Owners', endorsementType: 'additional',
    description: 'Adds additional insured', targetCoverageKinds: ['coverage'],
    compatibilityTags: ['general_liability'], latestPublishedVersionId: 'v1',
    versionCount: 2, isActive: true, isBuiltIn: false, displayOrder: 1,
    usageCount: 12, archived: false, createdBy: 'u1', createdAt: ts,
    updatedBy: 'u1', updatedAt: ts,
  },
  {
    id: 'end-3', orgId: 'org-1', endorsementCode: 'CG 21 47',
    title: 'Employment-Related Practices Exclusion', endorsementType: 'restrictive',
    description: 'Excludes employment practices', targetCoverageKinds: ['coverage'],
    compatibilityTags: ['general_liability'], versionCount: 1, isActive: true,
    isBuiltIn: false, displayOrder: 2, usageCount: 3, archived: false,
    createdBy: 'u1', createdAt: ts, updatedBy: 'u1', updatedAt: ts,
  },
];

const sampleTemplate: CoverageTemplate = {
  id: 'tpl-1', orgId: 'org-1',
  name: 'Standard CGL', description: 'Standard Commercial General Liability template',
  category: 'general_liability', tags: ['CGL', 'standard', 'occurrence'],
  coverageKind: 'coverage', coverageCode: 'CGL-001',
  scopeOfCoverage: 'Commercial general liability',
  premiumBasis: 'rated', coverageTrigger: 'occurrence',
  defaultLimits: [
    { limitType: 'perOccurrence', amount: 1000000, displayValue: '$1,000,000', isDefault: true },
    { limitType: 'aggregate', amount: 2000000, displayValue: '$2,000,000', isDefault: true },
  ],
  defaultDeductibles: [
    { deductibleType: 'flat', amount: 1000, displayValue: '$1,000', isDefault: true },
  ],
  bundledEndorsementIds: ['end-1', 'end-2'],
  bundledFormIds: ['CG 00 01'],
  availableStates: ['NY', 'CA', 'TX'],
  usageCount: 8, lastAppliedAt: null,
  isActive: true, isBuiltIn: false,
  createdBy: 'u1', createdAt: ts, updatedBy: 'u1', updatedAt: ts,
};

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

describe('Template Application', () => {
  it('produces coverages from template blueprint', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    expect(result.coverages).toHaveLength(1);
    expect(result.coverages[0].name).toBe('Standard CGL');
    expect(result.coverages[0].coverageKind).toBe('coverage');
  });

  it('resolves bundled endorsements', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    expect(result.endorsements).toHaveLength(2);
    expect(result.endorsements[0].title).toBe('Waiver of Transfer of Rights');
    expect(result.endorsements[1].title).toBe('Additional Insured – Owners');
    expect(result.endorsements.every(e => e.enabled)).toBe(true);
  });

  it('resolves bundled forms', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    expect(result.forms).toHaveLength(1);
    expect(result.forms[0].formNumber).toBe('CG 00 01');
  });

  it('carries through limits and deductibles', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    expect(result.limits).toHaveLength(2);
    expect(result.deductibles).toHaveLength(1);
  });

  it('skips endorsements not found in the org library', () => {
    const templateWithMissing = { ...sampleTemplate, bundledEndorsementIds: ['end-1', 'end-MISSING'] };
    const result = simulateApplyTemplate(templateWithMissing, sampleEndorsements);
    expect(result.endorsements).toHaveLength(1);
  });
});

describe('Wizard Hydration from Template', () => {
  it('creates wizard coverage items from template result', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    const items = hydrateWizardCoverages(result);

    expect(items).toHaveLength(3); // 1 coverage + 2 endorsements
    expect(items[0].coverageKind).toBe('coverage');
    expect(items[0].fromTemplate).toBe(true);
    expect(items[1].coverageKind).toBe('endorsement');
    expect(items[2].coverageKind).toBe('endorsement');
  });

  it('preserves display ordering', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    const items = hydrateWizardCoverages(result);

    items.forEach((item, i) => {
      expect(item.displayOrder).toBe(i);
    });
  });
});

describe('Endorsement Toggle', () => {
  it('adds endorsement when toggling on', () => {
    const items: WizardCoverageItem[] = [
      { coverageId: 'cov-1', name: 'CGL', coverageKind: 'coverage', isOptional: false, displayOrder: 0, fromTemplate: true },
    ];
    const { items: result, enabledIds } = toggleEndorsement(items, sampleEndorsements[2], new Set());

    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Employment-Related Practices Exclusion');
    expect(result[1].coverageKind).toBe('endorsement');
    expect(enabledIds.has('end-3')).toBe(true);
  });

  it('removes endorsement when toggling off', () => {
    const items: WizardCoverageItem[] = [
      { coverageId: 'cov-1', name: 'CGL', coverageKind: 'coverage', isOptional: false, displayOrder: 0, fromTemplate: true },
      { coverageId: 'tpl-end-end-3', name: 'EPL Exclusion', coverageKind: 'endorsement', isOptional: true, displayOrder: 1, fromTemplate: false },
    ];
    const { items: result, enabledIds } = toggleEndorsement(items, sampleEndorsements[2], new Set(['end-3']));

    expect(result).toHaveLength(1);
    expect(result[0].coverageKind).toBe('coverage');
    expect(enabledIds.has('end-3')).toBe(false);
  });

  it('re-indexes display order after toggle off', () => {
    const items: WizardCoverageItem[] = [
      { coverageId: 'cov-1', name: 'CGL', coverageKind: 'coverage', isOptional: false, displayOrder: 0, fromTemplate: true },
      { coverageId: 'tpl-end-end-1', name: 'Waiver', coverageKind: 'endorsement', isOptional: true, displayOrder: 1, fromTemplate: true },
      { coverageId: 'tpl-end-end-2', name: 'Additional', coverageKind: 'endorsement', isOptional: true, displayOrder: 2, fromTemplate: true },
    ];
    const { items: result } = toggleEndorsement(items, sampleEndorsements[0], new Set(['end-1', 'end-2']));

    expect(result).toHaveLength(2);
    result.forEach((item, i) => {
      expect(item.displayOrder).toBe(i);
    });
  });
});

describe('Library Faceting', () => {
  it('shows all items when facet is "all"', () => {
    const { templates, endorsements } = filterByFacet([sampleTemplate], sampleEndorsements, 'all');
    expect(templates).toHaveLength(1);
    expect(endorsements).toHaveLength(3);
  });

  it('shows only templates when facet is "templates"', () => {
    const { templates, endorsements } = filterByFacet([sampleTemplate], sampleEndorsements, 'templates');
    expect(templates).toHaveLength(1);
    expect(endorsements).toHaveLength(0);
  });

  it('shows only endorsements when facet is "endorsements"', () => {
    const { templates, endorsements } = filterByFacet([sampleTemplate], sampleEndorsements, 'endorsements');
    expect(templates).toHaveLength(0);
    expect(endorsements).toHaveLength(3);
  });
});

describe('Acceptance: PM can assemble product from template quickly and consistently', () => {
  it('ACCEPTANCE: template application produces a fully populated wizard state', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    const items = hydrateWizardCoverages(result);

    // Has base coverage
    expect(items.filter(c => c.coverageKind === 'coverage').length).toBeGreaterThan(0);
    // Has endorsements
    expect(items.filter(c => c.coverageKind === 'endorsement').length).toBeGreaterThan(0);
    // All marked as from template
    expect(items.every(c => c.fromTemplate)).toBe(true);
    // Forms are hydrated
    expect(result.forms.length).toBeGreaterThan(0);
    // Limits and deductibles are carried through
    expect(result.limits.length).toBeGreaterThan(0);
    expect(result.deductibles.length).toBeGreaterThan(0);
  });

  it('ACCEPTANCE: result is consistent across multiple applications', () => {
    const r1 = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    const r2 = simulateApplyTemplate(sampleTemplate, sampleEndorsements);

    expect(r1.coverages).toEqual(r2.coverages);
    expect(r1.endorsements).toEqual(r2.endorsements);
    expect(r1.forms).toEqual(r2.forms);
    expect(r1.limits).toEqual(r2.limits);
  });

  it('ACCEPTANCE: endorsements can be toggled on/off after template application', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    let items = hydrateWizardCoverages(result);
    let enabledIds = new Set(result.endorsements.filter(e => e.enabled).map(e => e.endorsementId));

    // Start with 3 items (1 cov + 2 end)
    expect(items).toHaveLength(3);

    // Toggle off end-1
    const after = toggleEndorsement(items, sampleEndorsements[0], enabledIds);
    expect(after.items).toHaveLength(2);
    expect(after.enabledIds.has('end-1')).toBe(false);

    // Toggle on end-3
    const after2 = toggleEndorsement(after.items, sampleEndorsements[2], after.enabledIds);
    expect(after2.items).toHaveLength(3);
    expect(after2.enabledIds.has('end-3')).toBe(true);
  });

  it('ACCEPTANCE: ordering is preserved through all operations', () => {
    const result = simulateApplyTemplate(sampleTemplate, sampleEndorsements);
    let items = hydrateWizardCoverages(result);

    // Verify initial ordering
    items.forEach((item, i) => expect(item.displayOrder).toBe(i));

    // Toggle off middle endorsement
    const enabledIds = new Set(result.endorsements.map(e => e.endorsementId));
    const after = toggleEndorsement(items, sampleEndorsements[0], enabledIds);

    // Verify re-indexed ordering (no gaps)
    after.items.forEach((item, i) => expect(item.displayOrder).toBe(i));
  });
});
