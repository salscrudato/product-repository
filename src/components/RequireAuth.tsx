// src/components/RequireAuth.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRoleContext } from '../context/RoleContext';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/**
 * RequireAuth
 *
 * Guards protected routes by verifying Firebase Auth state and org membership.
 * - Displays a loading gate while determining auth/org status
 * - Redirects unauthenticated users to /login (with return path)
 * - Redirects users without org membership to /org/select
 */
interface RequireAuthProps {
  children: React.ReactNode;
  /** If true, requires org membership. Defaults to true. */
  requireOrg?: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children, requireOrg = true }) => {
  const location = useLocation();
  const { user, loading: authLoading, hasOrg, orgLoading, currentOrg } = useRoleContext();

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          color: '#6b7280',
          fontSize: 16
        }}
      >
        Checking authentication…
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    logger.info(LOG_CATEGORIES.DATA, 'No active Firebase session, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If org is required, check org membership
  if (requireOrg) {
    // Show loading while checking org
    if (orgLoading) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            color: '#6b7280',
            fontSize: 16
          }}
        >
          Loading organization…
        </div>
      );
    }

    // Redirect to org selection if user has no org
    if (!hasOrg || !currentOrg) {
      logger.info(LOG_CATEGORIES.DATA, 'User has no org membership, redirecting to org select', {
        uid: user.uid
      });
      return <Navigate to="/org/select" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

export default RequireAuth;