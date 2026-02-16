/**
 * AuthContext
 * 
 * Provides authentication context with primaryOrgId for org-scoped operations.
 * This is a convenience wrapper around useRole that exposes auth-related values.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useRole } from '../hooks/useRole';

interface AuthContextValue {
  user: User | null;
  primaryOrgId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, currentOrg, userProfile, loading, orgLoading } = useRole();
  
  const value: AuthContextValue = {
    user,
    primaryOrgId: currentOrg?.id || userProfile?.primaryOrgId || null,
    loading: loading || orgLoading,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context with primaryOrgId
 *
 * Note: This hook always calls useRole to maintain consistent hook order.
 * If wrapped in AuthProvider, it uses the context value instead.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  // Always call useRole to maintain consistent hook order (Rules of Hooks)
  const { user, currentOrg, userProfile, loading, orgLoading } = useRole();

  // If wrapped in AuthProvider, use context value
  if (context !== undefined) {
    return context;
  }

  // Fallback: use useRole values directly
  return {
    user,
    primaryOrgId: currentOrg?.id || userProfile?.primaryOrgId || null,
    loading: loading || orgLoading,
  };
};

export default AuthContext;

