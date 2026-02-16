/**
 * Collaboration Types
 *
 * Threads, comments, subscriptions (watchers), and notifications.
 *
 * Firestore paths:
 *   orgs/{orgId}/threads/{threadId}
 *   orgs/{orgId}/threads/{threadId}/comments/{commentId}
 *   orgs/{orgId}/subscriptions/{subscriptionId}
 *   orgs/{orgId}/notifications/{notificationId}
 */

import { Timestamp } from 'firebase/firestore';
import type { SearchableArtifactType } from './search';

// ════════════════════════════════════════════════════════════════════════
// Target reference (shared across threads, subscriptions, notifications)
// ════════════════════════════════════════════════════════════════════════

/** What artifact a thread / subscription / notification points at */
export interface TargetRef {
  type: SearchableArtifactType;
  artifactId: string;
  versionId?: string | null;
  changeSetId?: string | null;
}

// ════════════════════════════════════════════════════════════════════════
// Thread
// ════════════════════════════════════════════════════════════════════════

export interface Thread {
  id: string;
  orgId: string;
  target: TargetRef;
  /** Denormalised title for list views (e.g. "CP 00 10 — Discussion") */
  title: string;
  /** Number of comments in this thread */
  commentCount: number;
  /** Timestamp of the most recent comment (for sort) */
  lastCommentAt: Timestamp | null;
  /** User ID of the most recent commenter */
  lastCommentBy: string | null;
  createdAt: Timestamp;
  createdBy: string;
}

// ════════════════════════════════════════════════════════════════════════
// Comment
// ════════════════════════════════════════════════════════════════════════

export interface Comment {
  id: string;
  threadId: string;
  /** Markdown-ish body; mentions are stored as @[userId] inline */
  body: string;
  /** Resolved user IDs of everyone @-mentioned */
  mentionedUserIds: string[];
  /** Is this comment edited? */
  editedAt?: Timestamp | null;
  createdAt: Timestamp;
  createdBy: string;
  /** Display name snapshot (denormalised for offline perf) */
  createdByName?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Subscription (watcher)
// ════════════════════════════════════════════════════════════════════════

export interface Subscription {
  id: string;
  orgId: string;
  target: TargetRef;
  userId: string;
  createdAt: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// Notification
// ════════════════════════════════════════════════════════════════════════

export type NotificationType =
  | 'mention'
  | 'comment'
  | 'status_change'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'published';

export interface AppNotification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  target: TargetRef;
  /** Human-readable headline */
  title: string;
  /** Body / detail text */
  body: string;
  /** Deep-link route */
  route: string;
  /** Who triggered this notification */
  actorUserId: string;
  actorDisplayName?: string;
  /** Read state */
  readAt: Timestamp | null;
  createdAt: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// Constants / labels
// ════════════════════════════════════════════════════════════════════════

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  mention: 'Mentioned you',
  comment: 'New comment',
  status_change: 'Status changed',
  approval_requested: 'Approval requested',
  approved: 'Approved',
  rejected: 'Rejected',
  published: 'Published',
};
