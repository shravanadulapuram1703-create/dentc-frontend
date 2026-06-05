import {
  X,
  Calendar,
  User,
  Clock,
  Search as SearchIcon,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { components } from "../../styles/theme";
import SendEmailModal from "./SendEmailModal";
import AddEditAppointmentForm from "./AddEditAppointmentForm";
import {
  fetchProviders,
  fetchOperatories,
  fetchProcedureTypes,
  fetchSchedulerConfig,
  type Provider,
  type Operatory,
  type ProcedureType,
  type SchedulerConfig,
} from "../../services/schedulerApi";
import {
  createPatient,
  type PatientCreateRequest,
} from "../../services/patientApi";
import { procedureTypeColorClasses } from "../../utils/procedureTypeColor";
import { listPatients } from "@/api/generated/endpoints/patients/patients";
import type { PatientRead, ListPatientsParams } from "@/api/generated/model";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  selectedSlot: { time: string; operatory: string } | null;
  currentOffice: string;
  editingAppointment?: any; // Appointment data when editing
  selectedDate?: Date; // Selected date from scheduler (for default when no slot)
}

interface PatientSearchResult {
  patientId: string;
  /** Numeric backend patient id (PatientRead.id) — used as the appointment
   *  patient_id, which the backend contract requires as number | null.
   *  patientId above is the human chart_no used only for display. */
  numericId?: number;
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

export default function NewAppointmentModal({
  isOpen,
  onClose,
  onSave,
  selectedSlot,
  currentOffice,
  editingAppointment,
  selectedDate,
}: NewAppointmentModalProps) {
  const [appointmentType, setAppointmentType] = useState<
    "existing" | "new" | "family" | "block" | "quickfill"
  >("new");
  const [showPatientForm, setShowPatientForm] = useState(
    !!editingAppointment,
  ); // Show form if editing
  const [showPatientSearch, setShowPatientSearch] =
    useState(false);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(() => {
      // If editing, seed the patient shell from the appointment's snake_case
      // read-model fields (real demographics load in the edit form).
      if (editingAppointment) {
        return {
          patientId:
            editingAppointment.patient_id != null
              ? String(editingAppointment.patient_id)
              : "",
          numericId: editingAppointment.patient_id ?? undefined,
          name: editingAppointment.patient_name ?? "",
          gender: "U",
          ssn: "***-**-****",
          phone: "(555) 000-0000",
          birthdate: "01/01/1990",
          age: 34,
          respId: "R-001",
          chartNumber: "CH-001",
          patientType: "General",
          office: currentOffice,
        };
      }
      return null;
    });
  const [showFullAppointmentForm, setShowFullAppointmentForm] =
    useState(false);
  const [newPatientData, setNewPatientData] =
    useState<PatientSearchResult | null>(null);
  const [initialAppointmentData, setInitialAppointmentData] = useState<{
    date?: string;
    time?: string;
    duration?: number;
    procedureType?: string;
    operatory?: string;
    provider?: string;
    notes?: string;
  } | null>(null);
  const [phoneError, setPhoneError] = useState<string>("");

  // Patient Search State (consistent with Patient.tsx)
  const [searchBy, setSearchBy] = useState("lastName");
  const [searchIn, setSearchIn] = useState<"current" | "all" | "group">("all");
  const [searchFor, setSearchFor] = useState<"patient" | "responsible">("patient");
  const [patientType, setPatientType] = useState<"both" | "general" | "ortho">("both");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<
    PatientSearchResult[]
  >([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Dynamic metadata state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  
  // Quick Save loading state
  const [isSaving, setIsSaving] = useState(false);
  
  // Patient search loading state
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  // ✅ Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling
      document.body.style.overflow = "hidden";

      // Cleanup function to restore scrolling when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Helper to format date as YYYY-MM-DD
  const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Form state
  const [formData, setFormData] = useState({
    // Patient Information
    birthdate: "",
    lastName: "",
    firstName: "",
    email: "",
    phoneNumber: "",
    phoneType: "Cell",
    // bypassPhone: false,
    gender: "", //New field

    // Appointment Details
    // Use selectedDate if provided, otherwise current date
    // When selectedSlot is null, time should be empty (user must select)
    date: selectedDate ? formatDateYYYYMMDD(selectedDate) : new Date().toISOString().split("T")[0],
    time: selectedSlot?.time || "", // Empty when no slot selected - user must choose
    duration: 10,
    procedureType: "",
    notes: "",
    operatory: selectedSlot?.operatory || "",
    provider: "",
  });

  // Fetch metadata when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      setMetadataError(null);
      try {
        // Fetch all metadata in parallel, scoped to the current office.
        // The service helpers extract the numeric office_id from "OFF-1".
        const [providersData, operatoriesData, procedureTypesData, configData] = await Promise.all([
          fetchProviders(currentOffice),
          fetchOperatories(currentOffice),
          fetchProcedureTypes(),
          fetchSchedulerConfig(currentOffice),
        ]);

        setProviders(providersData);
        setOperatories(operatoriesData);
        setProcedureTypes(procedureTypesData);
        setSchedulerConfig(configData);

        // Set default values after data loads
        if (operatoriesData.length > 0 && !selectedSlot?.operatory) {
          const firstOperatory = operatoriesData[0];
          if (firstOperatory) {
            setFormData((prev) => ({
              ...prev,
              operatory: firstOperatory.id,
            }));
          }
        }

        if (providersData.length > 0) {
          const firstProvider = providersData[0];
          if (firstProvider) {
            setFormData((prev) => ({
              ...prev,
              provider: firstProvider.name,
            }));
          }
        }

        if (procedureTypesData.length > 0) {
          const firstProcedureType = procedureTypesData[0];
          if (firstProcedureType) {
            setFormData((prev) => ({
              ...prev,
              procedureType: firstProcedureType.name,
            }));
          }
        }

        if (configData) {
          setFormData((prev) => ({
            ...prev,
            duration: configData.slotInterval || 10,
          }));
        }
      } catch (err: any) {
        setMetadataError(`Failed to load metadata: ${err.message}`);
        console.error("Error loading metadata:", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [isOpen, selectedSlot, currentOffice]);

  // Update form defaults when selectedSlot or selectedDate changes
  useEffect(() => {
    if (selectedSlot) {
      // When slot is selected, update time and operatory (view-only mode)
      // Auto-fill the provider from the operatory's provider_id (backend Gap 1).
      const op = operatories.find((o) => o.id === selectedSlot.operatory);
      const providerName = op?.provider_id
        ? providers.find((p) => p.id === op.provider_id)?.name
        : undefined;
      setFormData((prev) => ({
        ...prev,
        time: selectedSlot.time,
        operatory: selectedSlot.operatory,
        ...(providerName ? { provider: providerName } : {}),
      }));
    } else if (selectedDate) {
      // When no slot selected but date is provided, update date (editable mode)
      setFormData((prev) => ({
        ...prev,
        date: formatDateYYYYMMDD(selectedDate),
      }));
    }
  }, [selectedSlot, selectedDate, operatories, providers]);

  // Note: Patient search now uses the Patients API via handlePatientSearch

  // Helper to get procedure type color (centralized in utils/procedureTypeColor)
  const getProcedureTypeColor = (procedureName: string): string => {
    const procedure = procedureTypes.find((pt) => pt.name === procedureName);
    return procedureTypeColorClasses(procedure?.color);
  };

  const handleTypeSelection = (
    type: typeof appointmentType,
  ) => {
    setAppointmentType(type);
    if (type === "new") {
      setShowPatientForm(true);
      setShowPatientSearch(false);
    } else if (type === "existing") {
      setShowPatientSearch(true);
      setShowPatientForm(false);
    }
  };

  // Convert API Patient to PatientSearchResult format
  const convertPatientToSearchResult = (p: PatientRead): PatientSearchResult => {
    // Format name as "LastName, FirstName"
    const name = `${p.last_name ?? ""}, ${p.first_name ?? ""}`;

    // Calculate age from DOB if available
    let age = 0;
    if (p.dob) {
      const birthDate = new Date(p.dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Format birthdate from YYYY-MM-DD to MM/DD/YYYY if available
    let birthdateFormatted = "";
    if (p.dob) {
      const dateParts = p.dob.split("-");
      if (dateParts.length === 3) {
        birthdateFormatted = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
      }
    }

    return {
      patientId: p.chart_no || p.id.toString(), // chart no for display
      numericId: p.id, // numeric backend id for the appointment patient_id
      name,
      gender: p.gender || "U",
      ssn: p.ssn || "", // blank when the backend has no SSN — never a fake mask
      phone: p.cell_phone || p.phone || "",
      birthdate: birthdateFormatted,
      age,
      // Real backend fields (PatientRead.responsible_party_id / patient_type).
      respId: p.responsible_party_id ?? "",
      chartNumber: p.chart_no || "",
      patientType: p.patient_type ?? "",
      office: currentOffice,
      ...(p.email && { email: p.email }),
    };
  };

  // Helper to extract numeric office ID from currentOffice (e.g., "OFF-1" -> "1")
  const extractOfficeIdNumber = (officeId?: string): string | undefined => {
    if (!officeId) return undefined;
    if (/^\d+$/.test(officeId)) return officeId;
    const match = officeId.match(/(\d+)$/);
    return match ? match[1] : officeId;
  };

  // Map searchBy values to API format
  const mapSearchByToAPI = (searchBy: string): string => {
    const mapping: Record<string, string> = {
      "lastName": "lastName",
      "firstName": "firstName",
      "homePhone": "homePhone",
      "workPhone": "workPhone",
      "cellPhone": "cellPhone",
      "ssn": "ssn",
      "respId": "responsiblePartyId",
      "patId": "patientId",
      "chart": "chartNumber",
      "birthdate": "birthDate",
    };
    return mapping[searchBy] || searchBy;
  };

  const handlePatientSearch = async () => {
    if (!searchText.trim()) {
      alert("Please enter search criteria");
      return;
    }

    setIsSearchingPatients(true);
    setHasSearched(false);
    setSearchResults([]);

    try {
      // Map the search form to the backend /patients query params: exact
      // chart_no for Chart # searches, otherwise free-text `search`.
      const apiSearchBy = mapSearchByToAPI(searchBy);
      const params: ListPatientsParams = { page: 1, size: 100 };
      if (apiSearchBy === "chartNumber") {
        params.chart_no = searchText.trim();
      } else {
        params.search = searchText.trim();
      }
      if (searchIn === "current") {
        const officeIdNum = extractOfficeIdNumber(currentOffice);
        if (officeIdNum) params.home_office_id = Number(officeIdNum);
      }
      if (!includeInactive) params.is_active = true;

      const response = await listPatients(params);

      // Convert backend patients to PatientSearchResult format
      const results = response.items.map(convertPatientToSearchResult);
      
      setSearchResults(results);
      setHasSearched(true);
    } catch (err: any) {
      console.error("Error searching patients:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to search patients";
      alert(`Error searching patients: ${errorMessage}`);
      setHasSearched(true); // Set to true so error message can be shown
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const handleSelectPatient = (
    patient: PatientSearchResult,
  ) => {
    setSelectedPatient(patient);
    // Pre-fill form data with selected patient
    const nameParts = patient.name.split(", ");
    setFormData({
      ...formData,
      lastName: nameParts[0] || "",
      firstName: nameParts[1] || "",
      phoneNumber: patient.phone || "",
      birthdate: patient.birthdate || "",
    });
    setShowPatientSearch(false);
    setShowPatientForm(true);
  };
  const formatUSPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // US phone numbers must be max 10 digits
    if (digits.length > 10) return digits.slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6)
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

    return `(${digits.slice(0, 3)}) ${digits.slice(
      3,
      6,
    )}-${digits.slice(6)}`;
  };

  const isValidUSPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10;
  };

  const handleQuickSave = async () => {
    // Debug: Log at the very beginning to confirm function is called
    console.log("🚀 handleQuickSave called!");
    console.log("=== Quick Save Debug (START) ===");
    console.log("appointmentType:", appointmentType);
    console.log("selectedPatient:", selectedPatient ? "EXISTS" : "NULL");
    console.log("formData:", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthdate: formData.birthdate,
      phoneNumber: formData.phoneNumber,
      operatory: formData.operatory,
      provider: formData.provider,
      procedureType: formData.procedureType,
    });
    
    // Validate required fields
    if (appointmentType === "new") {
      if (
        !formData.birthdate ||
        !formData.lastName ||
        !formData.firstName ||
        !formData.phoneNumber
      ) {
        console.log("❌ Validation failed: Missing patient fields");
        alert(
          "Please fill in all required fields (Birthdate, Last Name, First Name, Phone Number)",
        );
        return;
      }
    }

    // Validate appointment-specific required fields
    if (!formData.operatory || !formData.provider || !formData.procedureType) {
      console.log("❌ Validation failed: Missing appointment fields");
      alert("Please select Operatory, Provider, and Procedure Type");
      return;
    }

    // Validate date and time when no slot is selected (red button flow)
    if (!selectedSlot) {
      if (!formData.date) {
        console.log("❌ Validation failed: Missing date");
        alert("Please select an appointment date");
        return;
      }
      if (!formData.time) {
        console.log("❌ Validation failed: Missing time");
        alert("Please select an appointment time");
        return;
      }
    }

    console.log("✅ Validation passed, proceeding with save...");
    setIsSaving(true);

    try {
      // Numeric backend patient id — the appointment patient_id contract is
      // number | null, so we never forward a chart_no string here.
      let patientIdNum: number | null;

      // Step 1: Create patient first (if new patient)
      // Determine if we need to create a new patient
      // For new patients: appointmentType is "new" OR no patient is selected
      const isNewPatient = appointmentType === "new" || !selectedPatient;
      
      console.log("isNewPatient (should create patient):", isNewPatient);

      if (isNewPatient) {
        console.log("Creating new patient...");
        
        // Ensure we have required patient data
        if (!formData.firstName || !formData.lastName) {
          throw new Error("First name and last name are required to create a patient");
        }
        
        // Convert birthdate from MM/DD/YYYY to YYYY-MM-DD format
        let dobFormatted: string | undefined;
        if (formData.birthdate) {
          // Parse MM/DD/YYYY format and convert to YYYY-MM-DD
          const parts = formData.birthdate.split("/");
          if (parts.length === 3) {
            const month = parts[0];
            const day = parts[1];
            const year = parts[2];
            if (month && day && year) {
              dobFormatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
          } else {
            // If already in YYYY-MM-DD format, use as-is
            dobFormatted = formData.birthdate;
          }
        }

        // Extract office ID from currentOffice string
        const extractOfficeId = (officeStr: string): number | undefined => {
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

        // Create patient using Patient API
        const patientData: PatientCreateRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          ...(dobFormatted && { dob: dobFormatted }),
          ...(formData.phoneNumber && { phone: formData.phoneNumber }),
          ...(formData.email && { email: formData.email }),
          ...(formData.gender && { gender: formData.gender as "M" | "F" | "O" }),
          homeOfficeId: extractOfficeId(currentOffice),
        };

        console.log("Patient data to create:", patientData);
        const newPatient = await createPatient(patientData);
        console.log("Patient created successfully:", newPatient);

        // The appointment API requires a numeric patient_id.
        patientIdNum = newPatient.id;
        console.log("Using numeric patientId:", patientIdNum);
      } else {
        console.log("Using existing patient:", selectedPatient?.patientId);
        // Existing patient: use their numeric backend id (fallback to a numeric
        // chart id only if it parses) — never forward a chart_no string.
        patientIdNum =
          selectedPatient.numericId ??
          (Number.isFinite(Number(selectedPatient.patientId))
            ? Number(selectedPatient.patientId)
            : null);
        if (patientIdNum == null) {
          throw new Error(
            "Selected patient has no numeric id; cannot create appointment.",
          );
        }
      }

      // Step 2: Create appointment with the patient ID
      // Format matches API contract: APPOINTMENT_API_CONTRACTS.md
      // API expects snake_case field names
      // Use time from formData (either from selectedSlot or user input)
      const appointmentTime = selectedSlot?.time || formData.time;
      if (!appointmentTime) {
        throw new Error("Appointment time is required");
      }

      const appointmentPayload = {
        patient_id: patientIdNum,
        date: formData.date,
        start_time: appointmentTime,
        duration: formData.duration,
        procedure_type: formData.procedureType,
        operatory: formData.operatory,
        provider: formData.provider,
        notes: formData.notes || undefined,
        status: "Scheduled", // Default status for Quick Save
      };

      // Call onSave with the appointment payload
      // The Scheduler component will handle the appointment creation API call
      console.log("📤 Calling onSave with appointment payload:", appointmentPayload);
      onSave(appointmentPayload);
      console.log("✅ onSave called, closing modal...");
      onClose();
    } catch (err: any) {
      console.error("Error in Quick Save:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to save appointment";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    // Validate required fields
    if (appointmentType === "new") {
      if (
        !formData.birthdate ||
        !formData.lastName ||
        !formData.firstName ||
        !formData.phoneNumber
      ) {
        alert(
          "Please fill in all required fields (Birthdate, Last Name, First Name, Phone Number)",
        );
        return;
      }
    }

    // Create a temporary patient object from the form data
    const tempPatient: PatientSearchResult = {
      patientId: "NEW-" + Date.now(), // Temporary ID
      name: `${formData.lastName}, ${formData.firstName}`,
      gender: formData.gender || "U", // Use gender from form
      ssn: "***-**-****",
      phone: formData.phoneNumber,
      birthdate: formData.birthdate,
      age:
        new Date().getFullYear() -
        new Date(formData.birthdate).getFullYear(),
      respId: "NEW",
      chartNumber: "TBD",
      patientType: "New Patient",
      office: currentOffice,
      email: formData.email,
      cellPhone:
        formData.phoneType === "Cell"
          ? formData.phoneNumber
          : "",
      workPhone:
        formData.phoneType === "Work"
          ? formData.phoneNumber
          : "",
      homePhone:
        formData.phoneType === "Home"
          ? formData.phoneNumber
          : "",
    };

    // Store the new patient data and initial appointment data
    setNewPatientData(tempPatient);
    setSelectedPatient(tempPatient);
    setShowFullAppointmentForm(true);
    
    // Store initial appointment data to pass to AddEditAppointmentForm
    // This will be used when AddEditAppointmentForm is rendered
    setInitialAppointmentData({
      ...(formData.date && { date: formData.date }),
      ...(formData.time && { time: formData.time }),
      ...(formData.duration && { duration: formData.duration }),
      ...(formData.procedureType && { procedureType: formData.procedureType }),
      ...(formData.operatory && { operatory: formData.operatory }),
      ...(formData.provider && { provider: formData.provider }),
      ...(formData.notes && { notes: formData.notes }),
    });
  };

  // ✅ Reusable Radio component (clean & safe)
  const Radio = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="searchBy"
        value={value}
        checked={searchBy === value}
        onChange={(e) => setSearchBy(e.target.value)}
        className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
      />
      <span className="text-xs text-[#1E293B]">{label}</span>
    </label>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[95vh] overflow-y-auto border-2 border-[#E2E8F0] scrollbar-visible">
        {/* Header - Medical Slate Theme */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between z-10 border-b-2 border-[#162942]">
          <h2 className="font-bold text-white">
            NEW APPOINTMENT
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#162942] p-2 rounded transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoadingMetadata && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#1F3A5F]" />
            <span className="ml-3 text-gray-600">Loading appointment options...</span>
          </div>
        )}

        {/* Error Message */}
        {metadataError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{metadataError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Selected Slot Information - View-only when slot is selected */}
        {selectedSlot && (
          <div className="bg-[#E8EFF7] border-b-2 border-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#1F3A5F] mb-2">
              Selected Appointment Slot
            </h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#64748B] font-medium">
                  Date:
                </span>
                <span className="ml-2 text-[#1E293B] font-semibold">
                  {formData.date}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">
                  Time:
                </span>
                <span className="ml-2 text-[#1E293B] font-semibold">
                  {selectedSlot.time}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">
                  Office:
                </span>
                <span className="ml-2 text-[#1E293B] font-semibold">
                  {currentOffice}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">
                  Operatory:
                </span>
                <span className="ml-2 text-[#1E293B] font-semibold">
                  {(() => {
                    const operatory = operatories.find((op) => op.id === selectedSlot.operatory);
                    return operatory?.name || selectedSlot.operatory;
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Editable Date & Time Selection - When no slot is selected (red button) */}
        {!selectedSlot && (
          <div className="bg-[#E8EFF7] border-b-2 border-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#1F3A5F] mb-4">
              Select Appointment Date & Time
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[#64748B] font-medium mb-1 text-sm">
                  Date <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      date: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                />
              </div>
              <div>
                <label className="block text-[#64748B] font-medium mb-1 text-sm">
                  Time <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                />
              </div>
              <div>
                <label className="block text-[#64748B] font-medium mb-1 text-sm">
                  Office
                </label>
                <div className="px-3 py-2 bg-gray-100 border-2 border-[#E2E8F0] rounded-lg text-sm font-semibold text-[#1E293B]">
                  {currentOffice}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {!showPatientForm && !showPatientSearch ? (
            /* Appointment Type Selection */
            <div className="space-y-4">
              <h3 className="font-bold text-[#1F3A5F] mb-4">
                Select Appointment Type
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() =>
                    handleTypeSelection("existing")
                  }
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User
                    className="w-8 h-8 text-[#EF4444] mb-2"
                    strokeWidth={2}
                  />
                  <div className="font-bold text-[#1E293B]">
                    Existing Patient
                  </div>
                  <div className="text-sm text-[#64748B] mt-1">
                    Schedule appointment for existing patient
                  </div>
                </button>
                <button
                  onClick={() => handleTypeSelection("new")}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User
                    className="w-8 h-8 text-[#2FB9A7] mb-2"
                    strokeWidth={2}
                  />
                  <div className="font-bold text-[#1E293B]">
                    New Patient
                  </div>
                  <div className="text-sm text-[#64748B] mt-1">
                    Create new patient and schedule appointment
                  </div>
                </button>
                <button
                  onClick={() => handleTypeSelection("family")}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User
                    className="w-8 h-8 text-[#3A6EA5] mb-2"
                    strokeWidth={2}
                  />
                  <div className="font-bold text-[#1E293B]">
                    Family Appointment
                  </div>
                  <div className="text-sm text-[#64748B] mt-1">
                    Schedule for family member
                  </div>
                </button>
                <button
                  onClick={() => handleTypeSelection("block")}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <Clock
                    className="w-8 h-8 text-[#8B5CF6] mb-2"
                    strokeWidth={2}
                  />
                  <div className="font-bold text-[#1E293B]">
                    Block Appointment
                  </div>
                  <div className="text-sm text-[#64748B] mt-1">
                    Block time on schedule
                  </div>
                </button>
                <button
                  onClick={() =>
                    handleTypeSelection("quickfill")
                  }
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <Calendar
                    className="w-8 h-8 text-[#F59E0B] mb-2"
                    strokeWidth={2}
                  />
                  <div className="font-bold text-[#1E293B]">
                    Quick Fill List
                  </div>
                  <div className="text-sm text-[#64748B] mt-1">
                    Select from quick fill patients
                  </div>
                </button>
              </div>
            </div>
          ) : showPatientSearch ? (
            /* Patient Search Interface */
            <div className="space-y-4">
              {/* Header with Search Input */}
              <div className="flex items-center justify-between gap-6 mb-4">
                <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide whitespace-nowrap">
                  Find Existing Patient
                </h3>

                {/* Search Input - Inline with title */}
                <div className="flex-1 flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Enter search criteria..."
                    value={searchText}
                    onChange={(e) =>
                      setSearchText(e.target.value)
                    }
                    onKeyPress={(e) =>
                      e.key === "Enter" && handlePatientSearch()
                    }
                    className="flex-1 px-4 py-2.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                  <button
                    onClick={handlePatientSearch}
                    className="bg-[#3A6EA5] text-white px-6 py-2.5 rounded-lg hover:bg-[#1F3A5F] transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    <SearchIcon
                      className="w-4 h-4"
                      strokeWidth={2}
                    />
                    Search
                  </button>
                </div>
              </div>

              {/* Search Criteria - Compact 3-column layout */}
              <div className="grid grid-cols-4 gap-4">
                {/* Search By → spans 3 columns */}
                <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-4 col-span-3">
                  <h4 className="text-xs font-bold text-[#1F3A5F] uppercase mb-3 tracking-wide">
                    Search By
                  </h4>

                  {/* 4 columns, each column = 3 fields */}
                  <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                    {/* Column 1 */}
                    <div className="space-y-2">
                      <Radio
                        label="Last Name"
                        value="lastName"
                      />
                      <Radio
                        label="First Name"
                        value="firstName"
                      />
                      <Radio
                        label="Home Phone"
                        value="homePhone"
                      />
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-2">
                      <Radio
                        label="Work Phone"
                        value="workPhone"
                      />
                      <Radio
                        label="Cell Phone"
                        value="cellPhone"
                      />
                      <Radio label="SSN" value="ssn" />
                    </div>

                    {/* Column 3 */}
                    <div className="space-y-2">
                      <Radio label="Resp. ID" value="respId" />
                      <Radio label="Pat. ID" value="patId" />
                      <Radio label="Chart#" value="chart" />
                    </div>

                    {/* Column 4 */}
                    <div className="space-y-2">
                      <Radio
                        label="Birthdate"
                        value="birthdate"
                      />

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={includeInactive}
                          onChange={(e) =>
                            setIncludeInactive(e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                        />
                        <span className="text-xs text-[#1E293B]">
                          Incl. Inactive
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Search In → 1 column */}
                <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-4 col-span-1">
                  <h4 className="text-xs font-bold text-[#1F3A5F] uppercase mb-3 tracking-wide">
                    Search In
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="searchIn"
                        value="current"
                        checked={searchIn === "current"}
                        onChange={(e) =>
                          setSearchIn(e.target.value as "current" | "all" | "group")
                        }
                        className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-xs text-[#1E293B]">
                        Current Office
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="searchIn"
                        value="all"
                        checked={searchIn === "all"}
                        onChange={(e) =>
                          setSearchIn(e.target.value as "current" | "all" | "group")
                        }
                        className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-xs text-[#1E293B]">
                        All Offices
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="searchIn"
                        value="group"
                        checked={searchIn === "group"}
                        onChange={(e) =>
                          setSearchIn(e.target.value as "current" | "all" | "group")
                        }
                        className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-xs text-[#1E293B]">
                        Office Group
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Search Results Table */}
              {hasSearched && (
                <div className="mt-6">
                  <h4 className="font-bold text-[#1F3A5F] mb-3">
                    Search Results ({searchResults.length}{" "}
                    patient
                    {searchResults.length !== 1 ? "s" : ""}{" "}
                    found)
                  </h4>

                  {searchResults.length === 0 ? (
                    <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-8 text-center">
                      <p className="text-[#64748B]">
                        No patients found matching your search
                        criteria.
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-[#1F3A5F] text-white sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold">
                                Pat. ID
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Gender
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                SSN
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Phone
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Birthdate
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Age
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Resp. ID
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Chart#
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Pat. Type
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Office
                              </th>
                              <th className="px-3 py-2 text-left font-bold">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {searchResults.map(
                              (patient, index) => (
                                <tr
                                  key={patient.patientId}
                                  className={`border-b border-[#E2E8F0] hover:bg-[#F7F9FC] cursor-pointer ${
                                    index % 2 === 0
                                      ? "bg-white"
                                      : "bg-[#FAFBFC]"
                                  }`}
                                >
                                  <td className="px-3 py-2 text-[#3A6EA5] font-semibold">
                                    {patient.patientId}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B] font-medium">
                                    {patient.name}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.gender}
                                  </td>
                                  <td className="px-3 py-2 text-[#64748B]">
                                    {patient.ssn}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.phone}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.birthdate}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.age}
                                  </td>
                                  <td className="px-3 py-2 text-[#64748B]">
                                    {patient.respId}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.chartNumber}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.patientType}
                                  </td>
                                  <td className="px-3 py-2 text-[#1E293B]">
                                    {patient.office}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      onClick={() =>
                                        handleSelectPatient(
                                          patient,
                                        )
                                      }
                                      className="px-3 py-1 bg-[#3A6EA5] text-white text-xs font-bold rounded hover:bg-[#2d5080] transition-colors"
                                    >
                                      SELECT
                                    </button>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Back Button */}
              <div className="flex justify-between pt-4 border-t-2 border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setShowPatientSearch(false);
                    setHasSearched(false);
                    setSearchResults([]);
                    setSearchText("");
                  }}
                  className={components.buttonSecondary}
                >
                  BACK TO APPOINTMENT TYPES
                </button>
              </div>
            </div>
          ) : /* Comprehensive Add/Edit Appointment Form */
          selectedPatient ? (
            <AddEditAppointmentForm
              patient={selectedPatient}
              selectedSlot={selectedSlot}
              currentOffice={currentOffice}
              onClose={onClose}
              onSave={onSave}
              onBack={() => {
                setSelectedPatient(null);
                setShowPatientForm(false);
                setShowPatientSearch(true);
                setInitialAppointmentData(null);
              }}
              editingAppointment={editingAppointment}
              {...(initialAppointmentData && { initialAppointmentData })}
            />
          ) : (
            /* Patient and Appointment Form */
            <div className="space-y-6">

              {/* Personal Information */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Birthdate{" "}
                      <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            birthdate: e.target.value,
                          })
                        }
                        required
                        disabled={!!selectedPatient}
                        className="flex-1 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100"
                      />
                      {/* <button className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg hover:bg-[#F7F9FC] hover:border-[#3A6EA5] transition-all">
                        <Calendar
                          className="w-5 h-5 text-[#64748B]"
                          strokeWidth={2}
                        />
                      </button> */}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Last Name{" "}
                      <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastName: e.target.value,
                        })
                      }
                      required
                      disabled={!!selectedPatient}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      First Name{" "}
                      <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstName: e.target.value,
                        })
                      }
                      required
                      disabled={!!selectedPatient}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    />
                  </div>
                </div>

{/* Phone Information */}
<div className="mt-4 grid grid-cols-4 gap-4">
  {/* Phone Number (2 columns) */}
  <div className="col-span-2">
    <label className="block text-[#1E293B] font-medium mb-1">
      Phone Number <span className="text-[#EF4444]">*</span>
    </label>

    <input
      type="tel"
      inputMode="numeric"
      placeholder="(555) 123-4567"
      value={formData.phoneNumber}
      onChange={(e) => {
        const formatted = formatUSPhone(e.target.value);

        setFormData({
          ...formData,
          phoneNumber: formatted,
        });

        if (formatted && !isValidUSPhone(formatted)) {
          setPhoneError("Enter a valid US phone number");
        } else {
          setPhoneError("");
        }
      }}
      required
      disabled={!!selectedPatient}
      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]
                 focus:border-[#3A6EA5] transition-all disabled:bg-gray-100"
    />

    {phoneError && (
      <p className="mt-1 text-xs text-[#EF4444]">
        {phoneError}
      </p>
    )}
  </div>

  {/* Phone Type */}
  <div>
    <label className="block text-[#1E293B] font-medium mb-1">
      Type
    </label>
    <select
      value={formData.phoneType}
      onChange={(e) =>
        setFormData({
          ...formData,
          phoneType: e.target.value,
        })
      }
      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]
                 focus:border-[#3A6EA5] transition-all"
    >
      <option value="Cell">Cell</option>
      <option value="Home">Home</option>
      <option value="Work">Work</option>
    </select>
  </div>

  {/* Gender */}
  <div>
    <label className="block text-[#1E293B] font-medium mb-1">
      Gender
    </label>
    <select
      value={formData.gender}
      onChange={(e) =>
        setFormData({
          ...formData,
          gender: e.target.value,
        })
      }
      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]
                 focus:border-[#3A6EA5] transition-all"
    >
      <option value="">Select</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Non-Binary/Other">
        Non-Binary / Other
      </option>
    </select>
  </div>
</div>
              </div>

              {/* Appointment Details */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">
                  Appointment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Duration (minutes)
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      <option value={10}>10 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Procedure Type
                    </label>
                    <select
                      value={formData.procedureType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          procedureType: e.target.value,
                        })
                      }
                      disabled={isLoadingMetadata || procedureTypes.length === 0}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {procedureTypes.length === 0 ? (
                        <option value="">Loading...</option>
                      ) : (
                        procedureTypes.map((type) => (
                          <option key={type.id || type.name} value={type.name}>
                            {type.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Procedure Type Color Preview */}
                {formData.procedureType && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-[#64748B] font-medium">
                      Color:
                    </span>
                    <div
                      className={`px-3 py-1 rounded font-medium text-sm ${getProcedureTypeColor(
                        formData.procedureType
                      )}`}
                    >
                      {formData.procedureType}
                    </div>
                  </div>
                )}

                {/* Appointment Notes */}
                <div className="mt-4">
                  <label className="block text-[#1E293B] font-medium mb-1">
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
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    placeholder="Enter any notes about this appointment..."
                  />
                </div>

                {/* Additional Options */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Provider
                    </label>
                    <select
                      value={formData.provider}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          provider: e.target.value,
                        })
                      }
                      disabled={isLoadingMetadata || providers.length === 0}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {providers.length === 0 ? (
                        <option value="">Loading...</option>
                      ) : (
                        providers.map((provider) => (
                          <option key={provider.id} value={provider.name}>
                            {provider.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Operatory
                    </label>
                    <select
                      value={formData.operatory}
                      onChange={(e) => {
                        const op = operatories.find((o) => o.id === e.target.value);
                        const providerName = op?.provider_id
                          ? providers.find((p) => p.id === op.provider_id)?.name
                          : undefined;
                        setFormData({
                          ...formData,
                          operatory: e.target.value,
                          // Auto-fill provider from operatory.provider_id (Gap 1).
                          ...(providerName ? { provider: providerName } : {}),
                        });
                      }}
                      disabled={isLoadingMetadata || operatories.length === 0}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {operatories.length === 0 ? (
                        <option value="">Loading...</option>
                      ) : (
                        operatories.map((operatory) => (
                          <option key={operatory.id} value={operatory.id}>
                            {operatory.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-between pt-4 border-t-2 border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setShowPatientForm(false);
                    setSelectedPatient(null);
                    if (appointmentType === "existing") {
                      setShowPatientSearch(true);
                    }
                  }}
                  className={components.buttonSecondary}
                >
                  BACK
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("🔘 QUICK SAVE button clicked!");
                      handleQuickSave();
                    }}
                    disabled={isSaving}
                    type="button"
                    className={`${components.buttonPrimary} ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        SAVING...
                      </>
                    ) : (
                      "QUICK SAVE"
                    )}
                  </button>
                  <button
                    onClick={handleContinue}
                    className={components.buttonSuccess}
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}