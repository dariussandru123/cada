import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import UATDashboardNew from './components/UATDashboardNew'; // Updated import
import { LogOut, Shield, Building2 } from 'lucide-react';

function AppContent() {
  const { currentUser, userData, signOut } = useAuth();

  console.log('🔍 AppContent render:', {
    hasUser: !!currentUser,
    userEmail: currentUser?.email,
    userData: userData,
    userRole: userData?.role
  });

  if (!currentUser) {
    console.log('👤 No user - showing login');
    return <Login />;
  }

  if (!userData) {
    console.log('⏳ User exists but userData not loaded yet');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele utilizatorului...</p>
        </div>
      </div>
    );
  }

  console.log('✅ User and userData loaded, role:', userData.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PC</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">PlatCAD</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                {userData?.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-purple-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-blue-600" />
                )}
                <span className="text-gray-700">{userData?.email}</span>
                {userData?.role === 'admin' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    Admin
                  </span>
                )}
                {userData?.role === 'city_hall_manager' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    UAT Manager
                  </span>
                )}
              </div>
              
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Ieșire</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/uat"
            element={
              <ProtectedRoute allowedRoles={['city_hall_manager']}>
                <div className="h-[calc(100vh-12rem)]">
                  <UATDashboardNew /> {/* Updated Component */}
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
