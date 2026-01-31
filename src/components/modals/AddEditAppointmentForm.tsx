import {
  X,
  Calendar,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import SendEmailModal from "./SendEmailModal";
import TxPlansTab from "./TxPlansTab";
import DatePickerCalendar from "./DatePickerCalendar";
import AddProcedure from "../patient/AddProcedure";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchProviders,
  fetchOperatories,
  fetchProcedureTypes,
  fetchAppointmentStatuses,
  fetchProcedureCodes,
  fetchProcedureCategories,
  fetchTreatmentPlans,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  type Provider,
  type Operatory,
  type ProcedureType,
  type AppointmentStatus,
  type ProcedureCode as ApiProcedureCode,
  type ProcedureCategory,
  type TreatmentPlan,
} from "../../services/schedulerApi";
import {
  createPatient,
  type PatientCreateRequest,
} from "../../services/patientApi";

interface PatientSearchResult {
  patientId: string;
  name: string;
  gender: string;
  ssn: string;
  phone: string;
  birthdate: string;
  age: number;
  respId: string;
  chartNumber: string;
  patientType: string;
  office: string;
  email?: string;
  cellPhone?: string;
  workPhone?: string;
  homePhone?: string;
}

interface AddEditAppointmentFormProps {
  patient: PatientSearchResult;
  selectedSlot: { time: string; operatory: string } | null;
  currentOffice: string;
  onClose: () => void;
  onSave: (data: any) => void;
  onBack: () => void;
  editingAppointment?: any; // Optional: appointment data when editing
  initialAppointmentData?: { // Optional: initial appointment data from New Patient flow
    date?: string;
    time?: string;
    duration?: number;
    procedureType?: string;
    operatory?: string;
    provider?: string;
    notes?: string;
  };
}

interface Treatment {
  id: string;
  status: string;
  code: string;
  th: string;
  surf: string;
  description: string;
  bill: string;
  duration: number;
  provider: string;
  providerUnits: number;
  estPatient: number;
  estInsurance: number;
  fee: number;
}

export default function AddEditAppointmentForm({
  patient,
  selectedSlot,
  currentOffice,
  onClose,
  onSave,
  onBack,
  editingAppointment,
  initialAppointmentData,
}: AddEditAppointmentFormProps) {
  const { currentOrganization, organizations, currentOffice: currentOfficeId } = useAuth();
  
  // Find current organization and office details
  const currentOrg = organizations.find((org) => org.id === currentOrganization);
  const currentOfficeObj = currentOrg?.offices.find((office) => office.id === currentOfficeId);
  
  // Extract numeric tenant ID from organization ID (e.g., "ORG-1" -> 1, "1" -> 1)
  const getTenantId = (): string => {
    if (!currentOrganization) return "N/A";
    // Extract numeric ID from formats like "ORG-1", "1", "001", etc.
    const match = currentOrganization.match(/(\d+)$/);
    if (match && match[1]) {
      // Convert to number to remove leading zeros (e.g., "001" -> 1), then back to string
      const numericId = parseInt(match[1], 10);
      return isNaN(numericId) ? currentOrganization : String(numericId);
    }
    // If no numeric match, try to use the value directly (might already be numeric)
    if (/^\d+$/.test(currentOrganization)) {
      return currentOrganization;
    }
    return currentOrganization;
  };

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dynamic metadata state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [statusOptions, setStatusOptions] = useState<AppointmentStatus[]>([]);
  const [procedureCodes, setProcedureCodes] = useState<ApiProcedureCode[]>([]);
  const [procedureCategories, setProcedureCategories] = useState<ProcedureCategory[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  
  // Ensure procedureCodes is always an array (defensive check)
  const safeProcedureCodes = procedureCodes || [];
  
  // Loading states
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(false);
  const [appointmentLoaded, setAppointmentLoaded] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);

  // Fetch full appointment details when editing - Progressive loading (non-blocking)
  useEffect(() => {
    const loadAppointmentDetails = async () => {
      if (!editingAppointment?.id) {
        setAppointmentLoaded(true); // No appointment to load
        return;
      }
      
      setIsLoadingAppointment(true);
      setAppointmentError(null);
      // Don't block form display - allow progressive loading
      
      try {
        console.log("Loading appointment details for editing:", editingAppointment.id);
        const fullAppointment = await fetchAppointment(editingAppointment.id);
        console.log("Full appointment data loaded:", fullAppointment);
        console.log("Lab fields from API:", {
          lab: fullAppointment.lab,
          labDds: (fullAppointment as any).labDds,
          lab_dds: fullAppointment.lab_dds,
          labCost: (fullAppointment as any).labCost,
          lab_cost: fullAppointment.lab_cost,
          labSentOn: (fullAppointment as any).labSentOn,
          lab_sent_on: fullAppointment.lab_sent_on,
          labDueOn: (fullAppointment as any).labDueOn,
          lab_due_on: fullAppointment.lab_due_on,
          labRecvdOn: (fullAppointment as any).labRecvdOn,
          lab_recvd_on: fullAppointment.lab_recvd_on,
        });
        console.log("Campaign field from API:", {
          campaignId: (fullAppointment as any).campaignId,
          campaign_id: fullAppointment.campaign_id,
        });
        
        // Convert date from YYYY-MM-DD to MM/DD/YYYY
        const convertDateToMMDDYYYY = (dateStr: string): string => {
          if (!dateStr) return getTodayDate();
          if (dateStr.includes("/")) return dateStr; // Already in MM/DD/YYYY
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
          return dateStr;
        };
        
        // Convert time from 24-hour (HH:MM) to 12-hour (HH:MM AM/PM)
        const convertTimeTo12Hour = (timeStr: string): string => {
          if (!timeStr) return "09:00 AM";
          if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
          const match = timeStr.match(/(\d{2}):(\d{2})/);
          if (match && match[1]) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const period = hours >= 12 ? "PM" : "AM";
            if (hours > 12) hours -= 12;
            if (hours === 0) hours = 12;
            return `${hours.toString().padStart(2, "0")}:${minutes} ${period}`;
          }
          return timeStr;
        };
        
        // Update form data with appointment details
        // Handle both camelCase and snake_case from API response
        const appointment: any = fullAppointment;
        setFormData(prev => ({
          ...prev,
          // Scheduling
          appointmentDate: convertDateToMMDDYYYY(fullAppointment.date),
          startsAt: convertTimeTo12Hour(fullAppointment.startTime),
          duration: fullAppointment.duration,
          procedureType: fullAppointment.procedureType || prev.procedureType,
          operatory: fullAppointment.operatory || prev.operatory,
          provider: fullAppointment.provider || prev.provider,
          status: fullAppointment.status || prev.status,
          
          // Lab information - handle both camelCase (labDds, labCost, labSentOn) and snake_case (lab_dds, lab_cost, lab_sent_on)
          lab: appointment.lab || false,
          labDDS: appointment.labDds || appointment.lab_dds || appointment.labDDS || "",
          labCost: appointment.labCost?.toString() || appointment.lab_cost?.toString() || "",
          // Keep dates in YYYY-MM-DD format for date inputs (HTML date inputs require this format)
          labSentOn: appointment.labSentOn || appointment.lab_sent_on || "",
          labDueOn: appointment.labDueOn || appointment.lab_due_on || "",
          labRecvdOn: appointment.labRecvdOn || appointment.lab_recvd_on || "",
          
          // Flags
          missed: appointment.missed || false,
          cancelled: appointment.cancelled || false,
          
          // Notes & Campaign - handle both camelCase (campaignId) and snake_case (campaign_id)
          notes: appointment.notes || "",
          campaignId: appointment.campaignId || appointment.campaign_id || "",
        }));
        
        // Load treatments if available
        // Handle both camelCase (procedureCode) and snake_case (procedure_code)
        if (fullAppointment.treatments && Array.isArray(fullAppointment.treatments)) {
          const transformedTreatments: Treatment[] = fullAppointment.treatments.map((t: any) => ({
            id: t.id || Date.now().toString() + Math.random(),
            status: t.status || "TP",
            code: t.procedureCode || t.procedure_code || "",
            th: t.tooth || t.th || "",
            surf: t.surface || t.surf || "",
            description: t.description || "",
            bill: t.billTo || t.bill_to || t.bill || "Patient",
            duration: t.duration || 0,
            provider: t.provider || "",
            providerUnits: t.providerUnits || t.provider_units || 1,
            estPatient: t.estPatient || t.est_patient || 0,
            estInsurance: t.estInsurance || t.est_insurance || 0,
            fee: t.fee || 0,
          }));
          setTreatments(transformedTreatments);
          console.log("Loaded treatments:", transformedTreatments);
          console.log("Treatment procedure codes:", transformedTreatments.map(t => t.code));
        }
        
        // Mark appointment as loaded - form can now be shown
        setAppointmentLoaded(true);
        console.log("✅ Appointment details fully loaded, form can be displayed");
      } catch (error: any) {
        console.error("Error loading appointment details:", error);
        setAppointmentError(error.response?.data?.detail || error.message || "Failed to load appointment details");
        // Still mark as loaded to show form, but with error message
        setAppointmentLoaded(true);
      } finally {
        setIsLoadingAppointment(false);
      }
    };
    
    loadAppointmentDetails();
  }, [editingAppointment?.id]);

  // Fetch all metadata on component mount
  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      setMetadataError(null);
      
      try {
        // Fetch all metadata in parallel
        const [
          providersData,
          operatoriesData,
          procedureTypesData,
          statusesData,
          categoriesData,
          treatmentPlansData,
        ] = await Promise.all([
          fetchProviders(currentOfficeId),
          fetchOperatories(currentOfficeId),
          fetchProcedureTypes(),
          fetchAppointmentStatuses(),
          fetchProcedureCategories().catch((err) => {
            console.error("Error fetching procedure categories:", err);
            return [];
          }),
          fetchTreatmentPlans(patient.patientId).catch((err) => {
            console.error("Error fetching treatment plans:", err);
            return [];
          }),
        ]);

        setProviders(providersData);
        setOperatories(operatoriesData);
        setProcedureTypes(procedureTypesData);
        setStatusOptions(statusesData);
        setProcedureCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setTreatmentPlans(Array.isArray(treatmentPlansData) ? treatmentPlansData : []);
        
        console.log("Metadata loaded:", {
          providers: providersData.length,
          operatories: operatoriesData.length,
          procedureTypes: procedureTypesData.length,
          statuses: statusesData.length,
          categories: Array.isArray(categoriesData) ? categoriesData.length : 0,
          treatmentPlans: Array.isArray(treatmentPlansData) ? treatmentPlansData.length : 0,
        });
        console.log("Treatment plans data:", treatmentPlansData);
        console.log("Procedure types with colors:", procedureTypesData.map(t => ({ name: t.name, color: t.color })));
        console.log("Procedure categories:", categoriesData);

        // Load procedure codes (can be lazy-loaded later if needed)
        try {
          console.log("Fetching procedure codes...");
          const codesData = await fetchProcedureCodes();
          const validCodes = Array.isArray(codesData) ? codesData : [];
          setProcedureCodes(validCodes);
          console.log("✅ Loaded procedure codes:", validCodes.length);
          if (validCodes.length > 0) {
            console.log("Sample procedure codes:", validCodes.slice(0, 3));
          }
        } catch (err: any) {
          console.error("❌ Error fetching procedure codes:", err);
          console.error("Error details:", err.response?.data || err.message);
          setProcedureCodes([]);
        }
      } catch (err: any) {
        console.error("Error loading metadata:", err);
        setMetadataError(`Failed to load appointment metadata: ${err.message}`);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [currentOfficeId, patient.patientId]);

  // Update formData when metadata loads (only once when metadata finishes loading)
  useEffect(() => {
    if (!isLoadingMetadata && statusOptions.length > 0 && procedureTypes.length > 0) {
      setFormData(prev => {
        const updates: any = {};
        
        // Update status if it's not set or doesn't match any available status
        if ((!prev.status || !statusOptions.some(s => s.name === prev.status)) && statusOptions.length > 0) {
          updates.status = statusOptions[0]?.name || "";
        }

        // Update procedure type if it's not set or doesn't match any available type
        if ((!prev.procedureType || !procedureTypes.some(t => t.name === prev.procedureType)) && procedureTypes.length > 0) {
          updates.procedureType = procedureTypes[0]?.name || "";
        }

        // Update provider when operatories load
        if (operatories.length > 0) {
          if (prev.operatory) {
            const operatory = operatories.find((op) => op.id === prev.operatory);
            if (operatory?.provider && prev.provider !== operatory.provider) {
              updates.provider = operatory.provider;
            } else if (!prev.provider && providers.length > 0) {
              updates.provider = providers[0]?.name || "";
            }
          } else {
            // If no operatory is selected, set default operatory and provider
            const defaultOperatory = operatories[0];
            if (defaultOperatory) {
              updates.operatory = defaultOperatory.id;
              updates.provider = defaultOperatory.provider || (providers.length > 0 ? providers[0]?.name || "" : "");
            }
          }
        }

        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, [isLoadingMetadata, statusOptions.length, procedureTypes.length, operatories.length, providers.length]);

  // Get today's date in MM/DD/YYYY format
  const getTodayDate = () => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;
  };

  // Get default provider based on operatory (from API data)
  const getDefaultProvider = (operatoryId: string) => {
    const operatory = operatories.find((op) => op.id === operatoryId);
    return operatory?.provider || (providers.length > 0 ? providers[0]?.name || "" : "");
  };

  // Available providers list (for simple selects) - from API
  const availableProviders = providers.map((p) => p.name);

  // ✅ STEP 2: Default provider for new treatments
  const getDefaultProviderForTreatment = () => {
    return formData.provider; // Appointment-level provider
  };

  // Appointment form state
  const [formData, setFormData] = useState({
    // Personal Information (read-only for existing patient)
    birthdate: patient.birthdate,
    lastName: patient.name.split(", ")[0],
    firstName: patient.name.split(", ")[1] || "",

    // Contact Information
    email: patient.email || "john.smith@email.com",
    cellPhone: patient.cellPhone || patient.phone,
    workPhone: patient.workPhone || "",
    homePhone: patient.homePhone || "",
    bypassPhone: false,

    // Operatory & Scheduling
    appointmentDate: getTodayDate(), // NEW: Appointment date
    operatory: selectedSlot?.operatory || (operatories.length > 0 ? operatories[0]?.id || "" : ""),
    status: statusOptions.length > 0 ? statusOptions[0]?.name || "Scheduled" : "Scheduled",
    startsAt: selectedSlot?.time || "09:00 AM",
    duration: 30,
    procedureType: procedureTypes.length > 0 ? procedureTypes[0]?.name || "" : "",
    provider: getDefaultProvider(
      selectedSlot?.operatory || (operatories.length > 0 ? operatories[0]?.id || "" : ""),
    ), // Auto-populate provider from API

    // Flags
    missed: false,
    cancelled: false,

    // Lab
    lab: false,
    labDDS: "",
    labCost: "",
    labSentOn: "",
    labDueOn: "",
    labRecvdOn: "",

    // Notes & Campaign
    notes: "",
    campaignId: "",
  });

  // Handle operatory change - update provider automatically (from API data)
  const handleOperatoryChange = (newOperatoryId: string) => {
    const newProvider = getDefaultProvider(newOperatoryId);
    setFormData({
      ...formData,
      operatory: newOperatoryId,
      provider: newProvider,
    });
  };

  // Phone validation errors state
  const [phoneErrors, setPhoneErrors] = useState({
    cellPhone: "",
    workPhone: "",
    homePhone: "",
  });

  // US Phone format validation (accepts (XXX) XXX-XXXX, XXX-XXX-XXXX, or XXXXXXXXXX)
  const validateUSPhoneFormat = (phone: string): boolean => {
    if (!phone || phone.trim() === "") return true; // Empty is OK
    const phoneRegex =
      /^(\([0-9]{3}\)\s?|[0-9]{3}[-\s]?)[0-9]{3}[-\s]?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  // Format phone to US standard (XXX) XXX-XXXX
  const formatUSPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Handle phone field changes with validation
  const handlePhoneChange = (
    field: "cellPhone" | "workPhone" | "homePhone",
    value: string,
  ) => {
    setFormData({ ...formData, [field]: value });

    // Validate on blur or when user stops typing
    if (value && !validateUSPhoneFormat(value)) {
      setPhoneErrors({
        ...phoneErrors,
        [field]: "Invalid US phone format. Use (XXX) XXX-XXXX",
      });
    } else {
      setPhoneErrors({
        ...phoneErrors,
        [field]: "",
      });
    }
  };

  // Handle phone field blur - format and validate
  const handlePhoneBlur = (
    field: "cellPhone" | "workPhone" | "homePhone",
  ) => {
    const value = formData[field];
    if (value && validateUSPhoneFormat(value)) {
      const formatted = formatUSPhone(value);
      setFormData({ ...formData, [field]: formatted });
      setPhoneErrors({ ...phoneErrors, [field]: "" });
    } else if (value) {
      setPhoneErrors({
        ...phoneErrors,
        [field]: "Invalid US phone format. Use (XXX) XXX-XXXX",
      });
    }
  };

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("ALL");
  const [treatmentTab, setTreatmentTab] = useState<
    "txplans" | "quickadd"
  >("txplans");

  const normalizeCategory = (value: string) =>
    value.replace(/\s+/g, "").toUpperCase();

  // ✅ STEP 1: Multi-select state for Quick Add (informational only)
  const [selectedProcedures, setSelectedProcedures] = useState<
    ApiProcedureCode[]
  >([]);

  // 🔹 NEW: Quick Add state (procedure browser → AddProcedure modal)
  const [showAddProcedure, setShowAddProcedure] =
    useState(false);
  const [selectedProcedureForAdd, setSelectedProcedureForAdd] =
    useState<ApiProcedureCode | null>(null);
  const [searchCodeFilter, setSearchCodeFilter] = useState("");
  const [searchUserCodeFilter, setSearchUserCodeFilter] =
    useState("");
  const [searchDescriptionFilter, setSearchDescriptionFilter] =
    useState("");

  // ✅ STEP 2: Toggle selection helper
  const toggleProcedureSelection = (proc: ApiProcedureCode) => {
    setSelectedProcedures((prev) => {
      const isSelected = prev.some((p) => p.code === proc.code);
      if (isSelected) {
        return prev.filter((p) => p.code !== proc.code);
      } else {
        return [...prev, proc];
      }
    });
  };

  // 🔹 Mapping function: AddProcedure → Treatment
  const mapProcedureToTreatment = (proc: any): Treatment => {
    return {
      id: proc.id,
      status: editingAppointment ? "C" : "TP", // FIX 3: C if same-day appointment, TP if planning
      code: proc.code,
      th: proc.tooth || "",
      surf: proc.surfaces || "",
      description: proc.description,
      bill: "Patient",
      duration: proc.duration
        ? Number(proc.duration)
        : proc.defaultDuration || 30, // FIX 4: User override → default → fallback
      provider: proc.provider || getDefaultProviderForTreatment(), // ✅ STEP 4: Use default provider logic
      providerUnits: 1,
      estPatient: proc.estPatient,
      estInsurance: proc.estInsurance,
      fee: proc.fee,
    };
  };

  // Procedure categories for Quick Add (from API, with "All" option)
  const procedureCategoriesForDisplay = useMemo(() => {
    // Start with "All" option
    const categories: Array<{ id: string; name: string; displayName: string }> = [
      { id: "ALL", name: "ALL", displayName: "All" },
    ];
    
    // Add API categories, filtering out any duplicate "ALL" that might come from API
    if (procedureCategories && Array.isArray(procedureCategories)) {
      procedureCategories.forEach(cat => {
        // Only add if it doesn't already exist (avoid duplicates)
        if (!categories.some(c => c.id === cat.id || c.id.toUpperCase() === cat.id.toUpperCase())) {
          categories.push({
            id: cat.id,
            name: cat.name,
            displayName: cat.displayName || cat.name,
          });
        }
      });
    }
    
    console.log("procedureCategoriesForDisplay:", categories.length, "categories:", categories);
    return categories;
  }, [procedureCategories]);

  const handleSave = async () => {
    // ✅ STEP 5: Validation - Hard stop if required fields missing
    const validationErrors: string[] = [];

    // Check required personal information
    if (!formData.birthdate) validationErrors.push("Birthdate is required");
    if (!formData.lastName) validationErrors.push("Last Name is required");
    if (!formData.firstName) validationErrors.push("First Name is required");

    // Check required contact information
    if (!formData.cellPhone && !formData.homePhone && !formData.workPhone) {
      validationErrors.push("At least one phone number is required");
    }

    // Check required scheduling information
    if (!formData.appointmentDate) validationErrors.push("Appointment Date is required");
    if (!formData.operatory) validationErrors.push("Operatory is required");
    if (!formData.startsAt) validationErrors.push("Start Time is required");
    if (!formData.duration || formData.duration <= 0) {
      validationErrors.push("Duration must be greater than 0");
    }
    if (!formData.provider) validationErrors.push("Provider is required");

    // If there are validation errors, show them and HARD STOP
    if (validationErrors.length > 0) {
      alert(
        "⚠️ Please fix the following errors:\n\n" +
        validationErrors.map((err, i) => `${i + 1}. ${err}`).join("\n")
      );
      return; // ✅ HARD STOP - Do not save, do not close
    }

    try {
      // Convert date from MM/DD/YYYY to YYYY-MM-DD
      const convertDateToYYYYMMDD = (dateStr: string): string => {
        if (!dateStr) return "";
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [month, day, year] = parts;
          if (month && day && year) {
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }
        return dateStr; // Already in YYYY-MM-DD format
      };

      // Convert time from "09:00 AM" to "09:00" (24-hour format)
      const convertTimeTo24Hour = (timeStr: string): string => {
        if (!timeStr) return "";
        // If already in 24-hour format (HH:MM), return as-is
        if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
        
        // Parse "09:00 AM" or "2:30 PM" format
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match && match[1] && match[2] && match[3]) {
          let hours = parseInt(match[1], 10);
          const minutes = match[2];
          const period = match[3].toUpperCase();
          
          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          
          return `${hours.toString().padStart(2, "0")}:${minutes}`;
        }
        return timeStr;
      };

      // Transform treatments to API format
      // IMPORTANT: Always include procedure_code - use "UNKNOWN" as fallback if missing
      const transformTreatments = treatments.map((t: any) => {
        const procedureCode = t.code || t.procedure_code || "UNKNOWN";
        
        // Log warning if treatment doesn't have a valid procedure code
        if (!t.code && !t.procedure_code) {
          console.warn(`Treatment "${t.description || 'Unknown'}" is missing procedure_code, using "UNKNOWN" as fallback`);
        }
        
        return {
          procedure_code: procedureCode, // Always include, never empty
          status: t.status || "TP", // Default to "Treatment Planned"
          tooth: t.th || t.tooth || undefined,
          surface: t.surf || t.surface || undefined,
          description: t.description || "",
          bill_to: t.bill || t.bill_to || "Patient",
          duration: t.duration || 0,
          provider: t.provider || formData.provider || "",
          provider_units: t.providerUnits || t.provider_units || 1,
          est_patient: t.estPatient || t.est_patient || undefined,
          est_insurance: t.estInsurance || t.est_insurance || undefined,
          fee: t.fee || 0,
        };
      });

      // For new patients (patientId starts with "NEW-"), create patient first
      let patientId = patient.patientId || (patient as any).id?.toString() || "";
      if (patientId.startsWith("NEW-")) {
        console.log("Creating new patient before saving appointment...");
        
        // Convert birthdate from MM/DD/YYYY to YYYY-MM-DD
        let dobFormatted: string | undefined;
        if (formData.birthdate) {
          const parts = formData.birthdate.split("/");
          if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            dobFormatted = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
          } else {
            dobFormatted = formData.birthdate;
          }
        }
        
        // Extract office ID from currentOffice string or use currentOfficeId from auth
        const extractOfficeId = (officeStr: string | undefined): number | undefined => {
          if (!officeStr) return undefined;
          const trimmed = officeStr.trim();
          if (/^\d+$/.test(trimmed)) {
            return parseInt(trimmed, 10);
          }
          const bracketMatch = officeStr.match(/\[(\d+)\]/);
          if (bracketMatch && bracketMatch[1]) {
            return parseInt(bracketMatch[1], 10);
          }
          const offMatch = officeStr.match(/(?:OFF-|OFF\s*)(\d+)/i);
          if (offMatch && offMatch[1]) {
            return parseInt(offMatch[1], 10);
          }
          const trailingMatch = officeStr.match(/(\d+)$/);
          if (trailingMatch && trailingMatch[1]) {
            return parseInt(trailingMatch[1], 10);
          }
          return undefined;
        };

        // Validate required fields
        if (!formData.firstName || !formData.lastName) {
          throw new Error("First name and last name are required to create a patient");
        }

        // Create patient
        const patientData: PatientCreateRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          ...(dobFormatted && { dob: dobFormatted }),
          ...(formData.cellPhone && { phone: formData.cellPhone }),
          ...(formData.email && { email: formData.email }),
          homeOfficeId: currentOfficeId ? parseInt(String(currentOfficeId), 10) : extractOfficeId(currentOffice),
        };
        
        // Only add gender if it's valid
        if (patient.gender && (patient.gender === "M" || patient.gender === "F" || patient.gender === "O")) {
          patientData.gender = patient.gender;
        }
        
        const newPatient = await createPatient(patientData);
        patientId = newPatient.chartNo || newPatient.id.toString();
        console.log("Patient created with ID:", patientId);
      }

      // Normalize status to ensure it matches SQL enum (title case)
      // Converts "MISSED" -> "Missed", "CANCELLED" -> "Cancelled"
      const normalizeStatus = (status: string | undefined): string => {
        if (!status) return "Scheduled";
        // Convert common uppercase values to title case
        const normalized = status.trim();
        if (normalized.toUpperCase() === "MISSED") return "Missed";
        if (normalized.toUpperCase() === "CANCELLED") return "Cancelled";
        // Return as-is if already in correct format
        return normalized;
      };

      // Build appointment payload
      const appointmentPayload: any = {
        patient_id: patientId,
        date: convertDateToYYYYMMDD(formData.appointmentDate),
        start_time: convertTimeTo24Hour(formData.startsAt),
        duration: formData.duration,
        procedure_type: formData.procedureType,
        operatory: formData.operatory,
        provider: formData.provider,
        status: normalizeStatus(formData.status),
        notes: formData.notes || undefined,
        
        // Lab information
        lab: formData.lab || false,
        lab_dds: formData.labDDS || undefined,
        lab_cost: formData.labCost ? parseFloat(formData.labCost.toString()) : undefined,
        // Date inputs return YYYY-MM-DD format, but convert if needed (MM/DD/YYYY -> YYYY-MM-DD)
        lab_sent_on: formData.labSentOn 
          ? (formData.labSentOn.includes("/") ? convertDateToYYYYMMDD(formData.labSentOn) : formData.labSentOn)
          : undefined,
        lab_due_on: formData.labDueOn
          ? (formData.labDueOn.includes("/") ? convertDateToYYYYMMDD(formData.labDueOn) : formData.labDueOn)
          : undefined,
        lab_recvd_on: formData.labRecvdOn
          ? (formData.labRecvdOn.includes("/") ? convertDateToYYYYMMDD(formData.labRecvdOn) : formData.labRecvdOn)
          : undefined,
        
        // Flags
        missed: formData.missed || false,
        cancelled: formData.cancelled || false,
        
        // Additional fields
        campaign_id: formData.campaignId || undefined,
        
        // Treatments - always include procedure_code (never empty, defaults to "UNKNOWN" if missing)
        treatments: transformTreatments.length > 0 ? transformTreatments : undefined,
      };

      // Remove undefined fields (but keep treatments array - backend handles empty arrays)
      Object.keys(appointmentPayload).forEach(key => {
        if (appointmentPayload[key] === undefined && key !== 'treatments') {
          delete appointmentPayload[key];
        }
      });
      
      // Log treatment details for debugging
      if (transformTreatments.length > 0) {
        console.log("📋 Treatments being saved:", transformTreatments.map(t => ({
          procedure_code: t.procedure_code,
          description: t.description,
          fee: t.fee
        })));
      }

      console.log("📤 Saving appointment with payload:", appointmentPayload);

      // Call API to save appointment
      if (editingAppointment?.id) {
        // Update existing appointment
        await updateAppointment({
          id: editingAppointment.id,
          ...appointmentPayload,
        });
        alert("✅ Appointment updated successfully!");
      } else {
        // Create new appointment
        await createAppointment(appointmentPayload);
    alert("✅ Appointment saved successfully!");
      }

      // Call onSave callback for parent component to refresh
      // Pass a flag to indicate appointment was already saved via API
      onSave({ 
        _alreadySaved: true, // Flag to indicate appointment was already saved
        formData, 
        patient, 
        treatments 
      });
    onClose(); // ✅ Close modal after successful save
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save appointment";
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleDeleteAppointment = () => {
    if (
      confirm(
        "Are you sure you want to delete this appointment?",
      )
    ) {
      alert("Appointment deleted");
      onClose();
    }
  };

  const handleCalcTime = () => {
    const totalDuration = treatments.reduce(
      (sum, t) => sum + t.duration,
      0,
    );
    setFormData({ ...formData, duration: totalDuration });
    alert(
      `Total duration calculated: ${totalDuration} minutes`,
    );
  };

  const handleAddTreatment = () => {
    const newTreatment: Treatment = {
      id: Date.now().toString(),
      status: "TP",
      code: "D0120",
      th: "1",
      surf: "",
      description: "Periodic Oral Evaluation",
      bill: "Patient",
      duration: 15,
      provider: getDefaultProviderForTreatment(), // ✅ STEP 4: Use default provider logic
      providerUnits: 1,
      estPatient: 50,
      estInsurance: 0,
      fee: 50,
    };
    setTreatments([...treatments, newTreatment]);
  };

  const handleDeleteTreatment = (id: string) => {
    setTreatments(treatments.filter((t) => t.id !== id));
  };

  const totalEstPatient = treatments.reduce(
    (sum, t) => sum + t.estPatient,
    0,
  );
  const totalFee = treatments.reduce(
    (sum, t) => sum + t.fee,
    0,
  );

  // Progressive loading: Show form immediately, load data in background
  // No blocking loader - form opens instantly with placeholders

  return (
    <>
      <div className="space-y-4">
        {/* Header with PGID and OID */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-3 flex items-center justify-between z-10 border-b-2 border-[#162942] -m-6 mb-3">
          <h2 className="font-bold text-white">
            ADD / EDIT APPOINTMENT
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-[#B0C4DE] font-medium">
                  PGID:
                </span>
                <span className="ml-2 font-semibold">
                  {getTenantId()}
                </span>
              </div>
              <div>
                <span className="text-[#B0C4DE] font-medium">
                  OID:
                </span>
                <span className="ml-2 font-semibold">
                  {currentOfficeObj?.id || currentOfficeId || "N/A"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-[#162942] p-2 rounded transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Non-blocking loading indicator - shows at top while data loads */}
        {(isLoadingMetadata || (editingAppointment && isLoadingAppointment)) && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700">
                {isLoadingMetadata && editingAppointment && isLoadingAppointment
                  ? "Loading appointment details and metadata..."
                  : isLoadingMetadata
                  ? "Loading metadata..."
                  : "Loading appointment details..."}
              </p>
            </div>
          </div>
        )}

        {/* Error messages - inline, non-blocking */}
        {appointmentError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mb-4">
            <p className="text-sm text-red-700">
              ⚠️ Error loading appointment details: {appointmentError}
            </p>
          </div>
        )}
        {metadataError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4">
            <p className="text-sm text-yellow-700">
              ⚠️ Warning: {metadataError}
            </p>
          </div>
        )}

        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
            Personal Information
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Birthdate{" "}
                <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.birthdate}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Last Name{" "}
                <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                First Name{" "}
                <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT INFORMATION & OPERATORY SCHEDULING - SIDE BY SIDE */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT: CONTACT INFORMATION */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
            <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
              Contact Information
            </h3>

            {/* Email Row */}
            <div className="mb-3">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                E-Mail
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                <button
                  onClick={() => setShowEmailModal(true)}
                  disabled={!formData.email}
                  className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send Email"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSMSModal(true)}
                  disabled={!formData.email}
                  className="px-3 py-1.5 bg-[#2FB9A7] text-white rounded-lg hover:bg-[#26a396] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send SMS"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone Fields */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Cell Phone
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.cellPhone}
                    onChange={(e) =>
                      handlePhoneChange(
                        "cellPhone",
                        e.target.value,
                      )
                    }
                    onBlur={() => handlePhoneBlur("cellPhone")}
                    className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                  <button
                    onClick={() => setShowSMSModal(true)}
                    disabled={!formData.cellPhone}
                    className="px-3 py-1.5 bg-[#2FB9A7] text-white rounded-lg hover:bg-[#26a396] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bypassPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bypassPhone: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-xs text-[#1E293B]">
                    Bypass
                  </span>
                </label>
                {phoneErrors.cellPhone && (
                  <p className="text-xs text-[#EF4444] mt-1">
                    {phoneErrors.cellPhone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Work Phone
                </label>
                <input
                  type="tel"
                  value={formData.workPhone}
                  onChange={(e) =>
                    handlePhoneChange(
                      "workPhone",
                      e.target.value,
                    )
                  }
                  onBlur={() => handlePhoneBlur("workPhone")}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                {phoneErrors.workPhone && (
                  <p className="text-xs text-[#EF4444] mt-1">
                    {phoneErrors.workPhone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Home Phone
                </label>
                <input
                  type="tel"
                  value={formData.homePhone}
                  onChange={(e) =>
                    handlePhoneChange(
                      "homePhone",
                      e.target.value,
                    )
                  }
                  onBlur={() => handlePhoneBlur("homePhone")}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                {phoneErrors.homePhone && (
                  <p className="text-xs text-[#EF4444] mt-1">
                    {phoneErrors.homePhone}
                  </p>
                )}
              </div>
            </div>

            {/* Provider Section - MOVED FROM OPERATORY SECTION */}
            <div className="mt-3 bg-[#E8F4F8] border-2 border-[#3A6EA5] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[#1F3A5F] font-bold text-xs uppercase tracking-wide">
                  Assigned Provider
                </label>
                <span className="text-[#2FB9A7] text-xs font-semibold">
                  Auto-populated from Operatory
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 px-3 py-1.5 bg-white border-2 border-[#3A6EA5] rounded-lg text-sm font-semibold text-[#1F3A5F]">
                  {formData.provider}
                </div>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-xs">
                  Change Provider (Optional)
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      provider: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                >
                  {providers.length === 0 ? (
                    <option value="">{isLoadingMetadata ? "Loading..." : "No providers available"}</option>
                  ) : (
                    providers.map((provider) => (
                      <option key={provider.id} value={provider.name}>
                        {provider.name}
                    </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT: OPERATORY & SCHEDULING */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
            <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
              Operatory & Scheduling
            </h3>

            {/* Date Field - FULL WIDTH */}
            <div className="mb-3 relative">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Date
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.appointmentDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appointmentDate: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  placeholder="MM/DD/YYYY"
                />
                <button
                  onClick={() =>
                    setShowDatePicker(!showDatePicker)
                  }
                  className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors flex items-center gap-1"
                  title="Select Date"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar Picker */}
              {showDatePicker && (
                <DatePickerCalendar
                  selectedDate={formData.appointmentDate}
                  onSelectDate={(date) => {
                    setFormData({
                      ...formData,
                      appointmentDate: date,
                    });
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Operatory
                </label>
                <select
                  value={formData.operatory}
                  onChange={(e) =>
                    handleOperatoryChange(e.target.value)
                  }
                  disabled={isLoadingMetadata || operatories.length === 0}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {operatories.length === 0 ? (
                    <option value="">{isLoadingMetadata ? "Loading..." : "No operatories available"}</option>
                  ) : (
                    operatories.map((operatory) => (
                      <option key={operatory.id} value={operatory.id}>
                        {operatory.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                  disabled={isLoadingMetadata || statusOptions.length === 0}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {statusOptions.length === 0 ? (
                    <option value="">{isLoadingMetadata ? "Loading..." : "No statuses available"}</option>
                  ) : (
                    statusOptions.map((status) => (
                      <option key={status.id} value={status.name}>
                        {status.displayName || status.name}
                    </option>
                    ))
                  )}
                  {/* Fallback option if current status doesn't match any option */}
                  {statusOptions.length > 0 && formData.status && !statusOptions.some(s => s.name === formData.status) && (
                    <option value={formData.status} disabled>
                      {formData.status} (Invalid)
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Starts At
                </label>
                <input
                  type="text"
                  value={formData.startsAt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startsAt: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>

            {/* Procedure Type */}
            <div className="mb-3">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Prod. Type
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.procedureType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      procedureType: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                >
                  {procedureTypes.length === 0 ? (
                    <option value="">{isLoadingMetadata ? "Loading..." : "No procedure types available"}</option>
                  ) : (
                    procedureTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                    ))
                  )}
                </select>
                {(() => {
                  const selectedType = procedureTypes.find(
                    (t) => t.name === formData.procedureType
                  );
                  const colorValue = selectedType?.color;
                  
                  // Handle both hex colors (#FFE5E5) and Tailwind CSS classes (bg-purple-100)
                  let backgroundColor = "#E2E8F0"; // Default gray
                  let colorClass = "";
                  
                  if (colorValue) {
                    // Check if it's a hex color (starts with #)
                    if (colorValue.startsWith("#")) {
                      backgroundColor = colorValue;
                    } else if (colorValue.startsWith("bg-")) {
                      // It's a Tailwind class - use it as a className
                      colorClass = colorValue;
                      // Also set a fallback background color in case Tailwind class doesn't apply
                      backgroundColor = "#E2E8F0";
                    } else {
                      // Try to use it as-is (might be a valid CSS color name)
                      backgroundColor = colorValue;
                    }
                  }
                  
                  return (
                    <div
                      className={`w-9 h-9 rounded border-2 border-[#CBD5E1] ${colorClass || ""}`}
                      style={colorClass ? {} : {
                        backgroundColor: backgroundColor,
                      }}
                      title={`Procedure Type: ${formData.procedureType || "None"}${colorValue ? ` (${colorValue})` : ""}`}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Flags Row */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.missed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      missed: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-[#1E293B] font-medium text-sm">
                  Missed
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cancelled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cancelled: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-[#1E293B] font-medium text-sm">
                  Cancelled
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 4: LAB SECTION */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.lab}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lab: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
            />
            <span className="text-[#1F3A5F] font-bold uppercase tracking-wide text-sm">
              Lab
            </span>
          </label>

          {formData.lab && (
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  DDS
                </label>
                <input
                  type="text"
                  value={formData.labDDS}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      labDDS: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Lab Cost
                </label>
                <input
                  type="number"
                  value={formData.labCost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      labCost: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Sent On
                </label>
                <input
                  type="date"
                  value={formData.labSentOn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      labSentOn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Due On
                </label>
                <input
                  type="date"
                  value={formData.labDueOn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      labDueOn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                  Recvd On
                </label>
                <input
                  type="date"
                  value={formData.labRecvdOn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      labRecvdOn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: NOTES & CAMPAIGN */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
            Notes & Campaign
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Appointment Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                placeholder="Enter appointment notes..."
              />
              <button className="mt-1.5 text-sm text-[#3A6EA5] hover:text-[#1F3A5F] font-medium">
                + Add Notes Macro
              </button>
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Campaign ID
              </label>
              <input
                type="text"
                value={formData.campaignId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    campaignId: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                placeholder="Optional campaign tracking"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: TREATMENTS GRID */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm">
              Treatments
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleAddTreatment}
                className="bg-[#2FB9A7] text-white px-3 py-1.5 rounded-lg hover:bg-[#26a396] transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Procedure
              </button>
            </div>
          </div>

          {/* Treatments Table */}
          <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden mb-3">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1F3A5F] text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold">
                      Status
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Code
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      TH
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Surf
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Description
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Bill
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Duration
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Provider
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      P. Units
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Est. Patient
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Est. Insurance
                    </th>
                    <th className="px-2 py-2 text-left font-bold">
                      Fee
                    </th>
                    <th className="px-2 py-2 text-left font-bold"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {treatments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-8 text-center text-[#64748B]"
                      >
                        No treatments added. Click "Add
                        Procedure" to add treatments.
                      </td>
                    </tr>
                  ) : (
                    treatments.map((treatment, index) => (
                      <tr
                        key={treatment.id}
                        className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? "bg-white" : "bg-[#F7F9FC]"}`}
                      >
                        <td className="px-2 py-2">
                          {treatment.status}
                        </td>
                        <td className="px-2 py-2 text-[#3A6EA5] font-semibold">
                          {treatment.code}
                        </td>
                        <td className="px-2 py-2">
                          {treatment.th}
                        </td>
                        <td className="px-2 py-2">
                          {treatment.surf}
                        </td>
                        <td className="px-2 py-2">
                          {treatment.description}
                        </td>
                        <td className="px-2 py-2">
                          {treatment.bill}
                        </td>
                        <td className="px-2 py-2">
                          {treatment.duration}
                        </td>
                        <td className="px-1 py-1">
                          {/* ✅ Compact Provider dropdown */}
                          <select
                            value={treatment.provider}
                            onChange={(e) => {
                              const updated = [...treatments];
                              const current = updated[index];
                              if (current) {
                                updated[index] = {
                                  ...current,
                                  id: current.id || `temp-${Date.now()}-${index}`, // Ensure id is always present
                                  provider: e.target.value,
                                };
                              }
                              setTreatments(updated);
                            }}
                            className="w-full px-1.5 py-0.5 border border-[#CBD5E1] rounded text-[11px] bg-white focus:outline-none focus:border-[#3A6EA5] leading-tight"
                            style={{ minWidth: '140px', maxWidth: '160px' }}
                          >
                            {providers.length === 0 ? (
                              <option value="">No providers available</option>
                            ) : (
                              providers.map((provider) => (
                              <option
                                key={provider.id}
                                value={provider.name}
                              >
                                {provider.name}
                              </option>
                              ))
                            )}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          {treatment.providerUnits}
                        </td>
                        <td className="px-2 py-2">
                          ${treatment.estPatient.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          ${treatment.estInsurance.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          ${treatment.fee.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              handleDeleteTreatment(
                                treatment.id,
                              )
                            }
                            className="text-[#EF4444] hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Procedures - REPLACED WITH TABBED INTERFACE */}
          <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3">
            {/* Tab Headers */}
            <div className="flex gap-1 mb-3 border-b border-[#E2E8F0]">
              <button
                onClick={() => setTreatmentTab("txplans")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  treatmentTab === "txplans"
                    ? "bg-[#3A6EA5] text-white rounded-t-lg"
                    : "text-[#1E293B] hover:bg-[#E2E8F0] rounded-t-lg"
                }`}
              >
                Tx Plans
              </button>
              <button
                onClick={() => setTreatmentTab("quickadd")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  treatmentTab === "quickadd"
                    ? "bg-[#3A6EA5] text-white rounded-t-lg"
                    : "text-[#1E293B] hover:bg-[#E2E8F0] rounded-t-lg"
                }`}
              >
                Quick Add
              </button>
            </div>

            {/* Tab Content */}
            {treatmentTab === "txplans" ? (
              <TxPlansTab
                treatmentPlans={treatmentPlans}
                isLoading={isLoadingMetadata}
                onSelectProcedures={(procedures) => {
                  // Convert Tx Plan procedures to treatments
                  const newTreatments: Treatment[] =
                    procedures.map((proc) => ({
                      id: Date.now().toString() + Math.random(),
                      status: "TP",
                      code: proc.code,
                      th: proc.tooth || "",
                      surf: proc.surface || "",
                      description: proc.description,
                      bill: "Patient",
                      duration: 30,
                      provider: proc.diagnosedProvider,
                      providerUnits: 1,
                      estPatient:
                        proc.fee - proc.insuranceEstimate,
                      estInsurance: proc.insuranceEstimate,
                      fee: proc.fee,
                    }));
                  setTreatments([
                    ...treatments,
                    ...newTreatments,
                  ]);
                }}
              />
            ) : (
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 text-sm">
                  QUICK ADD PROCEDURE
                </h4>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {procedureCategoriesForDisplay.length === 0 ? (
                    <div className="text-sm text-[#64748B]">
                      {isLoadingMetadata ? "Loading categories..." : "No categories available"}
                    </div>
                  ) : (
                    procedureCategoriesForDisplay.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => {
                          console.log("Category selected:", category.id);
                          setSelectedCategory(category.id.toUpperCase());
                        }}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          selectedCategory === category.id.toUpperCase()
                          ? "bg-[#3A6EA5] text-white"
                          : "bg-white border border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]"
                      }`}
                    >
                        {category.displayName}
                    </button>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <input
                    type="text"
                    placeholder="By Code"
                    value={searchCodeFilter}
                    onChange={(e) =>
                      setSearchCodeFilter(e.target.value)
                    }
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By User Code"
                    value={searchUserCodeFilter}
                    onChange={(e) =>
                      setSearchUserCodeFilter(e.target.value)
                    }
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By Description"
                    value={searchDescriptionFilter}
                    onChange={(e) =>
                      setSearchDescriptionFilter(e.target.value)
                    }
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By Explosion Code"
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                </div>

                {/* ✅ STEP 4: Add Selected to Treatments Button */}
                {selectedProcedures.length > 0 && (
                  <div className="mt-3 flex items-center justify-between bg-[#E8F4F8] border-2 border-[#3A6EA5] rounded-lg p-3">
                    <span className="text-sm font-semibold text-[#1F3A5F]">
                      {selectedProcedures.length} procedure(s) selected
                    </span>
                    <button
                      onClick={() => {
                        // Map selected procedures to treatments with TP status
                        const plannedTreatments = selectedProcedures.map(
                          (proc) => ({
                            id: Date.now().toString() + Math.random(),
                            status: "TP", // Treatment Planned
                            code: proc.code,
                            th: "",
                            surf: "",
                            description: proc.description,
                            bill: "Patient",
                            duration: 30, // Default duration
                            provider: getDefaultProviderForTreatment(), // ✅ STEP 4: Use default provider logic
                            providerUnits: 1,
                            estPatient: proc.defaultFee * 0.3,
                            estInsurance: proc.defaultFee * 0.7,
                            fee: proc.defaultFee,
                          }),
                        );
                        setTreatments([...treatments, ...plannedTreatments]);
                        setSelectedProcedures([]); // Clear selection
                      }}
                      className="bg-[#3A6EA5] text-white px-4 py-2 rounded-lg hover:bg-[#1F3A5F] transition-colors flex items-center gap-2 font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Selected to Treatments
                    </button>
                  </div>
                )}

                {/* ✅ REPLACED: Table view instead of grid */}
                <div className="mt-3 border border-[#E2E8F0] rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">
                            Code
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            User Code
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Description
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Category
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Filter procedure codes
                          const filteredCodes = safeProcedureCodes
                          .filter((proc) => {
                            if (selectedCategory === "ALL")
                              return true;

                            return (
                              normalizeCategory(proc.category) ===
                              selectedCategory
                            );
                          })
                          .filter(
                            (proc) =>
                              (searchCodeFilter === "" ||
                                proc.code.includes(
                                  searchCodeFilter,
                                )) &&
                              (searchUserCodeFilter === "" ||
                                proc.userCode.includes(
                                  searchUserCodeFilter,
                                )) &&
                              (searchDescriptionFilter === "" ||
                                proc.description
                                  .toLowerCase()
                                  .includes(
                                    searchDescriptionFilter.toLowerCase(),
                                  )),
                            );
                          
                          // Debug logging
                          if (safeProcedureCodes.length > 0) {
                            console.log("Quick Add Debug:", {
                              totalCodes: safeProcedureCodes.length,
                              selectedCategory,
                              filteredCount: filteredCodes.length,
                              searchFilters: {
                                code: searchCodeFilter,
                                userCode: searchUserCodeFilter,
                                description: searchDescriptionFilter,
                              },
                              sampleCodes: safeProcedureCodes.slice(0, 3).map(c => ({ code: c.code, category: c.category })),
                            });
                          }
                          
                          if (filteredCodes.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="px-3 py-8 text-center text-[#64748B]">
                                  {isLoadingMetadata 
                                    ? "Loading procedure codes..." 
                                    : `No procedure codes match filters (Total: ${safeProcedureCodes.length}, Category: ${selectedCategory}, Searches: ${searchCodeFilter || searchUserCodeFilter || searchDescriptionFilter ? "Active" : "None"})`}
                                </td>
                              </tr>
                            );
                          }
                          
                          return filteredCodes.map((proc) => {
                            // ✅ STEP 3: Check if procedure is selected
                            const isSelected = selectedProcedures.some(
                              (p) => p.code === proc.code,
                            );
                            return (
                              <tr
                                key={proc.code}
                                onClick={() =>
                                  toggleProcedureSelection(proc)
                                }
                                className={`border-b border-[#E2E8F0] hover:bg-[#E8F4F8] cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-[#D1E9F6] border-l-4 border-l-[#3A6EA5]"
                                    : ""
                                }`}
                              >
                                <td className="px-3 py-2 font-semibold text-[#1F3A5F]">
                                  {proc.code}
                                </td>
                                <td className="px-3 py-2 text-[#475569]">
                                  {proc.userCode}
                                </td>
                                <td className="px-3 py-2 text-[#1E293B]">
                                  {proc.description}
                                </td>
                                <td className="px-3 py-2 text-[#475569]">
                                  {proc.category}
                                </td>
                              </tr>
                            );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-3 bg-[#E8EFF7] border-2 border-[#3A6EA5] rounded-lg p-3">
            <div className="flex justify-end gap-8 font-semibold">
              <div>
                <span className="text-[#64748B]">
                  Total Est. Patient:
                </span>
                <span className="ml-2 text-[#1F3A5F]">
                  ${totalEstPatient.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">
                  Total Fee:
                </span>
                <span className="ml-2 text-[#1F3A5F]">
                  ${totalFee.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between pt-3 border-t-2 border-[#E2E8F0]">
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-5 py-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium text-sm"
            >
              BACK
            </button>
            <button
              onClick={handleDeleteAppointment}
              className="bg-[#EF4444] text-white px-5 py-1.5 rounded-lg hover:bg-[#DC2626] transition-colors font-medium text-sm"
            >
              Delete Appt
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCalcTime}
              className="bg-[#8B5CF6] text-white px-5 py-1.5 rounded-lg hover:bg-[#7C3AED] transition-colors font-medium text-sm"
            >
              Calc Time
            </button>
            <button
              onClick={() =>
                alert("Insurance Verification opened")
              }
              className="bg-[#F59E0B] text-white px-5 py-1.5 rounded-lg hover:bg-[#D97706] transition-colors font-medium text-sm"
            >
              Insurance Verification
            </button>
            <button
              onClick={() => alert("Change Provider opened")}
              className="bg-[#6B7280] text-white px-5 py-1.5 rounded-lg hover:bg-[#4B5563] transition-colors font-medium text-sm"
            >
              Change Provider
            </button>
            <button
              onClick={() => alert("Post procedures")}
              className="bg-[#2FB9A7] text-white px-5 py-1.5 rounded-lg hover:bg-[#26a396] transition-colors font-medium text-sm"
            >
              Post
            </button>
            <button
              onClick={handleSave}
              className="bg-[#3A6EA5] text-white px-6 py-1.5 rounded-lg hover:bg-[#1F3A5F] transition-colors font-medium shadow-md text-sm"
            >
              SAVE
            </button>
            <button
              onClick={onClose}
              className="bg-white text-[#64748B] border-2 border-[#E2E8F0] px-5 py-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      {showEmailModal && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          patientEmail={formData.email}
          patientName={`${formData.firstName} ${formData.lastName}`}
        />
      )}

      {/* Send SMS Modal (Placeholder) */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-2 border-[#E2E8F0] p-6">
            <h3 className="font-bold text-[#1F3A5F] mb-4">
              SEND SMS
            </h3>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg mb-4"
              placeholder="Type your message..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSMSModal(false)}
                className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-4 py-2 rounded-lg hover:bg-[#F7F9FC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("SMS sent successfully!");
                  setShowSMSModal(false);
                }}
                className="bg-[#2FB9A7] text-white px-6 py-2 rounded-lg hover:bg-[#26a396] transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Procedure Modal (NEW INTEGRATION) */}
      {showAddProcedure && selectedProcedureForAdd && (
        <AddProcedure
          isOpen={showAddProcedure}
          onClose={() => {
            setShowAddProcedure(false);
            setSelectedProcedureForAdd(null);
          }}
          patientName={patient.name}
          patientId={patient.patientId}
          office={currentOffice}
          initialProcedure={{
            code: selectedProcedureForAdd.code,
            userCode: selectedProcedureForAdd.userCode || "",
            description: selectedProcedureForAdd.description,
            category: selectedProcedureForAdd.category,
            requirements: {
              tooth: selectedProcedureForAdd.requirements?.tooth ?? false,
              surface: selectedProcedureForAdd.requirements?.surface ?? false,
              quadrant: selectedProcedureForAdd.requirements?.quadrant ?? false,
              materials: selectedProcedureForAdd.requirements?.materials ?? false,
            },
            defaultFee: 0,
            defaultDuration: undefined,
          }}
          onSave={(procedure) => {
            const newTreatment =
              mapProcedureToTreatment(procedure);
            setTreatments([...treatments, newTreatment]);
            setShowAddProcedure(false);
            setSelectedProcedureForAdd(null);
          }}
        />
      )}
    </>
  );
}