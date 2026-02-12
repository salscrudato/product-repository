/**
 * Role Context
 * Provides role-based access control throughout the application
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useRole } from '../hooks/useRole';
import { UserRole, RolePermissions, ROLE_DISPLAY_NAMES, ROLE_DESCRIPTIONS } from '../services/roleService';
import { User } from 'firebase/auth';

interface RoleContextValue {
  // Current user info
  user: User | null;
  role: UserRole;
  roleName: string;
  roleDescription: string;
  
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
  
  // Refresh
  refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const roleHook = useRole();

  const value: RoleContextValue = {
    ...roleHook,
    roleDescription: ROLE_DESCRIPTIONS[roleHook.role],
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

/**
 * Hook to use role context
 */
export const useRoleContext = (): RoleContextValue => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleProvider');
  }
  return context;
};

/**
 * Component to conditionally render based on role
 */
interface RequireRoleProps {
  role: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ 
  role, 
  children, 
  fallback = null 
}) => {
  const { hasRole, loading } = useRoleContext();
  
  if (loading) {
    return null;
  }
  
  if (!hasRole(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * Component to conditionally render based on permission
 */
interface RequirePermissionProps {
  permission: keyof RolePermissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { canPerform, loading } = useRoleContext();
  
  if (loading) {
    return null;
  }
  
  if (!canPerform(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

export default RoleContext;

