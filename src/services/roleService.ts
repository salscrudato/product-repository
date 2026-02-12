/**
 * Role Service
 * Client-side service for managing user roles and permissions
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

// Role hierarchy (higher index = more permissions)
export const ROLES = ['viewer', 'underwriter', 'product_manager', 'admin'] as const;
export type UserRole = typeof ROLES[number];

export interface UserWithRole {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  roleUpdatedAt: number | null;
  disabled: boolean;
  createdAt: string;
  lastSignIn: string;
}

export interface RolePermissions {
  canRead: boolean;
  canWriteProductConfig: boolean;
  canWriteUnderwriting: boolean;
  canWriteAdmin: boolean;
  canManageUsers: boolean;
}

/**
 * Get permissions for a given role
 */
export const getPermissionsForRole = (role: UserRole): RolePermissions => {
  const roleIndex = ROLES.indexOf(role);
  
  return {
    canRead: roleIndex >= 0, // All roles can read
    canWriteProductConfig: roleIndex >= ROLES.indexOf('product_manager'),
    canWriteUnderwriting: roleIndex >= ROLES.indexOf('underwriter'),
    canWriteAdmin: roleIndex >= ROLES.indexOf('admin'),
    canManageUsers: roleIndex >= ROLES.indexOf('admin'),
  };
};

/**
 * Check if current user has at least the specified role
 */
export const hasRole = async (requiredRole: UserRole): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    const tokenResult = await user.getIdTokenResult();
    const userRole = (tokenResult.claims.role as UserRole) || 'viewer';
    return ROLES.indexOf(userRole) >= ROLES.indexOf(requiredRole);
  } catch (error) {
    logger.error(LOG_CATEGORIES.AUTH, 'Error checking role', {}, error as Error);
    return false;
  }
};

/**
 * Get current user's role
 */
export const getCurrentUserRole = async (): Promise<UserRole> => {
  const user = auth.currentUser;
  if (!user) return 'viewer';
  
  try {
    const tokenResult = await user.getIdTokenResult();
    return (tokenResult.claims.role as UserRole) || 'viewer';
  } catch (error) {
    logger.error(LOG_CATEGORIES.AUTH, 'Error getting current role', {}, error as Error);
    return 'viewer';
  }
};

/**
 * Set user role (admin only)
 */
export const setUserRole = async (
  targetUserId: string, 
  role: UserRole
): Promise<{ success: boolean; message: string }> => {
  try {
    const callable = httpsCallable<
      { targetUserId: string; role: string },
      { success: boolean; message: string }
    >(functions, 'setUserRole');
    
    const result = await callable({ targetUserId, role });
    
    logger.info(LOG_CATEGORIES.AUTH, 'Role updated', { targetUserId, role });
    
    return result.data;
  } catch (error) {
    logger.error(LOG_CATEGORIES.AUTH, 'Error setting role', { targetUserId, role }, error as Error);
    throw error;
  }
};

/**
 * Get user's current role (admin can query any user)
 */
export const getUserRole = async (
  targetUserId?: string
): Promise<{ role: UserRole; roleUpdatedAt: number | null }> => {
  try {
    const callable = httpsCallable<
      { targetUserId?: string },
      { role: UserRole; roleUpdatedAt: number | null }
    >(functions, 'getUserRole');
    
    const result = await callable({ targetUserId });
    return result.data;
  } catch (error) {
    logger.error(LOG_CATEGORIES.AUTH, 'Error getting role', { targetUserId }, error as Error);
    throw error;
  }
};

/**
 * List all users with their roles (admin only)
 */
export const listUsersWithRoles = async (
  pageSize = 100,
  pageToken?: string
): Promise<{ users: UserWithRole[]; pageToken: string | null }> => {
  try {
    const callable = httpsCallable<
      { pageSize: number; pageToken?: string },
      { users: UserWithRole[]; pageToken: string | null }
    >(functions, 'listUsersWithRoles');
    
    const result = await callable({ pageSize, pageToken });
    return result.data;
  } catch (error) {
    logger.error(LOG_CATEGORIES.AUTH, 'Error listing users', {}, error as Error);
    throw error;
  }
};

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  viewer: 'Viewer',
  underwriter: 'Underwriter',
  product_manager: 'Product Manager',
  admin: 'Administrator',
};

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: 'Can view all product data but cannot make changes',
  underwriter: 'Can view and edit underwriting rules and risk assessments',
  product_manager: 'Can manage products, coverages, forms, and pricing',
  admin: 'Full access including user management and system configuration',
};

