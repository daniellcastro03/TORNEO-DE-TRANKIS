import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span className="logo-text">TORNEITOS DE TRANKIS</span>
      </div>
    );
  }

  // If requires full auth (not guest)
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // If it doesn't require full auth (so guest is OK) but user is not logged in AND not guest
  if (!requireAuth && !user && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
