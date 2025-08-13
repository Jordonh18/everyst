import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext'; 
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
import { ToolsPage } from './pages/tools/ToolsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import NetworkMapPage from './pages/network/NetworkMapPage';
import UsersManagementPage from './pages/users/UsersManagementPage';
import ActivityLogs from './pages/activity/ActivityLogs';
import PermissionGate from './components/auth/PermissionGate';
import { ThemeProvider } from "@/components/theme-provider"
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <AuthProvider>
            <NotificationProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                  <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute />}>
                    {/* Redirect from root to dashboard */}
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    {/* Use the actual DashboardPage component for the dashboard page */}
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="network" element={<NetworkMapPage />} />
                    <Route path="metrics" element={<div className="p-4">Metrics (Coming Soon)</div>} />
                    <Route path="security" element={<div className="p-4">Security (Coming Soon)</div>} />
                    <Route path="logs" element={<PermissionGate permission="canViewLogs" fallback={<Navigate to="/dashboard" replace />}><ActivityLogs /></PermissionGate>} />
                    <Route path="alerts" element={<div className="p-4">Alerts (Coming Soon)</div>} />
                    <Route path="integrations" element={<IntegrationsPage />} />
                    <Route path="tools" element={<ToolsPage />} />
                    <Route path="users" element={<PermissionGate permission="canManageUsers" fallback={<Navigate to="/dashboard" replace />}><UsersManagementPage /></PermissionGate>} />
                    <Route path="settings" element={<div className="p-4">Settings (Coming Soon)</div>} />
                    <Route path="account" element={<AccountSettingsPage />} />
                    <Route path="*" element={<div className="p-4">Page not found</div>} />
                  </Route>
                </Routes>
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
