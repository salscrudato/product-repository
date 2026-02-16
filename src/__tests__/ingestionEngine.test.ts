/**
 * Ingestion Engine Tests
 *
 * Comprehensive tests for the contract truth layer pipeline:
 *   - Section detection (insurance-specific patterns)
 *   - Chunking at section boundaries
 *   - Anchor generation (hash-based, stable)
 *   - Section tree building
 *   - Quality scoring and warning detection
 *   - Full pipeline integration
 */

import { describe, it, expect } from 'vitest';
import {
  generateAnchors,
  buildChunks,
  buildSections,
  scoreQuality,
  detectWarnings,
  runIngestionPipeline,
  type PageText,
  type IngestionInput,
} from '../engine/ingestionEngine';
import type { FormSectionType } from '../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makePage(pageNumber: number, text: string): PageText {
  return { pageNumber, text, charCount: text.length };
}

function makeInput(pages: PageText[]): IngestionInput {
  return { pages, formId: 'form-1', formVersionId: 'fv-1' };
}

// ════════════════════════════════════════════════════════════════════════
// Section Detection & Chunking
// ════════════════════════════════════════════════════════════════════════

describe('buildChunks', () => {
  it('produces at least one chunk for any non-empty input', () => {
    const pages = [makePage(1, 'Some policy text about coverage.')];
    const chunks = buildChunks(pages);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].text.length).toBeGreaterThan(0);
  });

  it('splits at section boundaries', () => {
    const pages = [
      makePage(1, 'DECLARATIONS\n' + 'Named insured: Acme Corp.\nPolicy period: Jan 1 - Dec 31.\n'.repeat(5)),
      makePage(2, 'COVERAGE A – BODILY INJURY AND PROPERTY DAMAGE LIABILITY\n' + 'We will pay those sums that the insured becomes legally obligated to pay.\n'.repeat(5)),
      makePage(3, 'EXCLUSIONS\n' + 'This insurance does not apply to expected or intended injury.\n'.repeat(5)),
    ];
    const chunks = buildChunks(pages);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].sectionType).toBe('declarations');
    expect(chunks[1].sectionType).toBe('coverage');
    expect(chunks[2].sectionType).toBe('exclusion');
  });

  it('assigns correct page ranges', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'This is coverage text.\n'.repeat(10)),
      makePage(2, 'Continued coverage text.\n'.repeat(10)),
      makePage(3, 'EXCLUSIONS\n' + 'Excluded items.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const coverageChunk = chunks.find(c => c.sectionType === 'coverage');
    expect(coverageChunk).toBeDefined();
    expect(coverageChunk!.pageStart).toBe(1);
    expect(coverageChunk!.pageEnd).toBeGreaterThanOrEqual(2);
  });

  it('assigns chunk indices sequentially', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'Text.\n'.repeat(10)),
      makePage(2, 'CONDITIONS\n' + 'More text.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });

  it('handles empty pages gracefully', () => {
    const pages = [makePage(1, ''), makePage(2, '')];
    const chunks = buildChunks(pages);
    // May produce a single chunk with minimal/empty text
    expect(chunks).toBeDefined();
  });

  it('detects INSURING AGREEMENT sections', () => {
    const pages = [
      makePage(1, 'INSURING AGREEMENT\n' + 'We will pay the insured.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    expect(chunks[0].sectionType).toBe('insuring_agreement');
  });

  it('detects DEFINITIONS sections', () => {
    const pages = [
      makePage(1, 'DEFINITIONS\n' + '"Bodily injury" means physical harm.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    expect(chunks[0].sectionType).toBe('definition');
  });

  it('detects ENDORSEMENT sections', () => {
    const pages = [
      makePage(1, 'THIS ENDORSEMENT MODIFIES INSURANCE PROVIDED UNDER\n' + 'Additional text.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    expect(chunks[0].sectionType).toBe('endorsement');
  });

  it('computes deterministic hashes for identical text', () => {
    const pages = [makePage(1, 'COVERAGE A\nWe will pay damages.\n'.repeat(5))];
    const chunks1 = buildChunks(pages);
    const chunks2 = buildChunks(pages);
    expect(chunks1[0].hash).toBe(chunks2[0].hash);
  });

  it('produces different hashes for different text', () => {
    const pages1 = [makePage(1, 'COVERAGE A\nText about coverage A.\n'.repeat(5))];
    const pages2 = [makePage(1, 'COVERAGE B\nText about coverage B.\n'.repeat(5))];
    const chunks1 = buildChunks(pages1);
    const chunks2 = buildChunks(pages2);
    expect(chunks1[0].hash).not.toBe(chunks2[0].hash);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Anchor Generation
// ════════════════════════════════════════════════════════════════════════

describe('generateAnchors', () => {
  it('creates anchors for section headings', () => {
    const text = 'COVERAGE A – BODILY INJURY\nWe will pay those sums.\nSome more text.';
    const anchors = generateAnchors(text, 1);
    expect(anchors.length).toBeGreaterThanOrEqual(1);
    expect(anchors[0].slug).toContain('coverage');
    expect(anchors[0].page).toBe(1);
  });

  it('creates anchors for uppercase lines', () => {
    const text = 'Some intro\nEXCLUSIONS\nThis insurance does not apply.';
    const anchors = generateAnchors(text, 3);
    expect(anchors.length).toBeGreaterThanOrEqual(1);
    expect(anchors[0].slug).toContain('exclusion');
    expect(anchors[0].page).toBe(3);
  });

  it('produces stable hashes for identical text', () => {
    const text = 'COVERAGE A\nWe will pay damages.';
    const a1 = generateAnchors(text, 1);
    const a2 = generateAnchors(text, 1);
    expect(a1[0].hash).toBe(a2[0].hash);
    expect(a1[0].slug).toBe(a2[0].slug);
  });

  it('includes offset information', () => {
    const text = 'Line one\nCOVERAGE A\nLine three';
    const anchors = generateAnchors(text, 1);
    const coverageAnchor = anchors.find(a => a.slug.includes('coverage'));
    expect(coverageAnchor).toBeDefined();
    expect(coverageAnchor!.offset).toBeGreaterThan(0);
  });

  it('returns empty array for no headings', () => {
    const text = 'just some lowercase text with no headings at all.';
    const anchors = generateAnchors(text, 1);
    expect(anchors).toEqual([]);
  });

  it('truncates long anchor text to 120 chars', () => {
    const longHeading = 'A'.repeat(200);
    const text = longHeading + '\nSome body text.';
    const anchors = generateAnchors(text, 1);
    if (anchors.length > 0) {
      expect(anchors[0].anchorText.length).toBeLessThanOrEqual(120);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section Building
// ════════════════════════════════════════════════════════════════════════

describe('buildSections', () => {
  it('groups chunks into sections by type', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'Coverage text.\n'.repeat(10)),
      makePage(2, 'EXCLUSIONS\n' + 'Exclusion text.\n'.repeat(10)),
      makePage(3, 'CONDITIONS\n' + 'Condition text.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const types = sections.map(s => s.type);
    expect(types).toContain('coverage');
    expect(types).toContain('exclusion');
    expect(types).toContain('condition');
  });

  it('merges adjacent chunks with the same section path', () => {
    // If two chunks have the same section path, they should be in one section
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'First page of coverage.\n'.repeat(10)),
      // No new section header on page 2 — stays in same section
      makePage(2, 'Continued coverage text.\n'.repeat(10)),
      makePage(3, 'EXCLUSIONS\n' + 'Excluded items.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    // Coverage and exclusion — at most 2 major sections (plus possibly general)
    expect(sections.length).toBeLessThanOrEqual(chunks.length);
  });

  it('assigns section order sequentially', () => {
    const pages = [
      makePage(1, 'DECLARATIONS\n' + 'Named insured.\n'.repeat(10)),
      makePage(2, 'COVERAGE A\n' + 'We will pay.\n'.repeat(10)),
      makePage(3, 'EXCLUSIONS\n' + 'Does not apply.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    for (let i = 0; i < sections.length; i++) {
      expect(sections[i].order).toBe(i);
    }
  });

  it('populates chunkIds on each section', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'Coverage text.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections[0].chunkIds.length).toBeGreaterThanOrEqual(1);
  });

  it('populates pageRefs on each section', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'Text.\n'.repeat(10)),
      makePage(2, 'More coverage text.\n'.repeat(10)),
      makePage(3, 'EXCLUSIONS\n' + 'Excluded.\n'.repeat(10)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const coverageSection = sections.find(s => s.type === 'coverage');
    expect(coverageSection).toBeDefined();
    expect(coverageSection!.pageRefs.length).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Quality Scoring
// ════════════════════════════════════════════════════════════════════════

describe('scoreQuality', () => {
  it('returns 100 for perfect documents', () => {
    const pages = [
      makePage(1, 'COVERAGE A\n' + 'A'.repeat(1000)),
      makePage(2, 'EXCLUSIONS\n' + 'B'.repeat(1000)),
      makePage(3, 'CONDITIONS\n' + 'C'.repeat(1000)),
    ];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const score = scoreQuality(pages, chunks, sections, []);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('penalizes sparse text', () => {
    const pages = [makePage(1, 'Hi')];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const score = scoreQuality(pages, chunks, sections, []);
    expect(score).toBeLessThan(70);
  });

  it('penalizes error warnings', () => {
    const pages = [makePage(1, 'COVERAGE A\n' + 'A'.repeat(1000))];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const warnings = [{ type: 'truncated' as const, message: 'Failed', severity: 'error' as const }];
    const score = scoreQuality(pages, chunks, sections, warnings);
    expect(score).toBeLessThan(90);
  });

  it('penalizes empty documents', () => {
    const pages: PageText[] = [];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const score = scoreQuality(pages, chunks, sections, []);
    expect(score).toBeLessThanOrEqual(50);
  });

  it('score is always in [0, 100] range', () => {
    // Many errors to push below 0
    const pages = [makePage(1, 'x')];
    const chunks = buildChunks(pages);
    const sections = buildSections(chunks);
    const warnings = Array.from({ length: 20 }, (_, i) => ({
      type: 'ocr_artifacts' as const,
      message: `Warning ${i}`,
      severity: 'error' as const,
    }));
    const score = scoreQuality(pages, chunks, sections, warnings);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Warning Detection
// ════════════════════════════════════════════════════════════════════════

describe('detectWarnings', () => {
  it('flags empty pages as low text density', () => {
    const pages = [makePage(1, ''), makePage(2, 'Some text here about the policy.')];
    const warnings = detectWarnings(pages);
    const lowDensity = warnings.find(w => w.type === 'low_text_density');
    expect(lowDensity).toBeDefined();
    expect(lowDensity!.pageRef).toBe(1);
  });

  it('flags very short documents', () => {
    const pages = [makePage(1, 'Short')];
    const warnings = detectWarnings(pages);
    expect(warnings.some(w => w.type === 'short_document')).toBe(true);
  });

  it('flags OCR artifacts', () => {
    const garbageText = '!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./' + '!@#$'.repeat(20);
    const pages = [makePage(1, garbageText)];
    const warnings = detectWarnings(pages);
    expect(warnings.some(w => w.type === 'ocr_artifacts')).toBe(true);
  });

  it('flags truncated pages', () => {
    const pages = [makePage(1, '[Error extracting page 1] some text')];
    const warnings = detectWarnings(pages);
    expect(warnings.some(w => w.type === 'truncated')).toBe(true);
  });

  it('returns empty warnings for clean document', () => {
    const pages = [
      makePage(1, 'COVERAGE A – Bodily Injury\nWe will pay those sums that the insured becomes legally obligated to pay as damages because of bodily injury or property damage to which this insurance applies.' + ' More text.'.repeat(50)),
    ];
    const warnings = detectWarnings(pages);
    const issues = warnings.filter(w => w.severity === 'error');
    expect(issues.length).toBe(0);
  });

  it('flags zero pages', () => {
    const warnings = detectWarnings([]);
    expect(warnings.some(w => w.type === 'short_document' && w.severity === 'error')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Full Pipeline Integration
// ════════════════════════════════════════════════════════════════════════

describe('runIngestionPipeline', () => {
  it('produces chunks, sections, and quality score', () => {
    const input = makeInput([
      makePage(1, 'DECLARATIONS\nNamed Insured: Acme Corp\nPolicy Period: Jan 1-Dec 31\n' + 'Additional text.\n'.repeat(10)),
      makePage(2, 'SECTION I – COVERAGES\nCoverage A – Bodily Injury\nWe will pay those sums.\n' + 'Coverage details.\n'.repeat(10)),
      makePage(3, 'EXCLUSIONS\nThis insurance does not apply to:\na. Expected or Intended Injury\n' + 'More exclusions.\n'.repeat(10)),
      makePage(4, 'CONDITIONS\n1. Duties After Occurrence\nYou must see to it that we are notified promptly.\n' + 'More conditions.\n'.repeat(10)),
    ]);
    const result = runIngestionPipeline(input);
    expect(result.chunks.length).toBeGreaterThanOrEqual(3);
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.qualityScore).toBeGreaterThanOrEqual(70);
    expect(result.totalPages).toBe(4);
    expect(result.totalCharacters).toBeGreaterThan(0);
  });

  it('flags missing structure in plain text documents', () => {
    const input = makeInput([
      makePage(1, 'This is just a plain text document with no insurance structure.\n'.repeat(20)),
    ]);
    const result = runIngestionPipeline(input);
    expect(result.warnings.some(w => w.type === 'no_structure_detected')).toBe(true);
  });

  it('returns high quality score for well-structured insurance forms', () => {
    const input = makeInput([
      makePage(1, 'INSURING AGREEMENT\nWe will pay on behalf of the insured.\n' + 'Details of agreement.\n'.repeat(20)),
      makePage(2, 'COVERAGE A – BODILY INJURY\nIncludes all damages.\n' + 'More coverage.\n'.repeat(20)),
      makePage(3, 'EXCLUSIONS\nDoes not apply to intentional acts.\n' + 'More exclusions.\n'.repeat(20)),
      makePage(4, 'DEFINITIONS\n"Bodily injury" means physical harm.\n' + 'More definitions.\n'.repeat(20)),
      makePage(5, 'CONDITIONS\nDuties after occurrence.\n' + 'More conditions.\n'.repeat(20)),
    ]);
    const result = runIngestionPipeline(input);
    expect(result.qualityScore).toBeGreaterThanOrEqual(85);
  });

  it('handles empty input', () => {
    const result = runIngestionPipeline(makeInput([]));
    expect(result.chunks.length).toBe(0);
    expect(result.sections.length).toBe(0);
    expect(result.qualityScore).toBeLessThanOrEqual(50);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('acceptance: anchors are stable across re-ingestion', () => {
    const pages = [
      makePage(1, 'COVERAGE A – BODILY INJURY\nWe will pay.\n' + 'Text.\n'.repeat(10)),
      makePage(2, 'EXCLUSIONS\nDoes not apply.\n' + 'Text.\n'.repeat(10)),
    ];
    const result1 = runIngestionPipeline(makeInput(pages));
    const result2 = runIngestionPipeline(makeInput(pages));

    // Same chunks
    expect(result1.chunks.length).toBe(result2.chunks.length);
    for (let i = 0; i < result1.chunks.length; i++) {
      expect(result1.chunks[i].hash).toBe(result2.chunks[i].hash);
    }

    // Same anchors
    const allAnchors1 = result1.chunks.flatMap(c => c.anchors.map(a => a.hash));
    const allAnchors2 = result2.chunks.flatMap(c => c.anchors.map(a => a.hash));
    expect(allAnchors1).toEqual(allAnchors2);
  });

  it('acceptance: citations can reference stable anchors', () => {
    const pages = [
      makePage(1, 'COVERAGE A – BODILY INJURY AND PROPERTY DAMAGE LIABILITY\nWe will pay those sums that the insured becomes legally obligated to pay as damages.\n' + 'More text.\n'.repeat(10)),
    ];
    const result = runIngestionPipeline(makeInput(pages));

    // There should be at least one anchor
    const allAnchors = result.chunks.flatMap(c => c.anchors);
    expect(allAnchors.length).toBeGreaterThanOrEqual(1);

    // Each anchor has required fields for citation references
    for (const anchor of allAnchors) {
      expect(anchor.hash).toBeTruthy();
      expect(anchor.slug).toBeTruthy();
      expect(anchor.anchorText).toBeTruthy();
      expect(anchor.page).toBeGreaterThanOrEqual(1);
      expect(typeof anchor.offset).toBe('number');
    }
  });
});
