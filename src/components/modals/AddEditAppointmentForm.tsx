import {
  X,
  Calendar,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import SendEmailModal from "./SendEmailModal";
import TxPlansTab from "./TxPlansTab";
import DatePickerCalendar from "./DatePickerCalendar";
import AppointmentProcedurePicker from "./AppointmentProcedurePicker";
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
  officeIdNum,
  type Provider,
  type Operatory,
  type ProcedureType,
  type AppointmentStatus,
  type ProcedureCode as ApiProcedureCode,
  type ProcedureCategory,
  type TreatmentPlan,
} from "../../services/schedulerApi";
import {
  createPatient as createPatientApi,
  getPatient,
  listPatients,
  updatePatient,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientCreate, PatientRead, PatientUpdate } from "@/api/generated/model";
import {
  loadAppointmentProcedures,
  syncAppointmentProcedures,
  newRowId,
  type AppointmentProcedureLine,
} from "../../services/appointmentProceduresApi";
import {
  loadFeeScheduleContext,
  resolveProcedureFee,
  EMPTY_FEE_CONTEXT,
  type FeeScheduleContext,
} from "../../services/feeScheduleResolver";
import { loadProcedureCodes } from "@/components/setup/insurance/procedureCodeService";

interface PatientSearchResult {
  patientId: string;
  /** Numeric backend patient id; the appointment patient_id contract is
   *  number | null. patientId is the chart_no used for display only. */
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
  /** PatientRead.home_office_id — the patient's own office, not the selected one. */
  homeOfficeId?: number | null;
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

/** "1978-01-05" (or an ISO timestamp) -> "01/05/1978". Pure string work — never
 *  `new Date(...)`, which parses a bare YYYY-MM-DD as UTC and shifts the day. */
const isoToMMDDYYYY = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${m}/${d}/${y}` : "";
};

/** "01/05/1978" -> "1978-01-05" (blank when not a complete date). */
const mmddyyyyToIso = (value: string | null | undefined): string => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [m, d, y] = value.split("/");
  if (!m || !d || !y || y.length !== 4) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

/** Strip formatting from a phone before sending it to the backend. */
const digitsOnly = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "");

/** One row of the TREATMENTS grid. Bound directly to the backend
 *  appointment_procedures shape (snake_case) so it round-trips unchanged. */
type Treatment = AppointmentProcedureLine;

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
          startsAt: convertTimeTo12Hour(fullAppointment.start_time),
          duration: fullAppointment.duration,
          procedureType: fullAppointment.procedure_label || prev.procedureType,
          operatory: fullAppointment.operatory_id || prev.operatory,
          provider: fullAppointment.provider_name || prev.provider,
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
        
        // Procedure lines are their own resource (/appointment-procedures) and
        // are loaded by a dedicated effect — AppointmentRead carries no
        // `treatments` array (the code that read one here never fired).

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

  // ---------------------------------------------------------------------
  // Patient record
  //
  // The form used to render whatever the caller happened to put in the thin
  // PatientSearchResult: the search grid supplies no work/home phone, and the
  // edit path seeded a placeholder shell (birthdate "01/01/1990", phone
  // "(555) 000-0000") that was never replaced — which is why Birthdate and the
  // contact fields looked wrong or empty. We now load the real patient once and
  // drive every Personal / Contact field from it.
  // ---------------------------------------------------------------------
  const [patientRecord, setPatientRecord] = useState<PatientRead | null>(null);
  const [patientNumericId, setPatientNumericId] = useState<number | null>(
    patient.numericId ?? null,
  );
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPatient = async () => {
      // A brand-new patient has not been created yet — nothing to load.
      if ((patient.patientId ?? "").startsWith("NEW-")) return;

      // patient.patientId is the chart_no (display only). Only patient.numericId
      // is the backend key; fall back to a chart_no lookup when it is absent.
      let id = patient.numericId ?? null;
      setIsLoadingPatient(true);
      setPatientError(null);
      try {
        if (id == null && patient.chartNumber) {
          const hit = await listPatients({ chart_no: patient.chartNumber, size: 1 });
          id = hit.items?.[0]?.id ?? null;
        }
        if (id == null) {
          setPatientError("This patient has no backend id — demographics could not be loaded.");
          return;
        }
        const record = await getPatient(id);
        if (cancelled) return;
        setPatientNumericId(id);
        setPatientRecord(record);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error loading patient record:", err);
        setPatientError(
          err?.response?.data?.detail || err?.message || "Failed to load patient details",
        );
      } finally {
        if (!cancelled) setIsLoadingPatient(false);
      }
    };
    void loadPatient();
    return () => {
      cancelled = true;
    };
  }, [patient.numericId, patient.patientId, patient.chartNumber]);

  // Seed Personal + Contact information from the loaded record. Home phone maps
  // to PatientRead.phone (the backend has no separate home_phone column).
  useEffect(() => {
    if (!patientRecord) return;
    setFormData((prev) => ({
      ...prev,
      birthdate: isoToMMDDYYYY(patientRecord.dob) || prev.birthdate,
      lastName: patientRecord.last_name ?? prev.lastName,
      firstName: patientRecord.first_name ?? prev.firstName,
      email: patientRecord.email ?? "",
      cellPhone: patientRecord.cell_phone ?? "",
      workPhone: patientRecord.work_phone ?? "",
      homePhone: patientRecord.phone ?? "",
    }));
  }, [patientRecord]);

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
        ] = await Promise.all([
          fetchProviders(currentOfficeId),
          fetchOperatories(currentOfficeId),
          fetchProcedureTypes(),
          fetchAppointmentStatuses(),
          fetchProcedureCategories().catch((err) => {
            console.error("Error fetching procedure categories:", err);
            return [];
          }),
        ]);

        // Some offices have operatories but no office-scoped providers assigned.
        // Without a provider list the appointment can't be saved (provider is
        // required and the "Change Provider" picker would be empty), so fall back
        // to the full provider list when the office-scoped fetch comes back empty.
        let effectiveProviders = providersData;
        if (effectiveProviders.length === 0) {
          try {
            effectiveProviders = await fetchProviders();
          } catch (err) {
            console.error("Provider fallback fetch failed:", err);
          }
        }
        setProviders(effectiveProviders);
        setOperatories(operatoriesData);
        setProcedureTypes(procedureTypesData);
        setStatusOptions(statusesData);
        setProcedureCategories(Array.isArray(categoriesData) ? categoriesData : []);
        
        console.log("Metadata loaded:", {
          providers: providersData.length,
          operatories: operatoriesData.length,
          procedureTypes: procedureTypesData.length,
          statuses: statusesData.length,
          categories: Array.isArray(categoriesData) ? categoriesData.length : 0,
        });
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
  }, [currentOfficeId]);

  // ---------------------------------------------------------------------
  // Treatment plans
  //
  // Keyed on the *numeric* patient id. This used to pass patient.patientId —
  // the chart_no — so the tree showed a different patient's plans (or none),
  // and the plans arrived with no phases because the items were never fetched.
  // ---------------------------------------------------------------------
  const [isLoadingTreatmentPlans, setIsLoadingTreatmentPlans] = useState(false);
  const [treatmentPlanReloadKey, setTreatmentPlanReloadKey] = useState(0);
  const reloadTreatmentPlans = useCallback(
    () => setTreatmentPlanReloadKey((k) => k + 1),
    [],
  );

  useEffect(() => {
    if (patientNumericId == null) {
      setTreatmentPlans([]);
      return;
    }
    let cancelled = false;
    setIsLoadingTreatmentPlans(true);
    void fetchTreatmentPlans(patientNumericId)
      .then((plans) => {
        if (!cancelled) setTreatmentPlans(plans);
      })
      .catch((err) => {
        console.error("Error fetching treatment plans:", err);
        if (!cancelled) setTreatmentPlans([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTreatmentPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientNumericId, treatmentPlanReloadKey]);

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

        // Set a default operatory/provider when none is chosen yet. The
        // provider is resolved from the operatory's provider_id (backend Gap 1),
        // falling back to the first provider.
        if (operatories.length > 0) {
          const opId = prev.operatory || operatories[0]?.id || "";
          if (!prev.operatory) updates.operatory = opId;
          if (!prev.provider) {
            const op = operatories.find((o) => o.id === opId);
            const byOp = op?.provider_id
              ? providers.find((p) => p.id === op.provider_id)?.name
              : undefined;
            const fallback = providers.length > 0 ? providers[0]?.name || "" : "";
            if (byOp || fallback) updates.provider = byOp || fallback;
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

  // Default provider — resolve the operatory's assigned provider via its
  // provider_id (backend Gap 1), falling back to the first provider.
  const getDefaultProvider = (operatoryId: string) => {
    const op = operatories.find((o) => o.id === operatoryId);
    const byOp = op?.provider_id
      ? providers.find((p) => p.id === op.provider_id)?.name
      : undefined;
    return byOp || (providers.length > 0 ? providers[0]?.name || "" : "");
  };

  /** The appointment form binds the provider *name*; procedure lines carry the
   *  backend provider_id. These two translate between them. */
  const providerIdByName = (name: string): string =>
    providers.find((p) => p.name === name)?.id ?? "";
  const providerNameById = (id: string): string =>
    providers.find((p) => p.id === id)?.name ?? "";

  /** Same-day visits post as completed ("C"); anything else is treatment-planned. */
  const defaultLineStatus = editingAppointment ? "C" : "TP";

  // Appointment form state
  const [formData, setFormData] = useState({
    // Personal Information (read-only for existing patient)
    birthdate: patient.birthdate,
    lastName: patient.name.split(", ")[0],
    firstName: patient.name.split(", ")[1] || "",

    // Contact Information — placeholders only; the real values arrive from the
    // patient record fetch above. (This used to default the e-mail to the
    // literal string "john.smith@email.com", which is what every appointment
    // showed for a patient with no e-mail on file.)
    email: patient.email || "",
    cellPhone: patient.cellPhone || patient.phone || "",
    workPhone: patient.workPhone || "",
    homePhone: patient.homePhone || "",
    bypassPhone: false,

    // Operatory & Scheduling — seed from the slot the user picked and any
    // date/time/defaults carried in from the New Appointment chooser
    // (initialAppointmentData), falling back to today's date and API defaults.
    appointmentDate: initialAppointmentData?.date
      ? // YYYY-MM-DD → MM/DD/YYYY (the field renders MM/DD/YYYY).
        (() => {
          const [y, m, d] = initialAppointmentData.date.split("-");
          return y && m && d ? `${m}/${d}/${y}` : getTodayDate();
        })()
      : getTodayDate(),
    operatory:
      selectedSlot?.operatory ||
      initialAppointmentData?.operatory ||
      (operatories.length > 0 ? operatories[0]?.id || "" : ""),
    status: statusOptions.length > 0 ? statusOptions[0]?.name || "Scheduled" : "Scheduled",
    startsAt: selectedSlot?.time || initialAppointmentData?.time || "09:00 AM",
    duration: initialAppointmentData?.duration ?? 30,
    procedureType:
      initialAppointmentData?.procedureType ||
      (procedureTypes.length > 0 ? procedureTypes[0]?.name || "" : ""),
    provider:
      initialAppointmentData?.provider ||
      getDefaultProvider(
        selectedSlot?.operatory ||
          initialAppointmentData?.operatory ||
          (operatories.length > 0 ? operatories[0]?.id || "" : ""),
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
    notes: initialAppointmentData?.notes || "",
    campaignId: "",
  });

  /** A brand-new patient the caller has not persisted yet. */
  const isNewPatientShell = (patient.patientId ?? "").startsWith("NEW-");

  // Personal fields are read-only when the patient record already holds a value
  // (the record is the source of truth); when the backend has none, the field
  // stays open so it can be filled in here and written back to the patient.
  const personalLocked = {
    birthdate: !isNewPatientShell && (isLoadingPatient || !!patientRecord?.dob),
    lastName: !isNewPatientShell && (isLoadingPatient || !!patientRecord?.last_name),
    firstName: !isNewPatientShell && (isLoadingPatient || !!patientRecord?.first_name),
  };

  // Handle operatory change — auto-fill the provider from the operatory's
  // assigned provider (backend Gap 1).
  const handleOperatoryChange = (newOperatoryId: string) => {
    setFormData({
      ...formData,
      operatory: newOperatoryId,
      provider: getDefaultProvider(newOperatoryId),
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
    (value ?? "").replace(/\s+/g, "").toUpperCase();

  // Quick Add multi-select (rows toggle; "Add Selected" prices and appends).
  const [selectedProcedures, setSelectedProcedures] = useState<
    ApiProcedureCode[]
  >([]);

  // The Add Procedure picker (also used by a Quick Add row click so the code's
  // tooth/surface/quadrant requirements are enforced before the line is added).
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [selectedProcedureForAdd, setSelectedProcedureForAdd] =
    useState<ApiProcedureCode | null>(null);
  const [searchCodeFilter, setSearchCodeFilter] = useState("");
  const [searchUserCodeFilter, setSearchUserCodeFilter] =
    useState("");
  const [searchDescriptionFilter, setSearchDescriptionFilter] =
    useState("");

  const toggleProcedureSelection = (proc: ApiProcedureCode) => {
    setSelectedProcedures((prev) => {
      const isSelected = prev.some((p) => p.code === proc.code);
      return isSelected
        ? prev.filter((p) => p.code !== proc.code)
        : [...prev, proc];
    });
  };

  // ---------------------------------------------------------------------
  // Pricing
  //
  // Quick Add used to invent the split (30% patient / 70% insurance) off the
  // code's default fee. Lines are now priced against the fee schedule that
  // applies to this patient/office/provider — the same resolver the Treatment
  // Plan and Transactions screens use.
  // ---------------------------------------------------------------------
  const [feeContext, setFeeContext] = useState<FeeScheduleContext>(EMPTY_FEE_CONTEXT);

  useEffect(() => {
    if (patientNumericId == null) return;
    let cancelled = false;
    void loadFeeScheduleContext({
      patient_id: patientNumericId,
      office_id: officeIdNum(currentOfficeId ?? currentOffice) ?? null,
      provider_id: providerIdByName(formData.provider) || null,
    })
      .then((ctx) => {
        if (!cancelled) setFeeContext(ctx);
      })
      .catch((err) => {
        console.error("Fee schedule context failed to load:", err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientNumericId, currentOfficeId, currentOffice, formData.provider, providers.length]);

  /** Existing lines for the appointment being edited. */
  useEffect(() => {
    if (!editingAppointment?.id) return;
    let cancelled = false;
    void (async () => {
      const [lines, codeMap] = await Promise.all([
        loadAppointmentProcedures(editingAppointment.id),
        loadProcedureCodes().catch(() => new Map()),
      ]);
      if (cancelled) return;
      // appointment_procedures has no duration column (backend gap
      // APPT-PROC-1) — fall back to the code's default so Calc Time works.
      setTreatments(
        lines.map((l) => ({
          ...l,
          duration:
            l.duration ||
            codeMap.get(l.procedure_code)?.default_duration_minutes ||
            0,
          description:
            l.description || codeMap.get(l.procedure_code)?.description || "",
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [editingAppointment?.id]);

  /** Append a code as a treatment line, priced from the fee schedule. */
  const addProcedureLine = async (
    proc: ApiProcedureCode,
    overrides: Partial<Treatment> = {},
  ) => {
    const priced = await resolveProcedureFee(feeContext, proc.code, {
      default_fee: proc.defaultFee,
    }).catch(() => null);
    const fee = priced?.fee ?? proc.defaultFee;
    const est_insurance = priced?.insurance_estimate ?? 0;
    setTreatments((prev) => [
      ...prev,
      {
        row_id: newRowId(),
        status: defaultLineStatus,
        procedure_code: proc.code,
        tooth: "",
        surface: "",
        description: proc.description,
        bill_to: "Patient",
        duration: proc.defaultDuration ?? 30,
        provider_id: providerIdByName(formData.provider),
        provider_units: 1,
        est_patient: priced?.patient_estimate ?? Math.max(fee - est_insurance, 0),
        est_insurance,
        fee,
        ...overrides,
      },
    ]);
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

      // For new patients (patientId starts with "NEW-"), create patient first.
      // The appointment patient_id contract is numeric, so we resolve to a
      // number here and never forward a chart_no/"NEW-" string.
      const isNewPatient = isNewPatientShell;
      // patient.patientId is a chart_no — never a backend id. Use the id we
      // resolved when the patient record loaded.
      let patientIdNum: number | null = patientNumericId;
      if (isNewPatient) {
        console.log("Creating new patient before saving appointment...");
        
        const dobFormatted = mmddyyyyToIso(formData.birthdate) || undefined;
        
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
        const patientData: PatientCreate = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          ...(dobFormatted && { dob: dobFormatted }),
          ...(formData.cellPhone && {
            cell_phone: digitsOnly(formData.cellPhone),
            preferred_contact: "cell_phone",
          }),
          ...(formData.workPhone && { work_phone: digitsOnly(formData.workPhone) }),
          ...(formData.homePhone && { phone: digitsOnly(formData.homePhone) }),
          ...(formData.email && { email: formData.email }),
          home_office_id: currentOfficeId ? parseInt(String(currentOfficeId), 10) : extractOfficeId(currentOffice),
        };

        // Gender is free-text on this backend ("Male"/"Female"/"M"/…); forward
        // whatever the caller supplied rather than dropping anything but M/F/O.
        if (patient.gender && patient.gender !== "U") {
          patientData.gender = patient.gender;
        }

        const newPatient = await createPatientApi(patientData);
        patientIdNum = newPatient.id;
        console.log("Patient created with numeric ID:", patientIdNum);
      }

      if (patientIdNum == null) {
        throw new Error(
          "Patient has no numeric id; cannot save appointment.",
        );
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
        patient_id: patientIdNum,
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
      };

      Object.keys(appointmentPayload).forEach((key) => {
        if (appointmentPayload[key] === undefined) delete appointmentPayload[key];
      });

      // Contact / demographic edits belong to the patient record, not the
      // appointment. Previously every edit made here was silently discarded for
      // an existing patient (the values were only used when creating one).
      if (!isNewPatient) {
        const patch: PatientUpdate = {};
        const dobIso = mmddyyyyToIso(formData.birthdate);
        if (dobIso && dobIso !== (patientRecord?.dob ?? "").slice(0, 10)) patch.dob = dobIso;
        if (!personalLocked.lastName && formData.lastName && formData.lastName !== patientRecord?.last_name)
          patch.last_name = formData.lastName;
        if (!personalLocked.firstName && formData.firstName && formData.firstName !== patientRecord?.first_name)
          patch.first_name = formData.firstName;
        if ((formData.email || "") !== (patientRecord?.email ?? "")) patch.email = formData.email || null;
        if (digitsOnly(formData.cellPhone) !== digitsOnly(patientRecord?.cell_phone))
          patch.cell_phone = digitsOnly(formData.cellPhone) || null;
        if (digitsOnly(formData.workPhone) !== digitsOnly(patientRecord?.work_phone))
          patch.work_phone = digitsOnly(formData.workPhone) || null;
        if (digitsOnly(formData.homePhone) !== digitsOnly(patientRecord?.phone))
          patch.phone = digitsOnly(formData.homePhone) || null;
        if (Object.keys(patch).length > 0) {
          const updated = await updatePatient(patientIdNum, patch);
          setPatientRecord(updated);
        }
      }

      // Save the appointment, then reconcile its procedure lines. The
      // `treatments` array used to be attached to this payload and dropped on
      // the floor — appointment procedures are their own resource.
      let appointmentId: string;
      if (editingAppointment?.id) {
        await updateAppointment({ id: editingAppointment.id, ...appointmentPayload });
        appointmentId = editingAppointment.id;
      } else {
        const created = await createAppointment(appointmentPayload);
        appointmentId = created.id;
      }

      let procedureWarning = "";
      try {
        const saved = await syncAppointmentProcedures(appointmentId, treatments);
        setTreatments(saved);
      } catch (err: any) {
        console.error("Error saving appointment procedures:", err);
        procedureWarning =
          "\n\n⚠️ The appointment saved, but its procedures could not be stored: " +
          (err?.response?.data?.detail || err?.message || "unknown error");
      }

      alert(
        (editingAppointment?.id
          ? "✅ Appointment updated successfully!"
          : "✅ Appointment saved successfully!") + procedureWarning,
      );

      onSave({
        _alreadySaved: true, // the appointment is already persisted via the API
        formData,
        patient,
        treatments,
      });
      onClose();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save appointment";
      alert(`❌ Error: ${errorMessage}`);
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

  /** Open the procedure picker. (This button used to append a hardcoded
   *  D0120 "Periodic Oral Evaluation" row on tooth 1 for $50.) */
  const handleAddTreatment = () => {
    setSelectedProcedureForAdd(null);
    setShowAddProcedure(true);
  };

  const handleDeleteTreatment = (rowId: string) => {
    setTreatments(treatments.filter((t) => t.row_id !== rowId));
  };

  const patchTreatment = (rowId: string, patch: Partial<Treatment>) => {
    setTreatments((prev) =>
      prev.map((t) => (t.row_id === rowId ? { ...t, ...patch } : t)),
    );
  };

  const totalEstPatient = treatments.reduce((sum, t) => sum + t.est_patient, 0);
  const totalEstInsurance = treatments.reduce((sum, t) => sum + t.est_insurance, 0);
  const totalFee = treatments.reduce((sum, t) => sum + t.fee, 0);

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
        {patientError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded mb-4">
            <p className="text-sm text-red-700">
              &#9888; Could not load this patient&apos;s details: {patientError}
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
                onChange={(e) =>
                  setFormData({ ...formData, birthdate: e.target.value })
                }
                disabled={personalLocked.birthdate}
                placeholder={isLoadingPatient ? "Loading…" : "MM/DD/YYYY"}
                title={
                  personalLocked.birthdate
                    ? "From the patient record"
                    : "Not on the patient record — entering it here updates the patient"
                }
                className={`w-full px-3 py-1.5 border-2 rounded-lg text-sm ${
                  personalLocked.birthdate
                    ? "border-[#CBD5E1] bg-gray-100 text-[#64748B] cursor-not-allowed"
                    : "border-[#F59E0B] bg-white focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                }`}
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
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                disabled={personalLocked.lastName}
                placeholder={isLoadingPatient ? "Loading…" : ""}
                className={`w-full px-3 py-1.5 border-2 rounded-lg text-sm ${
                  personalLocked.lastName
                    ? "border-[#CBD5E1] bg-gray-100 text-[#64748B] cursor-not-allowed"
                    : "border-[#F59E0B] bg-white focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                }`}
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
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                disabled={personalLocked.firstName}
                placeholder={isLoadingPatient ? "Loading…" : ""}
                className={`w-full px-3 py-1.5 border-2 rounded-lg text-sm ${
                  personalLocked.firstName
                    ? "border-[#CBD5E1] bg-gray-100 text-[#64748B] cursor-not-allowed"
                    : "border-[#F59E0B] bg-white focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                }`}
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
                        key={treatment.row_id}
                        className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? "bg-white" : "bg-[#F7F9FC]"}`}
                      >
                        <td className="px-2 py-2">
                          <select
                            value={treatment.status}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, { status: e.target.value })
                            }
                            className="w-full rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          >
                            <option value="TP">TP</option>
                            <option value="C">C</option>
                            <option value="EX">EX</option>
                            <option value="RF">RF</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 font-semibold text-[#3A6EA5]">
                          {treatment.procedure_code}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={treatment.tooth}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, { tooth: e.target.value })
                            }
                            className="w-12 rounded border border-[#CBD5E1] px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={treatment.surface}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, {
                                surface: e.target.value.toUpperCase(),
                              })
                            }
                            className="w-14 rounded border border-[#CBD5E1] px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">{treatment.description}</td>
                        <td className="px-2 py-2">
                          <select
                            value={treatment.bill_to}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, { bill_to: e.target.value })
                            }
                            title="Captured here but not stored by the backend yet (gap APPT-PROC-3)"
                            className="rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          >
                            <option value="Patient">Patient</option>
                            <option value="Insurance">Insurance</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={treatment.duration}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, {
                                duration: Number(e.target.value) || 0,
                              })
                            }
                            className="w-14 rounded border border-[#CBD5E1] px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={treatment.provider_id}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, {
                                provider_id: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                            style={{ minWidth: "140px", maxWidth: "160px" }}
                          >
                            {providers.length === 0 ? (
                              <option value="">No providers available</option>
                            ) : (
                              <>
                                <option value="">&mdash; None &mdash;</option>
                                {providers.map((provider) => (
                                  <option key={provider.id} value={provider.id}>
                                    {provider.name}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            value={treatment.provider_units}
                            onChange={(e) =>
                              patchTreatment(treatment.row_id, {
                                provider_units: Number(e.target.value) || 1,
                              })
                            }
                            title="Captured here but not stored by the backend yet (gap APPT-PROC-2)"
                            className="w-12 rounded border border-[#CBD5E1] px-1.5 py-0.5 text-[11px] leading-tight focus:border-[#3A6EA5] focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          ${treatment.est_patient.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          ${treatment.est_insurance.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={treatment.fee}
                            onChange={(e) => {
                              const fee = Number(e.target.value) || 0;
                              patchTreatment(treatment.row_id, {
                                fee,
                                est_patient: Math.max(fee - treatment.est_insurance, 0),
                              });
                            }}
                            className="w-20 rounded border border-[#CBD5E1] px-1.5 py-0.5 text-right text-[11px] font-semibold leading-tight tabular-nums focus:border-[#3A6EA5] focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => handleDeleteTreatment(treatment.row_id)}
                            title="Remove this procedure"
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
                isLoading={isLoadingMetadata || isLoadingTreatmentPlans}
                patientId={patientNumericId}
                officeId={officeIdNum(currentOfficeId ?? currentOffice) ?? null}
                providers={providers}
                defaultProviderId={providerIdByName(formData.provider)}
                procedureCodes={safeProcedureCodes}
                feeContext={feeContext}
                onRefresh={reloadTreatmentPlans}
                providerLabel={providerNameById}
                onSelectProcedures={(procedures) => {
                  // Selected plan procedures become appointment procedure lines,
                  // carrying their plan link, tooth/surface and real estimates.
                  const newTreatments: Treatment[] = procedures.map((proc) => ({
                    row_id: newRowId(),
                    status: "TP",
                    procedure_code: proc.code,
                    tooth: proc.tooth || "",
                    surface: proc.surface || "",
                    description: proc.description,
                    bill_to: "Patient",
                    duration:
                      safeProcedureCodes.find((c) => c.code === proc.code)
                        ?.defaultDuration ?? 30,
                    provider_id: proc.diagnosedProvider || providerIdByName(formData.provider),
                    provider_units: 1,
                    est_patient: Math.max(proc.fee - proc.insuranceEstimate, 0),
                    est_insurance: proc.insuranceEstimate,
                    fee: proc.fee,
                    treatment_plan_id: proc.planId ?? null,
                  }));
                  setTreatments((prev) => [...prev, ...newTreatments]);
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
                <div className="grid grid-cols-3 gap-2 text-sm">
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
                </div>

                {/* ✅ STEP 4: Add Selected to Treatments Button */}
                {selectedProcedures.length > 0 && (
                  <div className="mt-3 flex items-center justify-between bg-[#E8F4F8] border-2 border-[#3A6EA5] rounded-lg p-3">
                    <span className="text-sm font-semibold text-[#1F3A5F]">
                      {selectedProcedures.length} procedure(s) selected
                    </span>
                    <button
                      onClick={async () => {
                        // Each line is priced against the patient's fee schedule
                        // (this used to invent a 30/70 patient/insurance split).
                        const picked = selectedProcedures;
                        setSelectedProcedures([]);
                        for (const proc of picked) {
                          await addProcedureLine(proc);
                        }
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
                                onClick={() => toggleProcedureSelection(proc)}
                                onDoubleClick={() => {
                                  setSelectedProcedureForAdd(proc);
                                  setShowAddProcedure(true);
                                }}
                                title="Click to select · double-click to add with tooth / surface details"
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
                  Total Est. Insurance:
                </span>
                <span className="ml-2 text-[#1F3A5F]">
                  ${totalEstInsurance.toFixed(2)}
                </span>
              </div>
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

        {/* ACTION BUTTONS
            Only wired actions are shown. Deletion lives on the scheduler grid's
            right-click menu (a real API call); the legacy in-form Insurance
            Verification / Change Provider / Post buttons were alert-only stubs
            and are tracked as frontend gaps (see docs/scheduler). */}
        <div className="flex justify-between pt-3 border-t-2 border-[#E2E8F0]">
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-5 py-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium text-sm"
            >
              BACK
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCalcTime}
              title="Set the appointment duration from the total of the planned procedures"
              className="bg-[#8B5CF6] text-white px-5 py-1.5 rounded-lg hover:bg-[#7C3AED] transition-colors font-medium text-sm"
            >
              Calc Time
            </button>
            <button
              onClick={handleSave}
              className="bg-[#3A6EA5] text-white px-6 py-1.5 rounded-lg hover:bg-[#1F3A5F] transition-colors font-medium shadow-md text-sm"
            >
              {editingAppointment ? "SAVE CHANGES" : "SAVE APPOINTMENT"}
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

      {/* Add Procedure -> appointment procedure line (never a ledger charge) */}
      {showAddProcedure && (
        <AppointmentProcedurePicker
          isOpen={showAddProcedure}
          onClose={() => {
            setShowAddProcedure(false);
            setSelectedProcedureForAdd(null);
          }}
          patientName={`${formData.firstName} ${formData.lastName}`.trim()}
          procedureCodes={safeProcedureCodes}
          categories={procedureCategories}
          providers={providers}
          defaultProviderId={providerIdByName(formData.provider)}
          feeContext={feeContext}
          defaultStatus={defaultLineStatus}
          initialCode={selectedProcedureForAdd}
          onAdd={(line) => setTreatments((prev) => [...prev, line])}
        />
      )}
    </>
  );
}