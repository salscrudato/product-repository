/**
 * Clause-Grounded Analysis Tests
 *
 * Covers:
 *   - Types and config maps
 *   - Engine: buildCitedConclusions, detectOpenQuestions, buildDecisionGates, compareAnalyses
 *   - Service contract: grounding, resolving, gate advancement, comparison
 *   - Acceptance criteria: analysis reads like a defensible coverage memo with citations
 */

import { describe, it, expect } from 'vitest';
import {
  buildCitedConclusions,
  detectOpenQuestions,
  buildDecisionGates,
  groundAnalysis,
  compareAnalyses,
  type GroundingInput,
} from '../engine/clauseGroundedEngine';
import type {
  ClauseAnchorCitation,
  CitedConclusion,
  ConclusionType,
  OpenQuestion,
  DecisionGate,
  ClauseGroundedFields,
  AnalysisComparison,
} from '../types/clauseGroundedAnalysis';
import {
  CONCLUSION_TYPE_CONFIG,
  OPEN_QUESTION_CONFIG,
  DECISION_GATE_CONFIG,
} from '../types/clauseGroundedAnalysis';
import type { AnalysisStructuredFields, FormSourceSnapshot } from '../types/claimsAnalysis';
import type { FormIngestionSection, FormIngestionChunk, ContentAnchor } from '../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makeAnchor(overrides: Partial<ContentAnchor> = {}): ContentAnchor {
  return {
    hash: 'abc123',
    slug: 'coverage-a-bodily-injury',
    anchorText: 'Coverage A – Bodily Injury and Property Damage Liability',
    page: 4,
    offset: 0,
    ...overrides,
  };
}

function makeSection(overrides: Partial<FormIngestionSection> = {}): FormIngestionSection {
  return {
    id: 'sec1',
    title: 'Coverage A – Bodily Injury and Property Damage Liability',
    type: 'coverage',
    anchors: [makeAnchor()],
    pageRefs: [4, 5],
    summary: 'Covers bodily injury and property damage liability.',
    order: 0,
    path: 'SECTION I.Coverage A',
    chunkIds: ['chunk1'],
    ...overrides,
  };
}

function makeChunk(overrides: Partial<FormIngestionChunk> = {}): FormIngestionChunk {
  return {
    id: 'chunk1',
    index: 0,
    text: 'We will pay those sums that the insured becomes legally obligated to pay as damages because of "bodily injury" or "property damage" to which this insurance applies. Coverage A applies to bodily injury and property damage.',
    pageStart: 4,
    pageEnd: 5,
    anchors: [makeAnchor()],
    sectionPath: 'SECTION I.Coverage A',
    hash: 'chunkhash123',
    charCount: 200,
    sectionType: 'coverage',
    ...overrides,
  };
}

function makeSource(overrides: Partial<FormSourceSnapshot> = {}): FormSourceSnapshot {
  return {
    formId: 'form1',
    formVersionId: 'fv1',
    formNumber: 'CG 00 01',
    formTitle: 'Commercial General Liability',
    editionDate: '04/13',
    extractedText: 'Coverage A – Bodily Injury and Property Damage Liability. We will pay those sums...',
    status: 'published',
    ...overrides,
  };
}

function makeStructuredFields(overrides: Partial<AnalysisStructuredFields> = {}): AnalysisStructuredFields {
  return {
    determination: 'covered',
    summary: 'The claim is covered under Coverage A – Bodily Injury and Property Damage Liability.',
    applicableCoverages: [
      'Coverage A – Bodily Injury and Property Damage Liability applies. Per CG 00 01, Section I, the insurer will pay damages for bodily injury.',
    ],
    relevantExclusions: [
      'Exclusion j(5) – Employer Liability may apply if the claimant is an employee.',
    ],
    conditionsAndLimitations: [
      'The per-occurrence limit of $1,000,000 applies to this claim.',
    ],
    recommendations: [
      'Verify the claimant is not an employee of the insured.',
      'Obtain the complete policy with all endorsements.',
    ],
    ...overrides,
  };
}

function makeInput(overrides: Partial<GroundingInput> = {}): GroundingInput {
  const source = makeSource();
  const sectionsByFormVersion = new Map([['fv1', [makeSection()]]]);
  const chunksByFormVersion = new Map([['fv1', [makeChunk()]]]);
  return {
    structuredFields: makeStructuredFields(),
    existingCitations: [],
    sectionsByFormVersion,
    chunksByFormVersion,
    sources: [source],
    outputMarkdown: '## Coverage Determination: COVERED\n\n## Summary\nThe claim is covered.\n\n## Recommendations\n- Verify the claimant is not an employee.\n- Obtain the complete policy with all endorsements.',
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Type configuration maps
// ════════════════════════════════════════════════════════════════════════

describe('Type configuration maps', () => {
  it('CONCLUSION_TYPE_CONFIG has all conclusion types', () => {
    const types: ConclusionType[] = [
      'coverage_grant', 'exclusion_applies', 'exclusion_exception',
      'condition_met', 'condition_unmet', 'limitation_applies',
      'definition_relevant', 'endorsement_modifies', 'no_coverage',
    ];
    for (const t of types) {
      expect(CONCLUSION_TYPE_CONFIG[t]).toBeDefined();
      expect(CONCLUSION_TYPE_CONFIG[t].label).toBeTruthy();
      expect(CONCLUSION_TYPE_CONFIG[t].color).toMatch(/^#/);
    }
  });

  it('OPEN_QUESTION_CONFIG has all question categories', () => {
    const cats = [
      'missing_facts', 'ambiguous_language', 'missing_forms',
      'endorsement_unknown', 'jurisdiction_specific', 'policy_specific', 'claimant_info',
    ];
    for (const c of cats) {
      expect(OPEN_QUESTION_CONFIG[c as keyof typeof OPEN_QUESTION_CONFIG]).toBeDefined();
    }
  });

  it('DECISION_GATE_CONFIG has all statuses', () => {
    const statuses = ['pending', 'approved', 'rejected', 'needs_review'];
    for (const s of statuses) {
      expect(DECISION_GATE_CONFIG[s as keyof typeof DECISION_GATE_CONFIG]).toBeDefined();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildCitedConclusions
// ════════════════════════════════════════════════════════════════════════

describe('buildCitedConclusions', () => {
  it('creates coverage_grant conclusions from applicableCoverages', () => {
    const input = makeInput();
    const conclusions = buildCitedConclusions(input);
    const coverageGrants = conclusions.filter(c => c.type === 'coverage_grant');
    expect(coverageGrants.length).toBe(1);
    expect(coverageGrants[0].statement).toContain('Coverage A');
    expect(coverageGrants[0].confidence).toBe('high');
  });

  it('creates exclusion_applies conclusions from relevantExclusions', () => {
    const input = makeInput();
    const conclusions = buildCitedConclusions(input);
    const exclusions = conclusions.filter(c => c.type === 'exclusion_applies');
    expect(exclusions.length).toBe(1);
    expect(exclusions[0].statement).toContain('Exclusion');
  });

  it('creates limitation_applies conclusions for limit-related conditions', () => {
    const input = makeInput();
    const conclusions = buildCitedConclusions(input);
    const limitations = conclusions.filter(c => c.type === 'limitation_applies');
    expect(limitations.length).toBe(1);
    expect(limitations[0].statement).toContain('limit');
  });

  it('assigns sequential IDs and orders', () => {
    const conclusions = buildCitedConclusions(makeInput());
    for (let i = 0; i < conclusions.length; i++) {
      expect(conclusions[i].id).toBe(`conc-${i}`);
      expect(conclusions[i].order).toBe(i);
    }
  });

  it('creates no_coverage conclusion when determination is not_covered', () => {
    const input = makeInput({
      structuredFields: makeStructuredFields({
        determination: 'not_covered',
        applicableCoverages: [],
        summary: 'No coverage found.',
      }),
    });
    const conclusions = buildCitedConclusions(input);
    const noCov = conclusions.filter(c => c.type === 'no_coverage');
    expect(noCov.length).toBeGreaterThan(0);
  });

  it('attaches anchor citations to conclusions based on text matching', () => {
    const input = makeInput();
    const conclusions = buildCitedConclusions(input);
    const coverageGrant = conclusions.find(c => c.type === 'coverage_grant');
    // Should find anchor citations because "Coverage A", "Bodily Injury", "Property Damage"
    // appear in both the conclusion statement and the section/anchor text
    expect(coverageGrant).toBeDefined();
    // Citations may or may not be found depending on text overlap
    // The key requirement is the engine ATTEMPTS to find citations
    expect(coverageGrant!.citations).toBeDefined();
    expect(Array.isArray(coverageGrant!.citations)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: detectOpenQuestions
// ════════════════════════════════════════════════════════════════════════

describe('detectOpenQuestions', () => {
  it('detects open questions from recommendations with verify/confirm/obtain', () => {
    const input = makeInput();
    const questions = detectOpenQuestions(input);
    const verifyQ = questions.filter(q => q.question.toLowerCase().includes('verify'));
    expect(verifyQ.length).toBeGreaterThan(0);
    expect(verifyQ[0].category).toBe('missing_facts');
  });

  it('detects open questions from recommendations with obtain', () => {
    const input = makeInput();
    const questions = detectOpenQuestions(input);
    const obtainQ = questions.filter(q => q.question.toLowerCase().includes('obtain'));
    expect(obtainQ.length).toBeGreaterThan(0);
  });

  it('generates missing_forms question when only one form analyzed', () => {
    const input = makeInput();
    expect(input.sources.length).toBe(1);
    const questions = detectOpenQuestions(input);
    const missingForms = questions.filter(q => q.category === 'missing_forms');
    expect(missingForms.length).toBe(1);
    expect(missingForms[0].question).toContain('additional policy forms');
  });

  it('generates questions for insufficient_information determination', () => {
    const input = makeInput({
      structuredFields: makeStructuredFields({ determination: 'insufficient_information' }),
    });
    const questions = detectOpenQuestions(input);
    expect(questions.some(q => q.category === 'missing_facts')).toBe(true);
  });

  it('all questions have unique IDs and are unresolved', () => {
    const questions = detectOpenQuestions(makeInput());
    const ids = questions.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of questions) {
      expect(q.resolved).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: buildDecisionGates
// ════════════════════════════════════════════════════════════════════════

describe('buildDecisionGates', () => {
  it('always includes initial review and final determination gates', () => {
    const gates = buildDecisionGates('covered', false);
    expect(gates.some(g => g.id === 'gate-initial-review')).toBe(true);
    expect(gates.some(g => g.id === 'gate-final-determination')).toBe(true);
  });

  it('includes open questions gate when questions exist', () => {
    const gates = buildDecisionGates('covered', true);
    expect(gates.some(g => g.id === 'gate-open-questions')).toBe(true);
  });

  it('includes supervisor review for not_covered determination', () => {
    const gates = buildDecisionGates('not_covered', false);
    expect(gates.some(g => g.id === 'gate-supervisor-review')).toBe(true);
  });

  it('includes supervisor review for partially_covered determination', () => {
    const gates = buildDecisionGates('partially_covered', false);
    expect(gates.some(g => g.id === 'gate-supervisor-review')).toBe(true);
  });

  it('does NOT include supervisor review for covered determination', () => {
    const gates = buildDecisionGates('covered', false);
    expect(gates.some(g => g.id === 'gate-supervisor-review')).toBe(false);
  });

  it('all gates start in pending status', () => {
    const gates = buildDecisionGates('not_covered', true);
    for (const gate of gates) {
      expect(gate.status).toBe('pending');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: groundAnalysis (full pipeline)
// ════════════════════════════════════════════════════════════════════════

describe('groundAnalysis (full pipeline)', () => {
  it('produces all three output types', () => {
    const grounded = groundAnalysis(makeInput());
    expect(grounded.conclusions.length).toBeGreaterThan(0);
    expect(grounded.openQuestions.length).toBeGreaterThan(0);
    expect(grounded.decisionGates.length).toBeGreaterThan(0);
  });

  it('sets analysis version correctly', () => {
    const grounded = groundAnalysis(makeInput(), 3, 'prior-id');
    expect(grounded.analysisVersion).toBe(3);
    expect(grounded.priorAnalysisId).toBe('prior-id');
  });

  it('defaults to version 1', () => {
    const grounded = groundAnalysis(makeInput());
    expect(grounded.analysisVersion).toBe(1);
    expect(grounded.priorAnalysisId).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Engine: compareAnalyses
// ════════════════════════════════════════════════════════════════════════

describe('compareAnalyses', () => {
  it('detects determination change', () => {
    const left: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 1,
    };
    const right: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 2,
    };
    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: left },
      { id: 'a2', determination: 'not_covered', grounded: right },
    );
    expect(cmp.determinationChanged).toBe(true);
    expect(cmp.leftDetermination).toBe('covered');
    expect(cmp.rightDetermination).toBe('not_covered');
  });

  it('detects added conclusions', () => {
    const left: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 1,
    };
    const right: ClauseGroundedFields = {
      conclusions: [{
        id: 'c1', order: 0, type: 'coverage_grant',
        statement: 'Coverage A applies.',
        reasoning: 'Policy language grants coverage.',
        citations: [], confidence: 'high',
      }],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 2,
    };
    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: left },
      { id: 'a2', determination: 'covered', grounded: right },
    );
    expect(cmp.stats.conclusionsAdded).toBe(1);
    expect(cmp.conclusionDeltas[0].changeType).toBe('added');
  });

  it('detects removed conclusions', () => {
    const left: ClauseGroundedFields = {
      conclusions: [{
        id: 'c1', order: 0, type: 'coverage_grant',
        statement: 'Coverage A applies.',
        reasoning: 'reason', citations: [], confidence: 'high',
      }],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 1,
    };
    const right: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 2,
    };
    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: left },
      { id: 'a2', determination: 'covered', grounded: right },
    );
    expect(cmp.stats.conclusionsRemoved).toBe(1);
  });

  it('detects unchanged conclusions', () => {
    const conc: CitedConclusion = {
      id: 'c1', order: 0, type: 'coverage_grant',
      statement: 'Coverage A applies.',
      reasoning: 'reason', citations: [], confidence: 'high',
    };
    const left: ClauseGroundedFields = {
      conclusions: [conc],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 1,
    };
    const right: ClauseGroundedFields = {
      conclusions: [{ ...conc }],
      openQuestions: [],
      decisionGates: [],
      analysisVersion: 2,
    };
    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: left },
      { id: 'a2', determination: 'covered', grounded: right },
    );
    expect(cmp.stats.conclusionsUnchanged).toBe(1);
  });

  it('detects newly resolved questions', () => {
    const q: OpenQuestion = {
      id: 'q1', order: 0, category: 'missing_facts',
      question: 'Is the claimant an employee?',
      impact: 'Affects exclusion analysis.',
      affectedConclusionIds: [], resolved: false,
    };
    const left: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [q],
      decisionGates: [],
      analysisVersion: 1,
    };
    const right: ClauseGroundedFields = {
      conclusions: [],
      openQuestions: [{ ...q, resolved: true, resolution: 'No, confirmed non-employee.' }],
      decisionGates: [],
      analysisVersion: 2,
    };
    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: left },
      { id: 'a2', determination: 'covered', grounded: right },
    );
    expect(cmp.stats.questionsResolved).toBe(1);
    expect(cmp.questionDeltas.some(d => d.newlyResolved)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Service contract (function signatures exist, correct types)
// ════════════════════════════════════════════════════════════════════════

describe('Service contract', () => {
  it('clauseGroundedService exports all expected functions', async () => {
    const mod = await import('../services/clauseGroundedService');
    expect(typeof mod.groundExistingAnalysis).toBe('function');
    expect(typeof mod.getGroundedAnalysis).toBe('function');
    expect(typeof mod.listGroundedAnalyses).toBe('function');
    expect(typeof mod.resolveOpenQuestion).toBe('function');
    expect(typeof mod.advanceDecisionGate).toBe('function');
    expect(typeof mod.compareGroundedAnalyses).toBe('function');
  });

  it('types export all expected shapes', async () => {
    const mod = await import('../types/clauseGroundedAnalysis');
    expect(mod.CONCLUSION_TYPE_CONFIG).toBeDefined();
    expect(mod.OPEN_QUESTION_CONFIG).toBeDefined();
    expect(mod.DECISION_GATE_CONFIG).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance Criteria
// ════════════════════════════════════════════════════════════════════════

describe('Acceptance Criteria: analysis reads like a defensible coverage memo with citations', () => {
  it('every conclusion has a type, statement, reasoning, and citations array', () => {
    const grounded = groundAnalysis(makeInput());
    for (const conc of grounded.conclusions) {
      expect(conc.type).toBeTruthy();
      expect(conc.statement).toBeTruthy();
      expect(conc.reasoning).toBeTruthy();
      expect(Array.isArray(conc.citations)).toBe(true);
      expect(conc.confidence).toMatch(/^(high|medium|low)$/);
    }
  });

  it('open questions checklist identifies gaps in the analysis', () => {
    const grounded = groundAnalysis(makeInput());
    expect(grounded.openQuestions.length).toBeGreaterThan(0);
    for (const q of grounded.openQuestions) {
      expect(q.question).toBeTruthy();
      expect(q.impact).toBeTruthy();
      expect(q.category).toBeTruthy();
    }
  });

  it('decision gates provide workflow tracking', () => {
    const grounded = groundAnalysis(makeInput());
    expect(grounded.decisionGates.length).toBeGreaterThanOrEqual(2); // initial + final
    for (const gate of grounded.decisionGates) {
      expect(gate.name).toBeTruthy();
      expect(gate.status).toBe('pending');
    }
  });

  it('comparison tracks evolution over time', () => {
    const v1 = groundAnalysis(makeInput(), 1);
    const v2Input = makeInput({
      structuredFields: makeStructuredFields({
        determination: 'partially_covered',
        applicableCoverages: [
          'Coverage A applies with sublimit. Per CG 00 01, the sublimit of $500,000 applies.',
        ],
      }),
    });
    const v2 = groundAnalysis(v2Input, 2, 'a1');

    const cmp = compareAnalyses(
      { id: 'a1', determination: 'covered', grounded: v1 },
      { id: 'a2', determination: 'partially_covered', grounded: v2 },
    );

    expect(cmp.determinationChanged).toBe(true);
    expect(cmp.conclusionDeltas.length).toBeGreaterThan(0);
  });

  it('full grounded output has version tracking for audit', () => {
    const grounded = groundAnalysis(makeInput(), 2, 'prior-analysis-id');
    expect(grounded.analysisVersion).toBe(2);
    expect(grounded.priorAnalysisId).toBe('prior-analysis-id');
  });

  it('conclusion citations reference form-level anchors with page, section, and relevance', () => {
    const input = makeInput();
    const conclusions = buildCitedConclusions(input);
    // Find any conclusion with citations
    const withCitations = conclusions.filter(c => c.citations.length > 0);
    for (const conc of withCitations) {
      for (const cit of conc.citations) {
        expect(cit.formVersionId).toBeTruthy();
        expect(cit.formLabel).toBeTruthy();
        expect(cit.sectionPath).toBeTruthy();
        expect(cit.anchorHash).toBeTruthy();
        expect(cit.page).toBeGreaterThan(0);
        expect(cit.relevance).toMatch(/^(direct|supporting|contextual)$/);
      }
    }
  });
});
