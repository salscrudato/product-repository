/**
 * Collaboration Service
 *
 * Client-side Firestore layer for threads, comments, subscriptions,
 * and notifications.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  writeBatch,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, isAuthReady, isFirestoreTerminated, safeOnSnapshot } from '../firebase';
import { extractMentionedUserIds } from '../utils/mentionParser';
import type {
  Thread,
  Comment,
  Subscription,
  AppNotification,
  TargetRef,
} from '../types/collaboration';

// ════════════════════════════════════════════════════════════════════════
// Path helpers
// ════════════════════════════════════════════════════════════════════════

const threadsCol   = (orgId: string) => collection(db, `orgs/${orgId}/threads`);
const commentsCol  = (orgId: string, threadId: string) =>
  collection(db, `orgs/${orgId}/threads/${threadId}/comments`);
const subsCol      = (orgId: string) => collection(db, `orgs/${orgId}/subscriptions`);
const notifCol     = (orgId: string) => collection(db, `orgs/${orgId}/notifications`);

// ════════════════════════════════════════════════════════════════════════
// THREADS
// ════════════════════════════════════════════════════════════════════════

/**
 * Get or create the canonical thread for a target.
 * There is exactly one thread per (type, artifactId, versionId?, changeSetId?) tuple.
 */
export async function getOrCreateThread(
  orgId: string,
  target: TargetRef,
  title: string,
): Promise<Thread> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Check for existing thread
  const constraints: Parameters<typeof query>[1][] = [
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
  ];
  if (target.versionId) {
    constraints.push(where('target.versionId', '==', target.versionId));
  }
  if (target.changeSetId) {
    constraints.push(where('target.changeSetId', '==', target.changeSetId));
  }

  const q = query(threadsCol(orgId), ...constraints, firestoreLimit(1));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Thread;
  }

  // Create new thread
  const ref = await addDoc(threadsCol(orgId), {
    orgId,
    target,
    title,
    commentCount: 0,
    lastCommentAt: null,
    lastCommentBy: null,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });

  // Also auto-subscribe the creator
  await subscribe(orgId, target, user.uid);

  const created = await getDoc(ref);
  return { id: created.id, ...created.data() } as Thread;
}

/**
 * Subscribe to real-time thread for a target.
 */
export function subscribeToThread(
  orgId: string,
  target: TargetRef,
  callback: (thread: Thread | null) => void,
): Unsubscribe {
  const constraints: Parameters<typeof query>[1][] = [
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
  ];
  if (target.versionId) {
    constraints.push(where('target.versionId', '==', target.versionId));
  }
  if (target.changeSetId) {
    constraints.push(where('target.changeSetId', '==', target.changeSetId));
  }

  const q = query(threadsCol(orgId), ...constraints, firestoreLimit(1));
  return safeOnSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      const d = snap.docs[0];
      callback({ id: d.id, ...d.data() } as Thread);
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════════════════════

/**
 * Add a comment to a thread.
 * Auto-extracts mentions from the body and stores them in mentionedUserIds.
 * Also auto-subscribes the commenter.
 */
export async function addComment(
  orgId: string,
  threadId: string,
  body: string,
  displayName?: string,
): Promise<Comment> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const mentionedUserIds = extractMentionedUserIds(body);

  const ref = await addDoc(commentsCol(orgId, threadId), {
    threadId,
    body,
    mentionedUserIds,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: displayName || user.displayName || user.email || '',
  });

  // Update thread counters
  const threadRef = doc(db, `orgs/${orgId}/threads/${threadId}`);
  await updateDoc(threadRef, {
    commentCount: increment(1),
    lastCommentAt: serverTimestamp(),
    lastCommentBy: user.uid,
  });

  // Auto-subscribe the commenter
  const threadSnap = await getDoc(threadRef);
  if (threadSnap.exists()) {
    const thread = threadSnap.data() as Thread;
    await subscribe(orgId, thread.target, user.uid);
  }

  const created = await getDoc(ref);
  return { id: created.id, ...created.data() } as Comment;
}

/**
 * Subscribe to real-time comments for a thread, ordered by createdAt.
 */
export function subscribeToComments(
  orgId: string,
  threadId: string,
  callback: (comments: Comment[]) => void,
): Unsubscribe {
  const q = query(
    commentsCol(orgId, threadId),
    orderBy('createdAt', 'asc'),
  );
  return safeOnSnapshot(q, (snap) => {
    const comments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
    callback(comments);
  });
}

// ════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS (watchers)
// ════════════════════════════════════════════════════════════════════════

/**
 * Subscribe a user to a target (idempotent).
 */
export async function subscribe(
  orgId: string,
  target: TargetRef,
  userId: string,
): Promise<void> {
  // Check existing
  const q = query(
    subsCol(orgId),
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
    where('userId', '==', userId),
    firestoreLimit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // Already subscribed

  await addDoc(subsCol(orgId), {
    orgId,
    target,
    userId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unsubscribe a user from a target.
 */
export async function unsubscribe(
  orgId: string,
  target: TargetRef,
  userId: string,
): Promise<void> {
  const q = query(
    subsCol(orgId),
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Check if the current user is watching a target.
 */
export async function isWatching(
  orgId: string,
  target: TargetRef,
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const q = query(
    subsCol(orgId),
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
    where('userId', '==', user.uid),
    firestoreLimit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Real-time watcher status for the current user.
 */
export function subscribeToWatchStatus(
  orgId: string,
  target: TargetRef,
  callback: (watching: boolean) => void,
): Unsubscribe {
  const user = auth.currentUser;
  if (!user) { callback(false); return () => {}; }

  const q = query(
    subsCol(orgId),
    where('target.type', '==', target.type),
    where('target.artifactId', '==', target.artifactId),
    where('userId', '==', user.uid),
    firestoreLimit(1),
  );
  return safeOnSnapshot(q, (snap) => callback(!snap.empty));
}

// ════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to the current user's notifications (latest first).
 */
export function subscribeToNotifications(
  orgId: string,
  callback: (notifications: AppNotification[]) => void,
  maxResults = 50,
): Unsubscribe {
  // Prevent subscription before auth is fully propagated
  if (!isAuthReady()) { callback([]); return () => {}; }

  const user = auth.currentUser;
  if (!user) { callback([]); return () => {}; }

  const q = query(
    notifCol(orgId),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc'),
    firestoreLimit(maxResults),
  );
  return safeOnSnapshot(
    q,
    (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      callback(notifs);
    },
    (error) => {
      // Suppress errors during logout / shutting-down state
      if (isFirestoreTerminated()) { callback([]); return; }
      // Handle permission-denied gracefully during auth race condition
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        // Auth token not yet propagated to Firestore; return empty array
        callback([]);
      } else {
        console.error('Error in notifications subscription:', error);
        callback([]);
      }
    }
  );
}

/**
 * Mark a single notification as read.
 */
export async function markRead(orgId: string, notificationId: string): Promise<void> {
  const ref = doc(db, `orgs/${orgId}/notifications/${notificationId}`);
  await updateDoc(ref, { readAt: serverTimestamp() });
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllRead(orgId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    notifCol(orgId),
    where('userId', '==', user.uid),
    where('readAt', '==', null),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { readAt: serverTimestamp() }));
  await batch.commit();
}

/**
 * Get unread count (real-time).
 */
export function subscribeToUnreadCount(
  orgId: string,
  callback: (count: number) => void,
): Unsubscribe {
  // Prevent subscription before auth is fully propagated
  if (!isAuthReady()) { callback(0); return () => {}; }

  const user = auth.currentUser;
  if (!user) { callback(0); return () => {}; }

  const q = query(
    notifCol(orgId),
    where('userId', '==', user.uid),
    where('readAt', '==', null),
  );
  return safeOnSnapshot(
    q,
    (snap) => callback(snap.size),
    (error) => {
      // Suppress errors during logout / shutting-down state
      if (isFirestoreTerminated()) { callback(0); return; }
      // Handle permission-denied gracefully during auth race condition
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        callback(0);
      } else {
        console.error('Error in unread count subscription:', error);
        callback(0);
      }
    }
  );
}
