/**
 * Analytics Types
 *
 * Data model for leadership analytics covering five dimensions:
 *   1. Readiness     – per-product readiness scores and blockers
 *   2. Cycle Time    – time-in-status for change sets (draft → published)
 *   3. Approvals     – pending backlog by role, aging
 *   4. Blockers      – blocking tasks, failing QA, validation errors
 *   5. QA Pass Rate  – scenario pass rates across rate programs
 *
 * Firestore:
 *   orgs/{orgId}/analytics/portfolio      – portfolio snapshot
 *   orgs/{orgId}/analytics/changesets     – changeset metrics (optional)
 */

import { Timestamp } from 'firebase/firestore';
import type { ChangeSetStatus, ApprovalRoleRequired } from './changeSet';

// ════════════════════════════════════════════════════════════════════════
// 1. Readiness
// ════════════════════════════════════════════════════════════════════════

export type ReadinessGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number): ReadinessGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export const READINESS_GRADE_COLORS: Record<ReadinessGrade, string> = {
  A: '#10B981',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#F97316',
  F: '#EF4444',
};

export interface ProductReadinessMetric {
  productId: string;
  productName: string;
  /** 0-100 readiness score */
  readinessScore: number;
  grade: ReadinessGrade;
  /** Artifact breakdown */
  formScore: number;
  ruleScore: number;
  rateScore: number;
  /** State coverage */
  statesActive: number;
  statesTotal: number;
  /** Top blockers for this product */
  blockers: string[];
}

// ════════════════════════════════════════════════════════════════════════
// 2. Cycle Time
// ════════════════════════════════════════════════════════════════════════

export interface CycleTimeMetric {
  /** Average days from draft → published for completed change sets */
  avgDaysToPublish: number;
  /** Median days */
  medianDaysToPublish: number;
  /** Average days from draft → ready_for_review */
  avgDaysToReview: number;
  /** Average days from ready_for_review → approved */
  avgDaysToApprove: number;
  /** Average days from approved → published */
  avgDaysToPublishAfterApproval: number;
  /** Breakdown by recent completed change sets */
  recentCycleTimes: CycleTimeEntry[];
}

export interface CycleTimeEntry {
  changeSetId: string;
  changeSetName: string;
  createdAt: Date;
  publishedAt: Date | null;
  totalDays: number;
  daysInDraft: number;
  daysInReview: number;
  daysInApproval: number;
  status: ChangeSetStatus;
  /** Product context for filtering */
  productId?: string;
}

// ════════════════════════════════════════════════════════════════════════
// 3. Approvals Backlog
// ════════════════════════════════════════════════════════════════════════

export interface ApprovalsBacklogMetric {
  /** Total pending approvals across all change sets */
  totalPending: number;
  /** Breakdown by required role */
  byRole: Record<string, ApprovalBacklogEntry>;
  /** Oldest pending approval (days) */
  oldestPendingDays: number;
  /** Change sets waiting for approval */
  pendingChangeSets: PendingChangeSetEntry[];
}

export interface ApprovalBacklogEntry {
  role: ApprovalRoleRequired;
  roleName: string;
  pendingCount: number;
  avgWaitDays: number;
  oldestWaitDays: number;
}

export interface PendingChangeSetEntry {
  changeSetId: string;
  changeSetName: string;
  status: ChangeSetStatus;
  pendingRoles: ApprovalRoleRequired[];
  waitingDays: number;
  ownerUserId: string;
  itemCount: number;
  /** Product context for filtering */
  productId?: string;
}

// ════════════════════════════════════════════════════════════════════════
// 4. Blockers
// ════════════════════════════════════════════════════════════════════════

export type BlockerType =
  | 'blocking_task'
  | 'qa_failure'
  | 'validation_error'
  | 'missing_approval'
  | 'draft_artifact'
  | 'expired_rule';

export const BLOCKER_TYPE_CONFIG: Record<BlockerType, { label: string; color: string; icon: string }> = {
  blocking_task:    { label: 'Blocking Task',     color: '#EF4444', icon: 'stop' },
  qa_failure:       { label: 'QA Failure',        color: '#EF4444', icon: 'x-circle' },
  validation_error: { label: 'Validation Error',  color: '#F97316', icon: 'exclamation' },
  missing_approval: { label: 'Missing Approval',  color: '#F59E0B', icon: 'clock' },
  draft_artifact:   { label: 'Draft Artifact',    color: '#6B7280', icon: 'edit' },
  expired_rule:     { label: 'Expired Rule',      color: '#F59E0B', icon: 'calendar' },
};

export interface BlockerEntry {
  type: BlockerType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  /** Artifact or entity this blocker relates to */
  entityType?: string;
  entityId?: string;
  entityName?: string;
  /** Product context */
  productId?: string;
  productName?: string;
  /** Change set context */
  changeSetId?: string;
  changeSetName?: string;
  /** When this blocker was detected */
  detectedAt: Date;
}

export interface BlockersMetric {
  totalBlockers: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<BlockerType, number>;
  entries: BlockerEntry[];
}

// ════════════════════════════════════════════════════════════════════════
// 5. QA Pass Rate
// ════════════════════════════════════════════════════════════════════════

export interface QAPassRateMetric {
  /** Overall pass rate (0-1) across all recent runs */
  overallPassRate: number;
  /** Total runs in the period */
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  errorRuns: number;
  /** Pass rate by rate program */
  byRateProgram: QARateProgramEntry[];
  /** Recent runs for trend */
  recentRuns: QARunSummaryEntry[];
}

export interface QARateProgramEntry {
  rateProgramId: string;
  rateProgramName: string;
  passRate: number;
  totalRuns: number;
  lastRunDate: Date | null;
  lastRunStatus: 'passed' | 'failed' | 'error' | null;
  /** Product context for filtering */
  productId?: string;
}

export interface QARunSummaryEntry {
  runId: string;
  rateProgramName: string;
  status: 'passed' | 'failed' | 'error';
  passRate: number;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  triggeredAt: Date;
  changeSetName?: string;
  /** Product context for filtering */
  productId?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Portfolio Snapshot (persisted to Firestore)
// ════════════════════════════════════════════════════════════════════════

export interface PortfolioSnapshot {
  /** Overall readiness score (0-100) averaged across products */
  overallReadinessScore: number;
  overallGrade: ReadinessGrade;
  /** Per-product readiness */
  products: ProductReadinessMetric[];
  /** Cycle time metrics */
  cycleTime: CycleTimeMetric;
  /** Approvals backlog */
  approvalsBacklog: ApprovalsBacklogMetric;
  /** Blockers */
  blockers: BlockersMetric;
  /** QA pass rate */
  qaPassRate: QAPassRateMetric;
  /** When this snapshot was computed */
  computedAt: Timestamp;
  computedBy: string;
}
