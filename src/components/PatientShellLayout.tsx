import { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import GlobalNav from './GlobalNav';
import PatientSecondaryNav from './PatientSecondaryNav';
import { User, Phone, Mail, Calendar, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { getPatientDetails, type PatientDetails as ApiPatientDetails } from '../services/patientApi';

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
  const [patient, setPatient] = useState<PatientDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const date = new Date(dateStr);
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
  const getPreferredPhone = (contact: ApiPatientDetails['contact']): string => {
    if (!contact) return '—';
  
    const { preferred_contact, cell_phone, home_phone, work_phone } = contact;
  
    // helper – define what "valid" means for you
    const isValidPhone = (phone?: string) =>
      !!phone && phone.replace(/\D/g, '').length >= 1;
  
    // 1. Try preferred contact first
    if (preferred_contact) {
      const preferred = preferred_contact === 'home_phone' ? home_phone
        : preferred_contact === 'cell_phone' ? cell_phone
        : preferred_contact === 'work_phone' ? work_phone
        : preferred_contact === 'email' ? contact.email
        : undefined;
      if (isValidPhone(preferred)) {
        return formatPhone(preferred);
      }
    }
  
    // 2. Fallback to existing priority
    return formatPhone(
      [cell_phone, home_phone, work_phone].find(isValidPhone) || '—'
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

  // Fetch patient data from API
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) {
        navigate('/patient');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiPatient = await getPatientDetails(patientId);
        
        // Map API response to display format
        const displayData: PatientDisplayData = {
          id: apiPatient.id.toString(),
          chartNo: apiPatient.chart_no || `CH-${apiPatient.id}`,
          name: apiPatient.preferred_name 
            ? `${apiPatient.last_name}, ${apiPatient.first_name} (${apiPatient.preferred_name})`
            : `${apiPatient.last_name}, ${apiPatient.first_name}`,
          age: calculateAge(apiPatient.dob),
          gender: formatGender(apiPatient.gender),
          dob: formatDate(apiPatient.dob),
          phone: getPreferredPhone(apiPatient.contact),
          email: apiPatient.contact?.email || '—',
          office: apiPatient.office?.home_office_name || '—',
          officeId: apiPatient.office?.home_office_id?.toString() || undefined,
          balance: typeof apiPatient.balances?.account_balance === 'string' 
            ? parseFloat(apiPatient.balances.account_balance) || 0
            : apiPatient.balances?.account_balance || 0,
          nextAppointment: apiPatient.appointments && apiPatient.appointments.length > 0
            ? formatDate(apiPatient.appointments[0]?.date) + ' ' + (apiPatient.appointments[0]?.time || '')
            : '—',
          alerts: apiPatient.clinical?.medical_alerts?.map((alert: any) => 
            typeof alert === 'string' ? alert : alert.alert || alert.message || 'Unknown alert'
          ) || []
        };

        setPatient(displayData);
      } catch (err: any) {
        console.error('Error fetching patient data:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load patient data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, navigate]);

  const handleClosePatient = () => {
    // Clear patient context
    sessionStorage.removeItem('activePatient');
    setPatient(null);
    // Return to patient search/list
    navigate('/patient');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <GlobalNav 
          onLogout={onLogout} 
          currentOffice={currentOffice}
          setCurrentOffice={setCurrentOffice}
        />
        <div className="flex items-center justify-center h-[calc(100vh-180px)]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading patient...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-50">
        <GlobalNav 
          onLogout={onLogout} 
          currentOffice={currentOffice}
          setCurrentOffice={setCurrentOffice}
        />
        <div className="flex items-center justify-center h-[calc(100vh-180px)]">
          <div className="text-center bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Patient</h3>
            <p className="text-slate-600 mb-4">{error || 'Patient not found'}</p>
            <button
              onClick={() => navigate('/patient')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Return to Patient Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global Navigation - Always Visible */}
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

      {/* ✅ STEP 3: Hard vertical offset for fixed GlobalNav */}
      {/* DO NOT REMOVE: Required to prevent patient info from being covered by fixed navigation */}
      <div className="pt-[120px]">
        {/* PATIENT CONTEXT SHELL - Persistent Container */}
        <div className="bg-white border-b-2 border-slate-200 shadow-sm">
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
      </div>
    </div>
  );
}