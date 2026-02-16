/**
 * Task Automation – unit tests
 *
 * Tests for:
 *  1. Publish gating logic (blocking tasks block publish)
 *  2. Task link filtering
 *  3. Status transitions
 *  4. Acceptance criteria verification
 */

import { describe, it, expect } from 'vitest';

// ════════════════════════════════════════════════════════════════════════
// Since the Cloud Functions run in a Node/admin SDK context,
// we test the pure logic extracted into deterministic functions.
// ════════════════════════════════════════════════════════════════════════

interface TaskLink {
  type: string;
  artifactId: string;
  changeSetId?: string | null;
  stateCode?: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  blocking: boolean;
  links: TaskLink[];
}

// ── Extracted logic: matches Cloud Function + client service ──

function getBlockingTasksForChangeSet(tasks: Task[], changeSetId: string): Task[] {
  return tasks.filter(
    t =>
      t.blocking &&
      (t.status === 'open' || t.status === 'in_progress') &&
      t.links.some(l => l.changeSetId === changeSetId),
  );
}

function canPublish(issues: { type: string }[]): boolean {
  return issues.filter(i => i.type === 'error').length === 0;
}

function computePreflightIssues(blockingTasks: Task[]): { type: string; message: string }[] {
  const issues: { type: string; message: string }[] = [];
  if (blockingTasks.length > 0) {
    const taskNames = blockingTasks.map(t => t.title).join(', ');
    issues.push({
      type: 'error',
      message: `${blockingTasks.length} blocking task(s) not complete: ${taskNames}`,
    });
  }
  return issues;
}

const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'done', 'cancelled'],
  in_progress: ['open', 'done', 'cancelled'],
  done: ['open'],
  cancelled: ['open'],
};

function canTransition(current: string, target: string): boolean {
  return TASK_STATUS_TRANSITIONS[current]?.includes(target) ?? false;
}

// Determines required review roles from CS items
const APPROVAL_RULES: Record<string, string[]> = {
  product: ['product_manager'],
  coverage: ['product_manager'],
  form: ['compliance'],
  rule: ['underwriter', 'compliance'],
  rateProgram: ['actuary'],
  table: ['actuary'],
  dataDictionary: ['product_manager'],
  stateProgram: ['compliance'],
};

function getRequiredReviewRoles(items: { artifactType: string }[]): string[] {
  const roles = new Set<string>();
  items.forEach(i => {
    (APPROVAL_RULES[i.artifactType] || []).forEach(r => roles.add(r));
  });
  return Array.from(roles);
}

// ════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════

describe('Publish Gating – Blocking Tasks', () => {
  const CS_ID = 'cs-001';

  const sampleTasks: Task[] = [
    { id: 't1', title: 'Review: Rates (Actuary)', status: 'open', blocking: true, links: [{ type: 'changeset', artifactId: CS_ID, changeSetId: CS_ID }] },
    { id: 't2', title: 'Review: Forms (Compliance)', status: 'done', blocking: true, links: [{ type: 'changeset', artifactId: CS_ID, changeSetId: CS_ID }] },
    { id: 't3', title: 'Unrelated task', status: 'open', blocking: true, links: [{ type: 'changeset', artifactId: 'cs-other', changeSetId: 'cs-other' }] },
    { id: 't4', title: 'Non-blocking', status: 'open', blocking: false, links: [{ type: 'changeset', artifactId: CS_ID, changeSetId: CS_ID }] },
  ];

  it('finds only open/in_progress blocking tasks for the target CS', () => {
    const blockers = getBlockingTasksForChangeSet(sampleTasks, CS_ID);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].id).toBe('t1');
  });

  it('returns empty when all blocking tasks are done', () => {
    const allDone = sampleTasks.map(t => ({ ...t, status: t.id === 't1' ? 'done' : t.status }));
    const blockers = getBlockingTasksForChangeSet(allDone, CS_ID);
    expect(blockers).toHaveLength(0);
  });

  it('blocks publish when there are incomplete blocking tasks', () => {
    const blockers = getBlockingTasksForChangeSet(sampleTasks, CS_ID);
    const issues = computePreflightIssues(blockers);
    expect(canPublish(issues)).toBe(false);
    expect(issues[0].type).toBe('error');
    expect(issues[0].message).toContain('blocking task(s) not complete');
    expect(issues[0].message).toContain('Review: Rates (Actuary)');
  });

  it('allows publish when no blocking tasks remain', () => {
    const issues = computePreflightIssues([]);
    expect(canPublish(issues)).toBe(true);
  });

  it('handles in_progress blocking tasks correctly', () => {
    const inProgress = sampleTasks.map(t =>
      t.id === 't1' ? { ...t, status: 'in_progress' } : t,
    );
    const blockers = getBlockingTasksForChangeSet(inProgress, CS_ID);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].status).toBe('in_progress');
  });

  it('excludes cancelled blocking tasks', () => {
    const cancelled = sampleTasks.map(t =>
      t.id === 't1' ? { ...t, status: 'cancelled' } : t,
    );
    const blockers = getBlockingTasksForChangeSet(cancelled, CS_ID);
    expect(blockers).toHaveLength(0);
  });
});

describe('Status Transitions', () => {
  it('allows open → in_progress', () => {
    expect(canTransition('open', 'in_progress')).toBe(true);
  });

  it('allows open → done', () => {
    expect(canTransition('open', 'done')).toBe(true);
  });

  it('allows done → open (re-open)', () => {
    expect(canTransition('done', 'open')).toBe(true);
  });

  it('rejects done → in_progress', () => {
    expect(canTransition('done', 'in_progress')).toBe(false);
  });

  it('rejects done → cancelled', () => {
    expect(canTransition('done', 'cancelled')).toBe(false);
  });

  it('allows cancelled → open', () => {
    expect(canTransition('cancelled', 'open')).toBe(true);
  });
});

describe('Review Task Auto-Creation – Role Determination', () => {
  it('computes required roles from a set of items', () => {
    const items = [
      { artifactType: 'rateProgram' },
      { artifactType: 'form' },
      { artifactType: 'rule' },
    ];
    const roles = getRequiredReviewRoles(items);
    expect(roles).toContain('actuary');
    expect(roles).toContain('compliance');
    expect(roles).toContain('underwriter');
    expect(roles).toHaveLength(3);
  });

  it('deduplicates roles across multiple items of same type', () => {
    const items = [
      { artifactType: 'form' },
      { artifactType: 'form' },
      { artifactType: 'form' },
    ];
    const roles = getRequiredReviewRoles(items);
    expect(roles).toEqual(['compliance']);
  });

  it('returns empty for unknown artifact types', () => {
    const items = [{ artifactType: 'unknown_type' }];
    const roles = getRequiredReviewRoles(items);
    expect(roles).toEqual([]);
  });

  it('produces product_manager for product + coverage items', () => {
    const items = [
      { artifactType: 'product' },
      { artifactType: 'coverage' },
    ];
    const roles = getRequiredReviewRoles(items);
    expect(roles).toEqual(['product_manager']);
  });
});

describe('Task Link Filtering', () => {
  it('filters tasks by changeSetId', () => {
    const tasks: Task[] = [
      { id: 'a', title: 'A', status: 'open', blocking: false, links: [{ type: 'changeset', artifactId: 'cs-1', changeSetId: 'cs-1' }] },
      { id: 'b', title: 'B', status: 'open', blocking: false, links: [{ type: 'changeset', artifactId: 'cs-2', changeSetId: 'cs-2' }] },
      { id: 'c', title: 'C', status: 'open', blocking: false, links: [{ type: 'product', artifactId: 'p-1' }] },
    ];
    const linked = tasks.filter(t => t.links.some(l => l.changeSetId === 'cs-1'));
    expect(linked).toHaveLength(1);
    expect(linked[0].id).toBe('a');
  });

  it('filters tasks by stateCode', () => {
    const tasks: Task[] = [
      { id: 'a', title: 'A', status: 'open', blocking: false, links: [{ type: 'stateProgram', artifactId: 'p-1', stateCode: 'CA' }] },
      { id: 'b', title: 'B', status: 'open', blocking: false, links: [{ type: 'stateProgram', artifactId: 'p-1', stateCode: 'TX' }] },
    ];
    const ca = tasks.filter(t => t.links.some(l => l.stateCode === 'CA'));
    expect(ca).toHaveLength(1);
    expect(ca[0].id).toBe('a');
  });

  it('handles tasks with multiple links', () => {
    const tasks: Task[] = [
      { id: 'a', title: 'A', status: 'open', blocking: true, links: [
        { type: 'changeset', artifactId: 'cs-1', changeSetId: 'cs-1' },
        { type: 'product', artifactId: 'p-1' },
        { type: 'stateProgram', artifactId: 'p-1', stateCode: 'NY' },
      ]},
    ];
    expect(tasks[0].links.some(l => l.changeSetId === 'cs-1')).toBe(true);
    expect(tasks[0].links.some(l => l.stateCode === 'NY')).toBe(true);
    expect(tasks[0].links.some(l => l.type === 'product')).toBe(true);
  });
});

describe('Acceptance Criteria: Publish blocked by incomplete tasks', () => {
  it('ACCEPTANCE: publish is blocked with explicit blockers until tasks complete', () => {
    const CS_ID = 'cs-release-q1';
    const tasks: Task[] = [
      { id: 'review-1', title: 'Review rates (Actuary)', status: 'open', blocking: true,
        links: [{ type: 'changeset', artifactId: CS_ID, changeSetId: CS_ID }] },
      { id: 'review-2', title: 'Review forms (Compliance)', status: 'in_progress', blocking: true,
        links: [{ type: 'changeset', artifactId: CS_ID, changeSetId: CS_ID }] },
    ];

    // Before: 2 blockers prevent publish
    let blockers = getBlockingTasksForChangeSet(tasks, CS_ID);
    let issues = computePreflightIssues(blockers);
    expect(canPublish(issues)).toBe(false);
    expect(issues[0].message).toContain('2 blocking task(s)');

    // Complete one task
    tasks[0].status = 'done';
    blockers = getBlockingTasksForChangeSet(tasks, CS_ID);
    issues = computePreflightIssues(blockers);
    expect(canPublish(issues)).toBe(false);
    expect(issues[0].message).toContain('1 blocking task(s)');

    // Complete the second task
    tasks[1].status = 'done';
    blockers = getBlockingTasksForChangeSet(tasks, CS_ID);
    issues = computePreflightIssues(blockers);
    expect(canPublish(issues)).toBe(true);
    expect(issues).toHaveLength(0);
  });
});
