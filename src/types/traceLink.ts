/**
 * Trace Link Types
 *
 * Makes it explicit which rules and coverage configs are justified by which
 * clauses. Provides auditable traceability from contract language to
 * product configuration.
 *
 * Firestore path: orgs/{orgId}/traceLinks/{traceId}
 *
 * Direction:
 *   from: clauseVersionId  (contract language)
 *   to:   ruleVersionId | coverageVersionId | rateProgramVersionId  (implementation)
 */

import { Timestamp } from 'firebase/firestore';
import type { ClauseType } from './clause';

// ════════════════════════════════════════════════════════════════════════
// Target types
// ════════════════════════════════════════════════════════════════════════

export type TraceLinkTargetType = 'rule_version' | 'coverage_version' | 'rate_program_version';

export const TRACE_LINK_TARGET_CONFIG: Record<TraceLinkTargetType, { label: string; color: string }> = {
  rule_version:         { label: 'Rule',         color: '#F59E0B' },
  coverage_version:     { label: 'Coverage',     color: '#10B981' },
  rate_program_version: { label: 'Rate Program', color: '#3B82F6' },
};

// ════════════════════════════════════════════════════════════════════════
// TraceLink document
// ════════════════════════════════════════════════════════════════════════

/**
 * A directional trace link stored at orgs/{orgId}/traceLinks/{traceId}.
 *
 * from (clause version) → to (rule / coverage / rate program version)
 *
 * Auditors read these to verify that every rule or coverage config can be
 * traced back to specific contract language.
 */
export interface TraceLink {
  id: string;
  orgId: string;

  // ── Source: contract language ──
  /** The clause this trace originates from */
  clauseId: string;
  /** The specific clause version */
  clauseVersionId: string;

  // ── Target: implementation ──
  targetType: TraceLinkTargetType;
  /** Exactly one of these is populated based on targetType */
  ruleVersionId?: string;
  coverageVersionId?: string;
  rateProgramVersionId?: string;

  // ── Context ──
  /** Free-text rationale: why does this clause justify this configuration? */
  rationale: string;

  // ── Denormalised convenience fields ──
  /** Clause canonical name (for display) */
  clauseName?: string;
  /** Clause type (for badge rendering) */
  clauseType?: ClauseType;
  /** Target human-readable label (rule name, coverage name, etc.) */
  targetLabel?: string;

  // ── Audit ──
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Aggregated views
// ════════════════════════════════════════════════════════════════════════

/**
 * A trace link enriched with clause info — used in "Supporting Clauses" panels
 * on the rule builder and coverage editor.
 */
export interface TraceWithClause {
  traceLink: TraceLink;
  /** Resolved clause name */
  clauseName: string;
  /** Clause type for badge */
  clauseType: ClauseType;
  /** Snippet of clause text for preview */
  clauseTextSnippet: string;
  /** Clause version number */
  clauseVersionNumber: number;
}

/**
 * A trace link enriched with target info — used in "Implemented By" panel
 * on the clause browser.
 */
export interface TraceWithTarget {
  traceLink: TraceLink;
  /** Resolved target entity label */
  targetLabel: string;
  /** Display label for target type */
  targetTypeLabel: string;
}

/**
 * Summary of trace coverage for a given target.
 */
export interface TraceSummary {
  targetType: TraceLinkTargetType;
  targetId: string;
  totalTraces: number;
  clauseNames: string[];
}
