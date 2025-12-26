// import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import Login from './components/Login.js';
import LoginPage from './pages/LoginPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';
import SignUpPage from './pages/SignUpPage.js';
import Dashboard from './components/Dashboard.js';
import Scheduler from './components/pages/Scheduler.js';
import Patient from './components/pages/Patient.js';
import PatientShellLayout from './components/PatientShellLayout.js';
import PatientOverview from './components/pages/PatientOverview.js';
import PatientLedger from './components/pages/PatientLedger.js';
import Transactions from './components/pages/Transactions.js';
import Charting from './components/pages/Charting.js';
import Reports from './components/pages/Reports.js';
import Utilities from './components/pages/Utilities.js';
import Setup from './components/pages/Setup.js';
import Help from './components/pages/Help.js';
import MyPage from './components/pages/MyPage.js';
import PlaceholderPage from './components/PlaceholderPage.js';
import GlobalNav from './components/GlobalNav.js';
import PatientNotesListing from './components/patient/PatientNotesListing.js';
import AddEditPatientNote from './components/patient/AddEditPatientNote.js';
import ProgressNotesListing from './components/patient/ProgressNotesListing.js';
import AddEditProgressNote from './components/patient/AddEditProgressNote.js';
import ClaimDetail from './components/patient/ClaimDetail.js';

// Wrapper for global admin pages
function AdminPageWrapper({ 
  children, 
  onLogout, 
  currentOffice, 
  setCurrentOffice 
}: { 
  children: React.ReactNode; 
  onLogout: () => void; 
  currentOffice: string; 
  setCurrentOffice: (office: string) => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />
      {children}
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user, logout, currentOffice, setCurrentOffice, login } = useAuth();

  return (
    <Routes>
      {/* Authentication Pages */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login-old" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={login} />} />
      
      {/* Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          isAuthenticated ? 
          <Dashboard onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} user={user} /> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Scheduler (Global) */}
      <Route 
        path="/scheduler" 
        element={
          isAuthenticated ? 
          <Scheduler onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Patient Search/List (Global Entry Point) */}
      <Route 
        path="/patient" 
        element={
          isAuthenticated ? 
          <Patient onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* PATIENT CONTEXT SHELL - Persistent Container with Nested Routes */}
      <Route 
        path="/patient/:patientId/*" 
        element={
          isAuthenticated ? 
          <PatientShellLayout onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
          <Navigate to="/login" />
        }
      >
        {/* Patient Pages */}
        <Route path="overview" element={<PatientOverview />} />
        <Route path="ledger" element={<PatientLedger />} />
        <Route path="transaction" element={<Transactions />} />
        <Route path="restorative" element={<Charting />} />
        
        {/* Payment Plan */}
        <Route path="payment-plan/regular" element={<PlaceholderPage title="Regular Payment Plan" description="Manage patient payment plans" />} />
        <Route path="payment-plan/ortho" element={<PlaceholderPage title="Ortho Payment Plan" description="Manage orthodontic payment plans" />} />
        
        {/* Insurance - Dental */}
        <Route path="insurance/dental/primary" element={<PlaceholderPage title="Primary Dental Insurance" />} />
        <Route path="insurance/dental/secondary" element={<PlaceholderPage title="Secondary Dental Insurance" />} />
        <Route path="insurance/dental/tertiary" element={<PlaceholderPage title="Tertiary Dental Insurance" />} />
        <Route path="insurance/dental/quaternary" element={<PlaceholderPage title="Quaternary Dental Insurance" />} />
        
        {/* Insurance - Medical */}
        <Route path="insurance/medical/primary" element={<PlaceholderPage title="Primary Medical Insurance" />} />
        <Route path="insurance/medical/secondary" element={<PlaceholderPage title="Secondary Medical Insurance" />} />
        <Route path="insurance/medical/tertiary" element={<PlaceholderPage title="Tertiary Medical Insurance" />} />
        
        {/* Insurance Forms */}
        <Route path="insurance-forms/dental" element={<PlaceholderPage title="Dental Insurance Forms" />} />
        <Route path="insurance-forms/medical" element={<PlaceholderPage title="Medical Insurance Forms" />} />
        
        {/* Other Patient Pages */}
        <Route path="perio" element={<PlaceholderPage title="Periodontal Charting" />} />
        <Route path="notes" element={<PatientNotesListing />} />
        <Route path="notes/new" element={<AddEditPatientNote mode="add" />} />
        <Route path="notes/edit/:noteId" element={<AddEditPatientNote mode="edit" />} />
        <Route path="notes/view/:noteId" element={<AddEditPatientNote mode="view" />} />
        <Route path="progress-notes" element={<ProgressNotesListing />} />
        <Route path="progress-notes/new" element={<AddEditProgressNote mode="add" />} />
        <Route path="progress-notes/edit/:noteId" element={<AddEditProgressNote mode="edit" />} />
        {/* <Route path="progress-notes/view/:noteId" element={<AddEditProgressNote mode="view" />} /> */}
        <Route path="claim/:claimId" element={<ClaimDetail />} />
        <Route path="treatment" element={<PlaceholderPage title="Treatment Plan" />} />
        <Route path="prescriptions" element={<PlaceholderPage title="Prescriptions" />} />
        <Route path="documents" element={<PlaceholderPage title="Documents" />} />
        
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
          isAuthenticated ? 
          <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
            <Reports onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
          </AdminPageWrapper> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Reports - Lists */}
      <Route path="/reports/lists/patient-list" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Patient List" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/lists/responsible-party-list" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Responsible Party List" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/lists/provider-list" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Provider List" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/lists/security-list" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Security List" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/lists/setup-list" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Setup List" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Reports - Interactive */}
      <Route path="/reports/interactive/unsigned-progress-notes" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Unsigned Progress Notes" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/interactive/eligibility-verification" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Eligibility Verification" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Reports - Office */}
      <Route path="/reports/office/abbey-dental" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Abbey Dental Reports" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/office/brightnow" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="BrightNow Reports" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/office/dha" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="DHA Reports" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/reports/office/access-dental" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Access Dental Reports" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* UTILITIES (Global Admin Context) */}
      <Route 
        path="/utilities" 
        element={
          isAuthenticated ? 
          <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
            <Utilities onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
          </AdminPageWrapper> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Utilities - Generate Contract Charges */}
      <Route path="/utilities/generate-contract-charges/ortho-payment-plan" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Generate Ortho Payment Plan Charges" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/generate-contract-charges/regular-payment-plan" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Generate Regular Payment Plan Charges" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/generate-contract-charges/by-practice" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Generate Charges by Practice" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - Batch & Claims */}
      <Route path="/utilities/batch-claims/eclaims-new" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Batch Claims Processing – EClaims (New)" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/batch-claims/paper-med" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Batch Claims Processing – Paper / Med EClaims" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/batch-claims/eclaims-management" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="EClaims Management" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/batch-claims/batch-eligibility" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Batch Eligibility" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/batch-claims/close-out-managed-care" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Close Out Managed Care Claims" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/batch-claims/referral-management" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Referral Management" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - Insurance/Procedure */}
      <Route path="/utilities/insurance-procedure/consolidate-duplicate-plans" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Consolidate Duplicate Plans" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/insurance-procedure/consolidate-duplicate-carriers" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Consolidate Duplicate Carriers" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/insurance-procedure/new-plan-assignment" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="New Plan Assignment" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/insurance-procedure/procedure-code-replace" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Procedure Code Replace" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/insurance-procedure/coverage-category-copy" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Coverage Category Copy" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - PGID */}
      <Route path="/utilities/pgid/change-future-appointments" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Change Future Appointments" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/pgid/data-conversion-mapping" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Data Conversion Mapping" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/pgid/change-patient-fee-schedule" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Change Patient Fee Schedule" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/pgid/change-patient-home-office" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Change Patient Home Office" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - Office Specific */}
      <Route path="/utilities/office-specific/access-dental/direct-claims" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Access Dental - Direct Claims" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/access-dental/encounter-info-cap-plans" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Access Dental - Encounter Info Cap Plans" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/dha" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="DHA Utilities" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/universal" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Universal Utilities" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/cs-benefits" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="CS Benefits" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/dca" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="DCA Utilities" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/office-specific/corro-maduro" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Corro Maduro" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - User Functions */}
      <Route path="/utilities/user-functions/tickler" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Tickler" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/user-functions/timeclock" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Timeclock" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/user-functions/timeclock-editor" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Timeclock Editor" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Utilities - Launch */}
      <Route path="/utilities/launch/appointnow" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="AppointNow" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/launch/automated-campaigns" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Automated Campaigns" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/launch/apteryx-dcv" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Apteryx DCV" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/utilities/launch/xvw-web" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="XVW Web" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* SETUP (Strict Admin Context) */}
      <Route 
        path="/setup" 
        element={
          isAuthenticated ? 
          <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
            <Setup onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />
          </AdminPageWrapper> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Setup - Offices */}
      <Route path="/setup/offices/office-setup" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Office Setup" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/offices/office-assignment" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Office Assignment" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/offices/vendor-api-settings-legacy" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Vendor API Settings (Legacy)" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/offices/vendor-api-settings-new" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Vendor API Settings (New)" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Security */}
      <Route path="/setup/security/users" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="User Management" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/security/groups" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Group Management" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/security/change-my-password" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Change My Password" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/security/my-settings" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="My Settings" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Providers */}
      <Route path="/setup/providers/provider-setup" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Provider Setup" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/providers/per-office-settings" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Provider Per Office Settings" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Insurance */}
      <Route path="/setup/insurance/insurance-plans" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Insurance Plans" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/insurance/custom-coverage" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Custom Coverage" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/insurance/dental-carriers" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Dental Carriers" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/insurance/medical-carriers" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Medical Carriers" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/insurance/employees" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Employees" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/insurance/employers" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Employers" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Referrals */}
      <Route path="/setup/referrals/referral-sources" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Referral Sources" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/referrals/custom-demographics" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Custom Demographics" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Procedure Codes */}
      <Route path="/setup/procedure-codes/procedure-codes" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Procedure Codes" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/explosion-codes" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Explosion Codes" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/icd-codes" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="ICD Codes" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/modifier-codes" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Modifier Codes" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/place-of-service" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Place of Service" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/type-of-service" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Type of Service" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/cdt-to-cpt" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="CDT to CPT Mapping" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/cpt-to-icd" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="CPT to ICD Mapping" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/procedure-codes/cdt-to-icd" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="CDT to ICD Mapping" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Fee Schedules */}
      <Route path="/setup/fee-schedules/fee-schedule-setup" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Fee Schedule Setup" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/fee-schedules/fee-schedule-assignments" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Fee Schedule Assignments" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Charting */}
      <Route path="/setup/charting/colors" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Charting Colors" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/charting/materials" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Charting Materials" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/charting/per-use-templates" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Per Use Templates" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Medical */}
      <Route path="/setup/medical/medical-alerts" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Medical Alerts" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/medical/medical-questionnaire" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Medical Questionnaire" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/medical/dental-questionnaire" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Dental Questionnaire" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Setup - Scheduler */}
      <Route path="/setup/scheduler/scheduler-view" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Scheduler View Setup" /></AdminPageWrapper> : <Navigate to="/login" />} />
      <Route path="/setup/scheduler/scheduler-template" element={isAuthenticated ? <AdminPageWrapper onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}><PlaceholderPage title="Scheduler Template" /></AdminPageWrapper> : <Navigate to="/login" />} />
      
      {/* Help & My Page */}
      <Route 
        path="/help" 
        element={
          isAuthenticated ? 
          <Help onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
          <Navigate to="/login" />
        } 
      />
      <Route 
        path="/my-page" 
        element={
          isAuthenticated ? 
          <MyPage onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : 
          <Navigate to="/login" />
        } 
      />
      
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen w-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
        <Router>
          <AppRoutes />
        </Router>
      </div>
    </AuthProvider>
  );
}