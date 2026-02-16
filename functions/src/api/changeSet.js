/**
 * ChangeSet API
 * Cloud Functions for managing change sets with governed approval/publish workflow
 */

const { onCall } = require('firebase-functions/v2/https');
const { https } = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');

const db = admin.firestore();

// Valid statuses
const VALID_STATUSES = ['draft', 'ready_for_review', 'approved', 'filed', 'published', 'rejected'];
const ALLOWED_TRANSITIONS = {
  draft: ['ready_for_review'],
  ready_for_review: ['draft', 'approved', 'rejected'],
  approved: ['ready_for_review', 'filed', 'published'],
  filed: ['published'],
  published: [],
  rejected: ['draft'],
};

// Approval rules by artifact type
const APPROVAL_RULES = {
  product: ['product_manager'],
  coverage: ['product_manager'],
  form: ['compliance'],
  rule: ['underwriter', 'compliance'],
  rateProgram: ['actuary'],
  table: ['actuary'],
  dataDictionary: ['product_manager'],
  stateProgram: ['compliance'],
};

// ============================================================================
// Helpers
// ============================================================================

async function getMemberRole(orgId, userId) {
  const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
  if (!memberDoc.exists || memberDoc.data().status !== 'active') return null;
  return memberDoc.data().role;
}

async function canWriteInOrg(orgId, userId) {
  const role = await getMemberRole(orgId, userId);
  return ['admin', 'product_manager', 'actuary', 'underwriter', 'compliance'].includes(role);
}

async function hasApprovalRole(orgId, userId, requiredRole) {
  const role = await getMemberRole(orgId, userId);
  if (role === 'admin') return true; // Admin can approve anything
  return role === requiredRole;
}

async function logAuditEvent(orgId, eventData) {
  const auditRef = db.collection('orgs').doc(orgId).collection('auditLog').doc();
  await auditRef.set({
    ...eventData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return auditRef.id;
}

/**
 * Build the Firestore version document path for a change set item
 */
function buildVersionPath(orgId, item) {
  switch (item.artifactType) {
    case 'product':
      return `orgs/${orgId}/products/${item.artifactId}/versions/${item.versionId}`;
    case 'coverage': {
      const [productId, coverageId] = item.artifactId.split(':');
      return `orgs/${orgId}/products/${productId}/coverages/${coverageId}/versions/${item.versionId}`;
    }
    case 'form':
      return `orgs/${orgId}/forms/${item.artifactId}/versions/${item.versionId}`;
    case 'rule':
      return `orgs/${orgId}/rules/${item.artifactId}/versions/${item.versionId}`;
    case 'rateProgram':
      return `orgs/${orgId}/ratePrograms/${item.artifactId}/versions/${item.versionId}`;
    case 'table':
      return `orgs/${orgId}/tables/${item.artifactId}/versions/${item.versionId}`;
    case 'dataDictionary': {
      const [prodId, fieldId] = item.artifactId.split(':');
      return `orgs/${orgId}/products/${prodId}/dataDictionary/${fieldId}/versions/${item.versionId}`;
    }
    default:
      return null;
  }
}

// ============================================================================
// ChangeSet Functions
// ============================================================================

/**
 * Submit a ChangeSet for review
 */
exports.submitChangeSetForReview = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId } = request.data;

  if (!orgId || !changeSetId) {
    throw new https.HttpsError('invalid-argument', 'orgId and changeSetId are required');
  }

  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission');
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  if (changeSet.status !== 'draft') {
    throw new https.HttpsError('failed-precondition', `Cannot submit from status: ${changeSet.status}`);
  }

  // Get items and determine required approvals
  const itemsSnap = await changeSetRef.collection('items').get();
  if (itemsSnap.empty) {
    throw new https.HttpsError('failed-precondition', 'ChangeSet has no items');
  }

  const requiredRoles = new Set();
  itemsSnap.docs.forEach(doc => {
    const item = doc.data();
    const rules = APPROVAL_RULES[item.artifactType] || [];
    rules.forEach(role => requiredRoles.add(role));
  });

  // Create pending approval records
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  for (const role of requiredRoles) {
    const approvalRef = changeSetRef.collection('approvals').doc();
    batch.set(approvalRef, {
      roleRequired: role,
      status: 'pending',
      createdAt: now,
    });
  }

  batch.update(changeSetRef, {
    status: 'ready_for_review',
    pendingApprovalCount: requiredRoles.size,
    updatedAt: now,
    updatedBy: auth.uid,
  });

  await batch.commit();

  // Audit log
  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'SUBMIT_FOR_REVIEW',
    entityType: 'changeSet',
    entityId: changeSetId,
    changeSetId,
    metadata: { requiredRoles: Array.from(requiredRoles) },
  });

  return { success: true, requiredRoles: Array.from(requiredRoles) };
});

/**
 * Return a ChangeSet to draft status
 */
exports.returnChangeSetToDraft = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId, reason } = request.data;

  if (!orgId || !changeSetId) {
    throw new https.HttpsError('invalid-argument', 'orgId and changeSetId are required');
  }

  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission');
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  if (!['ready_for_review', 'rejected'].includes(changeSet.status)) {
    throw new https.HttpsError('failed-precondition', `Cannot return to draft from: ${changeSet.status}`);
  }

  // Delete existing approval records
  const approvalsSnap = await changeSetRef.collection('approvals').get();
  const batch = db.batch();
  approvalsSnap.docs.forEach(doc => batch.delete(doc.ref));

  batch.update(changeSetRef, {
    status: 'draft',
    pendingApprovalCount: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: auth.uid,
  });

  await batch.commit();

  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'RETURN_TO_DRAFT',
    entityType: 'changeSet',
    entityId: changeSetId,
    changeSetId,
    metadata: { reason },
  });

  return { success: true };
});

/**
 * Approve a ChangeSet (as a specific role)
 */
exports.approveChangeSet = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId, role, notes } = request.data;

  if (!orgId || !changeSetId || !role) {
    throw new https.HttpsError('invalid-argument', 'orgId, changeSetId, and role are required');
  }

  if (!(await hasApprovalRole(orgId, auth.uid, role))) {
    throw new https.HttpsError('permission-denied', `You do not have the ${role} role`);
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  if (changeSet.status !== 'ready_for_review') {
    throw new https.HttpsError('failed-precondition', 'ChangeSet is not ready for review');
  }

  // Find the pending approval for this role
  const approvalsSnap = await changeSetRef.collection('approvals')
    .where('roleRequired', '==', role)
    .where('status', '==', 'pending')
    .get();

  if (approvalsSnap.empty) {
    throw new https.HttpsError('not-found', `No pending ${role} approval found`);
  }

  const approvalRef = approvalsSnap.docs[0].ref;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await approvalRef.update({
    status: 'approved',
    approverUserId: auth.uid,
    decidedAt: now,
    notes: notes || null,
  });

  // Check if all approvals are complete
  const allApprovalsSnap = await changeSetRef.collection('approvals').get();
  const allApproved = allApprovalsSnap.docs.every(doc => doc.data().status === 'approved');
  const pendingCount = allApprovalsSnap.docs.filter(doc => doc.data().status === 'pending').length;

  const updateData = {
    pendingApprovalCount: pendingCount,
    updatedAt: now,
    updatedBy: auth.uid,
  };

  if (allApproved) {
    updateData.status = 'approved';
  }

  await changeSetRef.update(updateData);

  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'APPROVE',
    entityType: 'changeSet',
    entityId: changeSetId,
    changeSetId,
    metadata: { role, notes, allApproved },
  });

  return { success: true, allApproved, pendingCount };
});

/**
 * Reject a ChangeSet
 */
exports.rejectChangeSet = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId, role, notes } = request.data;

  if (!orgId || !changeSetId || !role || !notes) {
    throw new https.HttpsError('invalid-argument', 'orgId, changeSetId, role, and notes are required');
  }

  if (!(await hasApprovalRole(orgId, auth.uid, role))) {
    throw new https.HttpsError('permission-denied', `You do not have the ${role} role`);
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  if (changeSet.status !== 'ready_for_review') {
    throw new https.HttpsError('failed-precondition', 'ChangeSet is not ready for review');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Find and update the approval record
  const approvalsSnap = await changeSetRef.collection('approvals')
    .where('roleRequired', '==', role)
    .where('status', '==', 'pending')
    .get();

  if (!approvalsSnap.empty) {
    await approvalsSnap.docs[0].ref.update({
      status: 'rejected',
      approverUserId: auth.uid,
      decidedAt: now,
      notes,
    });
  }

  await changeSetRef.update({
    status: 'rejected',
    updatedAt: now,
    updatedBy: auth.uid,
  });

  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'REJECT',
    entityType: 'changeSet',
    entityId: changeSetId,
    changeSetId,
    metadata: { role, notes },
  });

  return { success: true };
});

/**
 * Publish a ChangeSet (publishes all draft versions)
 */
exports.publishChangeSet = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId } = request.data;

  if (!orgId || !changeSetId) {
    throw new https.HttpsError('invalid-argument', 'orgId and changeSetId are required');
  }

  // Verify user belongs to the org and has elevated permissions (admin or product_manager)
  const memberRole = await getMemberRole(orgId, auth.uid);
  if (!memberRole) {
    throw new https.HttpsError('permission-denied', 'You are not a member of this organization');
  }
  if (!['admin', 'product_manager'].includes(memberRole)) {
    throw new https.HttpsError('permission-denied', 'Publishing requires admin or product_manager role');
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();

  // Must be approved or filed to publish
  if (!['approved', 'filed'].includes(changeSet.status)) {
    throw new https.HttpsError('failed-precondition', `Cannot publish from status: ${changeSet.status}`);
  }

  // Get all items
  const itemsSnap = await changeSetRef.collection('items').get();
  if (itemsSnap.empty) {
    throw new https.HttpsError('failed-precondition', 'ChangeSet has no items');
  }

  // Guard against exceeding Firestore's 500-operation batch limit
  if (itemsSnap.size > 450) {
    throw new https.HttpsError(
      'failed-precondition',
      `Change set has ${itemsSnap.size} items, which exceeds the maximum of 450 per publish operation. Split into smaller change sets.`
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Pre-validate all version documents exist before committing any changes
  for (const itemDoc of itemsSnap.docs) {
    const item = itemDoc.data();
    const versionPath = buildVersionPath(orgId, item);
    if (!versionPath) continue; // unknown artifact type
    const versionSnap = await db.doc(versionPath).get();
    if (!versionSnap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Version document not found: ${item.artifactType} ${item.artifactId} version ${item.versionId}`
      );
    }
  }

  const batch = db.batch();
  const publishedItems = [];

  // Publish each version
  for (const itemDoc of itemsSnap.docs) {
    const item = itemDoc.data();

    // Build the version path based on artifact type
    let versionPath;
    switch (item.artifactType) {
      case 'product':
        versionPath = `orgs/${orgId}/products/${item.artifactId}/versions/${item.versionId}`;
        break;
      case 'coverage':
        // Coverage items should include productId in artifactId as "productId:coverageId"
        const [productId, coverageId] = item.artifactId.split(':');
        versionPath = `orgs/${orgId}/products/${productId}/coverages/${coverageId}/versions/${item.versionId}`;
        break;
      case 'form':
        versionPath = `orgs/${orgId}/forms/${item.artifactId}/versions/${item.versionId}`;
        break;
      case 'rule':
        versionPath = `orgs/${orgId}/rules/${item.artifactId}/versions/${item.versionId}`;
        break;
      case 'rateProgram':
        versionPath = `orgs/${orgId}/ratePrograms/${item.artifactId}/versions/${item.versionId}`;
        break;
      case 'table':
        versionPath = `orgs/${orgId}/tables/${item.artifactId}/versions/${item.versionId}`;
        break;
      case 'dataDictionary':
        const [prodId, fieldId] = item.artifactId.split(':');
        versionPath = `orgs/${orgId}/products/${prodId}/dataDictionary/${fieldId}/versions/${item.versionId}`;
        break;
      default:
        continue;
    }

    const versionRef = db.doc(versionPath);
    batch.update(versionRef, {
      status: 'published',
      publishedAt: now,
      publishedBy: auth.uid,
    });

    publishedItems.push({
      artifactType: item.artifactType,
      artifactId: item.artifactId,
      versionId: item.versionId,
    });
  }

  // Update changeset status
  batch.update(changeSetRef, {
    status: 'published',
    updatedAt: now,
    updatedBy: auth.uid,
  });

  await batch.commit();

  // Log audit for each published item
  for (const item of publishedItems) {
    await logAuditEvent(orgId, {
      actorUserId: auth.uid,
      action: 'PUBLISH',
      entityType: item.artifactType,
      entityId: item.artifactId,
      versionId: item.versionId,
      changeSetId,
    });
  }

  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'PUBLISH',
    entityType: 'changeSet',
    entityId: changeSetId,
    changeSetId,
    metadata: { itemCount: publishedItems.length },
  });

  return { success: true, publishedCount: publishedItems.length };
});

/**
 * Remove an item from a ChangeSet
 */
exports.removeChangeSetItem = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId, itemId } = request.data;

  if (!orgId || !changeSetId || !itemId) {
    throw new https.HttpsError('invalid-argument', 'orgId, changeSetId, and itemId are required');
  }

  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission');
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  if (changeSet.status !== 'draft') {
    throw new https.HttpsError('failed-precondition', 'Can only remove items from draft changesets');
  }

  const itemRef = changeSetRef.collection('items').doc(itemId);
  const itemDoc = await itemRef.get();

  if (!itemDoc.exists) {
    throw new https.HttpsError('not-found', 'Item not found');
  }

  const item = itemDoc.data();

  await itemRef.delete();

  // Update item count
  await changeSetRef.update({
    itemCount: admin.firestore.FieldValue.increment(-1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: auth.uid,
  });

  await logAuditEvent(orgId, {
    actorUserId: auth.uid,
    action: 'REMOVE_FROM_CHANGESET',
    entityType: item.artifactType,
    entityId: item.artifactId,
    changeSetId,
    metadata: { versionId: item.versionId },
  });

  return { success: true };
});

/**
 * Get preflight check for publishing (validates all requirements)
 */
exports.getPublishPreflight = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, changeSetId } = request.data;

  if (!orgId || !changeSetId) {
    throw new https.HttpsError('invalid-argument', 'orgId and changeSetId are required');
  }

  // Verify user is an active member of the org
  const memberRole = await getMemberRole(orgId, auth.uid);
  if (!memberRole) {
    throw new https.HttpsError('permission-denied', 'You are not a member of this organization');
  }

  const changeSetRef = db.collection('orgs').doc(orgId).collection('changeSets').doc(changeSetId);
  const changeSetDoc = await changeSetRef.get();

  if (!changeSetDoc.exists) {
    throw new https.HttpsError('not-found', 'ChangeSet not found');
  }

  const changeSet = changeSetDoc.data();
  const issues = [];

  // Check status
  if (!['approved', 'filed'].includes(changeSet.status)) {
    issues.push({ type: 'error', message: `ChangeSet must be approved before publishing (current: ${changeSet.status})` });
  }

  // Check items
  const itemsSnap = await changeSetRef.collection('items').get();
  if (itemsSnap.empty) {
    issues.push({ type: 'error', message: 'ChangeSet has no items' });
  }

  // Check approvals
  const approvalsSnap = await changeSetRef.collection('approvals').get();
  const pendingApprovals = approvalsSnap.docs.filter(doc => doc.data().status === 'pending');
  if (pendingApprovals.length > 0) {
    const pendingRoles = pendingApprovals.map(doc => doc.data().roleRequired).join(', ');
    issues.push({ type: 'error', message: `Pending approvals: ${pendingRoles}` });
  }

  const rejectedApprovals = approvalsSnap.docs.filter(doc => doc.data().status === 'rejected');
  if (rejectedApprovals.length > 0) {
    issues.push({ type: 'error', message: 'ChangeSet has rejected approvals' });
  }

  // Check effective dates
  if (changeSet.targetEffectiveStart) {
    const effectiveDate = new Date(changeSet.targetEffectiveStart);
    if (effectiveDate < new Date()) {
      issues.push({ type: 'warning', message: 'Target effective date is in the past' });
    }
  }

  // ── Blocking tasks gate ──
  // Query all tasks linked to this change set that are blocking + not done
  const tasksSnap = await db.collection(`orgs/${orgId}/tasks`)
    .where('blocking', '==', true)
    .where('status', 'in', ['open', 'in_progress'])
    .get();

  const blockingTasks = tasksSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.links && t.links.some(l => l.changeSetId === changeSetId));

  if (blockingTasks.length > 0) {
    const taskNames = blockingTasks.map(t => t.title).join(', ');
    issues.push({
      type: 'error',
      message: `${blockingTasks.length} blocking task(s) not complete: ${taskNames}`,
    });
  }

  return {
    success: true,
    canPublish: issues.filter(i => i.type === 'error').length === 0,
    issues,
    itemCount: itemsSnap.size,
    approvalCount: approvalsSnap.size,
    approvedCount: approvalsSnap.docs.filter(doc => doc.data().status === 'approved').length,
    blockingTaskCount: blockingTasks.length,
  };
});

