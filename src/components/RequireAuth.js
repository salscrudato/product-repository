import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function RequireAuth({ children }) {
  const [authState, setAuthState] = useState('loading');
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in (either email/password or anonymous)
        if (user.isAnonymous) {
          sessionStorage.setItem('ph-authed', 'guest');
        } else {
          sessionStorage.setItem('ph-authed', '1');
        }
        setAuthState('authenticated');
      } else {
        // User is signed out
        sessionStorage.removeItem('ph-authed');
        setAuthState('unauthenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  // Show loading state while checking auth
  if (authState === 'loading') {
    return <div>Loading...</div>;
  }

  // Check both Firebase auth state and session storage
  const sessionStatus = sessionStorage.getItem('ph-authed');
  const isAuthenticated = authState === 'authenticated' && (sessionStatus === '1' || sessionStatus === 'guest');

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}