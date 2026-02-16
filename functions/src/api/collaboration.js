/**
 * Collaboration – Cloud Function Triggers
 *
 * 1. On comment create: notify mentioned users + thread watchers
 * 2. On ChangeSet status change: notify watchers of key transitions
 *
 * Notifications are written to orgs/{orgId}/notifications/{notifId}
 */

const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

const db = admin.firestore();
const REGION = 'us-central1';
const opts = { region: REGION, memory: '256MiB' };

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

/** Extract @[userId] mentions from comment body */
const MENTION_RE = /@\[([a-zA-Z0-9_-]+)\]/g;
function extractMentions(body) {
  if (!body) return [];
  const ids = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) ids.add(m[1]);
  return [...ids];
}

/** Get member display name */
async function getMemberName(orgId, userId) {
  try {
    const doc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
    if (doc.exists) return doc.data().displayName || doc.data().email || userId;
  } catch {}
  return userId;
}

/** Get all subscriber user IDs for a target */
async function getWatcherUserIds(orgId, target) {
  const q = db.collection(`orgs/${orgId}/subscriptions`)
    .where('target.type', '==', target.type)
    .where('target.artifactId', '==', target.artifactId);
  const snap = await q.get();
  return snap.docs.map(d => d.data().userId);
}

/** Build a deep-link route from a target */
function routeForTarget(target) {
  switch (target.type) {
    case 'product':      return `/products/${target.artifactId}/overview`;
    case 'coverage':     return `/products/${target.artifactId}/coverages`;
    case 'form':         return target.versionId
                           ? `/forms/${target.artifactId}/versions/${target.versionId}`
                           : `/forms/${target.artifactId}`;
    case 'rule':         return `/rules/${target.artifactId}`;
    case 'rateProgram':  return `/pricing/${target.artifactId}`;
    case 'table':        return `/tables/${target.artifactId}`;
    case 'changeset':    return `/changesets/${target.changeSetId || target.artifactId}`;
    case 'stateProgram': return `/products/${target.artifactId}/states`;
    default:             return '/';
  }
}

/** Write notifications (batch) */
async function createNotifications(orgId, userIds, data) {
  if (!userIds.length) return;

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const userId of userIds) {
    const ref = db.collection(`orgs/${orgId}/notifications`).doc();
    batch.set(ref, {
      orgId,
      userId,
      ...data,
      readAt: null,
      createdAt: now,
    });
  }
  await batch.commit();
}

// ════════════════════════════════════════════════════════════════════════
// 1. On comment created → notify mentions + watchers
// ════════════════════════════════════════════════════════════════════════

const onCommentCreated = onDocumentCreated(
  { ...opts, document: 'orgs/{orgId}/threads/{threadId}/comments/{commentId}' },
  async (event) => {
    const { orgId, threadId } = event.params;
    const comment = event.data?.data();
    if (!comment) return;

    // Get parent thread for target info
    const threadDoc = await db.doc(`orgs/${orgId}/threads/${threadId}`).get();
    if (!threadDoc.exists) return;
    const thread = threadDoc.data();
    const target = thread.target;
    const route = routeForTarget(target);

    const actorName = comment.createdByName || await getMemberName(orgId, comment.createdBy);
    const actorUserId = comment.createdBy;

    // A. Mention notifications
    const mentionedIds = extractMentions(comment.body);
    // Don't notify the author about their own mention
    const mentionRecipients = mentionedIds.filter(id => id !== actorUserId);

    if (mentionRecipients.length > 0) {
      await createNotifications(orgId, mentionRecipients, {
        type: 'mention',
        target,
        title: `${actorName} mentioned you`,
        body: comment.body.slice(0, 200),
        route,
        actorUserId,
        actorDisplayName: actorName,
      });
    }

    // B. Watcher notifications (excluding author and already-mentioned users)
    const watcherIds = await getWatcherUserIds(orgId, target);
    const alreadyNotified = new Set([actorUserId, ...mentionRecipients]);
    const watcherRecipients = watcherIds.filter(id => !alreadyNotified.has(id));

    if (watcherRecipients.length > 0) {
      await createNotifications(orgId, watcherRecipients, {
        type: 'comment',
        target,
        title: `${actorName} commented on ${thread.title || target.type}`,
        body: comment.body.slice(0, 200),
        route,
        actorUserId,
        actorDisplayName: actorName,
      });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════
// 2. On ChangeSet status change → notify watchers on key transitions
// ════════════════════════════════════════════════════════════════════════

/** Statuses that trigger watcher notifications */
const NOTIFY_STATUSES = new Set([
  'ready_for_review',
  'approved',
  'rejected',
  'published',
]);

const STATUS_LABELS = {
  ready_for_review: 'submitted for review',
  approved: 'approved',
  rejected: 'rejected',
  published: 'published',
};

const STATUS_NOTIFICATION_TYPE = {
  ready_for_review: 'approval_requested',
  approved: 'approved',
  rejected: 'rejected',
  published: 'published',
};

const onChangeSetStatusChange = onDocumentUpdated(
  { ...opts, document: 'orgs/{orgId}/changeSets/{changeSetId}' },
  async (event) => {
    const { orgId, changeSetId } = event.params;
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!before || !after) return;

    // Only fire on actual status changes
    if (before.status === after.status) return;
    if (!NOTIFY_STATUSES.has(after.status)) return;

    const actorUserId = after.updatedBy || '';
    const actorName = await getMemberName(orgId, actorUserId);
    const csName = after.name || `Change Set ${changeSetId.slice(0, 8)}`;

    const target = {
      type: 'changeset',
      artifactId: changeSetId,
      changeSetId,
    };
    const route = `/changesets/${changeSetId}`;

    // Get watchers
    const watcherIds = await getWatcherUserIds(orgId, target);
    // Don't notify the person who triggered the transition
    const recipients = watcherIds.filter(id => id !== actorUserId);

    // Also notify the changeset owner if they're not the actor
    if (after.ownerUserId && after.ownerUserId !== actorUserId) {
      if (!recipients.includes(after.ownerUserId)) {
        recipients.push(after.ownerUserId);
      }
    }

    if (recipients.length === 0) return;

    const notifType = STATUS_NOTIFICATION_TYPE[after.status] || 'status_change';
    const statusLabel = STATUS_LABELS[after.status] || after.status;

    await createNotifications(orgId, recipients, {
      type: notifType,
      target,
      title: `${csName} was ${statusLabel}`,
      body: `${actorName} ${statusLabel} "${csName}"`,
      route,
      actorUserId,
      actorDisplayName: actorName,
    });
  }
);

// ════════════════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  onCommentCreated,
  onChangeSetStatusChange,
};
