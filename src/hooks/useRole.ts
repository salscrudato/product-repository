/**
 * useRole Hook
 * Provides role-based access control and permission checking
 */

import { useState, useEffect } from 'react';
import { auth } from '@/firebase';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

/**
 * Permission types
 */
export enum Permission {
  // Product permissions
  CREATE_PRODUCT = 'create_product',
  EDIT_PRODUCT = 'edit_product',
  DELETE_PRODUCT = 'delete_product',
  VIEW_PRODUCT = 'view_product',

  // Coverage permissions
  CREATE_COVERAGE = 'create_coverage',
  EDIT_COVERAGE = 'edit_coverage',
  DELETE_COVERAGE = 'delete_coverage',
  VIEW_COVERAGE = 'view_coverage',

  // Form permissions
  CREATE_FORM = 'create_form',
  EDIT_FORM = 'edit_form',
  DELETE_FORM = 'delete_form',
  VIEW_FORM = 'view_form',

  // Pricing permissions
  EDIT_PRICING = 'edit_pricing',
  VIEW_PRICING = 'view_pricing',

  // Rules permissions
  CREATE_RULE = 'create_rule',
  EDIT_RULE = 'edit_rule',
  DELETE_RULE = 'delete_rule',
  VIEW_RULE = 'view_rule',

  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MANAGE_SETTINGS = 'manage_settings'
}

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),

  [UserRole.MANAGER]: [
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.VIEW_PRODUCT,
    Permission.CREATE_COVERAGE,
    Permission.EDIT_COVERAGE,
    Permission.DELETE_COVERAGE,
    Permission.VIEW_COVERAGE,
    Permission.CREATE_FORM,
    Permission.EDIT_FORM,
    Permission.DELETE_FORM,
    Permission.VIEW_FORM,
    Permission.EDIT_PRICING,
    Permission.VIEW_PRICING,
    Permission.CREATE_RULE,
    Permission.EDIT_RULE,
    Permission.DELETE_RULE,
    Permission.VIEW_RULE,
    Permission.VIEW_AUDIT_LOG
  ],

  [UserRole.ANALYST]: [
    Permission.VIEW_PRODUCT,
    Permission.VIEW_COVERAGE,
    Permission.VIEW_FORM,
    Permission.VIEW_PRICING,
    Permission.VIEW_RULE,
    Permission.EDIT_PRICING,
    Permission.CREATE_RULE,
    Permission.EDIT_RULE,
    Permission.VIEW_AUDIT_LOG
  ],

  [UserRole.VIEWER]: [
    Permission.VIEW_PRODUCT,
    Permission.VIEW_COVERAGE,
    Permission.VIEW_FORM,
    Permission.VIEW_PRICING,
    Permission.VIEW_RULE
  ],

  [UserRole.GUEST]: [
    Permission.VIEW_PRODUCT
  ]
};

/**
 * Role hook result
 */
export interface UseRoleResult {
  role: UserRole | null;
  loading: boolean;
  error: Error | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
}

/**
 * Get user role from custom claims
 */
async function getUserRole(): Promise<UserRole | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return UserRole.GUEST;
    }

    const idTokenResult = await user.getIdTokenResult(true);
    const role = idTokenResult.claims.role as UserRole | undefined;

    if (!role || !Object.values(UserRole).includes(role)) {
      logger.warn(LOG_CATEGORIES.AUTH, 'Invalid or missing role in claims', {
        userId: user.uid,
        role
      });
      return UserRole.VIEWER;
    }

    return role;
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to get user role', {}, error as Error);
    return UserRole.VIEWER;
  }
}

/**
 * useRole hook
 */
export function useRole(): UseRoleResult {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      try {
        setLoading(true);
        const userRole = await getUserRole();
        if (isMounted) {
          setRole(userRole);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setRole(UserRole.VIEWER);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRole();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      loadRole();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const permissions = role ? ROLE_PERMISSIONS[role] : [];

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };

  return {
    role,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: role === UserRole.ADMIN,
    isManager: role === UserRole.MANAGER,
    isAnalyst: role === UserRole.ANALYST,
    isViewer: role === UserRole.VIEWER
  };
}

/**
 * Check if user has permission (for non-hook contexts)
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

