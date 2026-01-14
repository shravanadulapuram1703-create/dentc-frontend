import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalNav from './GlobalNav.js';
import type { UserRole } from '../contexts/AuthContext.js';
import PageHeader from './ui/PageHeader.js';
import SectionHeader from './ui/SectionHeader.js';
import { components } from '../styles/theme.js';
import { 
  Award,
  Briefcase,
  UserCheck,
  Users,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  Search,
  UserPlus
} from 'lucide-react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
}

interface DashboardProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
  user: User | null;
}

// Helper function to get role display info
function getRoleInfo(role: UserRole | undefined): { label: string; icon: any; color: string; bgColor: string } {
  switch (role) {
    case 'admin':
      return {
        label: 'System Administrator',
        icon: Award,
        color: 'text-purple-700',
        bgColor: 'bg-purple-100'
      };
    case 'manager':
      return {
        label: 'Practice Manager',
        icon: Briefcase,
        color: 'text-blue-700',
        bgColor: 'bg-blue-100'
      };
    case 'doctor':
    case 'provider':
      return {
        label: 'Healthcare Provider',
        icon: UserCheck,
        color: 'text-teal-700',
        bgColor: 'bg-teal-100'
      };
    case 'front_desk':
    case 'staff':
      return {
        label: 'Team Member',
        icon: Users,
        color: 'text-green-700',
        bgColor: 'bg-green-100'
      };
    default:
      return {
        label: 'Staff Member',
        icon: Users,
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
  }
}

export default function Dashboard({ onLogout, currentOffice, setCurrentOffice, user }: DashboardProps) {
  const navigate = useNavigate();
  const roleInfo = getRoleInfo(user?.role);
  const RoleIcon = roleInfo.icon;

  // SECTION B: Search State
  const [searchFor, setSearchFor] = useState<'patient' | 'responsible'>('patient');
  const [patientType, setPatientType] = useState<'both' | 'general' | 'ortho'>('both');
  const [searchBy, setSearchBy] = useState('lastName');
  const [searchScope, setSearchScope] = useState<'current' | 'all' | 'group'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');

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
    { value: 'subscriberId', label: 'Subscriber ID' }
  ];

  const getPlaceholder = () => {
    const option = searchByOptions.find(o => o.value === searchBy);
    return `Enter ${option?.label}...`;
  };

  const handleSearch = () => {
    if (!searchText.trim()) {
      alert('Please enter search criteria');
      return;
    }

    const query = `${searchBy}:${searchText}|scope:${searchScope}|type:${searchFor}`;
    setLastSearchQuery(query);

    // TODO: Execute actual search logic
    console.log('Search executed:', {
      searchFor,
      patientType,
      searchBy,
      searchText,
      searchScope,
      includeInactive
    });

    alert('Search functionality will display results here');
  };

  const handleLastSearch = () => {
    if (!lastSearchQuery) {
      alert('No previous search to reload');
      return;
    }
    alert(`Reloading last search: ${lastSearchQuery}`);
  };

  const handleAddNewPatient = () => {
    // Navigate to patient creation (would need to create this route)
    alert('Add New Patient workflow will open here');
  };
    const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } catch (err) {
      console.error('Backend logout failed', err);
      // Even if backend fails, proceed with frontend logout
    } finally {
      onLogout();
      navigate('/login');
    }
  };



  return (
    <div className="min-h-screen bg-[#F7F9FC] overflow-x-auto">

        <GlobalNav 
          onLogout={handleLogout} 
          currentOffice={currentOffice}
          setCurrentOffice={setCurrentOffice}
        />

      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* SECTION A: Welcome User / Identity Panel */}
        <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden">
          {/* Header Bar - Slate Blue */}
          {/* Header Bar - Slate Blue */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <RoleIcon className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome, {user?.name || 'User'}
                </h1>
                <p className="text-white/80 text-sm font-medium">
                  {user?.role}
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`px-4 py-2 rounded-lg ${
                  user?.isActive ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />
                  <span className="text-white font-semibold text-sm">
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* User Details Grid */}
          <div className="grid grid-cols-4 gap-4 p-6 bg-[#F7F9FC]">
            {/* Email */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#3A6EA5]/10 rounded-lg">
                  <Mail className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                </div>
                <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                  Email Address
                </div>
              </div>
              <div className="text-sm font-semibold text-[#1E293B] truncate">
                {user?.email || 'Not provided'}
              </div>
            </div>

            {/* User ID */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#1F3A5F]/10 rounded-lg">
                  <Shield className="w-4 h-4 text-[#1F3A5F]" strokeWidth={2} />
                </div>
                <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                  User ID
                </div>
              </div>
              <div className="text-sm font-semibold text-[#1E293B] font-mono">
                {user?.id || 'N/A'}
              </div>
            </div>

            {/* Current Office */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#2FB9A7]/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-[#2FB9A7]" strokeWidth={2} />
                </div>
                <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                  Current Office
                </div>
              </div>
              <div className="text-sm font-semibold text-[#1E293B]">
                {currentOffice}
              </div>
            </div>

            {/* Account Status */}
            {/* Account Status */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    user?.isActive ? 'bg-[#2FB9A7]/10' : 'bg-red-100'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      user?.isActive ? 'text-[#2FB9A7]' : 'text-red-600'
                    }`}
                    strokeWidth={2}
                  />
                </div>

                <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                  Account Status
                </div>
              </div>

              <div
                className={`text-sm font-semibold ${
                  user?.isActive ? 'text-[#2FB9A7]' : 'text-red-600'
                }`}
              >
                {user?.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION B: Search Patient / Responsible Party Panel */}
        <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0]">
          {/* Header - Slate Blue */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">
              Search Patient / Responsible Party
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Row 1: Search Scope Selection */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Block: Search For */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-3 pb-2 border-b border-[#E2E8F0] tracking-wide">
                  Search For
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchFor"
                      value="patient"
                      checked={searchFor === 'patient'}
                      onChange={(e) => setSearchFor(e.target.value as 'patient')}
                      className={components.radio}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">Patient</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchFor"
                      value="responsible"
                      checked={searchFor === 'responsible'}
                      onChange={(e) => setSearchFor(e.target.value as 'responsible')}
                      className={components.radio}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">Responsible Party</span>
                  </label>
                </div>

                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-bold text-[#475569] uppercase mb-2 tracking-wide">
                    General / Ortho Patient
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="both"
                        checked={patientType === 'both'}
                        onChange={(e) => setPatientType(e.target.value as 'both')}
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">Both</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="general"
                        checked={patientType === 'general'}
                        onChange={(e) => setPatientType(e.target.value as 'general')}
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">General Patient</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="patientType"
                        value="ortho"
                        checked={patientType === 'ortho'}
                        onChange={(e) => setPatientType(e.target.value as 'ortho')}
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">Ortho Patient</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Center Block: Search By */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-3 pb-2 border-b border-[#E2E8F0] tracking-wide">
                  Search By
                </h3>
                <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
                  {searchByOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="searchBy"
                        value={option.value}
                        checked={searchBy === option.value}
                        onChange={(e) => setSearchBy(e.target.value)}
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right Block: Search In */}
              <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-4">
                <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-3 pb-2 border-b border-[#E2E8F0] tracking-wide">
                  Search In
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="current"
                      checked={searchScope === 'current'}
                      onChange={(e) => setSearchScope(e.target.value as 'current')}
                      className={components.radio}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">Current Office</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="all"
                      checked={searchScope === 'all'}
                      onChange={(e) => setSearchScope(e.target.value as 'all')}
                      className={components.radio}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">All Offices</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="radio"
                      name="searchScope"
                      value="group"
                      checked={searchScope === 'group'}
                      onChange={(e) => setSearchScope(e.target.value as 'group')}
                      className={components.radio}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">Search in Office Group</span>
                  </label>
                </div>

                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                      className={components.checkbox}
                    />
                    <span className="text-sm font-semibold text-[#1E293B]">Include Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: Search Input & Actions */}
            <div className="bg-[#F7F9FC] rounded-lg border-2 border-[#3A6EA5]/30 p-4">
              <div className="flex items-center gap-4">
                {/* Search Text Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={getPlaceholder()}
                    className={components.input}
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
                  className={components.buttonPrimary + " flex items-center gap-2"}
                >
                  <Search className="w-5 h-5" strokeWidth={2} />
                  SEARCH
                </button>

                <button
                  onClick={handleLastSearch}
                  className={components.buttonSecondary}
                >
                  LAST SEARCH
                </button>

                <button
                  onClick={handleAddNewPatient}
                  className={components.buttonSuccess + " flex items-center gap-2"}
                >
                  <UserPlus className="w-5 h-5" strokeWidth={2} />
                  ADD NEW PATIENT
                </button>
              </div>
            </div>

            {/* Search Help Text */}
            <div className="text-center">
              <p className="text-sm text-[#64748B] font-medium">
                💡 Use the search criteria above to find patients or responsible parties. Results will appear below.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}