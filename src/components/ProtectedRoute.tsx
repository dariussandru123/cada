import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userData } = useAuth();

  console.log('🛡️ ProtectedRoute check:', {
    hasUser: !!currentUser,
    userData: userData,
    userRole: userData?.role,
    allowedRoles
  });

  if (!currentUser) {
    console.log('❌ No user - redirecting to login');
    return <Navigate to="/" replace />;
  }

  if (!userData) {
    console.log('⏳ Waiting for userData...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifică permisiunile...</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userData.role)) {
    console.log('❌ Access denied - role not allowed');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acces Interzis</h2>
          <p className="text-gray-600">Nu aveți permisiunea de a accesa această pagină.</p>
          <p className="text-sm text-gray-500 mt-4">Rol curent: {userData.role}</p>
          <p className="text-sm text-gray-500">Roluri permise: {allowedRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  console.log('✅ Access granted');
  return <>{children}</>;
}
