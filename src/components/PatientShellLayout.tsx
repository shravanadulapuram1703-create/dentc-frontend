import { useEffect, useMemo } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './layout/AppShell';
import PatientSecondaryNav from './PatientSecondaryNav';
import { User, Phone, Mail, Calendar, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { useGetPatient, useListPatientAlerts } from '@/api/generated/endpoints/patients/patients';
import { useListAppointments } from '@/api/generated/endpoints/appointments/appointments';
import { useGetPatientBalance } from '@/api/generated/endpoints/billing/billing';
import { useListOffices } from '@/api/generated/endpoints/organization/organization';
import type { PatientRead } from '@/api/generated/model';

interface PatientShellLayoutProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface PatientDisplayData {
  id: string;
  chartNo: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  office: string;
  officeId?: string; // Office ID for API calls
  balance: number;
  nextAppointment: string;
  alerts: string[];
}

export default function PatientShellLayout({ 
  onLogout, 
  currentOffice, 
  setCurrentOffice 
}: PatientShellLayoutProps) {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { setActivePatient } = useAuth();
  const numericId = patientId ? Number(patientId) : NaN;
  const validId = !Number.isNaN(numericId);

  const today = new Date().toISOString().slice(0, 10);

  const patientQuery = useGetPatient(numericId, { query: { enabled: validId } });
  const balanceQuery = useGetPatientBalance(numericId, { query: { enabled: validId } });
  const officesQuery = useListOffices({ size: 200 });
  const appointmentsQuery = useListAppointments(
    { patient_id: numericId, date_from: today, size: 50 },
    { query: { enabled: validId } },
  );
  const alertsQuery = useListPatientAlerts(
    { patient_id: numericId, is_active: true, size: 50 },
    { query: { enabled: validId } },
  );

  // Helper function to calculate age from DOB
  const calculateAge = (dob: string | null | undefined): number => {
    if (!dob) return 0;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : 0;
    } catch {
      return 0;
    }
  };

  // Helper function to format date from YYYY-MM-DD to MM/DD/YYYY
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    // Plain YYYY-MM-DD must be formatted from parts — `new Date("YYYY-MM-DD")`
    // parses as UTC midnight and shifts back a day in negative-offset timezones.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return `${m}/${d}/${y}`;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper function to format phone number
  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '—';
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX if 10 digits
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Helper function to get preferred phone
  // const getPreferredPhone = (contact: ApiPatientDetails['contact']): string => {
  //   if (!contact) return '—';
  //   // Priority: cell_phone > home_phone > work_phone
  //   return formatPhone(contact.cell_phone || contact.home_phone || contact.work_phone);
  // };
  const getPreferredPhone = (p: PatientRead): string => {
    const { preferred_contact, cell_phone, phone, work_phone, email } = p;

    const isValidPhone = (ph?: string | null) =>
      !!ph && ph.replace(/\D/g, "").length >= 1;

    // 1. Try preferred contact first ("home_phone" maps to the `phone` column)
    if (preferred_contact) {
      const preferred =
        preferred_contact === "home_phone" ? phone
        : preferred_contact === "cell_phone" ? cell_phone
        : preferred_contact === "work_phone" ? work_phone
        : preferred_contact === "email" ? email
        : undefined;
      if (isValidPhone(preferred)) {
        return formatPhone(preferred);
      }
    }

    // 2. Fallback priority: cell → home → work
    return formatPhone(
      [cell_phone, phone, work_phone].find(isValidPhone) || "—",
    );
  };
  

  // Helper function to format gender
  const formatGender = (gender: string | null | undefined): string => {
    if (!gender) return '—';
    const genderMap: Record<string, string> = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other'
    };
    return genderMap[gender] || gender;
  };

  // Redirect out if there's no patient id in the route.
  useEffect(() => {
    if (!patientId) navigate('/patient');
  }, [patientId, navigate]);

  const loading = patientQuery.isLoading;
  const error = patientQuery.isError ? 'Failed to load patient data' : null;

  // Compose the display model from the canonical resources:
  // identity (/patients/{id}) + balance (/patients/{id}/balance) + office name
  // (/offices) + next upcoming appointment (/appointments) + active alerts
  // (/patient-alerts).
  const patient = useMemo<PatientDisplayData | null>(() => {
    const p = patientQuery.data;
    if (!p) return null;

    const officeName = officesQuery.data?.items.find(
      (o) => o.id === p.home_office_id,
    )?.name;
    const bal = balanceQuery.data;

    // Earliest upcoming appointment (already filtered to date_from = today).
    const upcoming = (appointmentsQuery.data?.items ?? [])
      .slice()
      .sort((a, b) =>
        `${a.date}T${a.start_time ?? ''}`.localeCompare(
          `${b.date}T${b.start_time ?? ''}`,
        ),
      )[0];

    const alerts = (alertsQuery.data?.items ?? [])
      .map((a) => a.alert)
      .filter((a): a is string => Boolean(a));

    return {
      id: String(p.id),
      chartNo: p.chart_no || `CH-${p.id}`,
      name: p.preferred_name
        ? `${p.last_name}, ${p.first_name} (${p.preferred_name})`
        : `${p.last_name}, ${p.first_name}`,
      age: calculateAge(p.dob),
      gender: formatGender(p.gender),
      dob: formatDate(p.dob),
      phone: getPreferredPhone(p),
      email: p.email || '—',
      office: officeName || '—',
      officeId: p.home_office_id != null ? String(p.home_office_id) : undefined,
      balance: bal?.account_balance ?? bal?.balance ?? 0,
      nextAppointment: upcoming
        ? `${formatDate(upcoming.date)} ${upcoming.start_time ?? ''}`.trim()
        : '—',
      alerts,
    };
  }, [
    patientQuery.data,
    balanceQuery.data,
    officesQuery.data,
    appointmentsQuery.data,
    alertsQuery.data,
  ]);

  // Persist whichever patient is in context as this user's default, so it
  // reopens automatically everywhere (no patient prompt) until they switch.
  useEffect(() => {
    if (!patient) return;
    setActivePatient({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      dob: patient.dob,
    });
  }, [patient, setActivePatient]);

  const handleClosePatient = () => {
    // Closing is an explicit "switch patient" intent → show the search picker.
    // The persisted default patient is left intact on purpose.
    navigate('/patient?switch=1');
  };

  if (loading) {
    return (
      <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} bgClassName="bg-slate-50">
        <div className="flex items-center justify-center h-[calc(100vh-var(--app-nav-height))]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading patient...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !patient) {
    return (
      <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} bgClassName="bg-slate-50">
        <div className="flex items-center justify-center h-[calc(100vh-var(--app-nav-height))]">
          <div className="text-center bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Patient</h3>
            <p className="text-slate-600 mb-4">{error || 'Patient not found'}</p>
            <button
              onClick={() => navigate('/patient?switch=1')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Return to Patient Search
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      onLogout={onLogout}
      currentOffice={currentOffice}
      setCurrentOffice={setCurrentOffice}
      bgClassName="bg-slate-50"
    >
      {/* PATIENT CONTEXT SHELL - Persistent, sticks right below the fixed nav so
          the patient identity + tab bar stay visible while content scrolls. */}
      <div className="bg-white border-b-2 border-slate-200 shadow-sm sticky top-[var(--app-nav-height)] z-30">
          {/* Patient Summary Header */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Patient Info */}
              <div className="flex items-center gap-4">
                {/* Patient Avatar */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 shadow-md">
                  <User className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>

                {/* Patient Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    ID: {patient.id}
                    </span>
                    {patient.age > -1 && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {patient.age}y • {patient.gender}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    {patient.phone !== '—-' && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email !== '—' && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                    {patient.dob && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>DOB: {patient.dob}</span>
                      </div>
                    )}
                    {/* {patient.office !== '—' && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{patient.office}</span>
                      </div>
                    )} */}
                  </div>
                </div>
              </div>

              {/* Patient Quick Stats */}
              <div className="flex items-center gap-4">
                {/* Balance */}
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Balance</p>
                  <p className={`text-lg font-bold ${patient.balance > 0 ? 'text-red-600' : patient.balance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                    ${Math.abs(patient.balance).toFixed(2)}
                  </p>
                </div>

                {/* Next Appointment */}
                {patient.nextAppointment !== '—' && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Next Appointment</p>
                    <p className="text-sm font-semibold text-slate-900">{patient.nextAppointment}</p>
                  </div>
                )}

                {/* Alerts */}
                {patient.alerts.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border-2 border-amber-200">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-amber-700 font-semibold">{patient.alerts.length} Alert(s)</p>
                      <p className="text-xs text-amber-600">{patient.alerts[0]}</p>
                    </div>
                  </div>
                )}

                {/* Close Patient Button */}
                <button
                  onClick={handleClosePatient}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-all duration-200"
                >
                  Close Patient
                </button>
              </div>
            </div>
          </div>

          {/* Patient Secondary Navigation - Icon Bar */}
          <PatientSecondaryNav patientId={patient.id} />
        </div>

        {/* PATIENT CONTENT AREA - This changes based on route */}
        <div className="min-h-[calc(100vh-400px)]">
          <Outlet context={{ patient }} />
        </div>
    </AppShell>
  );
}