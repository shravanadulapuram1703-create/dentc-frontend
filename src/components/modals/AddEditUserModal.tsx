import { useEffect, useState } from "react";
import {
  X,
  User,
  Shield,
  Users,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import api from "../../services/api";
import type { UserSetupResponse } from "../../types/userSetup";
import { fetchUserForEdit } from "../../services/userApi";
import type { BackendUser } from "../../types/backendUser";

// Re-export BackendUser for backward compatibility
export type { BackendUser } from "../../types/backendUser";





interface AddEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => void;
  editingUser: BackendUser | null; // Can be null for add mode, or have user_id for edit mode
  currentOffice: string;
}

export default function AddEditUserModal({
  isOpen,
  onClose,
  onSave,
  editingUser,
  currentOffice,
}: AddEditUserModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [setup, setSetup] = useState<UserSetupResponse | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [groupMembershipsMetadata, setGroupMembershipsMetadata] = useState<
    Array<{ code: string; name: string; description?: string }>
  >([]);
  
  // User data loading states (for edit mode)
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [userDataError, setUserDataError] = useState<string | null>(null);
  const [loadedUserData, setLoadedUserData] = useState<BackendUser | null>(null);
  
  // Determine mode - check if editingUser has user_id
  const mode: "add" | "edit" = editingUser?.user_id ? "edit" : "add";

  // useEffect(() => {
  //   if (!isOpen) return;

  //   setSetupLoading(true);
  //   api
  //     .get<UserSetupResponse>("/api/v1/users/setup")
  //     .then(res => setSetup(res.data))
  //     .finally(() => setSetupLoading(false));
  // }, [isOpen]);



  // Form Data State
  
  // Fetch setup data (offices, roles, groups, etc.)
  useEffect(() => {
    if (!isOpen) return;

    setSetupLoading(true);
    api
      .get<UserSetupResponse>("/api/v1/users/setup")
      .then(res => setSetup(res.data))
      .catch(err => {
        console.error("Failed to load setup data:", err);
      })
      .finally(() => setSetupLoading(false));
  }, [isOpen]);

  // Fetch available user group memberships metadata (dynamic from backend)
  useEffect(() => {
    if (!isOpen) return;

    api
      .get<{ groups: Array<{ code: string; name: string; description?: string }> }>(
        "/api/v1/users/groups-metadata"
      )
      .then(res => {
        setGroupMembershipsMetadata(res.data?.groups || []);
      })
      .catch(err => {
        console.error("Failed to load group memberships metadata:", err);
        setGroupMembershipsMetadata([]);
      });
  }, [isOpen]);

  // Fetch user data when in edit mode
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setUserDataError(null);
      setLoadedUserData(null);
      return;
    }
    
    // If editingUser has user_id, fetch full user data for editing
    if (mode === "edit" && editingUser?.user_id) {
      setUserDataLoading(true);
      setUserDataError(null);
      
      console.log("Fetching user data for editing, user_id:", editingUser.user_id);
      
      // Fetch user data using the same endpoint as ViewUserDetailsModal
      // This should return complete user data including preferences, time_clock, etc.
      fetchUserForEdit(editingUser.user_id)
        .then(userData => {
          console.log("User data loaded for editing:", userData);
          setLoadedUserData(userData);
          setUserDataError(null);
        })
        .catch(err => {
          console.error("Failed to load user data for editing:", err);
          setUserDataError(err.response?.data?.detail || err.message || "Failed to load user data");
        })
        .finally(() => {
          setUserDataLoading(false);
        });
    } else if (mode === "add") {
      // In add mode, ensure loadedUserData is null
      setLoadedUserData(null);
      setUserDataError(null);
    }
  }, [isOpen, editingUser?.user_id, mode]);

  // const [formData, setFormData] = useState<any>({
  //   username: "",
  //   password: "",
  //   firstName: "",
  //   lastName: "",
  //   email: "",
  //   phone: "",

  //   active: true,

  //   homeOffice: "",
  //   assignedOffices: [],

  //   roles: [],
  //   assignedGroups: [],

  //   permittedIPs: [],

  //   patientAccessLevel: "all",

  //   use24x7Access: true,
  //   allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  //   allowedFrom: "08:00",
  //   allowedUntil: "18:00",

  //   timeClockPayRate: "",
  //   overtimeMethod: "daily",
  //   overtimeRate: "1.5",

  //   startupScreen: "Dashboard",
  //   defaultPerioScreen: "Standard",
  //   defaultNavigationSearch: "Patient",
  //   defaultSearchBy: "lastName",
  //   defaultReferralView: "All",

  //   showProductionView: true,
  //   hideProviderTime: false,
  //   printLabelsForAppointments: false,
  //   promptForEntryDate: false,
  //   includeInactivePatientsInSearch: false,
  //   hipaaCompliantScheduler: false,
  //   isOrthoAssistant: false,
  // });

  const [formData, setFormData] = useState({
    // Identity
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",

    // Status
    active: true,

    // Office Access
    homeOffice: "",
    assignedOffices: [] as string[],

    // Security
    roles: [] as string[],
    securityGroups: [] as string[],

    // Group Memberships (separate from security groups)
    groupMemberships: [] as string[],

    // Network
    permittedIPs: [] as string[],

    // Patient access
    patientAccessLevel: "all", // all | assigned

    // Login restrictions
    use24x7Access: true,
    allowedDays: {
      Mon: true,
      Tue: true,
      Wed: true,
      Thu: true,
      Fri: true,
      Sat: false,
      Sun: false,
    },
    allowedFrom: "08:00",
    allowedUntil: "18:00",

    // Time clock
    timeClockPayRate: "",
    overtimeMethod: "daily",
    overtimeRate: "1.5",

    // Preferences
    startupScreen: "Dashboard",
    defaultPerioScreen: "Standard",
    defaultNavigationSearch: "Patient",
    defaultSearchBy: "lastName",
    defaultReferralView: "All",

    showProductionView: true,
    hideProviderTime: false,
    printLabelsForAppointments: false,
    promptForEntryDate: false,
    includeInactivePatientsInSearch: false,
    hipaaCompliantScheduler: false,
    isOrthoAssistant: false,
  });



  // useEffect(() => {
  //   if (!editingUser) return;

  //   setFormData(prev => ({
  //     ...prev,

  //     username: editingUser.username ?? "",
  //     firstName: editingUser.first_name ?? "",
  //     lastName: editingUser.last_name ?? "",
  //     email: editingUser.email ?? "",
  //     phone: editingUser.phone ?? "",

  //     active: editingUser.is_active,

  //     homeOffice: editingUser.home_office_id?.toString() ?? "",
  //     assignedOffices: editingUser.assigned_offices?.map(String) ?? [],

  //     roles: editingUser.roles ?? [],
  //     assignedGroups: editingUser.security_groups ?? [],

  //     permittedIPs: editingUser.permitted_ips ?? [],

  //     timeClockPayRate: editingUser.time_clock?.pay_rate?.toString() ?? "",
  //     overtimeMethod: editingUser.time_clock?.overtime_method ?? "daily",
  //     overtimeRate: editingUser.time_clock?.overtime_rate?.toString() ?? "1.5",
  //   }));
  // }, [editingUser]);

  
  // const [formData, setFormData] = useState(() => ({
  //   // Identity
  //   username: editingUser?.username ?? "",
  //   password: "",
  //   firstName: editingUser?.first_name ?? "",
  //   lastName: editingUser?.last_name ?? "",
  //   email: editingUser?.email ?? "",
  //   phone: editingUser?.phone ?? "",

  //   // Status
  //   active: editingUser?.is_active ?? true,

  //   // Offices (IDs, not names)
  //   homeOffice: editingUser?.home_office_id?.toString() ?? "",
  //   assignedOffices: editingUser?.assigned_offices?.map(String) ?? [],

  //   // Security
  //   roles: editingUser?.roles ?? [],
  //   assignedGroups: editingUser?.security_groups ?? [],

  //   // Network
  //   permittedIPs: editingUser?.permitted_ips ?? [],

  //   // Patient access
  //   patientAccessLevel: "all",

  //   // Login restrictions
  //   use24x7Access: true,
  //   allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  //   allowedFrom: "08:00",
  //   allowedUntil: "18:00",

  //   // Time clock
  //   timeClockPayRate: editingUser?.time_clock?.pay_rate?.toString() ?? "",
  //   overtimeMethod: editingUser?.time_clock?.overtime_method ?? "daily",
  //   overtimeRate: editingUser?.time_clock?.overtime_rate?.toString() ?? "1.5",

  //   // Preferences
  //   startupScreen: "Dashboard",
  //   defaultPerioScreen: "Standard",
  //   defaultNavigationSearch: "Patient",
  //   defaultSearchBy: "lastName",
  //   defaultReferralView: "All",

  //   showProductionView: true,
  //   hideProviderTime: false,
  //   printLabelsForAppointments: false,
  //   promptForEntryDate: false,
  //   includeInactivePatientsInSearch: false,
  //   hipaaCompliantScheduler: false,
  //   isOrthoAssistant: false,
  // }));

  // Populate form data when user data is loaded (edit mode) or reset for add mode
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        active: true,
        homeOffice: "",
        assignedOffices: [],
        roles: [],
        securityGroups: [],
        groupMemberships: [],
        permittedIPs: [],
        patientAccessLevel: "all",
        use24x7Access: true,
        allowedDays: {
          Mon: true,
          Tue: true,
          Wed: true,
          Thu: true,
          Fri: true,
          Sat: false,
          Sun: false,
        },
        allowedFrom: "08:00",
        allowedUntil: "18:00",
        timeClockPayRate: "",
        overtimeMethod: "daily",
        overtimeRate: "1.5",
        startupScreen: "Dashboard",
        defaultPerioScreen: "Standard",
        defaultNavigationSearch: "Patient",
        defaultSearchBy: "lastName",
        defaultReferralView: "All",
        showProductionView: true,
        hideProviderTime: false,
        printLabelsForAppointments: false,
        promptForEntryDate: false,
        includeInactivePatientsInSearch: false,
        hipaaCompliantScheduler: false,
        isOrthoAssistant: false,
      });
      return;
    }

    // In add mode, keep default values
    if (mode === "add") {
      return;
    }

    // In edit mode, populate from loaded user data
    if (mode === "edit" && loadedUserData) {
      setFormData(prev => ({
        ...prev,
        username: loadedUserData.username ?? "",
        password: "", // Don't populate password in edit mode
        firstName: loadedUserData.first_name ?? "",
        lastName: loadedUserData.last_name ?? "",
        email: loadedUserData.email ?? "",
        phone: loadedUserData.phone ?? "",
        active: loadedUserData.is_active,
        homeOffice: loadedUserData.home_office_id?.toString() ?? "",
        assignedOffices: loadedUserData.assigned_offices?.map(String) ?? [],
        roles: loadedUserData.roles ?? [],
        securityGroups: loadedUserData.security_groups ?? [],
        groupMemberships: (loadedUserData as any).group_memberships?.map((g: any) => 
          typeof g === 'string' ? g : (g.group_id || g.groupId || g.group_name || g.groupName || g)
        ) ?? [],
        permittedIPs: loadedUserData.permitted_ips ?? [],
        patientAccessLevel: (loadedUserData as any).patient_access_level || "all",
        use24x7Access: (loadedUserData as any).login_restrictions?.use_24x7_access !== false,
        allowedDays: (loadedUserData as any).login_restrictions?.allowed_days 
          ? {
              Mon: (loadedUserData as any).login_restrictions.allowed_days.includes("Mon"),
              Tue: (loadedUserData as any).login_restrictions.allowed_days.includes("Tue"),
              Wed: (loadedUserData as any).login_restrictions.allowed_days.includes("Wed"),
              Thu: (loadedUserData as any).login_restrictions.allowed_days.includes("Thu"),
              Fri: (loadedUserData as any).login_restrictions.allowed_days.includes("Fri"),
              Sat: (loadedUserData as any).login_restrictions.allowed_days.includes("Sat"),
              Sun: (loadedUserData as any).login_restrictions.allowed_days.includes("Sun"),
            }
          : {
              Mon: true,
              Tue: true,
              Wed: true,
              Thu: true,
              Fri: true,
              Sat: false,
              Sun: false,
            },
        allowedFrom: (loadedUserData as any).login_restrictions?.allowed_from || "08:00",
        allowedUntil: (loadedUserData as any).login_restrictions?.allowed_until || "18:00",
        timeClockPayRate: loadedUserData.time_clock?.pay_rate?.toString() ?? "",
        overtimeMethod: loadedUserData.time_clock?.overtime_method ?? "daily",
        overtimeRate: loadedUserData.time_clock?.overtime_rate?.toString() ?? "1.5",
        // Preferences
        startupScreen: loadedUserData.preferences?.startup_screen ?? "Dashboard",
        defaultPerioScreen: loadedUserData.preferences?.default_perio_screen ?? "Standard",
        defaultNavigationSearch: loadedUserData.preferences?.default_navigation_search ?? "Patient",
        defaultSearchBy: loadedUserData.preferences?.default_search_by ?? "lastName",
        defaultReferralView: loadedUserData.preferences?.default_referral_view ?? "All",
        showProductionView: loadedUserData.preferences?.show_production_view ?? true,
        hideProviderTime: loadedUserData.preferences?.hide_provider_time ?? false,
        printLabelsForAppointments: loadedUserData.preferences?.print_labels ?? false,
        promptForEntryDate: loadedUserData.preferences?.prompt_entry_date ?? false,
        includeInactivePatientsInSearch: loadedUserData.preferences?.include_inactive_patients ?? false,
        hipaaCompliantScheduler: loadedUserData.preferences?.hipaa_compliant_scheduler ?? false,
        isOrthoAssistant: loadedUserData.preferences?.is_ortho_assistant ?? false,
      }));
    }
  }, [isOpen, mode, loadedUserData]);

  
  const REQUIRED_FIELDS = [
    "username",
    "firstName",
    "lastName",
    "email",
    "homeOffice",
    "roles",
    "securityGroups",
  ];

  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = formData[field as keyof typeof formData];
    if (field === "roles" || field === "securityGroups") {
      return !Array.isArray(value) || value.length === 0;
    }
    return !value;
  });

  const isFormValid = missingFields.length === 0;

  const fieldError = (field: string) =>
    missingFields.includes(field)
      ? "border-[#EF4444] bg-[#FEF2F2]"
      : "";


  const [newIP, setNewIP] = useState("");

  const organization = setup?.organization;

  // const availableOffices = setup?.offices ?? [];
  // const securityGroups = setup?.security_groups ?? [];
  // const userRoles = setup?.roles ?? [];

  const availableOffices = setup?.offices ?? [];

  const securityGroups =
    setup?.security_groups?.map(g => g.code) ?? [];

  // Available user group memberships (driven by /api/v1/users/groups-metadata)
  const availableGroupMetadata = groupMembershipsMetadata || [];

  const userRoles =
    setup?.roles?.map(r => r.code) ?? [];


  const patientAccessLevels = setup?.patient_access_levels ?? [];

  const overtimeMethods = setup?.time_clock.overtime_methods ?? [];
  const overtimeRates = setup?.time_clock.overtime_rates ?? [];




  const tabs = [
    { id: 0, label: "Login Info & Office Access", icon: User },
    { id: 1, label: "Permitted IPs", icon: Shield },
    { id: 2, label: "Group Memberships", icon: Users },
    { id: 3, label: "Time Clock", icon: Clock },
    { id: 4, label: "User Settings", icon: Settings },
  ];

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!isFormValid) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    // Validate required fields
    if (formData.roles.length === 0) {
      alert("Please select at least one User Role / Type");
      return;
    }

    if (formData.securityGroups.length === 0) {
      alert("Please select at least one Primary Security Group");
      return;
    }

    if (!formData.assignedOffices.includes(formData.homeOffice)) {
      alert("Home Office must be one of the assigned offices");
      return;
    }

    // Validate login restrictions
    if (!formData.use24x7Access) {
      const enabledDays = Object.entries(formData.allowedDays).filter(([_, enabled]) => enabled);
      if (enabledDays.length === 0) {
        alert("Please select at least one allowed day for login restrictions");
        return;
      }
      if (!formData.allowedFrom || !formData.allowedUntil) {
        alert("Please specify both 'Allowed From' and 'Allowed Until' times");
        return;
      }
      if (formData.allowedFrom >= formData.allowedUntil) {
        alert("'Allowed From' time must be earlier than 'Allowed Until' time");
        return;
      }
    }

    // Build payload
    const payload = {
      username: formData.username,
      // Only include password if provided (for add mode) or if user wants to change it (edit mode)
      ...(mode === "add" || formData.password ? { password: formData.password || undefined } : {}),

      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,

      is_active: formData.active,

      home_office_id: Number(formData.homeOffice),
      assigned_offices: formData.assignedOffices.map(Number),

      roles: formData.roles.length > 0 ? formData.roles : [],
      security_groups: formData.securityGroups.length > 0 ? formData.securityGroups : [],

      // Group Memberships (array of group IDs or group codes)
      group_memberships: formData.groupMemberships.length > 0 ? formData.groupMemberships : [],

      permitted_ips: formData.permittedIPs,

      // Patient Access Level
      patient_access_level: formData.patientAccessLevel || "all",

      // Login Time Restrictions
      login_restrictions: {
        use_24x7_access: formData.use24x7Access,
        allowed_days: formData.use24x7Access ? null : Object.entries(formData.allowedDays)
          .filter(([_, enabled]) => enabled)
          .map(([day, _]) => day),
        allowed_from: formData.use24x7Access ? null : formData.allowedFrom,
        allowed_until: formData.use24x7Access ? null : formData.allowedUntil,
      },

      time_clock: {
        pay_rate: formData.timeClockPayRate
          ? Number(formData.timeClockPayRate)
          : null,
        overtime_method: formData.overtimeMethod || null,
        overtime_rate: formData.overtimeRate ? Number(formData.overtimeRate) : null,
      },

      preferences: {
        startup_screen: formData.startupScreen,
        default_perio_screen: formData.defaultPerioScreen,
        default_navigation_search: formData.defaultNavigationSearch,
        default_search_by: formData.defaultSearchBy,
        default_referral_view: formData.defaultReferralView,

        show_production_view: formData.showProductionView,
        hide_provider_time: formData.hideProviderTime,
        print_labels: formData.printLabelsForAppointments,
        prompt_entry_date: formData.promptForEntryDate,
        include_inactive_patients: formData.includeInactivePatientsInSearch,
        hipaa_compliant_scheduler: formData.hipaaCompliantScheduler,
        is_ortho_assistant: formData.isOrthoAssistant,
      },
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      console.error("Error saving user:", error);
      // Error handling is done by parent component
    } finally {
      setSaving(false);
    }
  };

  // Office Assignment Handlers
  const moveOfficeToAssigned = (office: string) => {
    if (!formData.assignedOffices.includes(office)) {
      setFormData({
        ...formData,
        assignedOffices: [...formData.assignedOffices, office],
      });
    }
  };

  const removeOfficeFromAssigned = (office: string) => {
    setFormData({
      ...formData,
      assignedOffices: formData.assignedOffices.filter((o) => o !== office),
    });
  };

  // const moveAllOfficesToAssigned = () => {
  //   setFormData({
  //     ...formData,
  //     assignedOffices: [...availableOffices],
  //   });
  // };

  const moveAllOfficesToAssigned = () => {
    setFormData({
      ...formData,
      assignedOffices: availableOffices.map(o =>
        String(o.office_id)
      ),
    });
  };


  const removeAllOfficesFromAssigned = () => {
    setFormData({
      ...formData,
      assignedOffices: [],
    });
  };

  // Group Membership Handlers
  // const addGroup = (group: string) => {
  //   if (!formData.assignedGroups.includes(group)) {
  //     setFormData({
  //       ...formData,
  //       assignedGroups: [...formData.assignedGroups, group],
  //     });
  //   }
  // };

  // const removeGroup = (group: string) => {
  //   setFormData({
  //     ...formData,
  //     assignedGroups: formData.assignedGroups.filter((g) => g !== group),
  //   });
  // };
  // Group Membership handlers (separate from security groups)
  const addGroupMembership = (group: string) => {
    if (!formData.groupMemberships.includes(group)) {
      setFormData({
        ...formData,
        groupMemberships: [...formData.groupMemberships, group],
      });
    }
  };

  const removeGroupMembership = (group: string) => {
    setFormData({
      ...formData,
      groupMemberships: formData.groupMemberships.filter(g => g !== group),
    });
  };



  // IP Address Handlers
  const addIP = () => {
    if (!newIP.trim()) return;
    
    // Basic IP validation (simplified)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(newIP)) {
      alert("Please enter a valid IP address (e.g., 192.168.1.1)");
      return;
    }

    setFormData({
      ...formData,
      permittedIPs: [...formData.permittedIPs, newIP],
    });
    setNewIP("");
  };

  const removeIP = (ip: string) => {
    setFormData({
      ...formData,
      permittedIPs: formData.permittedIPs.filter((i) => i !== ip),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[1400px] max-h-[95vh] overflow-hidden border-2 border-[#E2E8F0]">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between z-10 border-b-2 border-[#162942]">
          <h2 className="font-bold text-white">
            {editingUser ? "EDIT USER" : "ADD NEW USER"}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#162942] p-2 rounded transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] px-6 pt-4 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-4 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#3A6EA5] bg-white text-[#3A6EA5] font-bold"
                    : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Loading State - User Data (Edit Mode) */}
          {mode === "edit" && userDataLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#3A6EA5] animate-spin mx-auto mb-4" />
                <p className="text-[#64748B] font-bold">Loading user data...</p>
              </div>
            </div>
          )}

          {/* Error State - User Data (Edit Mode) */}
          {mode === "edit" && userDataError && !userDataLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-bold mb-2">Failed to load user data</p>
                <p className="text-[#64748B] text-sm mb-4">{userDataError}</p>
                <button
                  onClick={() => {
                    if (editingUser?.user_id) {
                      setUserDataLoading(true);
                      setUserDataError(null);
                      fetchUserForEdit(editingUser.user_id)
                        .then(userData => {
                          setLoadedUserData(userData);
                          setUserDataError(null);
                        })
                        .catch(err => {
                          setUserDataError(err.response?.data?.detail || err.message || "Failed to load user data");
                        })
                        .finally(() => {
                          setUserDataLoading(false);
                        });
                    }
                  }}
                  className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Form Content - Only show if not loading user data or if in add mode */}
          {(!userDataLoading && !userDataError) || mode === "add" ? (
            <>
          {/* Tab 1: Login Info & Office Access */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Practice Group ID (Read-Only) */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Organization Context
                </h3>
                <div className="bg-[#F0F9FF] border-2 border-[#3B82F6] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#1E3A8A] mb-1">
                        PRACTICE GROUP ID (PGID)
                      </label>
                      <p className="font-bold text-[#1E293B] mb-1">
                        {/* {systemPGID} - {systemPGIDName} */}
                        {organization?.pgid} - {organization?.pgid_name}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        This user will inherit data access permissions based on PGID {organization?.pgid}. 
                        All users in this practice group share the same organizational boundary.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity & Login Fields */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Identity & Login
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Username <span className="text-[#EF4444]">*</span>
                    </label>
                    {/* <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    /> */}
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className={`w-full px-3 py-2 border-2 rounded-lg
                        ${fieldError("username")}
                        focus:outline-none focus:border-[#3A6EA5]`}
                    />

                    {missingFields.includes("username") && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        Backend must provide username
                      </p>
                    )}


                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Password <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Default: same as username"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      First Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Last Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>
                  {/* Short ID field removed - not in formData schema */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Email <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Account Status
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.active}
                      onChange={() => setFormData({ ...formData, active: true })}
                      className="w-4 h-4 text-[#22C55E]"
                    />
                    <span className="text-[#1E293B] font-bold">
                      Active (Can log in)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.active}
                      onChange={() =>
                        setFormData({ ...formData, active: false })
                      }
                      className="w-4 h-4 text-[#EF4444]"
                    />
                    <span className="text-[#1E293B] font-bold">
                      Inactive (Cannot log in)
                    </span>
                  </label>
                </div>
                <p className="text-sm text-[#64748B] mt-2">
                  Setting to Inactive will prevent login but preserve all
                  historical data.
                </p>
              </div>

              {/* Security & Role Assignment */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Security & Role
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Primary Security Group{" "}
                      <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.securityGroups[0] ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          securityGroups: e.target.value ? [e.target.value] : [],
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="">Select Security Group</option>
                      {securityGroups.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      User Role / Type <span className="text-[#EF4444]">*</span>
                    </label>
                    {/* <select
                      value={formData.userRole}
                      onChange={(e) =>
                        setFormData({ ...formData, userRole: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      {userRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select> */}
                    <select
                      value={formData.roles[0] ?? ""}
                      onChange={e =>
                        setFormData({ ...formData, roles: [e.target.value] })
                      }
                    >
                      {userRoles.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>                  
                  </div>
                </div>
              </div>

              {/* Patient Access Level */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Patient Access Level
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.patientAccessLevel === "all"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          patientAccessLevel: "all",
                        })
                      }
                      className="w-4 h-4 text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Search patients in all offices
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.patientAccessLevel === "assigned"}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          patientAccessLevel: "assigned",
                        })
                      }
                      className="w-4 h-4 text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Search patients in assigned offices only
                    </span>
                  </label>
                </div>
              </div>

              {/* Login Time Restrictions */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Login Time Restrictions
                </h3>
                
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.use24x7Access}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          use24x7Access: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B] font-bold">
                      24/7 Access (No restrictions)
                    </span>
                  </label>
                </div>

                {!formData.use24x7Access && (
                  <>
                    <div className="mb-4">
                      <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                        Allowed Days
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {Object.keys(formData.allowedDays).map((day) => (
                          <label
                            key={day}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                formData.allowedDays[
                                  day as keyof typeof formData.allowedDays
                                ]
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  allowedDays: {
                                    ...formData.allowedDays,
                                    [day]: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                            />
                            <span className="text-[#1E293B]">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                          Allowed From
                        </label>
                        <input
                          type="time"
                          value={formData.allowedFrom}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              allowedFrom: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                          Allowed Until
                        </label>
                        <input
                          type="time"
                          value={formData.allowedUntil}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              allowedUntil: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* HIPAA Compliant Scheduler */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Privacy Settings
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hipaaCompliantScheduler}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hipaaCompliantScheduler: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] font-bold">
                    Enable HIPAA Compliant Scheduler View
                  </span>
                </label>
                <p className="text-sm text-[#64748B] mt-2 ml-6">
                  Hides patient names and sensitive information in scheduler
                </p>
              </div>

              {/* Office Assignment */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Office Assignment & OID Mapping
                </h3>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                  {/* Available Offices */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                      Available Offices
                    </label>
                    <div className="border-2 border-[#E2E8F0] rounded-lg p-3 min-h-[200px] bg-[#F7F9FC]">
                      {/* {availableOffices
                        .filter(
                          (office) => !formData.assignedOffices.includes(office)
                        )
                        .map((office) => (
                          <div
                            key={office}
                            onClick={() => moveOfficeToAssigned(office)}
                            className="px-3 py-2 hover:bg-white rounded cursor-pointer text-sm border border-transparent hover:border-[#3A6EA5] mb-1"
                          >
                            <div className="font-bold text-[#1E293B]">{office}</div>
                            <div className="text-xs text-[#64748B]">
                              OID: {officeOIDMap[office]}
                            </div>
                          </div>
                        ))} */}
                        {availableOffices
                          .filter(o => !formData.assignedOffices.includes(String(o.office_id)))
                          .map(o => (
                            <div
                              key={o.office_id}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  assignedOffices: [...formData.assignedOffices, String(o.office_id)]
                                })
                              }
                            >
                              <div>{o.office_name}</div>
                              <div className="text-xs">OID: {o.office_oid}</div>
                            </div>
                        ))}
                    </div>
                  </div>

                  {/* Move Buttons */}
                  <div className="flex flex-col justify-center gap-2">
                    <button
                      onClick={moveAllOfficesToAssigned}
                      className="px-3 py-2 bg-[#3A6EA5] text-white rounded hover:bg-[#2d5080] text-sm"
                      title="Assign all offices"
                    >
                      <ChevronRight className="w-4 h-4 mx-auto" />
                      <ChevronRight className="w-4 h-4 mx-auto -mt-2" />
                    </button>
                    <button
                      onClick={removeAllOfficesFromAssigned}
                      className="px-3 py-2 bg-[#3A6EA5] text-white rounded hover:bg-[#2d5080] text-sm"
                      title="Remove all offices"
                    >
                      <ChevronLeft className="w-4 h-4 mx-auto" />
                      <ChevronLeft className="w-4 h-4 mx-auto -mt-2" />
                    </button>
                  </div>

                  {/* Assigned Offices */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                      Assigned Offices ({formData.assignedOffices.length})
                    </label>
                    <div className="border-2 border-[#3A6EA5] rounded-lg p-3 min-h-[200px] bg-white">
                      {formData.assignedOffices.length === 0 ? (
                        <div className="text-center text-[#64748B] text-sm mt-8">
                          No offices assigned
                        </div>
                      ) : (
                        formData.assignedOffices.map((office) => (
                          <div
                            key={office}
                            onClick={() => removeOfficeFromAssigned(office)}
                            className="px-3 py-2 bg-[#E8EFF7] hover:bg-[#F7F9FC] rounded cursor-pointer text-sm border border-[#3A6EA5] mb-1"
                          >
                            {(() => {
                              const officeData = availableOffices.find(o => String(o.office_id) === office);
                              return (
                                <>
                                  <div className="font-bold text-[#1E293B]">{officeData?.office_name || office}</div>
                                  <div className="text-xs text-[#3A6EA5] font-bold">
                                    OID: {officeData?.office_oid || "—"}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Home Office */}
                <div className="mt-4">
                  <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                    Home Office (OID) <span className="text-[#EF4444]">*</span>
                  </label>
                  {/* <select
                    value={formData.homeOffice}
                    onChange={(e) =>
                      setFormData({ ...formData, homeOffice: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  >
                    {formData.assignedOffices.map((office) => (
                      <option key={office} value={office}>
                        {office} (OID: {officeOIDMap[office]})
                      </option>
                    ))}
                  </select> */}
                  <select
                    value={formData.homeOffice}
                    onChange={(e) =>
                      setFormData({ ...formData, homeOffice: e.target.value })
                    }
                  >
                    {availableOffices
                      .filter(o => formData.assignedOffices.includes(String(o.office_id)))
                      .map(o => (
                        <option key={o.office_id} value={o.office_id}>
                          {o.office_name} (OID: {o.office_oid})
                        </option>
                      ))}
                  </select>
                  <p className="text-sm text-[#64748B] mt-1">
                    Default office on login • Home OID: {formData.homeOffice || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Permitted IPs */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  IP Address Restrictions
                </h3>
                
                <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg p-4 mb-4">
                  <p className="text-sm text-[#92400E]">
                    <strong>Default Behavior:</strong> If no IP addresses are defined,
                    login is permitted from all locations.
                  </p>
                  <p className="text-sm text-[#92400E] mt-2">
                    Add IP addresses to restrict login to specific networks or
                    locations.
                  </p>
                </div>

                {/* Add IP Address */}
                <div className="mb-4">
                  <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                    Add IP Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                      placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
                      className="flex-1 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    />
                    <button
                      onClick={addIP}
                      className="px-6 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] font-bold"
                    >
                      ADD
                    </button>
                  </div>
                </div>

                {/* Permitted IPs List */}
                <div>
                  <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                    Permitted IP Addresses ({formData.permittedIPs.length})
                  </label>
                  {formData.permittedIPs.length === 0 ? (
                    <div className="border-2 border-[#E2E8F0] rounded-lg p-8 text-center text-[#64748B]">
                      No IP restrictions set. Login permitted from all locations.
                    </div>
                  ) : (
                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-[#1F3A5F] text-white">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-bold">
                              IP Address
                            </th>
                            <th className="px-4 py-2 text-right text-sm font-bold">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.permittedIPs.map((ip, index) => (
                            <tr
                              key={index}
                              className="border-b border-[#E2E8F0] hover:bg-[#F7F9FC]"
                            >
                              <td className="px-4 py-3 text-[#1E293B]">{ip}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => removeIP(ip)}
                                  className="px-3 py-1 bg-[#EF4444] text-white text-sm rounded hover:bg-[#DC2626]"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Group Memberships */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  User Group Memberships
                </h3>

                <div className="bg-[#DBEAFE] border-2 border-[#3B82F6] rounded-lg p-4 mb-4">
                  <p className="text-sm text-[#1E3A8A]">
                    <strong>Note:</strong> Users may belong to multiple groups.
                    Permissions are additive, not exclusive. This allows staff to
                    wear multiple hats (e.g., Front Desk + Billing).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Available Groups */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                      Available User Groups
                    </label>
                    <div className="border-2 border-[#E2E8F0] rounded-lg p-3 min-h-[300px] bg-[#F7F9FC]">
                      {availableGroupMetadata
                        .filter((group) => !formData.groupMemberships.includes(group.code))
                        .map((group) => (
                          <div
                            key={group.code}
                            onClick={() => addGroupMembership(group.code)}
                            className="px-3 py-2 hover:bg-white rounded cursor-pointer text-sm border border-transparent hover:border-[#3A6EA5] mb-1 flex items-center justify-between"
                          >
                            <span>{group.name || group.code}</span>
                            <ChevronRight className="w-4 h-4 text-[#64748B]" />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Assigned Groups */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">
                      Assigned User Groups ({formData.groupMemberships.length})
                    </label>
                    <div className="border-2 border-[#3A6EA5] rounded-lg p-3 min-h-[300px] bg-white">
                      {formData.groupMemberships.length === 0 ? (
                        <div className="text-center text-[#64748B] text-sm mt-8">
                          No groups assigned
                        </div>
                      ) : (
                        formData.groupMemberships.map((groupCode) => {
                          const meta = availableGroupMetadata.find(g => g.code === groupCode);
                          const label = meta?.name || groupCode;
                          return (
                          <div
                            key={groupCode}
                            className="px-3 py-2 bg-[#E8EFF7] rounded text-sm border border-[#3A6EA5] mb-1 flex items-center justify-between"
                          >
                            <span className="font-bold text-[#1E293B]">
                              {label}
                            </span>
                            <button
                              onClick={() => removeGroupMembership(groupCode)}
                              className="text-[#EF4444] hover:text-[#DC2626]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Time Clock */}
          {activeTab === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Time Clock Settings
                </h3>

                <p className="text-sm text-[#64748B] mb-4">
                  Applies only if user participates in time tracking. Used by
                  payroll and time clock modules.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Time Clock Pay Rate ($/hour)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.timeClockPayRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeClockPayRate: e.target.value,
                        })
                      }
                      placeholder="e.g., 25.00"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Overtime Method
                    </label>
                    <select
                      value={formData.overtimeMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overtimeMethod: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Overtime Rate Multiplier
                    </label>
                    <select
                      value={formData.overtimeRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overtimeRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="1.5">1.5x (Time and a Half)</option>
                      <option value="2.0">2.0x (Double Time)</option>
                      <option value="1.0">1.0x (Regular Rate)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: User Settings */}
          {activeTab === 4 && (
            <div className="space-y-6">
              {/* Navigation Defaults */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Navigation Defaults
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Start-up Screen
                    </label>
                    <select
                      value={formData.startupScreen}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startupScreen: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="Dashboard">Dashboard</option>
                      <option value="Scheduler">Scheduler</option>
                      <option value="Patient">Patient Search</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Default Perio Screen
                    </label>
                    <select
                      value={formData.defaultPerioScreen}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultPerioScreen: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Default Navigation Search
                    </label>
                    <select
                      value={formData.defaultNavigationSearch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultNavigationSearch: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="Patient">Patient</option>
                      <option value="Appointment">Appointment</option>
                      <option value="Claim">Claim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Default Search By
                    </label>
                    <select
                      value={formData.defaultSearchBy}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultSearchBy: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="lastName">Last Name</option>
                      <option value="firstName">First Name</option>
                      <option value="patientId">Patient ID</option>
                      <option value="chartNumber">Chart Number</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scheduler & Production Preferences */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Scheduler & Production Preferences
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showProductionView}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showProductionView: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Show Production View (production colors in appointments)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hideProviderTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hideProviderTime: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Hide Provider Time in Scheduler
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.printLabelsForAppointments}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          printLabelsForAppointments: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Print Labels for Appointments
                    </span>
                  </label>
                </div>
              </div>

              {/* Data Entry Behavior */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Data Entry Behavior
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.promptForEntryDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          promptForEntryDate: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Prompt for Entry Date
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeInactivePatientsInSearch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          includeInactivePatientsInSearch: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Include Inactive Patients in Search
                    </span>
                  </label>
                </div>
              </div>

              {/* Referral & Specialty Flags */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Referral & Specialty Flags
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Default Referral View
                    </label>
                    <select
                      value={formData.defaultReferralView}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultReferralView: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="All">All Referrals</option>
                      <option value="Active">Active Only</option>
                      <option value="Pending">Pending Only</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isOrthoAssistant}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isOrthoAssistant: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                      />
                      <span className="text-[#1E293B] font-bold">
                        Is Ortho Assistant
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          ) : null}
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-[#F7F9FC] border-t-2 border-[#E2E8F0] p-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#64748B] text-white rounded-lg hover:bg-[#475569] transition-colors font-bold"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors font-bold"
          >
            SAVE USER
          </button>
        </div>
      </div>
    </div>
  );
}