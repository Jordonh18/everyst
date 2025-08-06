import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext'; 
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SummitDashboard } from './pages/summit/SummitDashboard';
import { BasecampIntegrations } from './pages/basecamp/BasecampIntegrations';
import { GearRoomTools } from './pages/gearroom/GearRoomTools';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import GlacierNetworkMap from './pages/glacier/GlacierNetworkMap';
import ClimbersUserManagement from './pages/climbers/ClimbersUserManagement';
import ActivityLogs from './pages/activity/ActivityLogs';
import PermissionGate from './components/auth/PermissionGate';
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
                    {/* Redirect from root to summit dashboard */}
                    <Route index element={<Navigate to="/summit" replace />} />
                    {/* Use the actual SummitDashboard component for the summit page */}
                    <Route path="summit" element={<SummitDashboard />} />
                    <Route path="network-map" element={<GlacierNetworkMap />} />
                    <Route path="metrics" element={<div className="p-4">Altitude Metrics (Coming Soon)</div>} />
                    <Route path="security" element={<div className="p-4">IceWall Security (Coming Soon)</div>} />
                    <Route path="logs" element={<PermissionGate permission="canViewLogs" fallback={<Navigate to="/summit" replace />}><ActivityLogs /></PermissionGate>} />
                    <Route path="alerts" element={<div className="p-4">Avalanche Alerts (Coming Soon)</div>} />
                    <Route path="integrations" element={<BasecampIntegrations />} />
                    <Route path="tools" element={<GearRoomTools />} />
                    <Route path="climbers" element={<PermissionGate permission="canManageUsers" fallback={<Navigate to="/summit" replace />}><ClimbersUserManagement /></PermissionGate>} />
                    <Route path="settings" element={<div className="p-4">ControlRoom Settings (Coming Soon)</div>} />
                    <Route path="account" element={<AccountSettingsPage />} />
                    <Route path="*" element={<div className="p-4">Page not found</div>} />
                  </Route>
                </Routes>
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
