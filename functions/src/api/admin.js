/**
 * Admin API - User Role Management
 * Cloud Functions for managing user roles and custom claims
 */

const { onCall } = require('firebase-functions/v2/https');
const { https } = require('firebase-functions');
const admin = require('firebase-admin');
const { requireAdmin, requireAuth } = require('../middleware/auth');

// Valid roles in the system
const VALID_ROLES = ['admin', 'product_manager', 'underwriter', 'viewer'];

/**
 * Set user role (custom claims)
 * Admin-only function to assign roles to users
 * 
 * @param {string} targetUserId - User ID to update
 * @param {string} role - Role to assign (admin, product_manager, underwriter, viewer)
 */
exports.setUserRole = onCall(async (request) => {
  const startTime = Date.now();
  
  try {
    // Require admin role (or allow first admin setup)
    const isFirstAdminSetup = await checkFirstAdminSetup(request);
    
    if (!isFirstAdminSetup) {
      requireAdmin(request);
    }
    
    const { targetUserId, role } = request.data;
    
    // Validate inputs
    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'targetUserId is required');
    }
    
    if (!role || !VALID_ROLES.includes(role)) {
      throw new https.HttpsError(
        'invalid-argument', 
        `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      );
    }
    
    // Get target user to verify they exist
    const targetUser = await admin.auth().getUser(targetUserId);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(targetUserId, {
      role: role,
      roleUpdatedAt: Date.now(),
      roleUpdatedBy: request.auth?.uid || 'system'
    });
    
    // Log the role change
    await admin.firestore().collection('auditLog').add({
      action: 'SET_USER_ROLE',
      targetUserId: targetUserId,
      targetEmail: targetUser.email || 'anonymous',
      newRole: role,
      performedBy: request.auth?.uid || 'system',
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        isFirstAdminSetup,
        latencyMs: Date.now() - startTime
      }
    });
    
    console.log(`✅ Role set: ${targetUser.email || targetUserId} -> ${role}`);
    
    return {
      success: true,
      userId: targetUserId,
      email: targetUser.email,
      role: role,
      message: `Successfully set role '${role}' for user`
    };
    
  } catch (error) {
    console.error('setUserRole error:', error);
    
    if (error instanceof https.HttpsError) {
      throw error;
    }
    
    if (error.code === 'auth/user-not-found') {
      throw new https.HttpsError('not-found', 'User not found');
    }
    
    throw new https.HttpsError('internal', error.message);
  }
});

/**
 * Get user role
 * Returns the current role for a user
 */
exports.getUserRole = onCall(async (request) => {
  try {
    requireAuth(request);
    
    const { targetUserId } = request.data;
    const userId = targetUserId || request.auth.uid;
    
    const user = await admin.auth().getUser(userId);
    const claims = user.customClaims || {};
    
    return {
      success: true,
      userId: userId,
      email: user.email,
      role: claims.role || 'viewer',
      roleUpdatedAt: claims.roleUpdatedAt || null
    };
    
  } catch (error) {
    console.error('getUserRole error:', error);
    throw new https.HttpsError('internal', error.message);
  }
});

/**
 * List users with roles
 * Admin-only function to list all users and their roles
 */
exports.listUsersWithRoles = onCall(async (request) => {
  try {
    requireAdmin(request);
    
    const { pageSize = 100, pageToken } = request.data;
    
    const listResult = await admin.auth().listUsers(pageSize, pageToken);
    
    const users = listResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.customClaims?.role || 'viewer',
      roleUpdatedAt: user.customClaims?.roleUpdatedAt || null,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime
    }));
    
    return {
      success: true,
      users,
      pageToken: listResult.pageToken || null,
      totalCount: users.length
    };
    
  } catch (error) {
    console.error('listUsersWithRoles error:', error);
    throw new https.HttpsError('internal', error.message);
  }
});

/**
 * Check if this is the first admin setup
 * Allows the first user to set themselves as admin
 */
async function checkFirstAdminSetup(request) {
  if (!request.auth) return false;
  
  // Check if any admin exists
  const listResult = await admin.auth().listUsers(100);
  const hasAdmin = listResult.users.some(
    user => user.customClaims?.role === 'admin'
  );
  
  // If no admin exists and user is trying to set themselves as admin
  if (!hasAdmin && request.data.targetUserId === request.auth.uid && request.data.role === 'admin') {
    console.log('🔓 First admin setup detected');
    return true;
  }
  
  return false;
}

