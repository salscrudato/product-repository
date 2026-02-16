/**
 * Contract Truth Layer – Ingestion Types
 *
 * Converts uploaded PDFs into a structured, hash-anchored truth layer:
 *   - Chunks: text segments with page refs and stable anchors
 *   - Sections: detected structural elements (coverage, exclusion, condition, etc.)
 *   - Ingestion metadata: quality score, warnings, completion status
 *
 * Firestore paths:
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}
 *     → ingestion: { status, qualityScore, warnings[], completedAt }
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}/chunks/{chunkId}
 *   orgs/{orgId}/forms/{formId}/versions/{fvId}/sections/{sectionId}
 */

import { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Ingestion status (stored on the form version document)
// ════════════════════════════════════════════════════════════════════════

export type IngestionPipelineStatus =
  | 'pending'        // Not yet started
  | 'extracting'     // Extracting text from PDF
  | 'chunking'       // Splitting into chunks + detecting sections
  | 'completed'      // Successfully ingested
  | 'failed';        // Pipeline failed

export const INGESTION_STATUS_CONFIG: Record<IngestionPipelineStatus, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: '#6B7280' },
  extracting: { label: 'Extracting', color: '#3B82F6' },
  chunking:   { label: 'Chunking',   color: '#8B5CF6' },
  completed:  { label: 'Completed',  color: '#10B981' },
  failed:     { label: 'Failed',     color: '#EF4444' },
};

export type IngestionWarningType =
  | 'low_text_density'       // Very little text per page (likely scan/image)
  | 'ocr_artifacts'          // Suspected OCR garbage characters
  | 'short_document'         // Fewer than expected pages/words
  | 'missing_sections'       // Expected sections not detected
  | 'large_gap'              // Large gap in page numbering
  | 'encoding_issue'         // Non-UTF8 or mojibake characters
  | 'truncated'              // PDF had pages that could not be read
  | 'no_structure_detected'; // No insurance sections found

export interface IngestionWarning {
  type: IngestionWarningType;
  message: string;
  /** Which page(s) or chunk(s) the warning relates to */
  pageRef?: number;
  chunkIndex?: number;
  severity: 'info' | 'warning' | 'error';
}

/** Stored on the OrgFormVersion document as a nested object */
export interface IngestionMetadata {
  status: IngestionPipelineStatus;
  /** 0-100 quality confidence score */
  qualityScore: number;
  warnings: IngestionWarning[];
  /** Total pages extracted */
  totalPages: number;
  /** Total text characters extracted */
  totalCharacters: number;
  /** Number of chunks produced */
  chunkCount: number;
  /** Number of sections detected */
  sectionCount: number;
  /** Pipeline timing */
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  /** Error message if status = 'failed' */
  errorMessage?: string;
  /** Who triggered this ingestion */
  triggeredBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Anchor – hash-based stable reference for citations
// ════════════════════════════════════════════════════════════════════════

/**
 * A stable, hash-based anchor that survives re-ingestion as long as
 * the underlying text doesn't change. Used by claims analysis and AI
 * citations to reference specific form content.
 */
export interface ContentAnchor {
  /** Deterministic hash of the anchor text (djb2) */
  hash: string;
  /** Short human-readable slug, e.g. "coverage-a-bodily-injury" */
  slug: string;
  /** The exact text that was hashed (first 120 chars) */
  anchorText: string;
  /** Page where this anchor starts */
  page: number;
  /** Character offset within the chunk */
  offset: number;
}

// ════════════════════════════════════════════════════════════════════════
// Form Chunk (sub-collection of form version)
// ════════════════════════════════════════════════════════════════════════

export interface FormIngestionChunk {
  id: string;
  /** Ordering index (0-based) */
  index: number;
  /** The extracted text */
  text: string;
  /** First page this chunk starts on (1-based) */
  pageStart: number;
  /** Last page this chunk spans to */
  pageEnd: number;
  /** Stable content anchors within this chunk */
  anchors: ContentAnchor[];
  /** Dot-delimited section path, e.g. "SECTION I.Coverage A.Bodily Injury" */
  sectionPath: string;
  /** Deterministic hash of the full chunk text */
  hash: string;
  /** Character count */
  charCount: number;
  /** Detected section type (if any) */
  sectionType?: FormSectionType;
}

// ════════════════════════════════════════════════════════════════════════
// Form Section (sub-collection of form version)
// ════════════════════════════════════════════════════════════════════════

export type FormSectionType =
  | 'coverage'
  | 'exclusion'
  | 'condition'
  | 'definition'
  | 'endorsement'
  | 'schedule'
  | 'declarations'
  | 'insuring_agreement'
  | 'limits'
  | 'deductibles'
  | 'general';

export const SECTION_TYPE_CONFIG: Record<FormSectionType, { label: string; color: string; icon: string }> = {
  coverage:           { label: 'Coverage',           color: '#10B981', icon: 'shield-check' },
  exclusion:          { label: 'Exclusion',          color: '#EF4444', icon: 'x-circle' },
  condition:          { label: 'Condition',          color: '#F59E0B', icon: 'exclamation' },
  definition:         { label: 'Definition',         color: '#3B82F6', icon: 'book-open' },
  endorsement:        { label: 'Endorsement',        color: '#8B5CF6', icon: 'document-plus' },
  schedule:           { label: 'Schedule',           color: '#6366F1', icon: 'table' },
  declarations:       { label: 'Declarations',       color: '#64748B', icon: 'document' },
  insuring_agreement: { label: 'Insuring Agreement', color: '#059669', icon: 'shield' },
  limits:             { label: 'Limits',             color: '#F97316', icon: 'adjustments' },
  deductibles:        { label: 'Deductibles',        color: '#F97316', icon: 'minus-circle' },
  general:            { label: 'General',            color: '#94A3B8', icon: 'document-text' },
};

export interface FormIngestionSection {
  id: string;
  /** Section title as detected from the text */
  title: string;
  /** Classified section type */
  type: FormSectionType;
  /** Stable anchors within this section */
  anchors: ContentAnchor[];
  /** Pages this section spans */
  pageRefs: number[];
  /** Optional AI-generated or rule-based summary */
  summary: string;
  /** Ordering index */
  order: number;
  /** Dot-delimited path in the section hierarchy */
  path: string;
  /** Chunk IDs that compose this section */
  chunkIds: string[];
}

// ════════════════════════════════════════════════════════════════════════
// Ingestion report (computed, not persisted — for UI display)
// ════════════════════════════════════════════════════════════════════════

export interface IngestionReport {
  /** Form identity */
  formId: string;
  formNumber: string;
  formTitle: string;
  formVersionId: string;
  editionDate: string;

  /** Ingestion metadata */
  ingestion: IngestionMetadata;

  /** Chunks produced */
  chunks: FormIngestionChunk[];
  /** Sections detected */
  sections: FormIngestionSection[];

  /** Aggregate stats */
  totalAnchors: number;
  /** Coverage of section types */
  sectionTypeCounts: Record<FormSectionType, number>;
}
