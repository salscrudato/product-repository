/**
 * Redline Compare Types
 *
 * Section-aware comparison between two form editions with downstream
 * impact analysis.
 *
 * The comparison is driven by the ingestion pipeline's anchors and section
 * hashes so it survives re-ordering and cosmetic formatting changes.
 */

import type { FormSectionType, FormIngestionSection, FormIngestionChunk, ContentAnchor } from './ingestion';
import type { ClauseLink } from './clause';
import type { FormUse } from './form';

// ════════════════════════════════════════════════════════════════════════
// Section-level diff
// ════════════════════════════════════════════════════════════════════════

export type SectionDiffStatus =
  | 'unchanged' // Same hash in both editions
  | 'modified'  // Same anchor slug, different content hash
  | 'added'     // Present only in the "right" (newer) edition
  | 'removed';  // Present only in the "left" (older) edition

export const SECTION_DIFF_CONFIG: Record<SectionDiffStatus, { label: string; color: string; bgColor: string }> = {
  unchanged: { label: 'Unchanged', color: '#10B981', bgColor: '#10B98110' },
  modified:  { label: 'Modified',  color: '#F59E0B', bgColor: '#F59E0B14' },
  added:     { label: 'Added',     color: '#3B82F6', bgColor: '#3B82F614' },
  removed:   { label: 'Removed',   color: '#EF4444', bgColor: '#EF444414' },
};

/**
 * A single section-level diff entry.
 * Left = older edition, right = newer edition.
 */
export interface SectionDiff {
  /** Stable key for matching: section path or anchor slug */
  matchKey: string;
  status: SectionDiffStatus;

  /** Left (older) section — null if 'added' */
  leftSection: FormIngestionSection | null;
  /** Right (newer) section — null if 'removed' */
  rightSection: FormIngestionSection | null;

  /** Section type (from whichever side is non-null) */
  sectionType: FormSectionType;
  /** Human-readable section title */
  title: string;

  /** For 'modified': which chunk hashes changed */
  changedChunkHashes?: { left: string; right: string }[];

  /** Page references (left, right) */
  leftPages?: number[];
  rightPages?: number[];
}

// ════════════════════════════════════════════════════════════════════════
// Chunk-level diff (for drill-down)
// ════════════════════════════════════════════════════════════════════════

export type ChunkDiffStatus = 'unchanged' | 'modified' | 'added' | 'removed';

export interface ChunkDiff {
  matchKey: string;
  status: ChunkDiffStatus;
  leftChunk: FormIngestionChunk | null;
  rightChunk: FormIngestionChunk | null;
  leftText: string;
  rightText: string;
}

// ════════════════════════════════════════════════════════════════════════
// Impact candidates — downstream entities that may be affected
// ════════════════════════════════════════════════════════════════════════

export type ImpactTargetType = 'product' | 'coverage' | 'rule' | 'rate_program' | 'clause' | 'state';

export const IMPACT_TARGET_CONFIG: Record<ImpactTargetType, { label: string; color: string }> = {
  product:      { label: 'Product',      color: '#6366F1' },
  coverage:     { label: 'Coverage',     color: '#10B981' },
  rule:         { label: 'Rule',         color: '#F59E0B' },
  rate_program: { label: 'Rate Program', color: '#3B82F6' },
  clause:       { label: 'Clause',       color: '#8B5CF6' },
  state:        { label: 'State',        color: '#64748B' },
};

/**
 * A downstream entity that may be affected by form changes.
 */
export interface ImpactCandidate {
  targetType: ImpactTargetType;
  targetId: string;
  targetLabel: string;
  /** Why this entity is affected (e.g. "linked via formUse", "clause references coverage A") */
  reason: string;
  /** Which changed sections drive this impact */
  affectedSectionKeys: string[];
  /** Severity hint */
  severity: 'high' | 'medium' | 'low';
}

// ════════════════════════════════════════════════════════════════════════
// Full comparison result
// ════════════════════════════════════════════════════════════════════════

export interface RedlineComparisonResult {
  /** Form identity */
  formId: string;
  formNumber: string;
  formTitle: string;

  /** Left = older, right = newer */
  leftVersionId: string;
  leftEditionDate: string;
  rightVersionId: string;
  rightEditionDate: string;

  /** Section-level diffs */
  sectionDiffs: SectionDiff[];

  /** Chunk-level diffs (for drill-down) */
  chunkDiffs: ChunkDiff[];

  /** Downstream impact candidates */
  impactCandidates: ImpactCandidate[];

  /** Summary statistics */
  stats: RedlineStats;
}

export interface RedlineStats {
  totalSections: number;
  unchangedSections: number;
  modifiedSections: number;
  addedSections: number;
  removedSections: number;

  totalChunks: number;
  unchangedChunks: number;
  modifiedChunks: number;
  addedChunks: number;
  removedChunks: number;

  impactCandidateCount: number;
}
