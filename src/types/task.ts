/**
 * Task Types (Governed Workflow Engine)
 *
 * Tasks are first-class workflow items tied to Change Sets and filings,
 * with publish gating via the `blocking` flag.
 *
 * Firestore path:
 *   orgs/{orgId}/tasks/{taskId}
 *   orgs/{orgId}/tasks/{taskId}/activity/{activityId}
 */

import { Timestamp } from 'firebase/firestore';
import type { SearchableArtifactType } from './search';

// ════════════════════════════════════════════════════════════════════════
// Status
// ════════════════════════════════════════════════════════════════════════

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['in_progress', 'done', 'cancelled'],
  in_progress: ['open', 'done', 'cancelled'],
  done: ['open'],       // re-open if needed
  cancelled: ['open'],  // re-open if needed
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#6B7280' },
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  done: { label: 'Done', color: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF' },
};

// ════════════════════════════════════════════════════════════════════════
// Priority
// ════════════════════════════════════════════════════════════════════════

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; order: number }> = {
  critical: { label: 'Critical', color: '#EF4444', order: 0 },
  high:     { label: 'High',     color: '#F59E0B', order: 1 },
  medium:   { label: 'Medium',   color: '#3B82F6', order: 2 },
  low:      { label: 'Low',      color: '#6B7280', order: 3 },
};

// ════════════════════════════════════════════════════════════════════════
// Phase
// ════════════════════════════════════════════════════════════════════════

export type TaskPhase =
  | 'review'
  | 'filing'
  | 'approval'
  | 'implementation'
  | 'testing'
  | 'general';

export const TASK_PHASE_CONFIG: Record<TaskPhase, { label: string }> = {
  review:         { label: 'Review' },
  filing:         { label: 'Filing' },
  approval:       { label: 'Approval' },
  implementation: { label: 'Implementation' },
  testing:        { label: 'Testing' },
  general:        { label: 'General' },
};

// ════════════════════════════════════════════════════════════════════════
// Link
// ════════════════════════════════════════════════════════════════════════

/** A relationship between a task and an artifact / change set / state */
export interface TaskLink {
  type: SearchableArtifactType;
  artifactId: string;
  versionId?: string | null;
  changeSetId?: string | null;
  stateCode?: string | null;
  /** Denormalised label for display */
  label?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Task document
// ════════════════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  phase: TaskPhase;
  dueDate?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  /** Artifact / change-set / state links */
  links: TaskLink[];
  /**
   * If true, this task blocks publishing of linked change sets.
   * The publish preflight will reject if any blocking task is not done.
   */
  blocking: boolean;
  /** Source of creation: 'manual' | 'auto_review' | 'auto_filing' */
  source: 'manual' | 'auto_review' | 'auto_filing';
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Task Activity (audit trail)
// ════════════════════════════════════════════════════════════════════════

export type TaskActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'comment'
  | 'linked'
  | 'unlinked';

export interface TaskActivity {
  id: string;
  taskId: string;
  type: TaskActivityType;
  actorUserId: string;
  actorName?: string;
  /** Human-readable description */
  summary: string;
  /** Optional before/after for changes */
  before?: string | null;
  after?: string | null;
  createdAt: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// Filter types (for UI)
// ════════════════════════════════════════════════════════════════════════

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  phase?: TaskPhase[];
  assigneeUserId?: string;
  changeSetId?: string;
  artifactId?: string;
  artifactType?: SearchableArtifactType;
  stateCode?: string;
  blocking?: boolean;
}
