import { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import GlobalNav from './GlobalNav.js';
import PatientSecondaryNav from './PatientSecondaryNav.js';
import { User, Phone, Mail, Calendar, MapPin, AlertCircle } from 'lucide-react';

interface PatientShellLayoutProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  lastVisit: string;
  nextAppointment: string;
  balance: number;
  insurance: string;
  alerts: string[];
}

export default function PatientShellLayout({ 
  onLogout, 
  currentOffice, 
  setCurrentOffice 
}: PatientShellLayoutProps) {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch patient data ONCE when shell mounts or patientId changes
  useEffect(() => {
    if (!patientId) {
      navigate('/patient');
      return;
    }

    // Simulate fetching patient data - in production, this would be an API call
    setLoading(true);
    
    // Mock patient data - in production, fetch from API
    const mockPatient: PatientData = {
      id: patientId,
      name: 'Sarah Johnson',
      age: 34,
      gender: 'Female',
      dob: '12/15/1989',
      phone: '(724) 555-0142',
      email: 'sarah.johnson@email.com',
      address: '123 Main Street, Cranberry Township, PA 16066',
      lastVisit: '11/15/2024',
      nextAppointment: '01/20/2025',
      balance: 850.00,
      insurance: 'Delta Dental PPO',
      alerts: ['Allergic to Penicillin', 'Premedication Required']
    };

    // Store patient in sessionStorage for persistence
    sessionStorage.setItem('activePatient', JSON.stringify(mockPatient));
    
    setPatient(mockPatient);
    setLoading(false);
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
            <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-medium">Loading patient...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global Navigation - Always Visible */}
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

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
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {patient.age}y • {patient.gender}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span>{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>DOB: {patient.dob}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Quick Stats */}
            <div className="flex items-center gap-4">
              {/* Balance */}
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Balance</p>
                <p className={`text-lg font-bold ${patient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${patient.balance.toFixed(2)}
                </p>
              </div>

              {/* Next Appointment */}
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Next Appointment</p>
                <p className="text-sm font-semibold text-slate-900">{patient.nextAppointment}</p>
              </div>

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
  );
}