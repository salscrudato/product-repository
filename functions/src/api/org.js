/**
 * Organization Management API
 * Cloud Functions for multi-tenant organization management
 */

const { onCall } = require('firebase-functions/v2/https');
const { https } = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');

const db = admin.firestore();

// Valid org roles
const VALID_ORG_ROLES = ['admin', 'product_manager', 'actuary', 'underwriter', 'compliance', 'viewer'];

/**
 * Helper: Check if user is org admin
 */
async function isOrgAdmin(orgId, userId) {
  const memberDoc = await db.collection('orgs').doc(orgId).collection('members').doc(userId).get();
  return memberDoc.exists && memberDoc.data().role === 'admin' && memberDoc.data().status === 'active';
}

/**
 * Helper: Log audit event
 */
async function logAuditEvent(orgId, action, performedBy, details) {
  await db.collection('orgs').doc(orgId).collection('auditLog').add({
    action,
    performedBy,
    performedAt: admin.firestore.FieldValue.serverTimestamp(),
    details,
  });
}

/**
 * Create a new organization
 * Creates org and adds creator as admin
 */
exports.createOrganization = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { name } = request.data;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new https.HttpsError('invalid-argument', 'Organization name must be at least 2 characters');
  }

  const orgRef = db.collection('orgs').doc();
  const orgId = orgRef.id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Create org document
  await orgRef.set({
    name: name.trim(),
    createdAt: now,
    createdBy: auth.uid,
    settings: {
      allowInvites: true,
      defaultRole: 'viewer',
    },
  });

  // Add creator as admin member
  await orgRef.collection('members').doc(auth.uid).set({
    userId: auth.uid,
    email: auth.token.email || '',
    displayName: auth.token.name || '',
    role: 'admin',
    status: 'active',
    createdAt: now,
    createdBy: auth.uid,
    joinedAt: now,
  });

  // Update user's primary org if they don't have one
  const userRef = db.collection('users').doc(auth.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists || !userDoc.data().primaryOrgId) {
    await userRef.set({
      primaryOrgId: orgId,
      email: auth.token.email || '',
      displayName: auth.token.name || '',
      createdAt: now,
    }, { merge: true });
  }

  // Log audit event
  await logAuditEvent(orgId, 'ORG_CREATED', auth.uid, { name: name.trim() });

  console.log(`✅ Organization created: ${orgId} by ${auth.uid}`);

  return {
    success: true,
    org: {
      id: orgId,
      name: name.trim(),
      createdAt: new Date(),
      createdBy: auth.uid,
    },
  };
});

/**
 * List organizations the current user belongs to
 * Special case: "admin" email gets access to ALL organizations
 */
exports.listUserOrgs = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);

  // Check for system admin via custom claims (set by Firebase Admin SDK, not by email)
  const isSystemAdmin = auth.token.systemAdmin === true;

  if (isSystemAdmin) {
    // Return ALL organizations with admin membership
    const allOrgsQuery = await db.collection('orgs').get();
    const orgs = [];

    for (const orgDoc of allOrgsQuery.docs) {
      const orgData = orgDoc.data();
      orgs.push({
        org: {
          id: orgDoc.id,
          name: orgData.name,
          createdAt: orgData.createdAt?.toDate() || new Date(),
          createdBy: orgData.createdBy,
          settings: orgData.settings,
        },
        membership: {
          id: auth.uid,
          orgId: orgDoc.id,
          userId: auth.uid,
          email: auth.token.email || '',
          displayName: auth.token.name || 'System Admin',
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          createdBy: 'system',
          joinedAt: new Date(),
        },
      });
    }

    return { success: true, orgs, isSystemAdmin: true };
  }

  // Normal user: Query orgs where user is a member
  const membershipQuery = await db.collectionGroup('members')
    .where('userId', '==', auth.uid)
    .where('status', '==', 'active')
    .get();

  const orgs = [];
  for (const memberDoc of membershipQuery.docs) {
    const orgId = memberDoc.ref.parent.parent.id;
    const orgDoc = await db.collection('orgs').doc(orgId).get();

    if (orgDoc.exists) {
      const orgData = orgDoc.data();
      const memberData = memberDoc.data();

      orgs.push({
        org: {
          id: orgId,
          name: orgData.name,
          createdAt: orgData.createdAt?.toDate() || new Date(),
          createdBy: orgData.createdBy,
          settings: orgData.settings,
        },
        membership: {
          id: auth.uid,
          orgId,
          userId: auth.uid,
          email: memberData.email,
          displayName: memberData.displayName,
          role: memberData.role,
          status: memberData.status,
          createdAt: memberData.createdAt?.toDate() || new Date(),
          createdBy: memberData.createdBy,
          joinedAt: memberData.joinedAt?.toDate(),
        },
      });
    }
  }

  return { success: true, orgs };
});

/**
 * List members of an organization (admin only)
 */
exports.listOrgMembers = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId } = request.data;

  if (!orgId) {
    throw new https.HttpsError('invalid-argument', 'orgId is required');
  }

  // Check if user is org admin
  if (!(await isOrgAdmin(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'Only org admins can list members');
  }

  const membersSnapshot = await db.collection('orgs').doc(orgId).collection('members').get();
  
  const members = membersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      orgId,
      userId: doc.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      invitedAt: data.invitedAt?.toDate(),
      joinedAt: data.joinedAt?.toDate(),
    };
  });

  return { success: true, members };
});

/**
 * Invite a user to an organization
 */
exports.inviteOrgMember = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, email, role } = request.data;

  if (!orgId || !email || !role) {
    throw new https.HttpsError('invalid-argument', 'orgId, email, and role are required');
  }

  if (!VALID_ORG_ROLES.includes(role)) {
    throw new https.HttpsError('invalid-argument', `Invalid role. Must be one of: ${VALID_ORG_ROLES.join(', ')}`);
  }

  // Check if user is org admin
  if (!(await isOrgAdmin(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'Only org admins can invite members');
  }

  // Get org name for invite
  const orgDoc = await db.collection('orgs').doc(orgId).get();
  if (!orgDoc.exists) {
    throw new https.HttpsError('not-found', 'Organization not found');
  }
  const orgName = orgDoc.data().name;

  // Check if user already exists and is a member
  const existingUsers = await admin.auth().getUserByEmail(email).catch(() => null);
  if (existingUsers) {
    const existingMember = await db.collection('orgs').doc(orgId).collection('members').doc(existingUsers.uid).get();
    if (existingMember.exists && existingMember.data().status === 'active') {
      throw new https.HttpsError('already-exists', 'User is already a member of this organization');
    }
  }

  // Create invite
  const inviteRef = db.collection('orgInvites').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  await inviteRef.set({
    orgId,
    orgName,
    email: email.toLowerCase(),
    role,
    invitedBy: auth.uid,
    invitedAt: now,
    expiresAt,
    status: 'pending',
  });

  // Log audit event
  await logAuditEvent(orgId, 'MEMBER_INVITED', auth.uid, { email, role });

  console.log(`✅ Invite created: ${email} to ${orgId} as ${role}`);

  return {
    success: true,
    invite: {
      id: inviteRef.id,
      orgId,
      orgName,
      email,
      role,
      invitedBy: auth.uid,
      invitedAt: new Date(),
      expiresAt,
      status: 'pending',
    },
  };
});

/**
 * Accept an organization invite
 */
exports.acceptOrgInvite = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { inviteId } = request.data;

  if (!inviteId) {
    throw new https.HttpsError('invalid-argument', 'inviteId is required');
  }

  const inviteRef = db.collection('orgInvites').doc(inviteId);
  const inviteDoc = await inviteRef.get();

  if (!inviteDoc.exists) {
    throw new https.HttpsError('not-found', 'Invite not found');
  }

  const invite = inviteDoc.data();

  // Verify invite is for this user
  if (invite.email.toLowerCase() !== auth.token.email?.toLowerCase()) {
    throw new https.HttpsError('permission-denied', 'This invite is not for you');
  }

  // Check invite status
  if (invite.status !== 'pending') {
    throw new https.HttpsError('failed-precondition', `Invite is ${invite.status}`);
  }

  // Check expiry
  if (invite.expiresAt.toDate() < new Date()) {
    await inviteRef.update({ status: 'expired' });
    throw new https.HttpsError('failed-precondition', 'Invite has expired');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Add user as member
  await db.collection('orgs').doc(invite.orgId).collection('members').doc(auth.uid).set({
    userId: auth.uid,
    email: auth.token.email || '',
    displayName: auth.token.name || '',
    role: invite.role,
    status: 'active',
    createdAt: now,
    createdBy: invite.invitedBy,
    invitedAt: invite.invitedAt,
    joinedAt: now,
  });

  // Update invite status
  await inviteRef.update({ status: 'accepted', acceptedAt: now });

  // Update user's primary org if they don't have one
  const userRef = db.collection('users').doc(auth.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists || !userDoc.data().primaryOrgId) {
    await userRef.set({
      primaryOrgId: invite.orgId,
      email: auth.token.email || '',
      displayName: auth.token.name || '',
      createdAt: now,
    }, { merge: true });
  }

  // Log audit event
  await logAuditEvent(invite.orgId, 'MEMBER_JOINED', auth.uid, { role: invite.role });

  console.log(`✅ Invite accepted: ${auth.uid} joined ${invite.orgId}`);

  return { success: true };
});

/**
 * Update a member's role
 */
exports.updateOrgMemberRole = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, userId, role } = request.data;

  if (!orgId || !userId || !role) {
    throw new https.HttpsError('invalid-argument', 'orgId, userId, and role are required');
  }

  if (!VALID_ORG_ROLES.includes(role)) {
    throw new https.HttpsError('invalid-argument', `Invalid role. Must be one of: ${VALID_ORG_ROLES.join(', ')}`);
  }

  // Check if user is org admin
  if (!(await isOrgAdmin(orgId, auth.uid))) {
    throw new https.HttpsError('permission-denied', 'Only org admins can update member roles');
  }

  // Prevent removing last admin
  if (role !== 'admin') {
    const adminsQuery = await db.collection('orgs').doc(orgId).collection('members')
      .where('role', '==', 'admin')
      .where('status', '==', 'active')
      .get();

    const isTargetAdmin = adminsQuery.docs.some(doc => doc.id === userId);
    if (isTargetAdmin && adminsQuery.size === 1) {
      throw new https.HttpsError('failed-precondition', 'Cannot remove the last admin');
    }
  }

  const memberRef = db.collection('orgs').doc(orgId).collection('members').doc(userId);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new https.HttpsError('not-found', 'Member not found');
  }

  const oldRole = memberDoc.data().role;
  await memberRef.update({
    role,
    roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    roleUpdatedBy: auth.uid,
  });

  // Log audit event
  await logAuditEvent(orgId, 'MEMBER_ROLE_UPDATED', auth.uid, { userId, oldRole, newRole: role });

  console.log(`✅ Member role updated: ${userId} in ${orgId} from ${oldRole} to ${role}`);

  return { success: true };
});

/**
 * Remove a member from an organization
 */
exports.removeOrgMember = onCall({ cors: true }, async (request) => {
  const auth = requireAuth(request);
  const { orgId, userId } = request.data;

  if (!orgId || !userId) {
    throw new https.HttpsError('invalid-argument', 'orgId and userId are required');
  }

  // Check if user is org admin (or removing themselves)
  const isAdmin = await isOrgAdmin(orgId, auth.uid);
  const isSelf = auth.uid === userId;

  if (!isAdmin && !isSelf) {
    throw new https.HttpsError('permission-denied', 'Only org admins can remove members');
  }

  // Prevent removing last admin
  const memberRef = db.collection('orgs').doc(orgId).collection('members').doc(userId);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new https.HttpsError('not-found', 'Member not found');
  }

  if (memberDoc.data().role === 'admin') {
    const adminsQuery = await db.collection('orgs').doc(orgId).collection('members')
      .where('role', '==', 'admin')
      .where('status', '==', 'active')
      .get();

    if (adminsQuery.size === 1) {
      throw new https.HttpsError('failed-precondition', 'Cannot remove the last admin');
    }
  }

  // Update member status to disabled (soft delete)
  await memberRef.update({
    status: 'disabled',
    disabledAt: admin.firestore.FieldValue.serverTimestamp(),
    disabledBy: auth.uid,
  });

  // If user's primary org was this one, clear it
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (userDoc.exists && userDoc.data().primaryOrgId === orgId) {
    await userRef.update({ primaryOrgId: null });
  }

  // Log audit event
  await logAuditEvent(orgId, 'MEMBER_REMOVED', auth.uid, { userId, removedBy: auth.uid });

  console.log(`✅ Member removed: ${userId} from ${orgId}`);

  return { success: true };
});

