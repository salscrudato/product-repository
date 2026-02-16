/**
 * Role Context
 * Provides role-based access control throughout the application
 * Extended with multi-tenant organization context
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useRole } from '../hooks/useRole';
import { UserRole, RolePermissions, ROLE_DISPLAY_NAMES, ROLE_DESCRIPTIONS } from '../services/roleService';
import { OrgRole, OrgMember, Organization, UserProfile, OrgRolePermissions, ORG_ROLE_DESCRIPTIONS } from '../services/orgService';
import { User } from 'firebase/auth';

interface RoleContextValue {
  // Current user info
  user: User | null;
  role: UserRole;
  roleName: string;
  roleDescription: string;

  // Org context
  currentOrg: Organization | null;
  /** Convenience shorthand for currentOrg?.id ?? '' */
  currentOrgId: string;
  orgRole: OrgRole | null;
  orgRoleName: string;
  orgRoleDescription: string;
  orgMembership: OrgMember | null;
  userProfile: UserProfile | null;
  userOrgs: Array<{ org: Organization; membership: OrgMember }>;
  hasOrg: boolean;

  // Permissions
  permissions: RolePermissions;
  orgPermissions: OrgRolePermissions | null;

  // Permission checks
  isAdmin: boolean;
  isProductManager: boolean;
  isUnderwriter: boolean;
  isViewer: boolean;

  // Org role checks
  isOrgAdmin: boolean;
  isOrgProductManager: boolean;
  canManageMembers: boolean;
  canWriteProducts: boolean;
  canApprove: boolean;
  canPublish: boolean;

  // Convenience methods
  hasRole: (requiredRole: UserRole) => boolean;
  canPerform: (action: keyof RolePermissions) => boolean;
  hasOrgRole: (requiredRole: OrgRole) => boolean;
  canPerformOrgAction: (action: keyof OrgRolePermissions) => boolean;

  // Loading state
  loading: boolean;
  orgLoading: boolean;

  // Refresh/Actions
  refreshRole: () => Promise<void>;
  refreshOrg: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const roleHook = useRole();

  const value: RoleContextValue = {
    ...roleHook,
    currentOrgId: roleHook.currentOrg?.id ?? '',
    roleDescription: ROLE_DESCRIPTIONS[roleHook.role],
    orgRoleDescription: roleHook.orgRole ? ORG_ROLE_DESCRIPTIONS[roleHook.orgRole] : '',
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

/**
 * Component to conditionally render based on org role
 */
interface RequireOrgRoleProps {
  role: OrgRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireOrgRole: React.FC<RequireOrgRoleProps> = ({
  role,
  children,
  fallback = null
}) => {
  const { hasOrgRole, orgLoading, hasOrg } = useRoleContext();

  if (orgLoading) {
    return null;
  }

  if (!hasOrg || !hasOrgRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Component to conditionally render based on org permission
 */
interface RequireOrgPermissionProps {
  permission: keyof OrgRolePermissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireOrgPermission: React.FC<RequireOrgPermissionProps> = ({
  permission,
  children,
  fallback = null
}) => {
  const { canPerformOrgAction, orgLoading, hasOrg } = useRoleContext();

  if (orgLoading) {
    return null;
  }

  if (!hasOrg || !canPerformOrgAction(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Component to require org membership
 */
interface RequireOrgMembershipProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireOrgMembership: React.FC<RequireOrgMembershipProps> = ({
  children,
  fallback = null
}) => {
  const { hasOrg, orgLoading, user } = useRoleContext();

  if (orgLoading) {
    return null;
  }

  if (!user || !hasOrg) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleContext;

