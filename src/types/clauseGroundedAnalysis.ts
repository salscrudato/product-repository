/**
 * Clause-Grounded Analysis Types
 *
 * Upgrades claims analysis to produce defensible coverage memos where
 * every conclusion cites specific clause anchors, open questions are
 * explicit, and decision gates track the analysis workflow.
 *
 * These types extend (not replace) the existing ClaimsAnalysis model.
 * A clause-grounded analysis stores its data at the same Firestore path
 * but adds richer citation structure, open questions, and decision gates.
 */

import type { ContentAnchor, FormSectionType } from './ingestion';
import type { ClauseType } from './clause';
import type { CoverageDetermination, ClaimScenario, AnalysisCitation } from './claimsAnalysis';

// ════════════════════════════════════════════════════════════════════════
// Clause-Anchor Citation
// ════════════════════════════════════════════════════════════════════════

/**
 * A citation that grounds a conclusion to a specific clause anchor.
 * Unlike AnalysisCitation (form-section level), this references the
 * exact anchor hash from the ingestion pipeline.
 */
export interface ClauseAnchorCitation {
  /** The conclusion this citation supports */
  conclusionId: string;

  /** Clause identity (if from clause library) */
  clauseId?: string;
  clauseVersionId?: string;
  clauseName?: string;
  clauseType?: ClauseType;

  /** Form identity */
  formVersionId: string;
  formLabel: string;

  /** Section identity */
  sectionPath: string;
  sectionType: FormSectionType;

  /** Anchor identity (from ingestion pipeline) */
  anchorHash: string;
  anchorSlug: string;
  anchorText: string;
  page: number;

  /** Excerpt from the anchor context (up to 300 chars) */
  excerpt: string;

  /** How strongly this citation supports the conclusion */
  relevance: 'direct' | 'supporting' | 'contextual';
}

// ════════════════════════════════════════════════════════════════════════
// Cited Conclusion
// ════════════════════════════════════════════════════════════════════════

export type ConclusionType =
  | 'coverage_grant'
  | 'exclusion_applies'
  | 'exclusion_exception'
  | 'condition_met'
  | 'condition_unmet'
  | 'limitation_applies'
  | 'definition_relevant'
  | 'endorsement_modifies'
  | 'no_coverage';

export const CONCLUSION_TYPE_CONFIG: Record<ConclusionType, { label: string; color: string }> = {
  coverage_grant:      { label: 'Coverage Grant',      color: '#10B981' },
  exclusion_applies:   { label: 'Exclusion Applies',   color: '#EF4444' },
  exclusion_exception: { label: 'Exclusion Exception', color: '#F59E0B' },
  condition_met:       { label: 'Condition Met',       color: '#059669' },
  condition_unmet:     { label: 'Condition Unmet',     color: '#DC2626' },
  limitation_applies:  { label: 'Limitation Applies',  color: '#F97316' },
  definition_relevant: { label: 'Definition Relevant', color: '#3B82F6' },
  endorsement_modifies:{ label: 'Endorsement Modifies',color: '#8B5CF6' },
  no_coverage:         { label: 'No Coverage',         color: '#6B7280' },
};

/**
 * A single analytical conclusion grounded by one or more clause anchors.
 */
export interface CitedConclusion {
  id: string;
  /** Sequential ordering */
  order: number;
  /** What type of conclusion this is */
  type: ConclusionType;
  /** The conclusion statement (1-3 sentences) */
  statement: string;
  /** Detailed reasoning that references the cited language */
  reasoning: string;
  /** Anchor citations that support this conclusion */
  citations: ClauseAnchorCitation[];
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

// ════════════════════════════════════════════════════════════════════════
// Open Questions ("What I still need to know")
// ════════════════════════════════════════════════════════════════════════

export type OpenQuestionCategory =
  | 'missing_facts'
  | 'ambiguous_language'
  | 'missing_forms'
  | 'endorsement_unknown'
  | 'jurisdiction_specific'
  | 'policy_specific'
  | 'claimant_info';

export const OPEN_QUESTION_CONFIG: Record<OpenQuestionCategory, { label: string; color: string }> = {
  missing_facts:        { label: 'Missing Facts',        color: '#EF4444' },
  ambiguous_language:   { label: 'Ambiguous Language',   color: '#F59E0B' },
  missing_forms:        { label: 'Missing Forms',        color: '#3B82F6' },
  endorsement_unknown:  { label: 'Endorsement Unknown',  color: '#8B5CF6' },
  jurisdiction_specific:{ label: 'Jurisdiction-Specific',color: '#6366F1' },
  policy_specific:      { label: 'Policy-Specific',      color: '#64748B' },
  claimant_info:        { label: 'Claimant Info',        color: '#F97316' },
};

/**
 * An explicit gap in the analysis: something the analyst still needs to know
 * before the conclusion can be considered final.
 */
export interface OpenQuestion {
  id: string;
  order: number;
  category: OpenQuestionCategory;
  /** The question itself */
  question: string;
  /** Why this matters for the coverage determination */
  impact: string;
  /** Which conclusion(s) this question affects */
  affectedConclusionIds: string[];
  /** Has this question been resolved in a subsequent analysis? */
  resolved: boolean;
  /** Resolution text (if resolved) */
  resolution?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Decision Gate
// ════════════════════════════════════════════════════════════════════════

export type DecisionGateStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export const DECISION_GATE_CONFIG: Record<DecisionGateStatus, { label: string; color: string }> = {
  pending:      { label: 'Pending',      color: '#6B7280' },
  approved:     { label: 'Approved',     color: '#10B981' },
  rejected:     { label: 'Rejected',     color: '#EF4444' },
  needs_review: { label: 'Needs Review', color: '#F59E0B' },
};

/**
 * A decision gate in the analysis workflow.
 * Tracks whether the analysis has been reviewed and approved.
 */
export interface DecisionGate {
  id: string;
  /** Gate name (e.g. "Coverage team review", "Supervisor sign-off") */
  name: string;
  status: DecisionGateStatus;
  /** Who needs to approve */
  assigneeRole?: string;
  /** Who actually approved/rejected */
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Clause-Grounded Analysis (extends ClaimsAnalysis)
// ════════════════════════════════════════════════════════════════════════

/**
 * The clause-grounded analysis extends the existing ClaimsAnalysis
 * with richer citation structure, open questions, and decision gates.
 *
 * Stored at the same path: orgs/{orgId}/claimsAnalyses/{analysisId}
 * Identified by the presence of the `conclusions` field.
 */
export interface ClauseGroundedFields {
  /** Ordered conclusions with clause-anchor citations */
  conclusions: CitedConclusion[];
  /** Open questions checklist */
  openQuestions: OpenQuestion[];
  /** Decision gates for workflow tracking */
  decisionGates: DecisionGate[];
  /** Version number for comparison over time */
  analysisVersion: number;
  /** If this is a re-analysis, the prior analysis ID */
  priorAnalysisId?: string;
  /** Tags for organizing analyses */
  tags?: string[];
}

// ════════════════════════════════════════════════════════════════════════
// Analysis Comparison
// ════════════════════════════════════════════════════════════════════════

export type ComparisonChangeType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface ConclusionDelta {
  conclusionId: string;
  type: ConclusionType;
  statement: string;
  changeType: ComparisonChangeType;
  /** Previous statement if changed */
  previousStatement?: string;
  /** Previous confidence if changed */
  previousConfidence?: string;
}

export interface QuestionDelta {
  questionId: string;
  question: string;
  changeType: ComparisonChangeType;
  /** Was this resolved between versions? */
  newlyResolved: boolean;
}

/**
 * Comparison between two clause-grounded analyses.
 */
export interface AnalysisComparison {
  leftAnalysisId: string;
  rightAnalysisId: string;
  leftVersion: number;
  rightVersion: number;

  /** Did the overall determination change? */
  determinationChanged: boolean;
  leftDetermination: CoverageDetermination;
  rightDetermination: CoverageDetermination;

  /** Conclusion-level changes */
  conclusionDeltas: ConclusionDelta[];

  /** Open question changes */
  questionDeltas: QuestionDelta[];

  /** Summary statistics */
  stats: {
    conclusionsAdded: number;
    conclusionsRemoved: number;
    conclusionsChanged: number;
    conclusionsUnchanged: number;
    questionsResolved: number;
    questionsAdded: number;
    questionsRemoved: number;
  };
}
