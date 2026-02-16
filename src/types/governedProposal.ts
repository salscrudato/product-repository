/**
 * Governed AI Proposal Types
 *
 * AI proposals (rules, coverages, forms mapping) must reference:
 *   - Impacted artifacts (what existing entities are affected)
 *   - Diffs (what will change, before/after)
 *   - Supporting clauses (when relevant)
 * and must apply only via Change Sets.
 *
 * This extends the existing AISuggestion/AIPlan model with governance fields
 * stored as a nested `governance` object on the same document:
 *   orgs/{orgId}/aiSuggestions/{suggestionId}
 *
 * GUARDRAIL: AI becomes a governed assistant with traceability, not a black box.
 */

import type { PlanArtifactType, PlanDiffEntry, PlanImpactSummary } from './aiPlan';
import type { ClauseType } from './clause';
import type { TraceLinkTargetType } from './traceLink';

// ════════════════════════════════════════════════════════════════════════
// Impacted Artifact
// ════════════════════════════════════════════════════════════════════════

/**
 * An existing artifact that will be affected by the AI proposal.
 * Shows exactly what is being touched and why.
 */
export interface ImpactedArtifact {
  /** Unique key within this proposal */
  key: string;
  /** Artifact type */
  artifactType: PlanArtifactType;
  /** Firestore entity ID */
  entityId: string;
  /** Human-readable name */
  entityName: string;
  /** Current version ID (if versioned) */
  currentVersionId?: string;
  /** The proposed version ID (once created) */
  proposedVersionId?: string;
  /** What action is being taken */
  action: 'create' | 'modify' | 'deprecate';
  /** Why this artifact is impacted */
  impactReason: string;
  /** Confidence in this impact assessment */
  confidence: 'high' | 'medium' | 'low';
}

// ════════════════════════════════════════════════════════════════════════
// Proposal Clause Reference
// ════════════════════════════════════════════════════════════════════════

/**
 * A link from an AI proposal to a clause that supports or justifies
 * the proposed change.
 */
export interface ProposalClauseRef {
  /** The clause this reference points to */
  clauseId: string;
  clauseVersionId: string;
  /** Clause metadata for display */
  clauseName: string;
  clauseType: ClauseType;
  /** Text snippet from the clause */
  clauseTextSnippet: string;
  /** Which artifact(s) in the proposal this clause supports */
  supportedArtifactKeys: string[];
  /** Why this clause is relevant */
  relevance: string;
  /** If an existing trace link connects this clause, the trace link ID */
  existingTraceLinkId?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Governance Decision
// ════════════════════════════════════════════════════════════════════════

export type GovernanceDecision = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export const GOVERNANCE_DECISION_CONFIG: Record<GovernanceDecision, { label: string; color: string }> = {
  pending:        { label: 'Pending Review',  color: '#6B7280' },
  approved:       { label: 'Approved',        color: '#10B981' },
  rejected:       { label: 'Rejected',        color: '#EF4444' },
  needs_revision: { label: 'Needs Revision',  color: '#F59E0B' },
};

// ════════════════════════════════════════════════════════════════════════
// Governed Proposal Fields (stored on AISuggestion)
// ════════════════════════════════════════════════════════════════════════

/**
 * Governance fields stored as a nested object on the existing
 * AISuggestion document. Identified by the presence of the
 * `governance` field.
 */
export interface GovernanceFields {
  /** Impacted artifacts with full details */
  impactedArtifacts: ImpactedArtifact[];
  /** Field-level diffs for each artifact */
  diffs: PlanDiffEntry[];
  /** Impact summary (counts, warnings, required approvals) */
  impactSummary: PlanImpactSummary;
  /** Supporting clause references (when relevant) */
  clauseRefs: ProposalClauseRef[];
  /** The Change Set this proposal applies to (REQUIRED) */
  changeSetId: string;
  /** Change Set name for display */
  changeSetName?: string;
  /** Governance decision */
  decision: GovernanceDecision;
  /** Decision notes from reviewer */
  decisionNotes?: string;
  /** Who reviewed */
  reviewedBy?: string;
  /** When reviewed */
  reviewedAt?: string;
  /** Whether trace links should be auto-created when approved */
  createTraceLinks: boolean;
}

// ════════════════════════════════════════════════════════════════════════
// Governance Report (for UI display)
// ════════════════════════════════════════════════════════════════════════

/**
 * Full governance report combining the AISuggestion with governance fields.
 */
export interface GovernanceReport {
  /** The suggestion ID */
  suggestionId: string;
  /** Plan title */
  title: string;
  /** Plan description */
  description: string;
  /** AI rationale */
  overallRationale: string;
  /** Caveats/risks */
  caveats: string[];
  /** Governance fields */
  governance: GovernanceFields;
  /** Creation metadata */
  createdAt: string;
  createdBy: string;
  /** AI model used */
  modelId: string;
}
