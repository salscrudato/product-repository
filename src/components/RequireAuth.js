import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const authed = sessionStorage.getItem('ph-authed') === '1';
  const loc    = useLocation();
  return authed ? children : <Navigate to="/login" state={{ from: loc }} replace />;
}