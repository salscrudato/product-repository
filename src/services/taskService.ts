/**
 * Task Service
 *
 * Client-side Firestore layer for governed workflow tasks.
 * Supports CRUD, filtering by linked artifacts/change sets,
 * activity logging, and blocking-task queries for publish gating.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, safeOnSnapshot } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskPhase,
  TaskLink,
  TaskActivity,
  TaskActivityType,
  TaskFilters,
} from '../types/task';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const tasksCol    = (orgId: string) => collection(db, `orgs/${orgId}/tasks`);
const taskDoc     = (orgId: string, taskId: string) => doc(db, `orgs/${orgId}/tasks/${taskId}`);
const activityCol = (orgId: string, taskId: string) =>
  collection(db, `orgs/${orgId}/tasks/${taskId}/activity`);

// ════════════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════════════

export async function createTask(
  orgId: string,
  data: Pick<Task, 'title' | 'description' | 'priority' | 'phase' | 'dueDate' | 'assigneeUserId' | 'assigneeName' | 'links' | 'blocking' | 'source'>,
): Promise<Task> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = await addDoc(tasksCol(orgId), {
    orgId,
    title: data.title,
    description: data.description || '',
    status: 'open' as TaskStatus,
    priority: data.priority || 'medium',
    phase: data.phase || 'general',
    dueDate: data.dueDate || null,
    assigneeUserId: data.assigneeUserId || null,
    assigneeName: data.assigneeName || null,
    links: data.links || [],
    blocking: data.blocking ?? false,
    source: data.source || 'manual',
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  // Activity entry
  await logActivity(orgId, ref.id, 'created', `Task created: ${data.title}`);

  logger.info(LOG_CATEGORIES.DATA, 'Task created', { taskId: ref.id, orgId });

  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as Task;
}

export async function getTask(orgId: string, taskId: string): Promise<Task | null> {
  const snap = await getDoc(taskDoc(orgId, taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Task;
}

export async function updateTask(
  orgId: string,
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'phase' | 'dueDate' | 'assigneeUserId' | 'assigneeName' | 'links' | 'blocking'>>,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await updateDoc(taskDoc(orgId, taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });
}

// ════════════════════════════════════════════════════════════════════════
// Status transitions
// ════════════════════════════════════════════════════════════════════════

export async function transitionTaskStatus(
  orgId: string,
  taskId: string,
  newStatus: TaskStatus,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const task = await getTask(orgId, taskId);
  if (!task) throw new Error('Task not found');

  await updateDoc(taskDoc(orgId, taskId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  await logActivity(orgId, taskId, 'status_changed', `Status → ${newStatus}`, task.status, newStatus);
}

// ════════════════════════════════════════════════════════════════════════
// Assignment
// ════════════════════════════════════════════════════════════════════════

export async function assignTask(
  orgId: string,
  taskId: string,
  assigneeUserId: string,
  assigneeName: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await updateDoc(taskDoc(orgId, taskId), {
    assigneeUserId,
    assigneeName,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  await logActivity(orgId, taskId, 'assigned', `Assigned to ${assigneeName}`);
}

export async function unassignTask(orgId: string, taskId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await updateDoc(taskDoc(orgId, taskId), {
    assigneeUserId: null,
    assigneeName: null,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  await logActivity(orgId, taskId, 'unassigned', 'Task unassigned');
}

// ════════════════════════════════════════════════════════════════════════
// Queries
// ════════════════════════════════════════════════════════════════════════

/**
 * List tasks with optional filters.
 * Firestore limits: one array-contains + one inequality per query,
 * so we apply remaining filters client-side.
 */
export async function listTasks(orgId: string, filters?: TaskFilters): Promise<Task[]> {
  let q = query(tasksCol(orgId), orderBy('createdAt', 'desc'));

  // Primary Firestore filter: status
  if (filters?.status && filters.status.length > 0 && filters.status.length <= 10) {
    q = query(q, where('status', 'in', filters.status));
  }

  const snap = await getDocs(q);
  let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));

  // Client-side filters
  if (filters?.priority?.length) {
    tasks = tasks.filter(t => filters.priority!.includes(t.priority));
  }
  if (filters?.phase?.length) {
    tasks = tasks.filter(t => filters.phase!.includes(t.phase));
  }
  if (filters?.assigneeUserId) {
    tasks = tasks.filter(t => t.assigneeUserId === filters.assigneeUserId);
  }
  if (filters?.blocking !== undefined) {
    tasks = tasks.filter(t => t.blocking === filters.blocking);
  }
  if (filters?.changeSetId) {
    tasks = tasks.filter(t =>
      t.links.some(l => l.changeSetId === filters.changeSetId)
    );
  }
  if (filters?.artifactId) {
    tasks = tasks.filter(t =>
      t.links.some(l => l.artifactId === filters.artifactId)
    );
  }
  if (filters?.artifactType) {
    tasks = tasks.filter(t =>
      t.links.some(l => l.type === filters.artifactType)
    );
  }
  if (filters?.stateCode) {
    tasks = tasks.filter(t =>
      t.links.some(l => l.stateCode === filters.stateCode)
    );
  }

  return tasks;
}

/**
 * Real-time subscription to tasks for a change set.
 */
export function subscribeToChangeSetTasks(
  orgId: string,
  changeSetId: string,
  callback: (tasks: Task[]) => void,
): Unsubscribe {
  // Firestore doesn't support array-of-objects queries directly,
  // so we fetch all org tasks and filter client-side.
  // For production scale, denormalise changeSetId to a top-level field.
  const q = query(tasksCol(orgId), orderBy('createdAt', 'desc'));
  return safeOnSnapshot(q, (snap) => {
    const tasks = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Task))
      .filter(t => t.links.some(l => l.changeSetId === changeSetId));
    callback(tasks);
  });
}

/**
 * Get incomplete blocking tasks linked to a change set.
 * This is the publish-gating query.
 */
export async function getBlockingTasksForChangeSet(
  orgId: string,
  changeSetId: string,
): Promise<Task[]> {
  const all = await listTasks(orgId, {
    status: ['open', 'in_progress'],
    changeSetId,
    blocking: true,
  });
  return all;
}

// ════════════════════════════════════════════════════════════════════════
// Activity log
// ════════════════════════════════════════════════════════════════════════

async function logActivity(
  orgId: string,
  taskId: string,
  type: TaskActivityType,
  summary: string,
  before?: string | null,
  after?: string | null,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(activityCol(orgId, taskId), {
    taskId,
    type,
    actorUserId: user.uid,
    actorName: user.displayName || user.email || '',
    summary,
    before: before ?? null,
    after: after ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function getTaskActivity(
  orgId: string,
  taskId: string,
  maxResults = 50,
): Promise<TaskActivity[]> {
  const q = query(
    activityCol(orgId, taskId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskActivity));
}

export function subscribeToTaskActivity(
  orgId: string,
  taskId: string,
  callback: (activity: TaskActivity[]) => void,
): Unsubscribe {
  const q = query(activityCol(orgId, taskId), orderBy('createdAt', 'desc'));
  return safeOnSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskActivity)));
  });
}
