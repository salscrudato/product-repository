/**
 * Analytics Engine Tests
 *
 * Tests all five metric families in the analytics aggregation engine:
 *   1. Readiness     – product readiness scoring & grading
 *   2. Cycle Time    – change set throughput metrics
 *   3. Approvals     – pending backlog aggregation
 *   4. Blockers      – cross-source blocker compilation
 *   5. QA Pass Rate  – scenario pass rate metrics
 */

import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  computeProductReadiness,
  computeOverallReadiness,
  computeCycleTime,
  computeApprovalsBacklog,
  computeBlockers,
  computeQAPassRate,
  type ReadinessInput,
  type CycleTimeInput,
  type ApprovalsInput,
  type BlockersInput,
  type QAPassRateInput,
} from '../engine/analyticsEngine';
import { scoreToGrade, READINESS_GRADE_COLORS } from '../types/analytics';
import type { ChangeSet, ApprovalRoleRequired } from '../types/changeSet';
import type { QARun } from '../types/scenario';

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function makeReadinessInput(overrides?: Partial<ReadinessInput>): ReadinessInput {
  return {
    productId: 'prod-1',
    productName: 'Commercial Property',
    overallReadinessScore: 85,
    formScore: 90,
    ruleScore: 80,
    rateScore: 85,
    statesActive: 12,
    statesTotal: 50,
    blockers: [],
    ...overrides,
  };
}

function makeChangeSet(overrides?: Partial<ChangeSet>): ChangeSet {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  return {
    id: `cs-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test ChangeSet',
    status: 'published',
    ownerUserId: 'user-1',
    createdAt: { toDate: () => createdAt } as any,
    createdBy: 'user-1',
    updatedAt: { toDate: () => now } as any,
    updatedBy: 'user-1',
    itemCount: 3,
    ...overrides,
  } as ChangeSet;
}

function makeQARun(overrides?: Partial<QARun>): QARun {
  return {
    id: `run-${Math.random().toString(36).slice(2, 8)}`,
    rateProgramId: 'rp-1',
    rateProgramName: 'Base Rate',
    draftVersionId: 'v-draft',
    status: 'passed',
    totalScenarios: 10,
    passedCount: 10,
    failedCount: 0,
    errorCount: 0,
    results: [],
    totalExecutionTimeMs: 100,
    triggeredAt: { toDate: () => new Date() } as any,
    triggeredBy: 'user-1',
    ...overrides,
  } as QARun;
}

// ════════════════════════════════════════════════════════════════════════
// 1. Readiness
// ════════════════════════════════════════════════════════════════════════

describe('computeProductReadiness', () => {
  it('maps inputs to ProductReadinessMetric with correct grade', () => {
    const inputs = [makeReadinessInput({ overallReadinessScore: 92 })];
    const result = computeProductReadiness(inputs);
    expect(result).toHaveLength(1);
    expect(result[0].grade).toBe('A');
    expect(result[0].readinessScore).toBe(92);
  });

  it('assigns correct grades across the spectrum', () => {
    const inputs = [
      makeReadinessInput({ productId: 'p1', overallReadinessScore: 95 }),
      makeReadinessInput({ productId: 'p2', overallReadinessScore: 78 }),
      makeReadinessInput({ productId: 'p3', overallReadinessScore: 62 }),
      makeReadinessInput({ productId: 'p4', overallReadinessScore: 45 }),
      makeReadinessInput({ productId: 'p5', overallReadinessScore: 20 }),
    ];
    const result = computeProductReadiness(inputs);
    expect(result[0].grade).toBe('A');
    expect(result[1].grade).toBe('B');
    expect(result[2].grade).toBe('C');
    expect(result[3].grade).toBe('D');
    expect(result[4].grade).toBe('F');
  });

  it('preserves blockers in the metric', () => {
    const inputs = [makeReadinessInput({ blockers: ['Missing form CG 00 01', 'Draft-only rule'] })];
    const result = computeProductReadiness(inputs);
    expect(result[0].blockers).toHaveLength(2);
  });
});

describe('computeOverallReadiness', () => {
  it('averages scores across products', () => {
    const metrics = computeProductReadiness([
      makeReadinessInput({ overallReadinessScore: 80 }),
      makeReadinessInput({ overallReadinessScore: 60 }),
    ]);
    const overall = computeOverallReadiness(metrics);
    expect(overall.score).toBe(70);
    expect(overall.grade).toBe('C');
  });

  it('returns F for empty products', () => {
    const overall = computeOverallReadiness([]);
    expect(overall.score).toBe(0);
    expect(overall.grade).toBe('F');
  });
});

describe('scoreToGrade', () => {
  it('maps boundary values correctly', () => {
    expect(scoreToGrade(100)).toBe('A');
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(89)).toBe('B');
    expect(scoreToGrade(75)).toBe('B');
    expect(scoreToGrade(74)).toBe('C');
    expect(scoreToGrade(60)).toBe('C');
    expect(scoreToGrade(59)).toBe('D');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(39)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });

  it('has colors for every grade', () => {
    const grades = ['A', 'B', 'C', 'D', 'F'] as const;
    for (const g of grades) {
      expect(READINESS_GRADE_COLORS[g]).toBeTruthy();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Cycle Time
// ════════════════════════════════════════════════════════════════════════

describe('computeCycleTime', () => {
  it('computes average and median for published change sets', () => {
    const changeSets = [
      makeChangeSet({ name: 'CS-A' }),
      makeChangeSet({ name: 'CS-B' }),
    ];
    const result = computeCycleTime({ changeSets });
    expect(result.avgDaysToPublish).toBeGreaterThan(0);
    expect(result.medianDaysToPublish).toBeGreaterThan(0);
  });

  it('returns zero for no change sets', () => {
    const result = computeCycleTime({ changeSets: [] });
    expect(result.avgDaysToPublish).toBe(0);
    expect(result.medianDaysToPublish).toBe(0);
    expect(result.recentCycleTimes).toEqual([]);
  });

  it('includes unpublished change sets in recent list', () => {
    const changeSets = [
      makeChangeSet({ name: 'Draft CS', status: 'draft' }),
      makeChangeSet({ name: 'Published CS', status: 'published' }),
    ];
    const result = computeCycleTime({ changeSets });
    expect(result.recentCycleTimes).toHaveLength(2);
    // Only published counts in avg
    const pubEntry = result.recentCycleTimes.find(e => e.status === 'published');
    expect(pubEntry).toBeTruthy();
  });

  it('limits recent cycle times to 20', () => {
    const changeSets = Array.from({ length: 30 }, (_, i) =>
      makeChangeSet({ name: `CS-${i}` }),
    );
    const result = computeCycleTime({ changeSets });
    expect(result.recentCycleTimes.length).toBeLessThanOrEqual(20);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Approvals Backlog
// ════════════════════════════════════════════════════════════════════════

describe('computeApprovalsBacklog', () => {
  it('counts pending approvals by role', () => {
    const cs = makeChangeSet({ id: 'cs-1', status: 'ready_for_review' });
    const approvals = new Map<string, { role: ApprovalRoleRequired; status: string; createdAt: Date }[]>();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    approvals.set('cs-1', [
      { role: 'actuary', status: 'pending', createdAt: threeDaysAgo },
      { role: 'compliance', status: 'approved', createdAt: threeDaysAgo },
    ]);

    const result = computeApprovalsBacklog({ changeSets: [cs], approvals });
    expect(result.totalPending).toBe(1);
    expect(result.byRole['actuary']).toBeTruthy();
    expect(result.byRole['actuary'].pendingCount).toBe(1);
    expect(result.byRole['compliance']).toBeUndefined(); // already approved
  });

  it('returns zero for no pending approvals', () => {
    const result = computeApprovalsBacklog({ changeSets: [], approvals: new Map() });
    expect(result.totalPending).toBe(0);
    expect(result.pendingChangeSets).toEqual([]);
  });

  it('sorts pending change sets by wait time descending', () => {
    const cs1 = makeChangeSet({
      id: 'cs-old', status: 'ready_for_review',
      createdAt: { toDate: () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } as any,
    });
    const cs2 = makeChangeSet({
      id: 'cs-new', status: 'ready_for_review',
      createdAt: { toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } as any,
    });
    const approvals = new Map();
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    approvals.set('cs-old', [{ role: 'actuary' as ApprovalRoleRequired, status: 'pending', createdAt: old }]);
    approvals.set('cs-new', [{ role: 'actuary' as ApprovalRoleRequired, status: 'pending', createdAt: new Date() }]);

    const result = computeApprovalsBacklog({ changeSets: [cs1, cs2], approvals });
    expect(result.pendingChangeSets[0].changeSetId).toBe('cs-old');
  });

  it('skips published and draft change sets', () => {
    const published = makeChangeSet({ id: 'pub', status: 'published' });
    const draft = makeChangeSet({ id: 'draft', status: 'draft' });
    const approvals = new Map();
    const result = computeApprovalsBacklog({ changeSets: [published, draft], approvals });
    expect(result.totalPending).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Blockers
// ════════════════════════════════════════════════════════════════════════

describe('computeBlockers', () => {
  const emptyInput: BlockersInput = {
    blockingTasks: [],
    qaFailures: [],
    validationErrors: [],
    missingApprovals: [],
    draftArtifacts: [],
    expiredRules: [],
  };

  it('returns zero for no blockers', () => {
    const result = computeBlockers(emptyInput);
    expect(result.totalBlockers).toBe(0);
    expect(result.critical).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it('categorizes blocking tasks as critical', () => {
    const result = computeBlockers({
      ...emptyInput,
      blockingTasks: [{ id: 't1', title: 'Review filing', createdAt: new Date() }],
    });
    expect(result.totalBlockers).toBe(1);
    expect(result.critical).toBe(1);
    expect(result.byType.blocking_task).toBe(1);
    expect(result.entries[0].type).toBe('blocking_task');
    expect(result.entries[0].severity).toBe('critical');
  });

  it('categorizes QA failures as critical', () => {
    const result = computeBlockers({
      ...emptyInput,
      qaFailures: [{ runId: 'r1', rateProgramName: 'Base', failedCount: 3, triggeredAt: new Date() }],
    });
    expect(result.critical).toBe(1);
    expect(result.byType.qa_failure).toBe(1);
  });

  it('categorizes validation errors as high', () => {
    const result = computeBlockers({
      ...emptyInput,
      validationErrors: [{ message: 'Missing required form', detectedAt: new Date() }],
    });
    expect(result.high).toBe(1);
    expect(result.byType.validation_error).toBe(1);
  });

  it('escalates old missing approvals to high severity', () => {
    const result = computeBlockers({
      ...emptyInput,
      missingApprovals: [{
        changeSetId: 'cs-1', changeSetName: 'CS', role: 'Actuary',
        waitDays: 10, detectedAt: new Date(),
      }],
    });
    expect(result.high).toBe(1); // >7 days = high
  });

  it('sorts by severity then date', () => {
    const result = computeBlockers({
      ...emptyInput,
      blockingTasks: [{ id: 't1', title: 'Critical task', createdAt: new Date() }],
      validationErrors: [{ message: 'High issue', detectedAt: new Date() }],
      draftArtifacts: [{ entityName: 'Form', entityType: 'form', detectedAt: new Date() }],
    });
    expect(result.entries[0].severity).toBe('critical');
    expect(result.entries[1].severity).toBe('high');
    expect(result.entries[2].severity).toBe('low');
  });

  it('aggregates multiple blocker types correctly', () => {
    const result = computeBlockers({
      blockingTasks: [
        { id: 't1', title: 'Task 1', createdAt: new Date() },
        { id: 't2', title: 'Task 2', createdAt: new Date() },
      ],
      qaFailures: [{ runId: 'r1', rateProgramName: 'Base', failedCount: 5, triggeredAt: new Date() }],
      validationErrors: [{ message: 'Error 1', detectedAt: new Date() }],
      missingApprovals: [
        { changeSetId: 'cs-1', changeSetName: 'CS', role: 'Actuary', waitDays: 2, detectedAt: new Date() },
      ],
      draftArtifacts: [{ entityName: 'Draft Form', entityType: 'form', detectedAt: new Date() }],
      expiredRules: [{ ruleName: 'Old Rule', expiredAt: '2024-01-01', detectedAt: new Date() }],
    });
    expect(result.totalBlockers).toBe(7);
    expect(result.byType.blocking_task).toBe(2);
    expect(result.byType.qa_failure).toBe(1);
    expect(result.byType.validation_error).toBe(1);
    expect(result.byType.missing_approval).toBe(1);
    expect(result.byType.draft_artifact).toBe(1);
    expect(result.byType.expired_rule).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. QA Pass Rate
// ════════════════════════════════════════════════════════════════════════

describe('computeQAPassRate', () => {
  it('computes overall pass rate correctly', () => {
    const runs = [
      makeQARun({ status: 'passed' }),
      makeQARun({ status: 'passed' }),
      makeQARun({ status: 'failed', failedCount: 2, passedCount: 8 }),
    ];
    const result = computeQAPassRate({ qaRuns: runs });
    expect(result.overallPassRate).toBeCloseTo(0.667, 2);
    expect(result.passedRuns).toBe(2);
    expect(result.failedRuns).toBe(1);
    expect(result.totalRuns).toBe(3);
  });

  it('returns zero for no runs', () => {
    const result = computeQAPassRate({ qaRuns: [] });
    expect(result.overallPassRate).toBe(0);
    expect(result.totalRuns).toBe(0);
    expect(result.byRateProgram).toEqual([]);
  });

  it('excludes running runs from calculations', () => {
    const runs = [
      makeQARun({ status: 'passed' }),
      makeQARun({ status: 'running' }),
    ];
    const result = computeQAPassRate({ qaRuns: runs });
    expect(result.totalRuns).toBe(1); // only completed
    expect(result.overallPassRate).toBe(1);
  });

  it('groups by rate program', () => {
    const runs = [
      makeQARun({ rateProgramId: 'rp-1', rateProgramName: 'Base', status: 'passed' }),
      makeQARun({ rateProgramId: 'rp-1', rateProgramName: 'Base', status: 'failed' }),
      makeQARun({ rateProgramId: 'rp-2', rateProgramName: 'Territory', status: 'passed' }),
    ];
    const result = computeQAPassRate({ qaRuns: runs });
    expect(result.byRateProgram).toHaveLength(2);
    const base = result.byRateProgram.find(rp => rp.rateProgramId === 'rp-1');
    expect(base).toBeTruthy();
    expect(base!.passRate).toBe(0.5);
    expect(base!.totalRuns).toBe(2);
    const territory = result.byRateProgram.find(rp => rp.rateProgramId === 'rp-2');
    expect(territory!.passRate).toBe(1);
  });

  it('limits recent runs to 20', () => {
    const runs = Array.from({ length: 30 }, (_, i) =>
      makeQARun({ id: `run-${i}`, status: i % 2 === 0 ? 'passed' : 'failed' }),
    );
    const result = computeQAPassRate({ qaRuns: runs });
    expect(result.recentRuns.length).toBeLessThanOrEqual(20);
  });

  it('sorts rate programs by pass rate ascending (worst first)', () => {
    const runs = [
      makeQARun({ rateProgramId: 'rp-good', rateProgramName: 'Good', status: 'passed' }),
      makeQARun({ rateProgramId: 'rp-bad', rateProgramName: 'Bad', status: 'failed' }),
    ];
    const result = computeQAPassRate({ qaRuns: runs });
    expect(result.byRateProgram[0].rateProgramId).toBe('rp-bad');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Acceptance criteria
// ════════════════════════════════════════════════════════════════════════

describe('acceptance criteria', () => {
  it('leadership can see bottlenecks and readiness in one page', () => {
    // Readiness
    const products = computeProductReadiness([
      makeReadinessInput({ productId: 'p1', productName: 'BOP', overallReadinessScore: 90, blockers: [] }),
      makeReadinessInput({ productId: 'p2', productName: 'WC', overallReadinessScore: 40, blockers: ['Missing rate program'] }),
    ]);
    const overall = computeOverallReadiness(products);
    expect(overall.grade).toBe('C'); // 65 avg

    // Cycle time
    const cycle = computeCycleTime({ changeSets: [makeChangeSet()] });
    expect(cycle.avgDaysToPublish).toBeGreaterThan(0);

    // Approvals
    const cs = makeChangeSet({ id: 'cs-1', status: 'ready_for_review' });
    const approvals = new Map();
    approvals.set('cs-1', [
      { role: 'actuary' as ApprovalRoleRequired, status: 'pending', createdAt: new Date(Date.now() - 5 * 86400000) },
    ]);
    const backlog = computeApprovalsBacklog({ changeSets: [cs], approvals });
    expect(backlog.totalPending).toBe(1);

    // Blockers
    const blockers = computeBlockers({
      blockingTasks: [{ id: 't1', title: 'Review', createdAt: new Date() }],
      qaFailures: [],
      validationErrors: [],
      missingApprovals: [],
      draftArtifacts: [],
      expiredRules: [],
    });
    expect(blockers.totalBlockers).toBe(1);

    // QA
    const qa = computeQAPassRate({
      qaRuns: [makeQARun({ status: 'passed' }), makeQARun({ status: 'failed' })],
    });
    expect(qa.overallPassRate).toBe(0.5);

    // All five metric families produce actionable data
    expect(products.length).toBe(2);
    expect(cycle.recentCycleTimes.length).toBeGreaterThan(0);
    expect(backlog.pendingChangeSets.length).toBe(1);
    expect(blockers.entries.length).toBe(1);
    expect(qa.recentRuns.length).toBe(2);
  });
});
