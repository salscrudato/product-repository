import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  // Treat both full users ("1") and guest sessions ("guest") as authenticated
  const status = sessionStorage.getItem('ph-authed');
  const authed = status === '1' || status === 'guest';
  const loc    = useLocation();
  return authed ? children : <Navigate to="/login" state={{ from: loc }} replace />;
}