/**
 * Authentication Middleware
 * Validates user authentication and authorization
 */

const { https } = require('firebase-functions');

/**
 * Middleware to require authentication
 * @param {Object} context - Firebase Functions context
 * @throws {https.HttpsError} If user is not authenticated
 */
const requireAuth = (context) => {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'User must be authenticated to perform this action'
    );
  }
  return context.auth;
};

/**
 * Middleware to require specific role
 * @param {Object} context - Firebase Functions context
 * @param {string[]} allowedRoles - Array of allowed roles
 * @throws {https.HttpsError} If user doesn't have required role
 */
const requireRole = (context, allowedRoles) => {
  const auth = requireAuth(context);
  
  const userRole = auth.token.role || 'user';
  
  if (!allowedRoles.includes(userRole)) {
    throw new https.HttpsError(
      'permission-denied',
      `User role '${userRole}' is not authorized. Required: ${allowedRoles.join(', ')}`
    );
  }
  
  return auth;
};

/**
 * Middleware to check if user is admin
 * @param {Object} context - Firebase Functions context
 * @throws {https.HttpsError} If user is not admin
 */
const requireAdmin = (context) => {
  return requireRole(context, ['admin']);
};

/**
 * Get user ID from context
 * @param {Object} context - Firebase Functions context
 * @returns {string} User ID
 */
const getUserId = (context) => {
  const auth = requireAuth(context);
  return auth.uid;
};

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  getUserId
};

