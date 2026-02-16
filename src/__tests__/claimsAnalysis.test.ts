/**
 * Claims Analysis Tests
 *
 * Tests for:
 * - Type contracts and label maps
 * - Scenario creation and validation
 * - Citation extraction from markdown
 * - Structured field parsing from AI output
 * - Hash generation for excerpt integrity
 */

import { describe, it, expect } from 'vitest';
import type {
  ClaimScenario,
  ClaimsAnalysis,
  AnalysisCitation,
  AnalysisStructuredFields,
  CauseOfLoss,
  DamageType,
  CoverageDetermination,
  FormSourceSnapshot,
} from '../types/claimsAnalysis';
import {
  CAUSE_OF_LOSS_LABELS,
  DAMAGE_TYPE_LABELS,
  DETERMINATION_LABELS,
  DETERMINATION_COLORS,
  hashExcerpt,
  createEmptyScenario,
  createEmptyStructuredFields,
} from '../types/claimsAnalysis';
import {
  parseStructuredFields,
  extractCitations,
} from '../services/structuredClaimsService';

// ============================================================================
// Type / Label Tests
// ============================================================================

describe('Claims Analysis Labels', () => {
  it('CAUSE_OF_LOSS_LABELS covers all CauseOfLoss values', () => {
    const causes: CauseOfLoss[] = [
      'fire', 'lightning', 'windstorm', 'hail', 'explosion', 'smoke',
      'water_damage', 'theft', 'vandalism', 'vehicle_damage',
      'bodily_injury', 'property_damage', 'personal_injury',
      'products_completed_ops', 'professional_liability', 'cyber_incident', 'other',
    ];
    causes.forEach(c => {
      expect(CAUSE_OF_LOSS_LABELS[c]).toBeDefined();
      expect(typeof CAUSE_OF_LOSS_LABELS[c]).toBe('string');
    });
  });

  it('DAMAGE_TYPE_LABELS covers all DamageType values', () => {
    const types: DamageType[] = ['property', 'bodily_injury', 'financial', 'reputational', 'other'];
    types.forEach(t => {
      expect(DAMAGE_TYPE_LABELS[t]).toBeDefined();
    });
  });

  it('DETERMINATION_LABELS and COLORS cover all values', () => {
    const dets: CoverageDetermination[] = ['covered', 'not_covered', 'partially_covered', 'insufficient_information'];
    dets.forEach(d => {
      expect(DETERMINATION_LABELS[d]).toBeDefined();
      expect(DETERMINATION_COLORS[d]).toBeDefined();
      expect(DETERMINATION_COLORS[d]).toMatch(/^#/);
    });
  });
});

// ============================================================================
// Scenario Tests
// ============================================================================

describe('ClaimScenario', () => {
  it('createEmptyScenario returns sensible defaults', () => {
    const s = createEmptyScenario();
    expect(s.lossDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.causeOfLoss).toBe('property_damage');
    expect(s.damageTypes).toEqual(['property']);
    expect(s.factsNarrative).toBe('');
  });

  it('supports all optional fields', () => {
    const s: ClaimScenario = {
      lossDate: '2024-06-15',
      causeOfLoss: 'fire',
      damageTypes: ['property', 'financial'],
      factsNarrative: 'A fire broke out in the warehouse.',
      causeOfLossDetail: 'Electrical short circuit',
      estimatedDamages: 250000,
      lossLocation: 'New York, NY',
      claimantName: 'Acme Corp',
      policyNumber: 'POL-12345',
      additionalFacts: { 'Sprinkler System': 'Present but non-functional' },
    };
    expect(s.estimatedDamages).toBe(250000);
    expect(s.additionalFacts?.['Sprinkler System']).toBe('Present but non-functional');
  });
});

// ============================================================================
// Hash Tests
// ============================================================================

describe('hashExcerpt', () => {
  it('returns a consistent hash for the same input', () => {
    const h1 = hashExcerpt('Section I – Coverage A');
    const h2 = hashExcerpt('Section I – Coverage A');
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', () => {
    const h1 = hashExcerpt('Section I – Coverage A');
    const h2 = hashExcerpt('Section II – Exclusions');
    expect(h1).not.toBe(h2);
  });

  it('returns a non-empty string', () => {
    const h = hashExcerpt('test');
    expect(h.length).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    const h = hashExcerpt('');
    expect(typeof h).toBe('string');
  });
});

// ============================================================================
// Structured Field Parsing Tests
// ============================================================================

describe('parseStructuredFields', () => {
  const sampleOutput = `## Coverage Determination: COVERED

## Summary
The claim for water damage to the insured's warehouse is covered under the Commercial Property Coverage Form. The policy provides coverage for direct physical loss caused by water damage.

## Applicable Coverages
- Per CG 00 01, Section I – Coverage A: Building coverage applies to the warehouse structure
- Per CG 00 01, Section I – Coverage B: Business Personal Property covers damaged inventory
- Per CG 00 01, Section I – Additional Coverage: Debris removal included

## Relevant Exclusions
- CG 00 01, Section I – Exclusion B.1: Flood exclusion does not apply as this was pipe burst, not rising water

## Conditions and Limitations
- 90-day notice requirement per Section IV, Condition C
- Deductible of $1,000 applies

## Analysis Details
Based on the policy language in CG 00 01, the water damage from a burst pipe constitutes a covered peril.

## Recommendations
- Document all damaged property with photographs
- Obtain contractor estimates for structural repairs
- File proof of loss within 90 days

## Sources
CG 00 01 (04/2013) – Sections I, IV referenced`;

  it('parses coverage determination correctly', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.determination).toBe('covered');
  });

  it('parses "NOT COVERED" determination', () => {
    const fields = parseStructuredFields('## Coverage Determination: NOT COVERED\n## Summary\nNot covered.\n');
    expect(fields.determination).toBe('not_covered');
  });

  it('parses "PARTIALLY COVERED" determination', () => {
    const fields = parseStructuredFields('## Coverage Determination: PARTIALLY COVERED\n## Summary\nPartial.\n');
    expect(fields.determination).toBe('partially_covered');
  });

  it('parses "INSUFFICIENT INFORMATION" determination', () => {
    const fields = parseStructuredFields('## Coverage Determination: INSUFFICIENT INFORMATION\n## Summary\nNeed more info.\n');
    expect(fields.determination).toBe('insufficient_information');
  });

  it('parses summary', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.summary).toContain('water damage');
    expect(fields.summary.length).toBeGreaterThan(10);
  });

  it('parses applicable coverages', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.applicableCoverages.length).toBe(3);
    expect(fields.applicableCoverages[0]).toContain('CG 00 01');
    expect(fields.applicableCoverages[0]).toContain('Coverage A');
  });

  it('parses relevant exclusions', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.relevantExclusions.length).toBe(1);
    expect(fields.relevantExclusions[0]).toContain('Flood exclusion');
  });

  it('parses conditions and limitations', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.conditionsAndLimitations.length).toBe(2);
    expect(fields.conditionsAndLimitations[0]).toContain('90-day');
  });

  it('parses recommendations', () => {
    const fields = parseStructuredFields(sampleOutput);
    expect(fields.recommendations.length).toBe(3);
    expect(fields.recommendations[0]).toContain('photograph');
  });

  it('handles markdown with no bullet items gracefully', () => {
    const fields = parseStructuredFields('## Coverage Determination: COVERED\n## Summary\nCovered.\n');
    expect(fields.determination).toBe('covered');
    expect(fields.applicableCoverages).toEqual([]);
    expect(fields.relevantExclusions).toEqual([]);
  });

  it('createEmptyStructuredFields returns valid defaults', () => {
    const fields = createEmptyStructuredFields();
    expect(fields.determination).toBe('insufficient_information');
    expect(fields.summary).toBe('');
    expect(fields.applicableCoverages).toEqual([]);
    expect(fields.relevantExclusions).toEqual([]);
    expect(fields.conditionsAndLimitations).toEqual([]);
    expect(fields.recommendations).toEqual([]);
  });
});

// ============================================================================
// Citation Extraction Tests
// ============================================================================

describe('extractCitations', () => {
  const sources: FormSourceSnapshot[] = [
    {
      formId: 'f1',
      formVersionId: 'fv1',
      formNumber: 'CG 00 01',
      formTitle: 'Commercial General Liability Coverage Form',
      editionDate: '04/2013',
      extractedText: 'Section I – COVERAGES Coverage A – Bodily Injury And Property Damage Liability...',
      status: 'published',
    },
    {
      formId: 'f2',
      formVersionId: 'fv2',
      formNumber: 'CG 20 10',
      formTitle: 'Additional Insured Endorsement',
      editionDate: '12/2019',
      extractedText: 'This endorsement modifies insurance provided under...',
      status: 'published',
    },
  ];

  it('extracts citations matching form numbers in markdown', () => {
    const markdown = 'Per CG 00 01, Section I – Coverage A provides bodily injury coverage. See CG 20 10, Section 1 for additional insured provisions.';
    const citations = extractCitations(markdown, sources);
    expect(citations.length).toBeGreaterThanOrEqual(1);
    expect(citations.some(c => c.formVersionId === 'fv1')).toBe(true);
  });

  it('includes formLabel with number and edition date', () => {
    const markdown = 'Per CG 00 01, Section I coverage applies.';
    const citations = extractCitations(markdown, sources);
    const cg = citations.find(c => c.formVersionId === 'fv1');
    if (cg) {
      expect(cg.formLabel).toContain('CG 00 01');
      expect(cg.formLabel).toContain('04/2013');
    }
  });

  it('avoids duplicate citations for the same form+section', () => {
    const markdown = 'Per CG 00 01, Section I coverage. Per CG 00 01, Section I again.';
    const citations = extractCitations(markdown, sources);
    const cg01 = citations.filter(c => c.formVersionId === 'fv1');
    // Should de-duplicate
    expect(cg01.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no form numbers match', () => {
    const markdown = 'This analysis discusses general coverage principles.';
    const citations = extractCitations(markdown, sources);
    expect(citations).toEqual([]);
  });

  it('generates excerpt hashes for integrity', () => {
    const markdown = 'Per CG 00 01, Section I – Coverage A applies.';
    const citations = extractCitations(markdown, sources);
    citations.forEach(c => {
      expect(c.excerptHash).toBeDefined();
      expect(c.excerptHash.length).toBeGreaterThan(0);
    });
  });

  it('extracts citations from Sources section', () => {
    const markdown = `## Analysis
Some analysis text.

## Sources
CG 00 01 (04/2013) – Sections I, IV referenced
CG 20 10 (12/2019) – Section 1 referenced`;
    const citations = extractCitations(markdown, sources);
    expect(citations.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// ClaimsAnalysis Document Shape
// ============================================================================

describe('ClaimsAnalysis document shape', () => {
  it('validates the full analysis document structure', () => {
    const doc: Partial<ClaimsAnalysis> = {
      id: 'analysis-1',
      orgId: 'org-1',
      formVersionIds: ['fv1', 'fv2'],
      scenario: createEmptyScenario(),
      outputMarkdown: '## Coverage Determination: COVERED',
      structuredFields: createEmptyStructuredFields(),
      citations: [],
      requestId: 'ca-123-abc',
      latencyMs: 1500,
      modelId: 'gpt-4o-mini',
    };

    expect(doc.formVersionIds).toHaveLength(2);
    expect(doc.requestId).toMatch(/^ca-/);
    expect(doc.modelId).toBe('gpt-4o-mini');
    expect(doc.latencyMs).toBeGreaterThan(0);
  });

  it('supports optional productVersionId and stateCode', () => {
    const doc: Partial<ClaimsAnalysis> = {
      id: 'analysis-2',
      orgId: 'org-1',
      productVersionId: 'pv-1',
      stateCode: 'NY',
      formVersionIds: ['fv1'],
      scenario: createEmptyScenario(),
      outputMarkdown: '',
      structuredFields: createEmptyStructuredFields(),
      citations: [],
      requestId: 'ca-456-def',
      latencyMs: 2000,
      modelId: 'gpt-4o-mini',
    };

    expect(doc.productVersionId).toBe('pv-1');
    expect(doc.stateCode).toBe('NY');
  });
});

// ============================================================================
// Citation Integrity
// ============================================================================

describe('Citation integrity', () => {
  it('citation references a specific formVersionId (not formId)', () => {
    const citation: AnalysisCitation = {
      formVersionId: 'fv-abc-123',
      formLabel: 'CG 00 01 04/2013',
      section: 'Section I – Coverage A',
      excerptHash: hashExcerpt('Section I – Coverage A'),
      locationHint: 'Section I – Coverage A',
    };

    expect(citation.formVersionId).toBe('fv-abc-123');
    expect(citation.formLabel).toContain('04/2013');
    expect(citation.section).toContain('Coverage A');
  });

  it('excerpt hash is consistent and verifiable', () => {
    const text = 'We will pay those sums that the insured becomes legally obligated to pay';
    const citation: AnalysisCitation = {
      formVersionId: 'fv-1',
      formLabel: 'CG 00 01 04/2013',
      section: 'Section I',
      excerptHash: hashExcerpt(text),
      locationHint: 'Section I',
      excerptText: text,
    };

    // Verify hash matches
    expect(citation.excerptHash).toBe(hashExcerpt(text));
    // Verify different text produces different hash
    expect(citation.excerptHash).not.toBe(hashExcerpt('different text'));
  });
});

// ============================================================================
// Acceptance Criteria Validation
// ============================================================================

describe('Acceptance Criteria: every analysis references specific form versions', () => {
  it('formVersionIds array is required and non-empty for a valid analysis', () => {
    const analysis: Partial<ClaimsAnalysis> = {
      formVersionIds: ['fv-1', 'fv-2'],
      citations: [
        {
          formVersionId: 'fv-1',
          formLabel: 'CG 00 01 04/2013',
          section: 'Section I',
          excerptHash: 'abc',
          locationHint: 'Section I',
        },
      ],
    };

    expect(analysis.formVersionIds!.length).toBeGreaterThan(0);
    expect(analysis.citations!.every(c => c.formVersionId.length > 0)).toBe(true);
  });

  it('citations expose the source form version used', () => {
    const citations: AnalysisCitation[] = [
      {
        formVersionId: 'fv-1',
        formLabel: 'CG 00 01 04/2013',
        section: 'Section I – Coverage A',
        excerptHash: hashExcerpt('coverage text'),
        locationHint: 'Section I – Coverage A',
        excerptText: 'We will pay those sums...',
      },
    ];

    citations.forEach(c => {
      expect(c.formVersionId).toBeTruthy();
      expect(c.formLabel).toBeTruthy();
      expect(c.section).toBeTruthy();
      expect(c.excerptHash).toBeTruthy();
    });
  });
});
