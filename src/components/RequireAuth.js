import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const location = useLocation();

  // Check for admin session only
  const sessionStatus = sessionStorage.getItem('ph-authed');
  const isAuthenticated = sessionStatus === 'admin';

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}