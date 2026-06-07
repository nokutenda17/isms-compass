import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
