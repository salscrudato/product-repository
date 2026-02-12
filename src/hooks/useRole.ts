/**
 * useRole Hook
 * React hook for managing user roles and permissions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import {
  UserRole,
  ROLES,
  getPermissionsForRole,
  RolePermissions,
  ROLE_DISPLAY_NAMES,
} from '../services/roleService';
import logger, { LOG_CATEGORIES } from '../utils/logger';

interface UseRoleResult {
  // Current user info
  user: User | null;
  role: UserRole;
  roleName: string;
  
  // Permissions
  permissions: RolePermissions;
  
  // Permission checks
  isAdmin: boolean;
  isProductManager: boolean;
  isUnderwriter: boolean;
  isViewer: boolean;
  
  // Convenience methods
  hasRole: (requiredRole: UserRole) => boolean;
  canPerform: (action: keyof RolePermissions) => boolean;
  
  // Loading state
  loading: boolean;
  
  // Refresh the role from token
  refreshRole: () => Promise<void>;
}

/**
 * Hook to get current user's role and permissions
 */
export const useRole = (): UseRoleResult => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  // Fetch role from token
  const fetchRole = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setRole('viewer');
      return;
    }

    try {
      const tokenResult = await currentUser.getIdTokenResult();
      const tokenRole = tokenResult.claims.role as UserRole;
      setRole(tokenRole && ROLES.includes(tokenRole) ? tokenRole : 'viewer');
    } catch (error) {
      logger.error(LOG_CATEGORIES.AUTH, 'Error fetching role from token', {}, error as Error);
      setRole('viewer');
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchRole(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchRole]);

  // Refresh role (useful after role change)
  const refreshRole = useCallback(async () => {
    if (user) {
      // Force refresh the token to get new claims
      await user.getIdToken(true);
      await fetchRole(user);
    }
  }, [user, fetchRole]);

  // Memoized permissions
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  // Role checks
  const hasRoleCheck = useCallback(
    (requiredRole: UserRole) => {
      return ROLES.indexOf(role) >= ROLES.indexOf(requiredRole);
    },
    [role]
  );

  const canPerform = useCallback(
    (action: keyof RolePermissions) => {
      return permissions[action];
    },
    [permissions]
  );

  return {
    user,
    role,
    roleName: ROLE_DISPLAY_NAMES[role],
    permissions,
    isAdmin: role === 'admin',
    isProductManager: hasRoleCheck('product_manager'),
    isUnderwriter: hasRoleCheck('underwriter'),
    isViewer: hasRoleCheck('viewer'),
    hasRole: hasRoleCheck,
    canPerform,
    loading,
    refreshRole,
  };
};

export default useRole;

