/**
 * Clause Library Types
 *
 * Clause-level tagging and reuse across forms, endorsements, products, and states.
 *
 * Data model:
 *   orgs/{orgId}/clauses/{clauseId}                                — canonical clause
 *   orgs/{orgId}/clauses/{clauseId}/versions/{clauseVersionId}     — versioned text
 *   orgs/{orgId}/clauseLinks/{linkId}                              — "where used" junction
 */

import { Timestamp } from 'firebase/firestore';
import type { VersionStatus } from './versioning';
import type { ContentAnchor } from './ingestion';

// ════════════════════════════════════════════════════════════════════════
// Clause Types
// ════════════════════════════════════════════════════════════════════════

export type ClauseType =
  | 'coverage'
  | 'exclusion'
  | 'condition'
  | 'definition'
  | 'endorsement'
  | 'schedule'
  | 'other';

export const CLAUSE_TYPE_CONFIG: Record<ClauseType, { label: string; color: string }> = {
  coverage:    { label: 'Coverage',    color: '#10B981' },
  exclusion:   { label: 'Exclusion',   color: '#EF4444' },
  condition:   { label: 'Condition',   color: '#F59E0B' },
  definition:  { label: 'Definition',  color: '#3B82F6' },
  endorsement: { label: 'Endorsement', color: '#8B5CF6' },
  schedule:    { label: 'Schedule',    color: '#6366F1' },
  other:       { label: 'Other',       color: '#94A3B8' },
};

export const CLAUSE_TYPE_OPTIONS = Object.entries(CLAUSE_TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as ClauseType,
  label: cfg.label,
  color: cfg.color,
}));

// ════════════════════════════════════════════════════════════════════════
// Clause (top-level doc)
// ════════════════════════════════════════════════════════════════════════

/**
 * A canonical clause stored at orgs/{orgId}/clauses/{clauseId}.
 * Represents the stable identity of a reusable clause.
 */
export interface OrgClause {
  id: string;
  orgId: string;

  /** Canonical short name, e.g. "Additional Insured – Managers or Lessors of Premises" */
  canonicalName: string;
  /** Clause classification */
  type: ClauseType;
  /** Free-form tags for filtering/search (e.g. ["gl", "additional-insured", "premises"]) */
  tags: string[];
  /** Product IDs this clause is associated with (denormalized for list/filter display) */
  productIds?: string[];
  /** Optional description */
  description?: string;

  /** Quick-access version pointers */
  latestPublishedVersionId?: string;
  latestDraftVersionId?: string;
  versionCount: number;

  /** Soft-delete flag */
  archived: boolean;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Clause Version
// ════════════════════════════════════════════════════════════════════════

/**
 * A versioned clause text stored at
 * orgs/{orgId}/clauses/{clauseId}/versions/{clauseVersionId}.
 */
export interface ClauseVersion {
  id: string;
  clauseId: string;

  /** Incremental version number */
  versionNumber: number;

  /** Full clause text */
  text: string;
  /** Hash-based anchors for stable citations */
  anchors: ContentAnchor[];

  /** If extracted from a form, the source form version */
  sourceFormVersionId?: string;
  /** If extracted from a form, the source form number */
  sourceFormNumber?: string;

  /** Version lifecycle */
  status: VersionStatus;

  /** When this clause version becomes effective */
  effectiveStart: string | null;
  /** When this clause version expires */
  effectiveEnd: string | null;

  /** Summary of what changed */
  summary?: string;
  /** Detailed notes */
  notes?: string;

  /** If cloned, the source version ID */
  clonedFromVersionId?: string;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  publishedAt?: Timestamp;
  publishedBy?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Clause Link ("where used" junction)
// ════════════════════════════════════════════════════════════════════════

export type ClauseLinkTargetType =
  | 'product_version'
  | 'coverage_version'
  | 'rule_version'
  | 'form_version';

/**
 * A "where used" junction stored at orgs/{orgId}/clauseLinks/{linkId}.
 * Links a clause version to a target entity.
 */
export interface ClauseLink {
  id: string;
  orgId: string;

  /** The clause and version being linked */
  clauseId: string;
  clauseVersionId: string;

  /** What this clause is linked to */
  targetType: ClauseLinkTargetType;

  /** Target entity IDs (at least one required) */
  productVersionId?: string;
  coverageVersionId?: string;
  ruleVersionId?: string;
  formVersionId?: string;

  /** Optional: state code for state-specific usage */
  stateCode?: string;

  /** Denormalised convenience fields */
  clauseName?: string;
  clauseType?: ClauseType;
  targetLabel?: string;

  /** Audit fields */
  createdAt: Timestamp;
  createdBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Aggregated views
// ════════════════════════════════════════════════════════════════════════

/** A clause with computed stats for the browser list */
export interface ClauseWithStats {
  clause: OrgClause;
  publishedVersionCount: number;
  linkCount: number;
  latestVersionText?: string;
}

/** Where-used detail for a clause */
export interface ClauseWhereUsedEntry {
  link: ClauseLink;
  /** Resolved human-readable label for the target */
  targetLabel: string;
  /** Target type display */
  targetTypeLabel: string;
}

/** Result of clause impact analysis */
export interface ClauseImpactResult {
  clauseId: string;
  clauseVersionId: string;
  clauseName: string;
  clauseType: ClauseType;
  /** All links referencing this clause version */
  affectedLinks: ClauseLink[];
  /** Unique product version IDs affected */
  affectedProductVersionIds: string[];
  /** Unique state codes affected */
  affectedStates: string[];
  /** Count of distinct targets */
  totalTargets: number;
}
