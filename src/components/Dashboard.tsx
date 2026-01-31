import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import GlobalNav from "./GlobalNav.js";
import type { UserRole } from "../contexts/AuthContext.js";
import { useAuth } from "../contexts/AuthContext.js";
import PageHeader from "./ui/PageHeader.js";
import SectionHeader from "./ui/SectionHeader.js";
import { components } from "../styles/theme.js";
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
  UserPlus,
  Loader2,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import api from "../services/api";
import { searchPatients, type Patient as ApiPatient } from "../services/patientApi.js";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isActive?: boolean; // Added optional isActive property
}

interface DashboardProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
  user: User | null;
}

// Helper function to get role display info
function getRoleInfo(role: UserRole | undefined): {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
} {
  switch (role) {
    case "admin":
      return {
        label: "System Administrator",
        icon: Award,
        color: "text-purple-700",
        bgColor: "bg-purple-100",
      };
    case "manager":
      return {
        label: "Practice Manager",
        icon: Briefcase,
        color: "text-blue-700",
        bgColor: "bg-blue-100",
      };
    case "doctor":
    case "provider":
      return {
        label: "Healthcare Provider",
        icon: UserCheck,
        color: "text-teal-700",
        bgColor: "bg-teal-100",
      };
    case "front_desk":
    case "staff":
      return {
        label: "Team Member",
        icon: Users,
        color: "text-green-700",
        bgColor: "bg-green-100",
      };
    default:
      return {
        label: "Staff Member",
        icon: Users,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
      };
  }
}

export default function Dashboard({
  onLogout,
  currentOffice,
  setCurrentOffice,
  user,
}: DashboardProps) {
  const navigate = useNavigate();
  const { organizations, currentOrganization } = useAuth();
  const roleInfo = getRoleInfo(user?.role);
  const RoleIcon = roleInfo.icon;

  // Get current office object to display name with ID
  const currentOrg = organizations.find((org) => org.id === currentOrganization);
  const offices = currentOrg?.offices || [];
  const currentOfficeObj = offices.find((office) => office.id === currentOffice);
  
  // Format office display name with ID: "Office Name [ID]"
  const formatOfficeDisplay = (office: typeof offices[0] | undefined) => {
    if (!office) return currentOffice || "Select Office";
    if (office.displayName) return office.displayName;
    // Use office ID instead of code
    if (office.id) {
      // Extract just the ID part if it's in format "O-123" or similar
      const officeId = office.id.replace(/^O-/, '');
      return `${office.name} [${officeId}]`;
    }
    return office.name || office.id;
  };
  
  const currentOfficeDisplay = useMemo(() => formatOfficeDisplay(currentOfficeObj), [currentOfficeObj, currentOffice]);

  // SECTION B: Search State
  const [searchFor, setSearchFor] = useState<
    "patient" | "responsible"
  >("patient");
  const [patientType, setPatientType] = useState<
    "both" | "general" | "ortho"
  >("both");
  const [searchBy, setSearchBy] = useState("lastName");
  const [searchScope, setSearchScope] = useState<
    "current" | "all" | "group"
  >("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Search Results State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Helper to extract numeric office ID from currentOffice (e.g., "OFF-1" -> "1")
  const extractOfficeIdNumber = (officeId?: string): string | undefined => {
    if (!officeId) return undefined;
    if (/^\d+$/.test(officeId)) return officeId;
    const match = officeId.match(/(\d+)$/);
    return match ? match[1] : officeId;
  };

  // Convert API Patient to display format
  const convertApiPatientToDisplay = (apiPatient: ApiPatient): any => {
    // Format DOB from YYYY-MM-DD to MM/DD/YYYY
    let dobFormatted = '';
    if (apiPatient.dob) {
      const dateParts = apiPatient.dob.split('-');
      if (dateParts.length === 3) {
        dobFormatted = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
      }
    }
    
    // Format name
    const name = `${apiPatient.firstName} ${apiPatient.lastName}`;
    
    return {
      id: apiPatient.id,
      patientId: apiPatient.chartNo || `PT-${apiPatient.id.toString().padStart(6, '0')}`,
      name: name,
      firstName: apiPatient.firstName,
      lastName: apiPatient.lastName,
      dob: apiPatient.dob || dobFormatted,
      phone: apiPatient.phone || '',
      email: apiPatient.email || '',
      chartNumber: apiPatient.chartNo || `CH-${apiPatient.id}`,
    };
  };

  const searchByOptions = [
    { value: "lastName", label: "Last Name" },
    { value: "firstName", label: "First Name" },
    { value: "preferredName", label: "Preferred Name" },
    { value: "patientType", label: "Patient Type" },
    { value: "medicaidId", label: "Medicaid ID" },
    { value: "chartNumber", label: "Chart #" },
    { value: "ssn", label: "SSN" },
    { value: "email", label: "Email" },
    { value: "birthDate", label: "Birth Date" },
    { value: "homePhone", label: "Home Phone" },
    { value: "cellPhone", label: "Cell Phone" },
    { value: "workPhone", label: "Work Phone" },
    { value: "patientId", label: "Patient ID" },
    {
      value: "responsiblePartyId",
      label: "Responsible Party ID",
    },
    {
      value: "responsiblePartyType",
      label: "Responsible Party Type",
    },
    { value: "subscriberId", label: "Subscriber ID" },
  ];

  const getPlaceholder = () => {
    const option = searchByOptions.find(
      (o) => o.value === searchBy,
    );
    return `Enter ${option?.label}...`;
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      alert("Please enter search criteria");
      return;
    }

    const query = `${searchBy}:${searchText}|scope:${searchScope}|type:${searchFor}`;
    setLastSearchQuery(query);

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(false);
    setExpandedPatientId(null);

    try {
      // Extract numeric office ID
      const officeIdNum = searchScope === 'current' ? extractOfficeIdNumber(currentOffice) : undefined;
      
      // Call advanced search API (same as Patient.tsx)
      const response = await searchPatients({
        searchBy: searchBy,
        searchValue: searchText.trim(),
        searchFor: searchFor,
        patientType: patientType === 'both' ? 'both' : patientType || 'both',
        searchScope: searchScope,
        includeInactive: includeInactive,
        officeId: officeIdNum,
        limit: 100,
        offset: 0,
      });

      // Convert API patients to display format
      const results = response.patients.map(convertApiPatientToDisplay);
      
      setSearchResults(results);
      setHasSearched(true);
    } catch (error: any) {
      console.error('Error searching patients:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to search patients';
      setSearchError(errorMessage);
      setHasSearched(true);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLastSearch = () => {
    if (!lastSearchQuery) {
      alert("No previous search to reload");
      return;
    }
    handleSearch();
  };

  const handleAddNewPatient = () => {
    navigate("/patient/new");
  };

  const handleViewPatient = (patient: any) => {
    navigate(`/patient/${patient.id}/overview`);
  };

  const toggleExpand = (patientId: number) => {
    setExpandedPatientId(expandedPatientId === patientId ? null : patientId);
  };
  const handleLogout = async () => {
    // Call onLogout immediately to show loading overlay
    // onLogout will handle the API call and state management
    await onLogout();
      navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav
        onLogout={handleLogout}
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

      <div className="pt-[120px]">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* SECTION A: Welcome User / Identity Panel */}
          <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden">
            {/* Header Bar - Slate Blue */}
            {/* Header Bar - Slate Blue */}
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <RoleIcon
                    className="w-8 h-8 text-white"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Welcome, {user?.name || "User"}
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
                    user?.isActive ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className="w-5 h-5 text-white"
                      strokeWidth={2}
                    />
                    <span className="text-white font-semibold text-sm">
                      {user?.isActive ? "Active" : "Inactive"}
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
                    <Mail
                      className="w-4 h-4 text-[#3A6EA5]"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                    Email Address
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#1E293B] truncate">
                  {user?.email || "Not provided"}
                </div>
              </div>

              {/* User ID */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#1F3A5F]/10 rounded-lg">
                    <Shield
                      className="w-4 h-4 text-[#1F3A5F]"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                    User ID
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#1E293B] font-mono">
                  {user?.id || "N/A"}
                </div>
              </div>

              {/* Current Office */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#2FB9A7]/10 rounded-lg">
                    <Building2
                      className="w-4 h-4 text-[#2FB9A7]"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                    Current Office
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#1E293B]">
                  {currentOfficeDisplay}
                </div>
              </div>

              {/* Account Status */}
              {/* Account Status */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      user?.isActive
                        ? "bg-[#2FB9A7]/10"
                        : "bg-red-100"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        user?.isActive
                          ? "text-[#2FB9A7]"
                          : "text-red-600"
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
                    user?.isActive
                      ? "text-[#2FB9A7]"
                      : "text-red-600"
                  }`}
                >
                  {user?.isActive ? "Active" : "Inactive"}
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
                        checked={searchFor === "patient"}
                        onChange={(e) =>
                          setSearchFor(
                            e.target.value as "patient",
                          )
                        }
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        Patient
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="searchFor"
                        value="responsible"
                        checked={searchFor === "responsible"}
                        onChange={(e) =>
                          setSearchFor(
                            e.target.value as "responsible",
                          )
                        }
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        Responsible Party
                      </span>
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
                          checked={patientType === "both"}
                          onChange={(e) =>
                            setPatientType(
                              e.target.value as "both",
                            )
                          }
                          className={components.radio}
                        />
                        <span className="text-sm font-semibold text-[#1E293B]">
                          Both
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                        <input
                          type="radio"
                          name="patientType"
                          value="general"
                          checked={patientType === "general"}
                          onChange={(e) =>
                            setPatientType(
                              e.target.value as "general",
                            )
                          }
                          className={components.radio}
                        />
                        <span className="text-sm font-semibold text-[#1E293B]">
                          General Patient
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                        <input
                          type="radio"
                          name="patientType"
                          value="ortho"
                          checked={patientType === "ortho"}
                          onChange={(e) =>
                            setPatientType(
                              e.target.value as "ortho",
                            )
                          }
                          className={components.radio}
                        />
                        <span className="text-sm font-semibold text-[#1E293B]">
                          Ortho Patient
                        </span>
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
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors"
                      >
                        <input
                          type="radio"
                          name="searchBy"
                          value={option.value}
                          checked={searchBy === option.value}
                          onChange={(e) =>
                            setSearchBy(e.target.value)
                          }
                          className={components.radio}
                        />
                        <span className="text-sm font-semibold text-[#1E293B]">
                          {option.label}
                        </span>
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
                        checked={searchScope === "current"}
                        onChange={(e) =>
                          setSearchScope(
                            e.target.value as "current",
                          )
                        }
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        Current Office
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="searchScope"
                        value="all"
                        checked={searchScope === "all"}
                        onChange={(e) =>
                          setSearchScope(e.target.value as "all")
                        }
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        All Offices
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="radio"
                        name="searchScope"
                        value="group"
                        checked={searchScope === "group"}
                        onChange={(e) =>
                          setSearchScope(
                            e.target.value as "group",
                          )
                        }
                        className={components.radio}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        Search in Office Group
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) =>
                          setIncludeInactive(e.target.checked)
                        }
                        className={components.checkbox}
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        Include Inactive
                      </span>
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
                      onChange={(e) =>
                        setSearchText(e.target.value)
                      }
                      placeholder={getPlaceholder()}
                      className={components.input}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handleSearch}
                    className={
                      components.buttonPrimary +
                      " flex items-center gap-2"
                    }
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
                    className={
                      components.buttonSuccess +
                      " flex items-center gap-2"
                    }
                  >
                    <UserPlus
                      className="w-5 h-5"
                      strokeWidth={2}
                    />
                    ADD NEW PATIENT
                  </button>
                </div>
              </div>

              {/* Search Help Text */}
              {!hasSearched && (
              <div className="text-center">
                <p className="text-sm text-[#64748B] font-medium">
                  💡 Use the search criteria above to find
                  patients or responsible parties. Results will
                  appear below.
                </p>
              </div>
              )}

              {/* Search Results */}
              {hasSearched && (
                <div className="mt-6">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
                      <span className="ml-3 text-[#64748B] font-medium">Searching...</span>
                    </div>
                  ) : searchError ? (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <p className="text-red-600 font-semibold">Error: {searchError}</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 font-semibold">No patients found matching your search criteria.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[#1F3A5F]">
                          Search Results ({searchResults.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {searchResults.map((patient) => (
                          <div
                            key={patient.id}
                            className="bg-white border-2 border-[#E2E8F0] rounded-lg p-4 hover:border-[#3A6EA5] transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <button
                                  onClick={() => toggleExpand(patient.id)}
                                  className="text-[#3A6EA5] hover:text-[#2f5a8c]"
                                >
                                  {expandedPatientId === patient.id ? (
                                    <ChevronDown className="w-5 h-5" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-[#1F3A5F] text-lg">
                                      {patient.name}
                                    </h4>
                                    {patient.chartNumber && (
                                      <span className="text-xs bg-[#3A6EA5] text-white px-2 py-1 rounded">
                                        {patient.chartNumber}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-[#64748B]">
                                    {patient.dob && (
                                      <span>DOB: {patient.dob}</span>
                                    )}
                                    {patient.phone && (
                                      <span>Phone: {patient.phone}</span>
                                    )}
                                    {patient.email && (
                                      <span>Email: {patient.email}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleViewPatient(patient)}
                                className={components.buttonPrimary + " flex items-center gap-2 ml-4"}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            </div>
                            {expandedPatientId === patient.id && (
                              <div className="mt-4 pt-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-xs font-bold text-[#64748B] uppercase">First Name:</span>
                                  <p className="text-sm font-semibold text-[#1E293B]">{patient.firstName}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[#64748B] uppercase">Last Name:</span>
                                  <p className="text-sm font-semibold text-[#1E293B]">{patient.lastName}</p>
                                </div>
                                {patient.dob && (
                                  <div>
                                    <span className="text-xs font-bold text-[#64748B] uppercase">Date of Birth:</span>
                                    <p className="text-sm font-semibold text-[#1E293B]">{patient.dob}</p>
                                  </div>
                                )}
                                {patient.phone && (
                                  <div>
                                    <span className="text-xs font-bold text-[#64748B] uppercase">Phone:</span>
                                    <p className="text-sm font-semibold text-[#1E293B]">{patient.phone}</p>
                                  </div>
                                )}
                                {patient.email && (
                                  <div>
                                    <span className="text-xs font-bold text-[#64748B] uppercase">Email:</span>
                                    <p className="text-sm font-semibold text-[#1E293B]">{patient.email}</p>
                                  </div>
                                )}
                                {patient.chartNumber && (
                                  <div>
                                    <span className="text-xs font-bold text-[#64748B] uppercase">Chart Number:</span>
                                    <p className="text-sm font-semibold text-[#1E293B]">{patient.chartNumber}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}