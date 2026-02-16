/**
 * Analytics Service
 *
 * Loads raw data from Firestore, feeds it through the analytics engine,
 * and optionally persists snapshots to orgs/{orgId}/analytics/portfolio.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, query, where, orderBy,
  Timestamp, limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { orgAnalyticsPath, analyticsDocPath } from '../repositories/paths';
import { listChangeSets, getChangeSetApprovals } from './changeSetService';
import { computeProduct360Readiness } from './readinessService';
import type { Product360Readiness, ArtifactCategoryReadiness } from './readinessService';
import type { ChangeSet, ChangeSetApproval, ApprovalRoleRequired } from '../types/changeSet';
import type { QARun } from '../types/scenario';
import type { Task } from '../types/task';
import type { Product } from '../types/index';
import type { PortfolioSnapshot } from '../types/analytics';
import {
  computeProductReadiness,
  computeOverallReadiness,
  computeCycleTime,
  computeApprovalsBacklog,
  computeBlockers,
  computeQAPassRate,
  type ReadinessInput,
} from '../engine/analyticsEngine';

// ════════════════════════════════════════════════════════════════════════
// Data loaders
// ════════════════════════════════════════════════════════════════════════

function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'string') return new Date(ts);
  return new Date();
}

async function loadProducts(orgId: string): Promise<Product[]> {
  const snap = await getDocs(collection(db, `orgs/${orgId}/products`));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

async function loadQARuns(orgId: string): Promise<QARun[]> {
  const snap = await getDocs(
    query(collection(db, `orgs/${orgId}/qaRuns`), orderBy('triggeredAt', 'desc'), limit(100)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as QARun));
}

async function loadBlockingTasks(orgId: string): Promise<Task[]> {
  const snap = await getDocs(
    query(
      collection(db, `orgs/${orgId}/tasks`),
      where('blocking', '==', true),
      where('status', 'in', ['open', 'in_progress']),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

async function loadApprovals(
  orgId: string,
  changeSets: ChangeSet[],
): Promise<Map<string, { role: ApprovalRoleRequired; status: string; createdAt: Date }[]>> {
  const map = new Map<string, { role: ApprovalRoleRequired; status: string; createdAt: Date }[]>();
  // Only load approvals for active change sets
  const active = changeSets.filter(cs =>
    cs.status === 'ready_for_review' || cs.status === 'approved',
  );
  for (const cs of active) {
    try {
      const approvals = await getChangeSetApprovals(orgId, cs.id);
      map.set(cs.id, approvals.map(a => ({
        role: a.roleRequired,
        status: a.status,
        createdAt: toDate(a.createdAt),
      })));
    } catch {
      map.set(cs.id, []);
    }
  }
  return map;
}

// ════════════════════════════════════════════════════════════════════════
// Main aggregation
// ════════════════════════════════════════════════════════════════════════

export async function computePortfolioSnapshot(orgId: string): Promise<PortfolioSnapshot> {
  // Load all raw data in parallel
  const [products, changeSets, qaRuns, blockingTasks] = await Promise.all([
    loadProducts(orgId),
    listChangeSets(orgId),
    loadQARuns(orgId),
    loadBlockingTasks(orgId),
  ]);

  const approvals = await loadApprovals(orgId, changeSets);

  // ── 1. Readiness per product ──
  const readinessInputs: ReadinessInput[] = [];
  for (const product of products) {
    if (product.archived) continue;
    try {
      const r360 = await computeProduct360Readiness(orgId, product.id, null);
      const categoryScore = (cat: string) => {
        const c = r360.artifacts.find(a => a.category === cat);
        return c?.score ?? 0;
      };
      readinessInputs.push({
        productId: product.id,
        productName: product.name,
        overallReadinessScore: r360.overallReadinessScore,
        formScore: categoryScore('forms'),
        ruleScore: categoryScore('rules'),
        rateScore: categoryScore('ratePrograms'),
        statesActive: r360.stateStats.active,
        statesTotal: r360.stateStats.total,
        blockers: r360.blockers,
      });
    } catch {
      readinessInputs.push({
        productId: product.id,
        productName: product.name,
        overallReadinessScore: 0,
        formScore: 0,
        ruleScore: 0,
        rateScore: 0,
        statesActive: 0,
        statesTotal: 0,
        blockers: ['Failed to compute readiness'],
      });
    }
  }

  const productMetrics = computeProductReadiness(readinessInputs);
  const overall = computeOverallReadiness(productMetrics);

  // ── 2. Cycle time ──
  const cycleTime = computeCycleTime({ changeSets });

  // ── 3. Approvals backlog ──
  const approvalsBacklog = computeApprovalsBacklog({ changeSets, approvals });

  // ── 4. Blockers ──
  const failedRuns = qaRuns.filter(r => r.status === 'failed');
  const now = new Date();
  const blockers = computeBlockers({
    blockingTasks: blockingTasks.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: toDate(t.createdAt),
    })),
    qaFailures: failedRuns.map(r => ({
      runId: r.id,
      rateProgramName: r.rateProgramName || r.rateProgramId,
      changeSetName: r.changeSetName,
      failedCount: r.failedCount,
      triggeredAt: toDate(r.triggeredAt),
    })),
    validationErrors: [],
    missingApprovals: approvalsBacklog.pendingChangeSets.flatMap(cs =>
      cs.pendingRoles.map(role => ({
        changeSetId: cs.changeSetId,
        changeSetName: cs.changeSetName,
        role: APPROVAL_ROLE_NAMES[role] || role,
        waitDays: cs.waitingDays,
        detectedAt: now,
      })),
    ),
    draftArtifacts: [],
    expiredRules: [],
  });

  // ── 5. QA pass rate ──
  const qaPassRate = computeQAPassRate({ qaRuns });

  const uid = auth.currentUser?.uid || 'system';

  return {
    overallReadinessScore: overall.score,
    overallGrade: overall.grade,
    products: productMetrics,
    cycleTime,
    approvalsBacklog,
    blockers,
    qaPassRate,
    computedAt: Timestamp.now(),
    computedBy: uid,
  };
}

const APPROVAL_ROLE_NAMES: Record<string, string> = {
  actuary: 'Actuary',
  compliance: 'Compliance',
  underwriter: 'Underwriter',
  admin: 'Admin',
  product_manager: 'Product Manager',
};

// ════════════════════════════════════════════════════════════════════════
// Persistence
// ════════════════════════════════════════════════════════════════════════

export async function savePortfolioSnapshot(
  orgId: string,
  snapshot: PortfolioSnapshot,
): Promise<void> {
  await setDoc(doc(db, analyticsDocPath(orgId, 'portfolio')), snapshot);
}

export async function getPortfolioSnapshot(
  orgId: string,
): Promise<PortfolioSnapshot | null> {
  const snap = await getDoc(doc(db, analyticsDocPath(orgId, 'portfolio')));
  if (!snap.exists()) return null;
  return snap.data() as PortfolioSnapshot;
}

/**
 * Compute, save, and return a fresh portfolio snapshot.
 */
export async function refreshPortfolioSnapshot(orgId: string): Promise<PortfolioSnapshot> {
  const snapshot = await computePortfolioSnapshot(orgId);
  await savePortfolioSnapshot(orgId, snapshot);
  return snapshot;
}
