// src/components/RequireAuth.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getAuth, type User } from 'firebase/auth';
import logger, { LOG_CATEGORIES } from '@utils/logger';

/**
 * RequireAuth
 * 
 * Guards protected routes by verifying Firebase Auth state.
 * Provides a secure, reactive gate compared to sessionStorage.
 * - Displays a loading gate while determining auth status
 * - Redirects unauthenticated users to /login (with return path)
 * - Supports session fallback for local dev if needed
 */
interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const location = useLocation();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setAuthUser(user);
        setLoading(false);
        if (user) {
          logger.info(LOG_CATEGORIES.DATA, 'User authenticated', {
            uid: user.uid,
            email: user.email
          });
        } else {
          logger.info(LOG_CATEGORIES.DATA, 'No active Firebase session');
        }
      },
      (error) => {
        logger.error(LOG_CATEGORIES.ERROR, 'Auth state listener failed', {}, error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fallback for local development (when Firebase Auth may be disabled)
  const sessionStatus = sessionStorage.getItem('ph-authed');
  const sessionAuthenticated = sessionStatus === 'admin' || sessionStatus === 'guest';
  const isAuthenticated = !!authUser || sessionAuthenticated;

  if (loading) {
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

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default RequireAuth;