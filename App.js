import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Import pages
import ActivitiesManagement from './pages/ActivitiesManagement';
import AdminUsersManagementPage from './pages/AdminUsersManagementPage';
import BookingPage from './pages/BookingPage'; // New import for Bookings
import ContentManagement from './pages/ContentManagement';
import HomePage from './pages/HomePage';
import HomePageManagement from './pages/HomePageManagement';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';
import MarketingPage from './pages/MarketingPage';
import MyProfilePage from './pages/MyProfilePage';
import PartnersManagement from './pages/PartnersManagement';
import RequestsPage from './pages/RequestsPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import UsersManagementPage from './pages/UsersManagementPage';
import PublicActivationPage from './PublicActivationPage'; // Public activation page (no login required)
import TestActivationPage from './TestActivationPage'; // Test page
import WebActivationPage from './WebActivationPage'; // New import for Ticket Activation

// Layout for authenticated pages
const AdminLayout = ({ children, userRole }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', path: '/home', icon: '📊', roles: ['super_admin', 'agent'] },
    { name: 'Manage Home App', path: '/home-page-management', icon: '🏠', roles: ['super_admin'] },
    { name: 'Content Management', path: '/content-management', icon: '📝', roles: ['super_admin'] },
    { name: 'Partners', path: '/partners', icon: '🤝', roles: ['super_admin'] },
    { name: 'Activities', path: '/activities', icon: '🎯', roles: ['super_admin'] },
    { name: 'Marketing', path: '/marketing', icon: '📢', roles: ['super_admin', 'agent'] },
    { name: 'Sales', path: '/sales', icon: '💰', roles: ['super_admin'] },
    { name: 'Users', path: '/users', icon: '👥', roles: ['super_admin', 'agent'] },
    { name: 'Requests', path: '/requests', icon: '📨', roles: ['super_admin', 'agent'] },
    { name: 'Bookings', path: '/bookings', icon: '📅', roles: ['super_admin', 'agent'] }, // New navigation item
    { name: 'Ticket Activation', path: '/activate', icon: '🎫', roles: ['super_admin', 'agent'] }, // New navigation item
    { name: 'Logs', path: '/logs', icon: '📋', roles: ['super_admin'] },
    { name: 'Admin Users', path: '/admin-users', icon: '👨‍💼', roles: ['super_admin'] },
    { name: 'My Profile', path: '/profile', icon: '👤', roles: ['super_admin', 'agent'] },
  ];

  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 bg-purple-600">
          <h1 className="text-xl font-bold text-white">Basmah Jo Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {filteredNavigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
            >
              <span className="mr-3">🚪</span>
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              ☰
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {userRole === 'super_admin' ? 'Super Admin' : 'Agent'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Protected route
const ProtectedRoute = ({ children, allowedRoles = ['super_admin', 'agent'] }) => {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          setUserRole(adminUser?.role || 'agent');
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('email', session.user.email)
          .single();

        setUserRole(adminUser?.role || 'agent');
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return userRole === 'agent' ? (
      <Navigate to="/users" replace />
    ) : (
      <Navigate to="/home" replace />
    );
  }

  return <AdminLayout userRole={userRole}>{children}</AdminLayout>;
};

// Main App
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/home-page-management" element={<ProtectedRoute allowedRoles={['super_admin']}><HomePageManagement /></ProtectedRoute>} />
        <Route path="/content-management" element={<ProtectedRoute allowedRoles={['super_admin']}><ContentManagement /></ProtectedRoute>} />
        <Route path="/partners" element={<ProtectedRoute allowedRoles={['super_admin']}><PartnersManagement /></ProtectedRoute>} />
        <Route path="/activities" element={<ProtectedRoute allowedRoles={['super_admin']}><ActivitiesManagement /></ProtectedRoute>} />
        <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute allowedRoles={['super_admin']}><SalesDashboardPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersManagementPage /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} /> {/* New route */}
        <Route path="/activate" element={<ProtectedRoute><WebActivationPage /></ProtectedRoute>} /> {/* Admin activation route */}
        <Route path="/ticket" element={<PublicActivationPage />} /> {/* Public activation route - no login required */}
        <Route path="/test" element={<TestActivationPage />} /> {/* Test route - no login required */}
        <Route path="/logs" element={<ProtectedRoute allowedRoles={['super_admin']}><LogsPage /></ProtectedRoute>} />
        <Route path="/admin-users" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUsersManagementPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />
        <Route path="/" element={session ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;