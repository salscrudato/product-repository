import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function RequireAuth({ children }) {
  const [authState, setAuthState] = useState('loading');
  const [sessionCheck, setSessionCheck] = useState(0); // Force re-check trigger
  const location = useLocation();

  useEffect(() => {
    // Check for admin session immediately on mount
    const currentSession = sessionStorage.getItem('ph-authed');
    if (currentSession === 'admin') {
      setAuthState('authenticated');
      return; // No Firebase listener needed for admin sessions
    }

    // Set up Firebase auth listener for non-admin sessions
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
        // User is signed out - but check if this is an admin session first
        const currentSession = sessionStorage.getItem('ph-authed');
        if (currentSession !== 'admin') {
          // Only clear session if it's not an admin session
          sessionStorage.removeItem('ph-authed');
          setAuthState('unauthenticated');
        } else {
          // Admin session exists, consider as authenticated
          setAuthState('authenticated');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Add a separate effect to periodically check session storage for admin login
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSession = sessionStorage.getItem('ph-authed');
      if (currentSession === 'admin' && authState !== 'authenticated') {
        setAuthState('authenticated');
        setSessionCheck(prev => prev + 1); // Trigger re-render
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [authState, sessionCheck]);

  // Show loading state while checking auth
  if (authState === 'loading') {
    return <div>Loading...</div>;
  }

  // Check both Firebase auth state and session storage
  const sessionStatus = sessionStorage.getItem('ph-authed');
  const isAuthenticated =
    (authState === 'authenticated' && (sessionStatus === '1' || sessionStatus === 'guest')) ||
    sessionStatus === 'admin';



  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}