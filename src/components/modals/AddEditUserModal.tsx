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

import { fetchUserForEdit } from "../../services/userApi";
import { getUserSetupMetadata, deleteUserImage } from "../../api/generated/endpoints/users/users";
import { listUserGroups } from "../../api/generated/endpoints/staff/staff";
import {
  useListOffices,
  useListProviders,
} from "../../api/generated/endpoints/organization/organization";
import type { UserSetupMetadata } from "../../api/generated/model/userSetupMetadata";
import type { BackendUser } from "../../types/backendUser";

// Re-export BackendUser for backward compatibility
export type { BackendUser } from "../../types/backendUser";





interface AddEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any, imageFile?: File | null) => void | Promise<void>;
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
  const [setup, setSetup] = useState<UserSetupMetadata | null>(null);
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
  
  // Offices for the assignment picker (generated client, OfficeRead).
  const officesQ = useListOffices({ size: 200 }, { query: { enabled: isOpen } });
  const availableOffices = officesQ.data?.items ?? [];

  // Providers for the Report Access Provider dropdown.
  const providersQ = useListProviders({ size: 200 }, { query: { enabled: isOpen } });
  const availableProviders = providersQ.data?.items ?? [];

  // User image + signature (image goes via the multipart endpoint after save).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Dropdown metadata (roles, patient access levels, overtime methods, prefs
  // schema) from GET /api/v1/users/setup-metadata.
  useEffect(() => {
    if (!isOpen) return;

    setSetupLoading(true);
    getUserSetupMetadata()
      .then(data => setSetup(data))
      .catch(err => {
        console.error("Failed to load setup metadata:", err);
      })
      .finally(() => setSetupLoading(false));
  }, [isOpen]);

  // Available user groups (catalog) via the generated client. The membership
  // "code" is the group id (matches fetchUserForEdit's group_memberships shape).
  useEffect(() => {
    if (!isOpen) return;

    listUserGroups({ is_active: true, size: 200 })
      .then(res => {
        setGroupMembershipsMetadata(
          (res.items ?? []).map(g => ({
            code: String(g.id),
            name: g.name,
            description: g.description ?? undefined,
          }))
        );
      })
      .catch(err => {
        console.error("Failed to load user groups:", err);
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

    // Structural
    shortId: "",
    reportAccessProviderId: "",
    custom1: "",
    custom2: "",
    signatureData: "",

    // Status
    active: true,

    // Office Access
    homeOffice: "",
    assignedOffices: [] as string[],

    // Security
    roles: [] as string[],

    // Group Memberships
    groupMemberships: [] as string[],

    // Network
    permittedIPs: [] as string[],

    // Patient access (value from setup-metadata.patient_access_levels)
    patientAccessLevel: "",

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
    overtimeMethod: "",
    overtimeRate: "1.5",
    clockInRequired: false,

    // Preferences
    startupScreen: "Dashboard",
    toolbar: "",
    perioSetupTemplate: "",
    defaultPerioScreen: "Standard",
    defaultNavigationSearch: "Patient",
    defaultSearchBy: "lastName",
    defaultReferralView: "All",

    productionView: false,
    showProductionColors: false,
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
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        shortId: "",
        reportAccessProviderId: "",
        custom1: "",
        custom2: "",
        signatureData: "",
        active: true,
        homeOffice: "",
        assignedOffices: [],
        roles: [],
        groupMemberships: [],
        permittedIPs: [],
        patientAccessLevel: "",
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
        overtimeMethod: "",
        overtimeRate: "1.5",
        clockInRequired: false,
        startupScreen: "Dashboard",
        toolbar: "",
        perioSetupTemplate: "",
        defaultPerioScreen: "Standard",
        defaultNavigationSearch: "Patient",
        defaultSearchBy: "lastName",
        defaultReferralView: "All",
        productionView: false,
        showProductionColors: false,
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
      const lr = loadedUserData.login_restrictions;
      const days = (lr?.allowed_days ?? "").split(",").map(s => s.trim());
      const prefs = loadedUserData.preferences ?? {};
      const prefStr = (k: string, dflt: string) => prefs[k] || dflt;
      const prefBool = (k: string, dflt: boolean) =>
        prefs[k] == null ? dflt : prefs[k] === "true";

      setImageFile(null);
      setImagePreview(loadedUserData.image_url ?? null);

      setFormData(prev => ({
        ...prev,
        username: loadedUserData.username ?? "",
        password: "", // Don't populate password in edit mode
        firstName: loadedUserData.first_name ?? "",
        lastName: loadedUserData.last_name ?? "",
        email: loadedUserData.email ?? "",
        phone: loadedUserData.phone ?? "",
        shortId: loadedUserData.short_id ?? "",
        reportAccessProviderId: loadedUserData.report_access_provider_id ?? "",
        custom1: loadedUserData.custom_1 ?? "",
        custom2: loadedUserData.custom_2 ?? "",
        signatureData: loadedUserData.signature_data ?? "",
        active: loadedUserData.is_active,
        homeOffice: loadedUserData.home_office_id?.toString() ?? "",
        assignedOffices: loadedUserData.assigned_offices?.map(String) ?? [],
        roles: loadedUserData.roles ?? [],
        groupMemberships: loadedUserData.group_memberships ?? [],
        permittedIPs: loadedUserData.permitted_ips ?? [],
        patientAccessLevel: loadedUserData.patient_access_level ?? "",
        use24x7Access: lr?.is_24_7 ?? true,
        allowedDays: {
          Mon: days.includes("Mon"),
          Tue: days.includes("Tue"),
          Wed: days.includes("Wed"),
          Thu: days.includes("Thu"),
          Fri: days.includes("Fri"),
          Sat: days.includes("Sat"),
          Sun: days.includes("Sun"),
        },
        allowedFrom: (lr?.start_time ?? "08:00").slice(0, 5),
        allowedUntil: (lr?.end_time ?? "18:00").slice(0, 5),
        timeClockPayRate: loadedUserData.time_clock?.pay_rate?.toString() ?? "",
        overtimeMethod: loadedUserData.time_clock?.overtime_method ?? "",
        overtimeRate: loadedUserData.time_clock?.overtime_rate?.toString() ?? "1.5",
        clockInRequired: loadedUserData.time_clock?.clock_in_required ?? false,
        // Preferences (stored as key/value strings)
        startupScreen: prefStr("startup_screen", "Dashboard"),
        toolbar: prefStr("toolbar", ""),
        perioSetupTemplate: prefStr("perio_setup_template", ""),
        defaultPerioScreen: prefStr("default_perio_screen", "Standard"),
        defaultNavigationSearch: prefStr("default_navigation_search", "Patient"),
        defaultSearchBy: prefStr("default_search_by", "lastName"),
        defaultReferralView: prefStr("default_referral_view", "All"),
        productionView: prefBool("production_view", false),
        showProductionColors: prefBool("show_production_colors", false),
        hideProviderTime: prefBool("hide_provider_time", false),
        printLabelsForAppointments: prefBool("print_labels", false),
        promptForEntryDate: prefBool("prompt_entry_date", false),
        includeInactivePatientsInSearch: prefBool("include_inactive_patients", false),
        hipaaCompliantScheduler: prefBool("hipaa_compliant_scheduler", false),
        isOrthoAssistant: prefBool("is_ortho_assistant", false),
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
  ];

  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = formData[field as keyof typeof formData];
    if (field === "roles") {
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

  // Backend-driven dropdown options (Option = { value, label }).
  const availableGroupMetadata = groupMembershipsMetadata || [];
  const userRoles = setup?.roles ?? [];
  const patientAccessLevels = setup?.patient_access_levels ?? [];
  const overtimeMethods = setup?.overtime_methods ?? [];




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

    if (mode === "add" && formData.password.length < 8) {
      alert("Password (at least 8 characters) is required for a new user");
      return;
    }

    if (!formData.assignedOffices.includes(formData.homeOffice)) {
      alert("Home Office must be one of the assigned offices");
      return;
    }

    const enabledDays = Object.entries(formData.allowedDays)
      .filter(([, enabled]) => enabled)
      .map(([day]) => day);

    // Validate login restrictions
    if (!formData.use24x7Access) {
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

    // Build the compound payload (UserCompleteCreate / UserCompleteUpdate). The
    // parent (UserSetup) routes it to POST /users/complete or PUT
    // /users/{id}/complete in one transaction. Preferences are key/value strings.
    const payload = {
      email: formData.email,
      username: formData.username,
      ...(formData.password ? { password: formData.password } : {}),

      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone || null,

      role: formData.roles[0],
      is_active: formData.active,
      patient_access_level: formData.patientAccessLevel || null,

      short_id: formData.shortId || null,
      report_access_provider_id: formData.reportAccessProviderId || null,
      custom_1: formData.custom1 || null,
      custom_2: formData.custom2 || null,
      signature_data: formData.signatureData || null,

      home_office_id: formData.homeOffice ? Number(formData.homeOffice) : null,
      assigned_offices: formData.assignedOffices.map(Number),

      group_ids: formData.groupMemberships
        .map(Number)
        .filter((n) => !Number.isNaN(n)),

      ip_rules: formData.permittedIPs.map((ip) => ({
        ip_address: ip,
        rule_type: "allow",
      })),

      login_restrictions: {
        is_24_7: formData.use24x7Access,
        allowed_days: formData.use24x7Access ? null : enabledDays.join(","),
        start_time: formData.use24x7Access ? null : formData.allowedFrom,
        end_time: formData.use24x7Access ? null : formData.allowedUntil,
      },

      time_clock: {
        pay_rate: formData.timeClockPayRate ? Number(formData.timeClockPayRate) : null,
        overtime_method: formData.overtimeMethod || null,
        overtime_rate: formData.overtimeRate ? Number(formData.overtimeRate) : null,
        clock_in_required: formData.clockInRequired,
      },

      preferences: {
        startup_screen: formData.startupScreen,
        toolbar: formData.toolbar,
        perio_setup_template: formData.perioSetupTemplate,
        default_perio_screen: formData.defaultPerioScreen,
        default_navigation_search: formData.defaultNavigationSearch,
        default_search_by: formData.defaultSearchBy,
        default_referral_view: formData.defaultReferralView,
        production_view: String(formData.productionView),
        show_production_colors: String(formData.showProductionColors),
        hide_provider_time: String(formData.hideProviderTime),
        print_labels: String(formData.printLabelsForAppointments),
        prompt_entry_date: String(formData.promptForEntryDate),
        include_inactive_patients: String(formData.includeInactivePatientsInSearch),
        hipaa_compliant_scheduler: String(formData.hipaaCompliantScheduler),
        is_ortho_assistant: String(formData.isOrthoAssistant),
      },
    };

    setSaving(true);
    try {
      await onSave(payload, imageFile);
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
      assignedOffices: availableOffices.map(o => String(o.id)),
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

  // User image: validate, preview, and stage the file for upload after save.
  const onImageSelected = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("User image must be a JPEG or PNG file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("User image must be 2 MB or smaller.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const removeImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    if (mode === "edit" && editingUser?.user_id) {
      try {
        await deleteUserImage(editingUser.user_id);
      } catch (e) {
        console.error("Failed to remove user image:", e);
      }
    }
  };

  // Signature: store the image as a data-URL string (backend signature_data).
  const onSignatureSelected = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setFormData((prev) => ({ ...prev, signatureData: String(reader.result) }));
    reader.readAsDataURL(file);
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
                      <p className="text-sm text-[#64748B]">
                        This user inherits data access permissions from the current
                        practice group. All users in the group share the same
                        organizational boundary.
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
                  {/* Password — only on create; not changed from this screen in edit mode. */}
                  {mode === "add" && (
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
                  )}
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
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Short ID (6 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.shortId}
                      onChange={(e) =>
                        setFormData({ ...formData, shortId: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., KRIUDA"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] uppercase"
                    />
                  </div>
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
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Custom 1
                    </label>
                    <input
                      type="text"
                      value={formData.custom1}
                      onChange={(e) =>
                        setFormData({ ...formData, custom1: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Custom 2
                    </label>
                    <input
                      type="text"
                      value={formData.custom2}
                      onChange={(e) =>
                        setFormData({ ...formData, custom2: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
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
                      User Role / Type <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.roles[0] ?? ""}
                      onChange={e =>
                        setFormData({ ...formData, roles: e.target.value ? [e.target.value] : [] })
                      }
                      className={`w-full px-3 py-2 border-2 rounded-lg ${fieldError("roles")} focus:outline-none focus:border-[#3A6EA5]`}
                    >
                      <option value="">Select Role</option>
                      {userRoles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Patient Access Level
                    </label>
                    <select
                      value={formData.patientAccessLevel}
                      onChange={e =>
                        setFormData({ ...formData, patientAccessLevel: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="">Select Access Level</option>
                      {patientAccessLevels.map(lvl => (
                        <option key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Report Access Provider
                    </label>
                    <select
                      value={formData.reportAccessProviderId}
                      onChange={e =>
                        setFormData({ ...formData, reportAccessProviderId: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    >
                      <option value="">None</option>
                      {availableProviders.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                          .filter(o => !formData.assignedOffices.includes(String(o.id)))
                          .map(o => (
                            <div
                              key={o.id}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  assignedOffices: [...formData.assignedOffices, String(o.id)]
                                })
                              }
                              className="px-3 py-2 hover:bg-white rounded cursor-pointer text-sm border border-transparent hover:border-[#3A6EA5] mb-1"
                            >
                              <div className="font-bold text-[#1E293B]">{o.name}</div>
                              <div className="text-xs text-[#64748B]">OID: {o.office_code}</div>
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
                              const officeData = availableOffices.find(o => String(o.id) === office);
                              return (
                                <>
                                  <div className="font-bold text-[#1E293B]">{officeData?.name || office}</div>
                                  <div className="text-xs text-[#3A6EA5] font-bold">
                                    OID: {officeData?.office_code || "—"}
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
                      .filter(o => formData.assignedOffices.includes(String(o.id)))
                      .map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name} (OID: {o.office_code})
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
                      <option value="">Select Method</option>
                      {overtimeMethods.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
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

                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={formData.clockInRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, clockInRequired: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                  />
                  <span className="text-[#1E293B] font-bold">Clock-in required</span>
                </label>
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
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Toolbar
                    </label>
                    <input
                      type="text"
                      value={formData.toolbar}
                      onChange={(e) =>
                        setFormData({ ...formData, toolbar: e.target.value })
                      }
                      placeholder="e.g., Front Desk"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-1 text-sm">
                      Perio Setup Template
                    </label>
                    <input
                      type="text"
                      value={formData.perioSetupTemplate}
                      onChange={(e) =>
                        setFormData({ ...formData, perioSetupTemplate: e.target.value })
                      }
                      placeholder="e.g., Default Template"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                    />
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
                      checked={formData.productionView}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productionView: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">Production View?</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showProductionColors}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showProductionColors: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#3A6EA5]"
                    />
                    <span className="text-[#1E293B]">
                      Show Production Colors in Appointment Units?
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

              {/* Profile Media */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Profile Media
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* User Image */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">User Image</label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="User"
                          className="w-20 h-20 rounded-lg object-cover border-2 border-[#E2E8F0]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[#E2E8F0] flex items-center justify-center text-xs text-[#64748B]">
                          No image
                        </div>
                      )}
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => onImageSelected(e.target.files?.[0] ?? null)}
                          className="text-sm"
                        />
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={removeImage}
                            className="block text-xs text-[#EF4444] hover:underline"
                          >
                            Remove image
                          </button>
                        )}
                        <p className="text-xs text-[#64748B]">JPEG/PNG, ≤ 2 MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Signature */}
                  <div>
                    <label className="block text-[#1E293B] font-bold mb-2 text-sm">Signature</label>
                    <div className="flex items-center gap-4">
                      {formData.signatureData ? (
                        <img
                          src={formData.signatureData}
                          alt="Signature"
                          className="h-20 max-w-[160px] object-contain border-2 border-[#E2E8F0] rounded-lg bg-white"
                        />
                      ) : (
                        <div className="w-40 h-20 rounded-lg border-2 border-dashed border-[#E2E8F0] flex items-center justify-center text-xs text-[#64748B] text-center px-2">
                          No signature
                        </div>
                      )}
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => onSignatureSelected(e.target.files?.[0] ?? null)}
                          className="text-sm"
                        />
                        {formData.signatureData && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, signatureData: "" })}
                            className="block text-xs text-[#EF4444] hover:underline"
                          >
                            Clear signature
                          </button>
                        )}
                        <p className="text-xs text-[#64748B]">Topaz pad capture or an uploaded image.</p>
                      </div>
                    </div>
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