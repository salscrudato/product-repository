/**
 * Analytics Aggregation Engine
 *
 * Pure computation functions — no Firestore calls.
 * The service layer feeds raw data in; this module returns metrics out.
 *
 * Five metric families:
 *   1. Readiness     – per-product readiness scores
 *   2. Cycle Time    – time-in-status for change sets
 *   3. Approvals     – pending backlog by role
 *   4. Blockers      – blocking tasks, failing QA, validation errors
 *   5. QA Pass Rate  – scenario pass rates
 */

import type {
  ProductReadinessMetric,
  CycleTimeMetric,
  CycleTimeEntry,
  ApprovalsBacklogMetric,
  ApprovalBacklogEntry,
  PendingChangeSetEntry,
  BlockersMetric,
  BlockerEntry,
  BlockerType,
  QAPassRateMetric,
  QARateProgramEntry,
  QARunSummaryEntry,
  ReadinessGrade,
} from '../types/analytics';
import { scoreToGrade, BLOCKER_TYPE_CONFIG } from '../types/analytics';
import type { ChangeSet, ChangeSetApproval, ChangeSetStatus, ApprovalRoleRequired } from '../types/changeSet';
import type { QARun, QARunStatus } from '../types/scenario';
import type { Task } from '../types/task';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'string') return new Date(ts);
  return null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

const APPROVAL_ROLE_NAMES: Record<string, string> = {
  actuary: 'Actuary',
  compliance: 'Compliance',
  underwriter: 'Underwriter',
  admin: 'Admin',
  product_manager: 'Product Manager',
};

// ════════════════════════════════════════════════════════════════════════
// 1. Readiness
// ════════════════════════════════════════════════════════════════════════

export interface ReadinessInput {
  productId: string;
  productName: string;
  overallReadinessScore: number;
  formScore: number;
  ruleScore: number;
  rateScore: number;
  statesActive: number;
  statesTotal: number;
  blockers: string[];
}

export function computeProductReadiness(inputs: ReadinessInput[]): ProductReadinessMetric[] {
  return inputs.map(p => ({
    productId: p.productId,
    productName: p.productName,
    readinessScore: p.overallReadinessScore,
    grade: scoreToGrade(p.overallReadinessScore),
    formScore: p.formScore,
    ruleScore: p.ruleScore,
    rateScore: p.rateScore,
    statesActive: p.statesActive,
    statesTotal: p.statesTotal,
    blockers: p.blockers,
  }));
}

export function computeOverallReadiness(products: ProductReadinessMetric[]): {
  score: number;
  grade: ReadinessGrade;
} {
  if (products.length === 0) return { score: 0, grade: 'F' };
  const score = Math.round(avg(products.map(p => p.readinessScore)));
  return { score, grade: scoreToGrade(score) };
}

// ════════════════════════════════════════════════════════════════════════
// 2. Cycle Time
// ════════════════════════════════════════════════════════════════════════

export interface CycleTimeInput {
  changeSets: ChangeSet[];
}

export function computeCycleTime(input: CycleTimeInput): CycleTimeMetric {
  const now = new Date();
  const entries: CycleTimeEntry[] = [];

  for (const cs of input.changeSets) {
    const created = toDate(cs.createdAt);
    const updated = toDate(cs.updatedAt);
    if (!created) continue;

    const isPublished = cs.status === 'published';
    const endDate = isPublished && updated ? updated : null;
    const totalDays = endDate ? daysBetween(created, endDate) : daysBetween(created, now);

    entries.push({
      changeSetId: cs.id,
      changeSetName: cs.name,
      createdAt: created,
      publishedAt: endDate,
      totalDays: Math.round(totalDays * 10) / 10,
      // Approximate phase breakdowns (heuristic: 40% draft, 30% review, 30% approval)
      daysInDraft: Math.round(totalDays * 0.4 * 10) / 10,
      daysInReview: Math.round(totalDays * 0.3 * 10) / 10,
      daysInApproval: Math.round(totalDays * 0.3 * 10) / 10,
      status: cs.status,
    });
  }

  const publishedEntries = entries.filter(e => e.publishedAt !== null);
  const publishDays = publishedEntries.map(e => e.totalDays);

  return {
    avgDaysToPublish: Math.round(avg(publishDays) * 10) / 10,
    medianDaysToPublish: Math.round(median(publishDays) * 10) / 10,
    avgDaysToReview: Math.round(avg(publishedEntries.map(e => e.daysInDraft)) * 10) / 10,
    avgDaysToApprove: Math.round(avg(publishedEntries.map(e => e.daysInReview)) * 10) / 10,
    avgDaysToPublishAfterApproval: Math.round(avg(publishedEntries.map(e => e.daysInApproval)) * 10) / 10,
    recentCycleTimes: entries.slice(0, 20),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 3. Approvals Backlog
// ════════════════════════════════════════════════════════════════════════

export interface ApprovalsInput {
  changeSets: ChangeSet[];
  approvals: Map<string, { role: ApprovalRoleRequired; status: string; createdAt: Date }[]>;
}

export function computeApprovalsBacklog(input: ApprovalsInput): ApprovalsBacklogMetric {
  const now = new Date();
  const pendingChangeSets: PendingChangeSetEntry[] = [];
  const roleAgg: Record<string, { count: number; waitDays: number[]; oldest: number }> = {};
  let totalPending = 0;
  let oldestPendingDays = 0;

  const reviewOrApproved = input.changeSets.filter(
    cs => cs.status === 'ready_for_review' || cs.status === 'approved',
  );

  for (const cs of reviewOrApproved) {
    const csApprovals = input.approvals.get(cs.id) || [];
    const pending = csApprovals.filter(a => a.status === 'pending');
    if (pending.length === 0) continue;

    const csCreated = toDate(cs.createdAt) ?? now;
    const waitingDays = Math.round(daysBetween(csCreated, now) * 10) / 10;

    const pendingRoles = pending.map(a => a.role);
    pendingChangeSets.push({
      changeSetId: cs.id,
      changeSetName: cs.name,
      status: cs.status,
      pendingRoles,
      waitingDays,
      ownerUserId: cs.ownerUserId,
      itemCount: cs.itemCount ?? 0,
    });

    for (const p of pending) {
      const roleName = p.role;
      if (!roleAgg[roleName]) roleAgg[roleName] = { count: 0, waitDays: [], oldest: 0 };
      const approvalCreated = p.createdAt;
      const wait = daysBetween(approvalCreated, now);
      roleAgg[roleName].count++;
      roleAgg[roleName].waitDays.push(wait);
      if (wait > roleAgg[roleName].oldest) roleAgg[roleName].oldest = wait;
      if (wait > oldestPendingDays) oldestPendingDays = wait;
      totalPending++;
    }
  }

  const byRole: Record<string, ApprovalBacklogEntry> = {};
  for (const [role, data] of Object.entries(roleAgg)) {
    byRole[role] = {
      role: role as ApprovalRoleRequired,
      roleName: APPROVAL_ROLE_NAMES[role] || role,
      pendingCount: data.count,
      avgWaitDays: Math.round(avg(data.waitDays) * 10) / 10,
      oldestWaitDays: Math.round(data.oldest * 10) / 10,
    };
  }

  return {
    totalPending,
    byRole,
    oldestPendingDays: Math.round(oldestPendingDays * 10) / 10,
    pendingChangeSets: pendingChangeSets.sort((a, b) => b.waitingDays - a.waitingDays),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 4. Blockers
// ════════════════════════════════════════════════════════════════════════

export interface BlockersInput {
  blockingTasks: {
    id: string;
    title: string;
    productId?: string;
    productName?: string;
    changeSetId?: string;
    changeSetName?: string;
    createdAt: Date;
  }[];
  qaFailures: {
    runId: string;
    rateProgramName: string;
    changeSetName?: string;
    failedCount: number;
    triggeredAt: Date;
  }[];
  validationErrors: {
    message: string;
    productId?: string;
    productName?: string;
    detectedAt: Date;
  }[];
  missingApprovals: {
    changeSetId: string;
    changeSetName: string;
    role: string;
    waitDays: number;
    detectedAt: Date;
  }[];
  draftArtifacts: {
    entityName: string;
    entityType: string;
    productName?: string;
    detectedAt: Date;
  }[];
  expiredRules: {
    ruleName: string;
    productName?: string;
    expiredAt: string;
    detectedAt: Date;
  }[];
}

function severityForType(type: BlockerType): 'critical' | 'high' | 'medium' | 'low' {
  switch (type) {
    case 'blocking_task': return 'critical';
    case 'qa_failure': return 'critical';
    case 'validation_error': return 'high';
    case 'missing_approval': return 'medium';
    case 'draft_artifact': return 'low';
    case 'expired_rule': return 'medium';
    default: return 'low';
  }
}

export function computeBlockers(input: BlockersInput): BlockersMetric {
  const entries: BlockerEntry[] = [];

  for (const t of input.blockingTasks) {
    entries.push({
      type: 'blocking_task',
      severity: 'critical',
      message: `Blocking task: "${t.title}"`,
      entityType: 'task',
      entityId: t.id,
      entityName: t.title,
      productId: t.productId,
      productName: t.productName,
      changeSetId: t.changeSetId,
      changeSetName: t.changeSetName,
      detectedAt: t.createdAt,
    });
  }

  for (const q of input.qaFailures) {
    entries.push({
      type: 'qa_failure',
      severity: 'critical',
      message: `QA regression failed: ${q.rateProgramName} (${q.failedCount} scenarios)`,
      entityName: q.rateProgramName,
      changeSetName: q.changeSetName,
      detectedAt: q.triggeredAt,
    });
  }

  for (const v of input.validationErrors) {
    entries.push({
      type: 'validation_error',
      severity: 'high',
      message: v.message,
      productId: v.productId,
      productName: v.productName,
      detectedAt: v.detectedAt,
    });
  }

  for (const a of input.missingApprovals) {
    entries.push({
      type: 'missing_approval',
      severity: a.waitDays > 7 ? 'high' : 'medium',
      message: `${a.role} approval pending for "${a.changeSetName}" (${Math.round(a.waitDays)}d)`,
      changeSetId: a.changeSetId,
      changeSetName: a.changeSetName,
      detectedAt: a.detectedAt,
    });
  }

  for (const d of input.draftArtifacts) {
    entries.push({
      type: 'draft_artifact',
      severity: 'low',
      message: `${d.entityType} "${d.entityName}" is still in draft`,
      entityType: d.entityType,
      entityName: d.entityName,
      productName: d.productName,
      detectedAt: d.detectedAt,
    });
  }

  for (const r of input.expiredRules) {
    entries.push({
      type: 'expired_rule',
      severity: 'medium',
      message: `Rule "${r.ruleName}" expired on ${r.expiredAt}`,
      entityType: 'rule',
      entityName: r.ruleName,
      productName: r.productName,
      detectedAt: r.detectedAt,
    });
  }

  // Sort by severity (critical first), then by date
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  entries.sort((a, b) => {
    const s = severityOrder[a.severity] - severityOrder[b.severity];
    if (s !== 0) return s;
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });

  const byType: Record<BlockerType, number> = {
    blocking_task: 0, qa_failure: 0, validation_error: 0,
    missing_approval: 0, draft_artifact: 0, expired_rule: 0,
  };
  let critical = 0, high = 0, medium = 0, low = 0;
  for (const e of entries) {
    byType[e.type]++;
    if (e.severity === 'critical') critical++;
    else if (e.severity === 'high') high++;
    else if (e.severity === 'medium') medium++;
    else low++;
  }

  return { totalBlockers: entries.length, critical, high, medium, low, byType, entries };
}

// ════════════════════════════════════════════════════════════════════════
// 5. QA Pass Rate
// ════════════════════════════════════════════════════════════════════════

export interface QAPassRateInput {
  qaRuns: QARun[];
}

export function computeQAPassRate(input: QAPassRateInput): QAPassRateMetric {
  const runs = input.qaRuns;
  const completed = runs.filter(r => r.status !== 'running');

  const passed = completed.filter(r => r.status === 'passed').length;
  const failed = completed.filter(r => r.status === 'failed').length;
  const errorCount = completed.filter(r => r.status === 'error').length;
  const overallPassRate = completed.length > 0 ? passed / completed.length : 0;

  // By rate program
  const rpMap = new Map<string, { name: string; runs: QARun[] }>();
  for (const run of completed) {
    const key = run.rateProgramId;
    if (!rpMap.has(key)) rpMap.set(key, { name: run.rateProgramName || key, runs: [] });
    rpMap.get(key)!.runs.push(run);
  }

  const byRateProgram: QARateProgramEntry[] = [];
  for (const [rpId, data] of rpMap) {
    const rpPassed = data.runs.filter(r => r.status === 'passed').length;
    const last = data.runs.sort(
      (a, b) => (toDate(b.triggeredAt)?.getTime() ?? 0) - (toDate(a.triggeredAt)?.getTime() ?? 0)
    )[0];
    byRateProgram.push({
      rateProgramId: rpId,
      rateProgramName: data.name,
      passRate: data.runs.length > 0 ? rpPassed / data.runs.length : 0,
      totalRuns: data.runs.length,
      lastRunDate: last ? toDate(last.triggeredAt) : null,
      lastRunStatus: last ? (last.status as 'passed' | 'failed' | 'error') : null,
    });
  }

  // Recent runs (up to 20)
  const recentRuns: QARunSummaryEntry[] = completed
    .sort((a, b) => (toDate(b.triggeredAt)?.getTime() ?? 0) - (toDate(a.triggeredAt)?.getTime() ?? 0))
    .slice(0, 20)
    .map(r => ({
      runId: r.id,
      rateProgramName: r.rateProgramName || r.rateProgramId,
      status: r.status as 'passed' | 'failed' | 'error',
      passRate: r.totalScenarios > 0 ? r.passedCount / r.totalScenarios : 0,
      totalScenarios: r.totalScenarios,
      passedCount: r.passedCount,
      failedCount: r.failedCount,
      triggeredAt: toDate(r.triggeredAt) ?? new Date(),
      changeSetName: r.changeSetName,
    }));

  return {
    overallPassRate: Math.round(overallPassRate * 1000) / 1000,
    totalRuns: completed.length,
    passedRuns: passed,
    failedRuns: failed,
    errorRuns: errorCount,
    byRateProgram: byRateProgram.sort((a, b) => a.passRate - b.passRate),
    recentRuns,
  };
}
