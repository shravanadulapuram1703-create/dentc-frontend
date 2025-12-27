import GlobalNav from '../GlobalNav';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Printer,
  Building2,
  CreditCard,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { components } from '../../styles/theme';

interface PatientProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface Patient {
  id: number;
  patientId: string;
  name: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  insurance: string;
  lastVisit: string;
  nextAppointment: string;
  balance: string;
  officeId: string;
  officeName: string;
  chartNumber: string;
  ssn: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export default function Patient({ onLogout, currentOffice, setCurrentOffice }: PatientProps) {
  const navigate = useNavigate();

  // Search State (copied from Dashboard.tsx)
  const [searchFor, setSearchFor] = useState<'patient' | 'responsible'>('patient');
  const [patientType, setPatientType] = useState<'both' | 'general' | 'ortho'>('both');
  const [searchBy, setSearchBy] = useState('lastName');
  const [searchScope, setSearchScope] = useState<'current' | 'all' | 'group'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Results State
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<number | null>(null);

  const searchByOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'preferredName', label: 'Preferred Name' },
    { value: 'patientType', label: 'Patient Type' },
    { value: 'medicaidId', label: 'Medicaid ID' },
    { value: 'chartNumber', label: 'Chart #' },
    { value: 'ssn', label: 'SSN' },
    { value: 'email', label: 'Email' },
    { value: 'birthDate', label: 'Birth Date' },
    { value: 'homePhone', label: 'Home Phone' },
    { value: 'cellPhone', label: 'Cell Phone' },
    { value: 'workPhone', label: 'Work Phone' },
    { value: 'patientId', label: 'Patient ID' },
    { value: 'responsiblePartyId', label: 'Responsible Party ID' },
    { value: 'responsiblePartyType', label: 'Responsible Party Type' },
    { value: 'subscriberId', label: 'Subscriber ID' },
  ];

  // Mock patient data
  const mockPatients: Patient[] = [
    {
      id: 1,
      patientId: 'PT-000001',
      name: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      dob: '05/15/1980',
      phone: '(555) 123-4567',
      email: 'john.smith@email.com',
      address: '123 Main St',
      city: 'Pittsburgh',
      state: 'PA',
      zip: '15201',
      insurance: 'Delta Dental - Premium',
      lastVisit: '03/15/2024',
      nextAppointment: '04/20/2024',
      balance: '$150.00',
      officeId: '108',
      officeName: 'Cranberry Main',
      chartNumber: 'CH-001',
      ssn: '***-**-1234',
      emergencyContact: 'Jane Smith',
      emergencyPhone: '(555) 123-4568'
    },
    {
      id: 2,
      patientId: 'PT-000002',
      name: 'Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson',
      dob: '08/22/1975',
      phone: '(555) 234-5678',
      email: 'sarah.j@email.com',
      address: '456 Oak Ave',
      city: 'Pittsburgh',
      state: 'PA',
      zip: '15202',
      insurance: 'Cigna Dental',
      lastVisit: '03/18/2024',
      nextAppointment: '04/15/2024',
      balance: '$0.00',
      officeId: '109',
      officeName: 'Cranberry North',
      chartNumber: 'CH-002',
      ssn: '***-**-5678',
      emergencyContact: 'Mike Johnson',
      emergencyPhone: '(555) 234-5679'
    },
    {
      id: 3,
      patientId: 'PT-000003',
      name: 'Michael Brown',
      firstName: 'Michael',
      lastName: 'Brown',
      dob: '11/30/1992',
      phone: '(555) 345-6789',
      email: 'mbrown@email.com',
      address: '789 Pine Rd',
      city: 'Pittsburgh',
      state: 'PA',
      zip: '15203',
      insurance: 'MetLife Dental',
      lastVisit: '03/10/2024',
      nextAppointment: '05/05/2024',
      balance: '$225.50',
      officeId: '108',
      officeName: 'Cranberry Main',
      chartNumber: 'CH-003',
      ssn: '***-**-9012',
      emergencyContact: 'Lisa Brown',
      emergencyPhone: '(555) 345-6790'
    },
    {
      id: 4,
      patientId: 'PT-000004',
      name: 'Emily Davis',
      firstName: 'Emily',
      lastName: 'Davis',
      dob: '03/12/1988',
      phone: '(555) 456-7890',
      email: 'emily.davis@email.com',
      address: '321 Elm St',
      city: 'Pittsburgh',
      state: 'PA',
      zip: '15204',
      insurance: 'Aetna Dental',
      lastVisit: '03/20/2024',
      nextAppointment: '04/25/2024',
      balance: '$75.00',
      officeId: '201',
      officeName: 'Downtown Pittsburgh',
      chartNumber: 'CH-004',
      ssn: '***-**-3456',
      emergencyContact: 'Robert Davis',
      emergencyPhone: '(555) 456-7891'
    },
  ];

  const getPlaceholder = () => {
    const option = searchByOptions.find((o) => o.value === searchBy);
    return `Enter ${option?.label}...`;
  };

  const handleSearch = () => {
    if (!searchText.trim()) {
      alert('Please enter search criteria');
      return;
    }

    const query = `${searchBy}:${searchText}|scope:${searchScope}|type:${searchFor}`;
    setLastSearchQuery(query);

    // Mock search - filter patients based on search text
    const results = mockPatients.filter(patient => {
      const searchLower = searchText.toLowerCase();
      return (
        patient.name.toLowerCase().includes(searchLower) ||
        patient.patientId.toLowerCase().includes(searchLower) ||
        patient.email.toLowerCase().includes(searchLower) ||
        patient.phone.includes(searchText) ||
        patient.chartNumber.toLowerCase().includes(searchLower)
      );
    });

    setSearchResults(results);
    setHasSearched(true);
    setExpandedPatientId(null);
  };

  const handleLastSearch = () => {
    if (!lastSearchQuery) {
      alert('No previous search to reload');
      return;
    }
    handleSearch();
  };

  const handleAddNewPatient = () => {
    alert('Add New Patient workflow will open here');
  };

  const toggleExpand = (patientId: number) => {
    setExpandedPatientId(expandedPatientId === patientId ? null : patientId);
  };

  const handleViewOverview = (patient: Patient) => {
    // Navigate to patient overview with patient ID
    navigate('/patient-overview', { state: { patientId: patient.patientId } });
  };

  const handleEdit = (patient: Patient) => {
    alert(`Edit patient: ${patient.name}`);
  };

  const handlePrint = (patient: Patient) => {
    alert(`Print patient details: ${patient.name}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0] overflow-hidden">
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Patient Management</h1>
                <p className="text-white/80 text-sm font-medium">Search and manage patient records</p>
              </div>
            </div>
            
            <button 
              onClick={handleAddNewPatient}
              className={components.buttonSuccess + " flex items-center gap-2"}
            >
              <UserPlus className="w-5 h-5" strokeWidth={2} />
              ADD NEW PATIENT
            </button>
          </div>
        </div>

        {/* Search Panel */}
        <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0]">
          {/* Search Input & Action Buttons Bar (replacing header) */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              {/* Search Text Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full px-4 py-2.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleSearch}
                className="px-5 py-2.5 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2d5080] transition-colors shadow-md flex items-center gap-2"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
                SEARCH
              </button>

              <button
                onClick={handleLastSearch}
                className="px-5 py-2.5 bg-[#475569] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-md"
              >
                LAST SEARCH
              </button>

              {/* <button
                onClick={handleAddNewPatient}
                className="px-5 py-2.5 bg-[#2FB9A7] text-white text-sm font-bold rounded-lg hover:bg-[#28a896] transition-colors shadow-md flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" strokeWidth={2} />
                ADD NEW PATIENT
              </button> */}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Row 1: Search Scope Selection - Compact */}
            <div className="grid grid-cols-3 gap-4">
              {/* Left Block: Search For */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">
                  Search For
                </h3>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchFor"
                      value="patient"
                      checked={searchFor === 'patient'}
                      onChange={(e) => setSearchFor(e.target.value as 'patient')}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">Patient</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchFor"
                      value="responsible"
                      checked={searchFor === 'responsible'}
                      onChange={(e) => setSearchFor(e.target.value as 'responsible')}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">Responsible Party</span>
                  </label>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-bold text-[#475569] uppercase mb-2 tracking-wide">
                    General / Ortho Patient
                  </h4>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="both"
                        checked={patientType === 'both'}
                        onChange={(e) => setPatientType(e.target.value as 'both')}
                        className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm font-medium text-[#1E293B]">Both</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="general"
                        checked={patientType === 'general'}
                        onChange={(e) => setPatientType(e.target.value as 'general')}
                        className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm font-medium text-[#1E293B]">General Patient</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="ortho"
                        checked={patientType === 'ortho'}
                        onChange={(e) => setPatientType(e.target.value as 'ortho')}
                        className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm font-medium text-[#1E293B]">Ortho Patient</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Center Block: Search By */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">
                  Search By
                </h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-64 overflow-y-auto">
                  {searchByOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-0.5 rounded transition-colors"
                    >
                      <input
                        type="radio"
                        name="searchBy"
                        value={option.value}
                        checked={searchBy === option.value}
                        onChange={(e) => setSearchBy(e.target.value)}
                        className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm font-medium text-[#1E293B]">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right Block: Search In */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">
                  Search In
                </h3>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="current"
                      checked={searchScope === 'current'}
                      onChange={(e) => setSearchScope(e.target.value as 'current')}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">Current Office</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="all"
                      checked={searchScope === 'all'}
                      onChange={(e) => setSearchScope(e.target.value as 'all')}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">All Offices</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="group"
                      checked={searchScope === 'group'}
                      onChange={(e) => setSearchScope(e.target.value as 'group')}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">Search in Office Group</span>
                  </label>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">Include Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0]">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">
                  Search Results
                </h2>
                <p className="text-white/80 text-sm font-medium">
                  Found {searchResults.length} patient(s)
                </p>
              </div>
            </div>

            {/* Results List */}
            <div className="divide-y-2 divide-[#E2E8F0]">
              {searchResults.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" strokeWidth={1.5} />
                  <h3 className="font-bold text-[#64748B] mb-2">No Patients Found</h3>
                  <p className="text-[#94A3B8]">Try adjusting your search criteria</p>
                </div>
              ) : (
                searchResults.map((patient) => {
                  const isExpanded = expandedPatientId === patient.id;
                  
                  return (
                    <div key={patient.id} className="bg-white hover:bg-[#F7F9FC] transition-colors">
                      {/* Collapsed Row - Basic Info */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Expand Button */}
                          <button
                            onClick={() => toggleExpand(patient.id)}
                            className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#1F3A5F]" strokeWidth={2.5} />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[#64748B]" strokeWidth={2.5} />
                            )}
                          </button>

                          {/* Basic Patient Info */}
                          <div className="grid grid-cols-3 gap-6 flex-1">
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Patient Name
                              </div>
                              <div className="font-bold text-[#1E293B]">
                                {patient.name}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Patient ID
                              </div>
                              <div className="font-semibold text-[#3A6EA5]">
                                {patient.patientId}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Office
                              </div>
                              <div className="font-semibold text-[#1E293B]">
                                {patient.officeName} [{patient.officeId}]
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons (always visible) */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewOverview(patient)}
                            className={components.buttonPrimary + " flex items-center gap-2 text-sm"}
                            title="View Overview"
                          >
                            <Eye className="w-4 h-4" strokeWidth={2} />
                            OVERVIEW
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section - Additional Details */}
                      {isExpanded && (
                        <div className="border-t-2 border-[#E2E8F0] bg-[#F7F9FC] p-6">
                          <div className="space-y-6">
                            {/* Demographic Information */}
                            <div>
                              <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4" strokeWidth={2.5} />
                                Demographic Information
                              </h3>
                              <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    Date of Birth
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.dob}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    Chart Number
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.chartNumber}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    SSN
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.ssn}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    Insurance
                                  </div>
                                  <div className="font-semibold text-[#1E293B] truncate">{patient.insurance}</div>
                                </div>
                              </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                              <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4" strokeWidth={2.5} />
                                Contact Information
                              </h3>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Phone className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Phone
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.phone}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Mail className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Email
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B] truncate">{patient.email}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Address
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B] text-sm">
                                    {patient.address}, {patient.city}, {patient.state} {patient.zip}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Clinical & Financial Info */}
                            <div>
                              <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4" strokeWidth={2.5} />
                                Clinical & Financial Information
                              </h3>
                              <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Last Visit
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.lastVisit}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-[#2FB9A7]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Next Appointment
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.nextAppointment}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="w-4 h-4 text-[#F59E0B]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Balance
                                    </div>
                                  </div>
                                  <div className={`font-bold ${
                                    patient.balance === '$0.00' ? 'text-[#2FB9A7]' : 'text-[#F59E0B]'
                                  }`}>
                                    {patient.balance}
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                                    <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                                      Office ID
                                    </div>
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.officeId}</div>
                                </div>
                              </div>
                            </div>

                            {/* Emergency Contact */}
                            <div>
                              <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4" strokeWidth={2.5} />
                                Emergency Contact
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    Name
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.emergencyContact}</div>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
                                  <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                    Phone
                                  </div>
                                  <div className="font-semibold text-[#1E293B]">{patient.emergencyPhone}</div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#E2E8F0]">
                              <button
                                onClick={() => handleViewOverview(patient)}
                                className={components.buttonPrimary + " flex items-center gap-2"}
                              >
                                <Eye className="w-5 h-5" strokeWidth={2} />
                                VIEW OVERVIEW
                              </button>
                              <button
                                onClick={() => handleEdit(patient)}
                                className={components.buttonSecondary + " flex items-center gap-2"}
                              >
                                <Edit className="w-5 h-5" strokeWidth={2} />
                                EDIT
                              </button>
                              <button
                                onClick={() => handlePrint(patient)}
                                className={components.buttonSecondary + " flex items-center gap-2"}
                              >
                                <Printer className="w-5 h-5" strokeWidth={2} />
                                PRINT
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Initial State - No Search Yet */}
        {!hasSearched && (
          <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0] p-12 text-center">
            <Search className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-bold text-[#64748B] mb-2">Ready to Search</h3>
            <p className="text-[#94A3B8]">
              Enter your search criteria above and click SEARCH to find patients
            </p>
          </div>
        )}
      </div>
    </div>
  );
}