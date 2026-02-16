/**
 * Contract Truth Layer – Ingestion Engine
 *
 * Pure computation: text in → chunks, sections, anchors, quality score out.
 * No Firestore or network calls — the service layer handles persistence.
 *
 * Pipeline:
 *   1. Receive page-level text from PDF extraction
 *   2. Detect section boundaries (insurance-aware patterns)
 *   3. Split into chunks at section boundaries
 *   4. Generate stable hash-based anchors for each chunk
 *   5. Build section tree with page refs
 *   6. Score ingestion quality (text density, OCR issues, etc.)
 */

import { createHash } from './hashUtils';
import type {
  FormIngestionChunk,
  FormIngestionSection,
  FormSectionType,
  ContentAnchor,
  IngestionWarning,
  IngestionWarningType,
  IngestionMetadata,
} from '../types/ingestion';

// ════════════════════════════════════════════════════════════════════════
// Section detection patterns (insurance-specific)
// ════════════════════════════════════════════════════════════════════════

interface SectionPattern {
  pattern: RegExp;
  type: FormSectionType;
  priority: number; // higher = more specific
}

const SECTION_PATTERNS: SectionPattern[] = [
  // Coverage sections
  { pattern: /^(?:SECTION\s+[IVX]+\s*[-–—]\s*)?COVERAGE\s+[A-Z]/i, type: 'coverage', priority: 10 },
  { pattern: /^INSURING\s+AGREEMENT/i, type: 'insuring_agreement', priority: 10 },
  { pattern: /^(?:SECTION\s+[IVX]+\s*[-–—]\s*)?COVERAGES?\s*$/i, type: 'coverage', priority: 9 },

  // Exclusions
  { pattern: /^(?:SECTION\s+[IVX]+\s*[-–—]\s*)?EXCLUSIONS?\s*$/i, type: 'exclusion', priority: 10 },
  { pattern: /^(?:\d+\.\s*)?(?:THIS\s+INSURANCE\s+DOES\s+NOT\s+APPLY)/i, type: 'exclusion', priority: 8 },

  // Conditions
  { pattern: /^(?:SECTION\s+[IVX]+\s*[-–—]\s*)?CONDITIONS?\s*$/i, type: 'condition', priority: 10 },
  { pattern: /^GENERAL\s+CONDITIONS?/i, type: 'condition', priority: 9 },

  // Definitions
  { pattern: /^(?:SECTION\s+[IVX]+\s*[-–—]\s*)?DEFINITIONS?\s*$/i, type: 'definition', priority: 10 },

  // Endorsement
  { pattern: /^THIS\s+ENDORSEMENT\s+MODIFIES/i, type: 'endorsement', priority: 10 },
  { pattern: /^ENDORSEMENT/i, type: 'endorsement', priority: 9 },
  { pattern: /^POLICY\s+CHANGE/i, type: 'endorsement', priority: 8 },

  // Schedule
  { pattern: /^SCHEDULE\s*(OF|$)/i, type: 'schedule', priority: 9 },

  // Declarations
  { pattern: /^DECLARATIONS?\s*(PAGE|$)/i, type: 'declarations', priority: 9 },

  // Limits
  { pattern: /^LIMITS?\s+OF\s+(?:LIABILITY|INSURANCE)/i, type: 'limits', priority: 9 },
  { pattern: /^COVERAGE\s+LIMITS?/i, type: 'limits', priority: 8 },

  // Deductibles
  { pattern: /^DEDUCTIBLES?\s*$/i, type: 'deductibles', priority: 9 },

  // Generic section headers
  { pattern: /^SECTION\s+[IVX]+/i, type: 'general', priority: 5 },
  { pattern: /^PART\s+[A-Z0-9]/i, type: 'general', priority: 4 },
];

// ════════════════════════════════════════════════════════════════════════
// Page-level input
// ════════════════════════════════════════════════════════════════════════

export interface PageText {
  /** 1-based page number */
  pageNumber: number;
  /** Extracted text for this page */
  text: string;
  /** Character count (to detect sparse pages) */
  charCount: number;
}

export interface IngestionInput {
  pages: PageText[];
  formId: string;
  formVersionId: string;
}

export interface IngestionResult {
  chunks: Omit<FormIngestionChunk, 'id'>[];
  sections: Omit<FormIngestionSection, 'id'>[];
  warnings: IngestionWarning[];
  qualityScore: number;
  totalPages: number;
  totalCharacters: number;
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function detectSectionType(line: string): { type: FormSectionType; priority: number } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  for (const sp of SECTION_PATTERNS) {
    if (sp.pattern.test(trimmed)) {
      return { type: sp.type, priority: sp.priority };
    }
  }
  return null;
}

/** Detect OCR artifacts: high ratio of non-alphanumeric chars */
function hasOcrArtifacts(text: string): boolean {
  if (text.length < 20) return false;
  const alphanumeric = text.replace(/[^a-zA-Z0-9\s]/g, '').length;
  const ratio = alphanumeric / text.length;
  return ratio < 0.6;
}

/** Detect encoding issues: control chars, mojibake sequences */
function hasEncodingIssues(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  const controlChars = (text.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
  const mojibake = (text.match(/[ïâãåæçèéêëìíîðñòóôõöùúûüý]{3,}/gi) || []).length;
  return controlChars > 5 || mojibake > 2;
}

// ════════════════════════════════════════════════════════════════════════
// Core pipeline
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate stable content anchors from a text block.
 * Anchors are placed at heading-like lines and at regular intervals.
 */
export function generateAnchors(text: string, pageStart: number): ContentAnchor[] {
  const anchors: ContentAnchor[] = [];
  const lines = text.split('\n');
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Anchor on section-like headings or uppercase lines > 5 chars
    const isHeading = (
      detectSectionType(trimmed) !== null ||
      (trimmed.length >= 5 && trimmed.length < 120 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed))
    );

    if (isHeading) {
      const anchorText = trimmed.slice(0, 120);
      anchors.push({
        hash: djb2(anchorText),
        slug: slugify(anchorText),
        anchorText,
        page: pageStart,
        offset,
      });
    }

    offset += line.length + 1; // +1 for newline
  }

  return anchors;
}

/**
 * Detect section boundaries and split text into structured chunks.
 */
export function buildChunks(pages: PageText[]): Omit<FormIngestionChunk, 'id'>[] {
  const chunks: Omit<FormIngestionChunk, 'id'>[] = [];
  let currentText = '';
  let currentPageStart = pages.length > 0 ? pages[0].pageNumber : 1;
  let currentPageEnd = currentPageStart;
  let currentSectionPath = '';
  let currentSectionType: FormSectionType | undefined;
  let chunkIndex = 0;

  for (const page of pages) {
    const lines = page.text.split('\n');

    for (const line of lines) {
      const sectionInfo = detectSectionType(line.trim());

      // If we detect a new section and have accumulated text, emit a chunk
      if (sectionInfo && currentText.length > 100) {
        const hash = djb2(currentText);
        const anchors = generateAnchors(currentText, currentPageStart);
        chunks.push({
          index: chunkIndex++,
          text: currentText.trim(),
          pageStart: currentPageStart,
          pageEnd: currentPageEnd,
          anchors,
          sectionPath: currentSectionPath,
          hash,
          charCount: currentText.length,
          sectionType: currentSectionType,
        });
        currentText = '';
        currentPageStart = page.pageNumber;
      }

      if (sectionInfo) {
        currentSectionPath = line.trim();
        currentSectionType = sectionInfo.type;
      }

      currentText += line + '\n';
      currentPageEnd = page.pageNumber;
    }
  }

  // Emit remaining text
  if (currentText.trim().length > 0) {
    const hash = djb2(currentText);
    const anchors = generateAnchors(currentText, currentPageStart);
    chunks.push({
      index: chunkIndex,
      text: currentText.trim(),
      pageStart: currentPageStart,
      pageEnd: currentPageEnd,
      anchors,
      sectionPath: currentSectionPath,
      hash,
      charCount: currentText.length,
      sectionType: currentSectionType,
    });
  }

  return chunks;
}

/**
 * Build section objects from chunks.
 * Sections aggregate adjacent chunks of the same type.
 */
export function buildSections(
  chunks: Omit<FormIngestionChunk, 'id'>[],
): Omit<FormIngestionSection, 'id'>[] {
  const sections: Omit<FormIngestionSection, 'id'>[] = [];
  let sectionOrder = 0;

  for (const chunk of chunks) {
    const type = chunk.sectionType || 'general';
    const title = chunk.sectionPath || 'Untitled Section';

    // Merge with previous section if same path
    const prev = sections.length > 0 ? sections[sections.length - 1] : null;
    if (prev && prev.path === chunk.sectionPath && prev.type === type) {
      // Extend existing section
      prev.pageRefs = [...new Set([...prev.pageRefs, chunk.pageStart, chunk.pageEnd])];
      prev.anchors = [...prev.anchors, ...chunk.anchors];
      prev.chunkIds.push(`chunk-${chunk.index}`);
      prev.summary = `${title} (${prev.pageRefs.length} pages)`;
    } else {
      sections.push({
        title,
        type,
        anchors: [...chunk.anchors],
        pageRefs: [...new Set([chunk.pageStart, chunk.pageEnd])],
        summary: `${title} (pages ${chunk.pageStart}-${chunk.pageEnd})`,
        order: sectionOrder++,
        path: chunk.sectionPath,
        chunkIds: [`chunk-${chunk.index}`],
      });
    }
  }

  return sections;
}

/**
 * Score ingestion quality (0-100).
 * Penalizes sparse text, OCR artifacts, missing sections, and short docs.
 */
export function scoreQuality(
  pages: PageText[],
  chunks: Omit<FormIngestionChunk, 'id'>[],
  sections: Omit<FormIngestionSection, 'id'>[],
  warnings: IngestionWarning[],
): number {
  let score = 100;

  // Penalize for warnings
  for (const w of warnings) {
    if (w.severity === 'error') score -= 15;
    else if (w.severity === 'warning') score -= 8;
    else score -= 2;
  }

  // Penalize for low text density (< 200 chars/page average)
  const totalChars = pages.reduce((s, p) => s + p.charCount, 0);
  const avgCharsPerPage = pages.length > 0 ? totalChars / pages.length : 0;
  if (avgCharsPerPage < 100) score -= 25;
  else if (avgCharsPerPage < 200) score -= 15;
  else if (avgCharsPerPage < 400) score -= 5;

  // Bonus for detecting insurance sections
  const structuredSections = sections.filter(s => s.type !== 'general');
  if (structuredSections.length === 0 && chunks.length > 0) score -= 10;
  if (structuredSections.length >= 3) score += 5;

  // Penalize very short documents (< 500 chars total)
  if (totalChars < 500) score -= 20;
  else if (totalChars < 2000) score -= 10;

  // Penalize no pages
  if (pages.length === 0) score -= 50;

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect quality warnings from page-level text.
 */
export function detectWarnings(pages: PageText[]): IngestionWarning[] {
  const warnings: IngestionWarning[] = [];

  if (pages.length === 0) {
    warnings.push({
      type: 'short_document',
      message: 'No pages were extracted from the PDF',
      severity: 'error',
    });
    return warnings;
  }

  const totalChars = pages.reduce((s, p) => s + p.charCount, 0);

  // Short document
  if (totalChars < 500) {
    warnings.push({
      type: 'short_document',
      message: `Very short document (${totalChars} characters). May be an image-only PDF.`,
      severity: 'warning',
    });
  }

  // Per-page checks
  for (const page of pages) {
    // Low text density
    if (page.charCount < 50) {
      warnings.push({
        type: 'low_text_density',
        message: `Page ${page.pageNumber}: very little text (${page.charCount} chars). Likely a scanned image.`,
        pageRef: page.pageNumber,
        severity: 'warning',
      });
    }

    // OCR artifacts
    if (hasOcrArtifacts(page.text)) {
      warnings.push({
        type: 'ocr_artifacts',
        message: `Page ${page.pageNumber}: suspected OCR artifacts (high non-alphanumeric ratio).`,
        pageRef: page.pageNumber,
        severity: 'warning',
      });
    }

    // Encoding issues
    if (hasEncodingIssues(page.text)) {
      warnings.push({
        type: 'encoding_issue',
        message: `Page ${page.pageNumber}: possible encoding issues detected.`,
        pageRef: page.pageNumber,
        severity: 'warning',
      });
    }
  }

  // Truncation check
  const truncated = pages.filter(p => p.text.includes('[Error extracting page'));
  if (truncated.length > 0) {
    warnings.push({
      type: 'truncated',
      message: `${truncated.length} page(s) could not be fully extracted.`,
      severity: 'error',
    });
  }

  return warnings;
}

/**
 * Run the full ingestion pipeline.
 * Pure function: pages in → structured result out.
 */
export function runIngestionPipeline(input: IngestionInput): IngestionResult {
  const { pages } = input;

  // 1. Detect warnings
  const warnings = detectWarnings(pages);

  // 2. Build chunks at section boundaries
  const chunks = buildChunks(pages);

  // 3. Build section tree
  const sections = buildSections(chunks);

  // 4. Check for missing structure
  const hasStructure = sections.some(s => s.type !== 'general');
  if (!hasStructure && chunks.length > 0) {
    warnings.push({
      type: 'no_structure_detected',
      message: 'No insurance-specific sections (coverage, exclusion, condition, etc.) were detected.',
      severity: 'info',
    });
  }

  // 5. Score quality
  const qualityScore = scoreQuality(pages, chunks, sections, warnings);

  const totalCharacters = pages.reduce((s, p) => s + p.charCount, 0);

  return {
    chunks,
    sections,
    warnings,
    qualityScore,
    totalPages: pages.length,
    totalCharacters,
  };
}
