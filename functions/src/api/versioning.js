/**
 * Versioning API
 * Cloud Functions for managing versioned artifacts (products, coverages, forms, etc.)
 */

const { onCall } = require('firebase-functions/v2/https');
const { https } = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');

const db = admin.firestore();

// Valid version statuses
const VALID_STATUSES = ['draft', 'review', 'approved', 'filed', 'published', 'archived'];
const IMMUTABLE_STATUSES = ['published', 'archived'];

// Status transition rules
const ALLOWED_TRANSITIONS = {
  draft: ['review', 'archived'],
  review: ['draft', 'approved', 'archived'],
  approved: ['review', 'filed', 'archived'],
  filed: ['approved', 'published', 'archived'],
  published: ['archived'],
  archived: [],
};

// Entity types and their collection paths
const ENTITY_TYPES = {
  product: (orgId, entityId) => `orgs/${orgId}/products/${entityId}`,
  coverage: (orgId, productId, coverageId) => `orgs/${orgId}/products/${productId}/coverages/${coverageId}`,
  form: (orgId, entityId) => `orgs/${orgId}/forms/${entityId}`,
  rule: (orgId, entityId) => `orgs/${orgId}/rules/${entityId}`,
  rateProgram: (orgId, entityId) => `orgs/${orgId}/ratePrograms/${entityId}`,
  table: (orgId, entityId) => `orgs/${orgId}/tables/${entityId}`,
  dataDictionary: (orgId, productId, fieldId) => `orgs/${orgId}/products/${productId}/dataDictionary/${fieldId}`,
};

/**
 * Helper: Check if user is an active member of the org
 */
async function requireOrgMembership(orgId, userId) {
  const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
  if (!memberDoc.exists || memberDoc.data().status !== 'active') {
    throw new https.HttpsError('permission-denied', 'You are not a member of this organization');
  }
  return memberDoc.data();
}

/**
 * Helper: Check if user can write to org
 */
async function canWriteInOrg(orgId, userId) {
  const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
  if (!memberDoc.exists || memberDoc.data().status !== 'active') return false;
  const role = memberDoc.data().role;
  return ['admin', 'product_manager', 'actuary', 'underwriter'].includes(role);
}

/**
 * Helper: Check if user can publish in org (admin only)
 */
async function canPublishInOrg(orgId, userId) {
  const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
  return memberDoc.exists && memberDoc.data().role === 'admin' && memberDoc.data().status === 'active';
}

/**
 * Helper: Get entity path
 */
function getEntityPath(entityType, orgId, entityId, parentId = null) {
  const pathBuilder = ENTITY_TYPES[entityType];
  if (!pathBuilder) {
    throw new https.HttpsError('invalid-argument', `Invalid entity type: ${entityType}`);
  }
  // For nested entities like coverage and dataDictionary
  if (entityType === 'coverage' || entityType === 'dataDictionary') {
    if (!parentId) {
      throw new https.HttpsError('invalid-argument', `parentId required for ${entityType}`);
    }
    return pathBuilder(orgId, parentId, entityId);
  }
  return pathBuilder(orgId, entityId);
}

/**
 * List versions for an entity
 */
exports.listVersions = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, status } = request.data;

  if (!orgId || !entityType || !entityId) {
    throw new https.HttpsError('invalid-argument', 'orgId, entityType, and entityId are required');
  }

  await requireOrgMembership(orgId, auth.uid);

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  let query = db.collection(`${entityPath}/versions`).orderBy('versionNumber', 'desc');

  if (status && VALID_STATUSES.includes(status)) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();
  const versions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { success: true, versions };
});

/**
 * Get a specific version
 */
exports.getVersion = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, versionId, parentId } = request.data;

  if (!orgId || !entityType || !entityId || !versionId) {
    throw new https.HttpsError('invalid-argument', 'orgId, entityType, entityId, and versionId are required');
  }

  await requireOrgMembership(orgId, auth.uid);

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  const versionDoc = await db.doc(`${entityPath}/versions/${versionId}`).get();

  if (!versionDoc.exists) {
    throw new https.HttpsError('not-found', 'Version not found');
  }

  return { success: true, version: { id: versionDoc.id, ...versionDoc.data() } };
});

/**
 * Create a new draft version
 */
exports.createDraftVersion = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, data, summary } = request.data;

  if (!orgId || !entityType || !entityId) {
    throw new https.HttpsError('invalid-argument', 'orgId, entityType, and entityId are required');
  }

  // Permission check
  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission to create versions');
  }

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  const versionsRef = db.collection(`${entityPath}/versions`);

  // Get the highest version number
  const latestSnapshot = await versionsRef.orderBy('versionNumber', 'desc').limit(1).get();
  const nextVersionNumber = latestSnapshot.empty ? 1 : latestSnapshot.docs[0].data().versionNumber + 1;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const versionRef = versionsRef.doc();

  const versionData = {
    ...data,
    versionNumber: nextVersionNumber,
    status: 'draft',
    summary: summary || `Draft v${nextVersionNumber}`,
    createdAt: now,
    createdBy: auth.uid,
    updatedAt: now,
    updatedBy: auth.uid,
  };

  await versionRef.set(versionData);

  return {
    success: true,
    versionId: versionRef.id,
    versionNumber: nextVersionNumber,
  };
});

/**
 * Clone a published version to create a new draft
 */
exports.cloneVersion = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, sourceVersionId, summary } = request.data;

  if (!orgId || !entityType || !entityId || !sourceVersionId) {
    throw new https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  // Permission check
  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission to clone versions');
  }

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  const versionsRef = db.collection(`${entityPath}/versions`);

  // Get source version
  const sourceDoc = await versionsRef.doc(sourceVersionId).get();
  if (!sourceDoc.exists) {
    throw new https.HttpsError('not-found', 'Source version not found');
  }

  const sourceData = sourceDoc.data();

  // Get the highest version number
  const latestSnapshot = await versionsRef.orderBy('versionNumber', 'desc').limit(1).get();
  const nextVersionNumber = latestSnapshot.empty ? 1 : latestSnapshot.docs[0].data().versionNumber + 1;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const newVersionRef = versionsRef.doc();

  // Clone data, excluding metadata
  const { versionNumber, status, createdAt, createdBy, updatedAt, updatedBy, effectiveStart, effectiveEnd, ...clonedData } = sourceData;

  const newVersionData = {
    ...clonedData,
    versionNumber: nextVersionNumber,
    status: 'draft',
    summary: summary || `Draft v${nextVersionNumber} (cloned from v${sourceData.versionNumber})`,
    clonedFrom: sourceVersionId,
    createdAt: now,
    createdBy: auth.uid,
    updatedAt: now,
    updatedBy: auth.uid,
  };

  await newVersionRef.set(newVersionData);

  return {
    success: true,
    versionId: newVersionRef.id,
    versionNumber: nextVersionNumber,
    clonedFrom: sourceVersionId,
  };
});

/**
 * Transition version status
 */
exports.transitionVersionStatus = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, versionId, newStatus, notes } = request.data;

  if (!orgId || !entityType || !entityId || !versionId || !newStatus) {
    throw new https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    throw new https.HttpsError('invalid-argument', `Invalid status: ${newStatus}`);
  }

  // Publishing requires admin permission
  if (newStatus === 'published' && !(await canPublishInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'Only admins can publish versions');
  } else if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission to transition versions');
  }

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  const versionRef = db.doc(`${entityPath}/versions/${versionId}`);
  const versionDoc = await versionRef.get();

  if (!versionDoc.exists) {
    throw new https.HttpsError('not-found', 'Version not found');
  }

  const currentStatus = versionDoc.data().status;

  // Validate transition
  if (IMMUTABLE_STATUSES.includes(currentStatus)) {
    throw new https.HttpsError('failed-precondition', `Cannot transition from ${currentStatus} status`);
  }

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    throw new https.HttpsError(
      'failed-precondition',
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const updateData = {
    status: newStatus,
    updatedAt: now,
    updatedBy: auth.uid,
  };

  // Add notes if provided
  if (notes) {
    updateData.notes = notes;
  }

  // If publishing, set effective dates and update parent entity
  if (newStatus === 'published') {
    updateData.effectiveStart = now;

    // Update parent entity's latestPublishedVersionId
    const entityRef = db.doc(entityPath);
    await entityRef.update({ latestPublishedVersionId: versionId });
  }

  await versionRef.update(updateData);

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus,
  };
});

/**
 * Update a draft version
 */
exports.updateDraftVersion = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, versionId, data, summary } = request.data;

  if (!orgId || !entityType || !entityId || !versionId) {
    throw new https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  if (!(await canWriteInOrg(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'You do not have permission to update versions');
  }

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);
  const versionRef = db.doc(`${entityPath}/versions/${versionId}`);
  const versionDoc = await versionRef.get();

  if (!versionDoc.exists) {
    throw new https.HttpsError('not-found', 'Version not found');
  }

  const currentStatus = versionDoc.data().status;
  if (currentStatus !== 'draft') {
    throw new https.HttpsError('failed-precondition', 'Only draft versions can be updated');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const updateData = {
    ...data,
    updatedAt: now,
    updatedBy: auth.uid,
  };

  if (summary) {
    updateData.summary = summary;
  }

  // Don't allow overwriting protected fields
  delete updateData.versionNumber;
  delete updateData.status;
  delete updateData.createdAt;
  delete updateData.createdBy;

  await versionRef.update(updateData);

  return { success: true };
});

/**
 * Compare two versions
 */
exports.compareVersions = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, entityType, entityId, parentId, leftVersionId, rightVersionId } = request.data;

  if (!orgId || !entityType || !entityId || !leftVersionId || !rightVersionId) {
    throw new https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  await requireOrgMembership(orgId, auth.uid);

  const entityPath = getEntityPath(entityType, orgId, entityId, parentId);

  const [leftDoc, rightDoc] = await Promise.all([
    db.doc(`${entityPath}/versions/${leftVersionId}`).get(),
    db.doc(`${entityPath}/versions/${rightVersionId}`).get(),
  ]);

  if (!leftDoc.exists || !rightDoc.exists) {
    throw new https.HttpsError('not-found', 'One or both versions not found');
  }

  const leftData = leftDoc.data();
  const rightData = rightDoc.data();

  // Compute diff (simplified - full diff happens client-side)
  const metadataFields = ['versionNumber', 'status', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'effectiveStart', 'effectiveEnd', 'summary', 'notes', 'clonedFrom'];

  const leftContent = { ...leftData };
  const rightContent = { ...rightData };
  metadataFields.forEach(f => {
    delete leftContent[f];
    delete rightContent[f];
  });

  return {
    success: true,
    left: { id: leftDoc.id, metadata: extractMetadata(leftData), content: leftContent },
    right: { id: rightDoc.id, metadata: extractMetadata(rightData), content: rightContent },
  };
});

/**
 * Helper: Extract metadata from version doc
 */
function extractMetadata(data) {
  return {
    versionNumber: data.versionNumber,
    status: data.status,
    summary: data.summary,
    notes: data.notes,
    createdAt: data.createdAt,
    createdBy: data.createdBy,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    effectiveStart: data.effectiveStart,
    effectiveEnd: data.effectiveEnd,
  };
}

