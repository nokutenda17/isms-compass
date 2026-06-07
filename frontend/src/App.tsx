import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { Layout } from './components/layout/Layout';
import { RoleGuard } from './components/RoleGuard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AcceptInvite } from './pages/AcceptInvite';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { Dashboard } from './pages/Dashboard';
import { StepOverview } from './pages/StepOverview';
import { RiskRegister } from './pages/RiskRegister';
import { MonitoringScreen } from './pages/MonitoringScreen';
import { UserManagement } from './pages/UserManagement';
import { DocumentExport } from './pages/DocumentExport';
import { StatementOfApplicability } from './pages/StatementOfApplicability';
import { StepModule } from './pages/StepModule';
import { AuditLog } from './pages/AuditLog';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/accept-invite" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AcceptInvite />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />

      <Route path="/onboarding" element={
        isAuthenticated ? <OnboardingWizard /> : <Navigate to="/" replace />
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/steps" element={
        <ProtectedRoute>
          <StepOverview />
        </ProtectedRoute>
      } />

      <Route path="/steps/:stepNumber" element={
        <ProtectedRoute>
          <StepModule />
        </ProtectedRoute>
      } />

      <Route path="/risks" element={
        <ProtectedRoute>
          <RiskRegister />
        </ProtectedRoute>
      } />

      <Route path="/soa" element={
        <ProtectedRoute>
          <StatementOfApplicability />
        </ProtectedRoute>
      } />

      <Route path="/documents" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['ISMS_Owner']}>
            <DocumentExport />
          </RoleGuard>
        </ProtectedRoute>
      } />

      <Route path="/monitoring" element={
        <ProtectedRoute>
          <MonitoringScreen />
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['ISMS_Owner']}>
            <UserManagement />
          </RoleGuard>
        </ProtectedRoute>
      } />

      <Route path="/audit-log" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['ISMS_Owner', 'Auditor']}>
            <AuditLog />
          </RoleGuard>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['ISMS_Owner']}>
            <Settings />
          </RoleGuard>
        </ProtectedRoute>
      } />

      <Route path="*" element={
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
          <SonnerToaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
