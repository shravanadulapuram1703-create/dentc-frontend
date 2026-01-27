import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, memo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AIChatProvider, useAIChat } from './contexts/AIChatContext';
import { Loader2 } from 'lucide-react';
import { SkeletonCard } from './components/ui/skeleton';

// Lazy load all route components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Scheduler = lazy(() => import('./components/pages/Scheduler'));
const Patient = lazy(() => import('./components/pages/Patient'));
const PatientShellLayout = lazy(() => import('./components/PatientShellLayout'));
const PatientOverview = lazy(() => import('./components/patient/overview/PatientOverview'));
const PatientLedger = lazy(() => import('./components/pages/PatientLedger'));
const Transactions = lazy(() => import('./components/pages/Transactions'));
const Charting = lazy(() => import('./components/pages/Charting'));
const Reports = lazy(() => import('./components/pages/Reports'));
const Utilities = lazy(() => import('./components/pages/Utilities'));
const Setup = lazy(() => import('./components/pages/Setup'));
const Help = lazy(() => import('./components/pages/Help'));
const MyPage = lazy(() => import('./components/pages/MyPage'));
const PlaceholderPage = lazy(() => import('./components/PlaceholderPage'));
const GlobalNav = lazy(() => import('./components/GlobalNav'));
const PatientNotesListing = lazy(() => import('./components/patient/PatientNotesListing'));
const AddEditPatientNote = lazy(() => import('./components/patient/AddEditPatientNote'));
const ProgressNotesListing = lazy(() => import('./components/patient/ProgressNotesListing'));
const AddEditProgressNote = lazy(() => import('./components/patient/AddEditProgressNote'));
const ClaimDetail = lazy(() => import('./components/patient/ClaimDetail'));
const UserSetup = lazy(() => import('./components/pages/setup/UserSetup'));
const OfficeSetup = lazy(() => import('./components/setup/offices/OfficeSetup'));
const TenantSetup = lazy(() => import('./components/pages/setup/TenantSetup'));
const AIChat = lazy(() => import('./components/ai-chat/AIChat'));
const AddNewPatient = lazy(() => import('./components/pages/AddNewPatient'));

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="fixed inset-0 flex items-center justify-center bg-transparent z-50">
    <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
      <p className="text-[#1F3A5F] font-medium">Loading...</p>
    </div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

// Wrapper for global admin pages (memoized)
const AdminPageWrapper = memo(({ 
  children, 
  onLogout, 
  currentOffice, 
  setCurrentOffice 
}: { 
  children: React.ReactNode; 
  onLogout: () => void; 
  currentOffice: string; 
  setCurrentOffice: (office: string) => void;
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<LoadingFallback />}>
        <GlobalNav 
          onLogout={onLogout} 
          currentOffice={currentOffice}
          setCurrentOffice={setCurrentOffice}
        />
      </Suspense>
      <div className="pt-[120px]">
        {children}
      </div>
    </div>
  );
});

AdminPageWrapper.displayName = 'AdminPageWrapper';

// Main routes component (memoized to prevent unnecessary re-renders)
const AppRoutes = memo(() => {
  const { isAuthenticated, user, logout, currentOffice, setCurrentOffice, login, isLoggingOut } = useAuth();

  return (
    <Routes>
      {/* Authentication Pages */}
      <Route path="/login" element={
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        </Suspense>
      } />
      <Route path="/forgot-password" element={
        <Suspense fallback={<LoadingFallback />}>
          <ForgotPasswordPage />
        </Suspense>
      } />
      <Route path="/signup" element={
        <Suspense fallback={<LoadingFallback />}>
          <SignUpPage />
        </Suspense>
      } />
      <Route path="/login-old" element={
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={login} />}
        </Suspense>
      } />
      
      {/* Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <Dashboard onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} user={user} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* Scheduler (Global) */}
      <Route 
        path="/scheduler" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <Scheduler onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* Patient Search/List (Global Entry Point) */}
      <Route 
        path="/patient" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <Patient onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />

      {/* Add New Patient */}
      <Route 
        path="/patient/new" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <AddNewPatient onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* PATIENT CONTEXT SHELL - Persistent Container with Nested Routes */}
      <Route 
        path="/patient/:patientId/*" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <PatientShellLayout onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        }
      >
        {/* Patient Pages - Lazy loaded */}
        <Route path="overview" element={
          <Suspense fallback={<SkeletonCard />}>
            <PatientOverview />
          </Suspense>
        } />
        <Route path="ledger" element={
          <Suspense fallback={<SkeletonCard />}>
            <PatientLedger />
          </Suspense>
        } />
        <Route path="transaction" element={
          <Suspense fallback={<SkeletonCard />}>
            <Transactions />
          </Suspense>
        } />
        <Route path="restorative" element={
          <Suspense fallback={<SkeletonCard />}>
            <Charting />
          </Suspense>
        } />
        
        {/* Payment Plan */}
        <Route path="payment-plan/regular" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Regular Payment Plan" description="Manage patient payment plans" />
          </Suspense>
        } />
        <Route path="payment-plan/ortho" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Ortho Payment Plan" description="Manage orthodontic payment plans" />
          </Suspense>
        } />
        
        {/* Insurance - Dental */}
        <Route path="insurance/dental/primary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Primary Dental Insurance" />
          </Suspense>
        } />
        <Route path="insurance/dental/secondary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Secondary Dental Insurance" />
          </Suspense>
        } />
        <Route path="insurance/dental/tertiary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Tertiary Dental Insurance" />
          </Suspense>
        } />
        <Route path="insurance/dental/quaternary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Quaternary Dental Insurance" />
          </Suspense>
        } />
        
        {/* Insurance - Medical */}
        <Route path="insurance/medical/primary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Primary Medical Insurance" />
          </Suspense>
        } />
        <Route path="insurance/medical/secondary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Secondary Medical Insurance" />
          </Suspense>
        } />
        <Route path="insurance/medical/tertiary" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Tertiary Medical Insurance" />
          </Suspense>
        } />
        
        {/* Insurance Forms */}
        <Route path="insurance-forms/dental" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Dental Insurance Forms" />
          </Suspense>
        } />
        <Route path="insurance-forms/medical" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Medical Insurance Forms" />
          </Suspense>
        } />
        
        {/* Other Patient Pages */}
        <Route path="perio" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Periodontal Charting" />
          </Suspense>
        } />
        <Route path="notes" element={
          <Suspense fallback={<SkeletonCard />}>
            <PatientNotesListing />
          </Suspense>
        } />
        <Route path="notes/new" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditPatientNote mode="add" />
          </Suspense>
        } />
        <Route path="notes/edit/:noteId" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditPatientNote mode="edit" />
          </Suspense>
        } />
        <Route path="notes/view/:noteId" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditPatientNote mode="view" />
          </Suspense>
        } />
        <Route path="progress-notes" element={
          <Suspense fallback={<SkeletonCard />}>
            <ProgressNotesListing />
          </Suspense>
        } />
        <Route path="progress-notes/new" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditProgressNote mode="add" />
          </Suspense>
        } />
        <Route path="progress-notes/edit/:noteId" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditProgressNote mode="edit" />
          </Suspense>
        } />
        <Route path="progress-notes/view/:noteId" element={
          <Suspense fallback={<SkeletonCard />}>
            <AddEditProgressNote mode="view" />
          </Suspense>
        } />
        <Route path="claim/:claimId" element={
          <Suspense fallback={<SkeletonCard />}>
            <ClaimDetail />
          </Suspense>
        } />
        <Route path="treatment" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Treatment Plan" />
          </Suspense>
        } />
        <Route path="prescriptions" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Prescriptions" />
          </Suspense>
        } />
        <Route path="documents" element={
          <Suspense fallback={<SkeletonCard />}>
            <PlaceholderPage title="Documents" />
          </Suspense>
        } />
        
        {/* Default - Redirect to Overview */}
        <Route index element={<Navigate to="overview" replace />} />
      </Route>
      
      {/* Legacy Redirects */}
      <Route path="/patient-overview" element={<Navigate to="/patient/12345/overview" replace />} />
      <Route path="/patient-ledger" element={<Navigate to="/patient/12345/ledger" replace />} />
      
      {/* REPORTS (Global Admin Context) */}
      <Route 
        path="/reports" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
                <Reports onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
              </AdminPageWrapper> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* SETUP (Strict Admin Context) */}
      <Route 
        path="/setup" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
                <Setup onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
              </AdminPageWrapper> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* Setup - Offices */}
      <Route path="/setup/offices/office-setup" element={
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? 
            <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
              <OfficeSetup />
            </AdminPageWrapper> : 
            <Navigate to="/login" />
          }
        </Suspense>
      } />
      
      {/* Setup - Tenant (Super Admin Only) */}
      <Route path="/setup/tenant" element={
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? 
            <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
              <TenantSetup />
            </AdminPageWrapper> : 
            <Navigate to="/login" />
          }
        </Suspense>
      } />
      
      {/* Setup - Security */}
      <Route path="/setup/security/users" element={
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? 
            <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
              <UserSetup onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
            </AdminPageWrapper> : 
            <Navigate to="/login" />
          }
        </Suspense>
      } />
      
      {/* UTILITIES (Global Admin Context) */}
      <Route 
        path="/utilities" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
                <Utilities onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
              </AdminPageWrapper> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* Help & My Page */}
      <Route 
        path="/help" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <Help onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      <Route 
        path="/my-page" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            {isAuthenticated ? 
              <MyPage onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
              <Navigate to="/login" />
            }
          </Suspense>
        } 
      />
      
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
});

AppRoutes.displayName = 'AppRoutes';

// Logout Loading Overlay Component (memoized)
const LogoutOverlay = memo(() => {
  const { isLoggingOut } = useAuth();
  
  if (!isLoggingOut) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <Loader2 className="w-12 h-12 text-[#3A6EA5] animate-spin" />
        <p className="text-[#1E293B] font-bold text-lg">Logging out...</p>
        <p className="text-[#64748B] text-sm text-center">
          Please wait while we securely log you out
        </p>
      </div>
    </div>
  );
});

LogoutOverlay.displayName = 'LogoutOverlay';

// App Content (memoized)
const AppContent = memo(() => {
  const { chatWidth } = useAIChat();

  return (
    <div 
      style={{ 
        marginRight: chatWidth > 0 ? `${chatWidth}px` : '0',
        transition: 'margin-right 0.3s ease-in-out'
      }}
    >
      <AppRoutes />
      <LogoutOverlay />
      {/* Global AI Chat Assistant - Available on all screens */}
      <Suspense fallback={null}>
        <AIChat />
      </Suspense>
    </div>
  );
});

AppContent.displayName = 'AppContent';

// Main App component
export default function App() {
  return (
    <AuthProvider>
      <AIChatProvider>
        <Router>
          <AppContent />
        </Router>
      </AIChatProvider>
    </AuthProvider>
  );
}
