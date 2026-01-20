import api from "./api";

/**
 * Extract numeric office ID from office ID string
 * Examples: "OFF-1" -> "1", "1" -> "1", "OFF-123" -> "123"
 */
const extractOfficeIdNumber = (officeId?: string): string | undefined => {
  if (!officeId) return undefined;
  // If it's already just a number, return as-is
  if (/^\d+$/.test(officeId)) return officeId;
  // Extract number from "OFF-{number}" format
  const match = officeId.match(/(\d+)$/);
  return match ? match[1] : officeId;
};

// ===== TYPES =====
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO format: YYYY-MM-DD
  startTime: string; // Start time in "HH:MM" format
  endTime: string; // End time in "HH:MM" format
  duration: number; // Duration in minutes
  procedureType: string;
  status:
    | "Scheduled"
    | "Confirmed"
    | "Unconfirmed"
    | "Left Message"
    | "In Reception"
    | "Available"
    | "In Operatory"
    | "Checked Out"
    | "Missed"
    | "Cancelled";
  operatory: string;
  provider: string;
  notes?: string;
  
  // Lab information
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string; // YYYY-MM-DD
  lab_due_on?: string; // YYYY-MM-DD
  lab_recvd_on?: string; // YYYY-MM-DD
  
  // Flags
  missed?: boolean;
  cancelled?: boolean;
  
  // Additional fields
  campaign_id?: string;
  
  // Treatment plan linkage
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  
  // Treatments/Procedures
  treatments?: AppointmentTreatment[];
}

export interface Operatory {
  id: string;
  name: string;
  provider: string;
  office: string;
}

export interface Provider {
  id: string;
  name: string;
  office?: string;
}

export interface ProcedureType {
  id: string;
  name: string;
  color?: string;
}

export interface SchedulerConfig {
  startHour: number; // e.g., 8 for 8:00 AM
  endHour: number; // e.g., 17 for 5:00 PM
  slotInterval: number; // e.g., 10 for 10-minute intervals
}

export interface AppointmentTreatment {
  procedure_code: string;
  status: string; // 'TP' (Treatment Planned), 'C' (Completed), etc.
  tooth?: string;
  surface?: string;
  description: string;
  bill_to?: string; // 'Patient', 'Insurance', etc.
  duration: number; // minutes
  provider: string;
  provider_units?: number;
  est_patient?: number;
  est_insurance?: number;
  fee: number;
}

export interface AppointmentCreateRequest {
  patient_id: string; // Use patient_id for API (snake_case)
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (24-hour format)
  duration: number; // minutes
  procedure_type: string;
  operatory: string; // operatory ID
  provider: string; // provider name
  status?: Appointment["status"];
  notes?: string;
  
  // Lab information
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string; // YYYY-MM-DD
  lab_due_on?: string; // YYYY-MM-DD
  lab_recvd_on?: string; // YYYY-MM-DD
  
  // Flags
  missed?: boolean;
  cancelled?: boolean;
  
  // Additional fields
  campaign_id?: string;
  
  // Treatment plan linkage
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  
  // Treatments/Procedures (optional - can be saved separately)
  treatments?: AppointmentTreatment[];
}

export interface AppointmentUpdateRequest {
  id: string;
  patient_id?: string;
  date?: string;
  start_time?: string;
  duration?: number;
  procedure_type?: string;
  operatory?: string;
  provider?: string;
  status?: Appointment["status"];
  notes?: string;
  
  // Lab information
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string;
  lab_due_on?: string;
  lab_recvd_on?: string;
  
  // Flags
  missed?: boolean;
  cancelled?: boolean;
  
  // Additional fields
  campaign_id?: string;
  
  // Treatment plan linkage
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  
  // Treatments/Procedures
  treatments?: AppointmentTreatment[];
}

// ===== API FUNCTIONS =====

/**
 * Fetch appointments for a specific date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format (optional, defaults to startDate)
 * @param officeId - Optional office ID to filter by
 * @returns Array of appointments
 */
export const fetchAppointments = async (
  startDate: string,
  endDate?: string,
  officeId?: string
): Promise<Appointment[]> => {
  const params: Record<string, string> = {
    start_date: startDate,
  };
  
  if (endDate) {
    params.end_date = endDate;
  }
  
  if (officeId) {
    // params.office_id = extractOfficeIdNumber(officeId);
    params.office_id = officeId;
  }

  const response = await api.get<{ appointments: Appointment[] }>("/api/v1/scheduler/appointments", {
    params,
  });
  
  return response.data.appointments;
};

/**
 * Fetch a single appointment by ID
 */
export const fetchAppointment = async (id: string): Promise<Appointment> => {
  const response = await api.get<{ appointment: Appointment }>(`/api/v1/scheduler/appointments/${id}`);
  return response.data.appointment;
};

/**
 * Normalize status value to match SQL enum (title case)
 * Converts "MISSED" -> "Missed", "CANCELLED" -> "Cancelled"
 */
const normalizeStatus = (status: string | undefined): string | undefined => {
  if (!status) return status;
  const normalized = status.trim();
  if (normalized.toUpperCase() === "MISSED") return "Missed";
  if (normalized.toUpperCase() === "CANCELLED") return "Cancelled";
  return normalized;
};

/**
 * Create a new appointment
 * 
 * Accepts either:
 * 1. AppointmentCreateRequest (camelCase) - for backward compatibility
 * 2. New API format (snake_case) - matches APPOINTMENT_API_CONTRACTS.md
 *    - For existing patients: { patient_id, date, start_time, ... }
 *    - For new patients: { patient: {...}, appointment: {...} }
 */
export const createAppointment = async (
  data: AppointmentCreateRequest | any
): Promise<Appointment> => {
  // Normalize status to ensure it matches SQL enum (title case)
  const payload = { ...data };
  if (payload.status) {
    payload.status = normalizeStatus(payload.status);
  }
  
  // The API expects snake_case format as per APPOINTMENT_API_CONTRACTS.md
  // If data is in camelCase (old format), transform it
  // If data is already in snake_case or nested format (new format), send as-is
  const response = await api.post<{ appointment: Appointment }>("/api/v1/scheduler/appointments", payload);
  return response.data.appointment;
};

/**
 * Update an existing appointment with all details
 */
export const updateAppointment = async (
  data: AppointmentUpdateRequest | any
): Promise<Appointment> => {
  const { id, ...restData } = data;
  
  // Transform camelCase to snake_case if needed
  const payload: any = { ...restData };
  
  // Normalize status to ensure it matches SQL enum (title case)
  if (payload.status) {
    payload.status = normalizeStatus(payload.status);
  }
  
  // Transform fields (same as createAppointment)
  if (payload.patientId && !payload.patient_id) {
    payload.patient_id = payload.patientId;
    delete payload.patientId;
  }
  if (payload.startTime && !payload.start_time) {
    payload.start_time = payload.startTime;
    delete payload.startTime;
  }
  if (payload.procedureType && !payload.procedure_type) {
    payload.procedure_type = payload.procedureType;
    delete payload.procedureType;
  }
  if (payload.campaignId && !payload.campaign_id) {
    payload.campaign_id = payload.campaignId;
    delete payload.campaignId;
  }
  if (payload.treatmentPlanId && !payload.treatment_plan_id) {
    payload.treatment_plan_id = payload.treatmentPlanId;
    delete payload.treatmentPlanId;
  }
  if (payload.treatmentPlanPhaseId && !payload.treatment_plan_phase_id) {
    payload.treatment_plan_phase_id = payload.treatmentPlanPhaseId;
    delete payload.treatmentPlanPhaseId;
  }
  if (payload.labDDS && !payload.lab_dds) {
    payload.lab_dds = payload.labDDS;
    delete payload.labDDS;
  }
  if (payload.labCost !== undefined && payload.lab_cost === undefined) {
    payload.lab_cost = payload.labCost;
    delete payload.labCost;
  }
  if (payload.labSentOn && !payload.lab_sent_on) {
    payload.lab_sent_on = payload.labSentOn;
    delete payload.labSentOn;
  }
  if (payload.labDueOn && !payload.lab_due_on) {
    payload.lab_due_on = payload.labDueOn;
    delete payload.labDueOn;
  }
  if (payload.labRecvdOn && !payload.lab_recvd_on) {
    payload.lab_recvd_on = payload.labRecvdOn;
    delete payload.labRecvdOn;
  }
  
  // Transform treatments array if present
  if (payload.treatments && Array.isArray(payload.treatments)) {
    payload.treatments = payload.treatments.map((t: any) => ({
      procedure_code: t.procedure_code || t.code,
      status: t.status,
      tooth: t.tooth || t.th,
      surface: t.surface || t.surf,
      description: t.description,
      bill_to: t.bill_to || t.bill || 'Patient',
      duration: t.duration,
      provider: t.provider,
      provider_units: t.provider_units || t.providerUnits || 1,
      est_patient: t.est_patient || t.estPatient,
      est_insurance: t.est_insurance || t.estInsurance,
      fee: t.fee,
    }));
  }
  
  const response = await api.put<{ appointment: Appointment }>(
    `/api/v1/scheduler/appointments/${id}`,
    payload
  );
  return response.data.appointment;
};

/**
 * Delete an appointment
 */
export const deleteAppointment = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/scheduler/appointments/${id}`);
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (
  id: string,
  status: Appointment["status"]
): Promise<Appointment> => {
  // Normalize status to ensure it matches SQL enum (title case)
  const normalizedStatus = normalizeStatus(status);
  const response = await api.patch<{ appointment: Appointment }>(
    `/api/v1/scheduler/appointments/${id}/status`,
    { status: normalizedStatus }
  );
  return response.data.appointment;
};

/**
 * Fetch all operatories for an office
 * @param officeId - Optional office ID to filter by
 */
export const fetchOperatories = async (officeId?: string): Promise<Operatory[]> => {
  const params = officeId ? { office_id: extractOfficeIdNumber(officeId) } : {};
  const response = await api.get<{ operatories: Operatory[] }>("/api/v1/scheduler/operatories", {
    params,
  });
  return response.data.operatories;
};

/**
 * Fetch all providers
 * @param officeId - Optional office ID to filter by
 */
export const fetchProviders = async (officeId?: string): Promise<Provider[]> => {
  const params = officeId ? { office_id: extractOfficeIdNumber(officeId) } : {};
  const response = await api.get<{ providers: Provider[] }>("/api/v1/scheduler/providers", {
    params,
  });
  return response.data.providers;
};

/**
 * Fetch all procedure types
 */
export const fetchProcedureTypes = async (): Promise<ProcedureType[]> => {
  const response = await api.get<{ procedure_types: ProcedureType[] }>(
    "/api/v1/scheduler/procedure-types"
  );
  return response.data.procedure_types;
};

/**
 * Fetch scheduler configuration (time slots, etc.)
 */
export const fetchSchedulerConfig = async (officeId?: string): Promise<SchedulerConfig> => {
  const params = officeId ? { office_id: extractOfficeIdNumber(officeId) } : {};
  const response = await api.get<{ config: any }>("/api/v1/scheduler/config", {
    params,
  });
  const apiConfig = response.data.config;
  
  // Transform snake_case API response to camelCase
  return {
    startHour: apiConfig.start_hour ?? apiConfig.startHour,
    endHour: apiConfig.end_hour ?? apiConfig.endHour,
    slotInterval: apiConfig.slot_interval ?? apiConfig.slotInterval,
  };
};

// ===== ADDITIONAL METADATA TYPES =====

export interface AppointmentStatus {
  id: string;
  name: string;
  displayName: string;
  color?: string;
}

export interface AppointmentType {
  id: string;
  name: string;
  description?: string;
}

export interface ProcedureCode {
  code: string;
  userCode: string;
  description: string;
  category: string;
  requirements: {
    tooth?: boolean;
    surface?: boolean;
    quadrant?: boolean;
    materials?: boolean;
  };
  defaultFee: number;
  defaultDuration?: number;
}

export interface ProcedureCategory {
  id: string;
  name: string;
  displayName: string;
}

export interface TreatmentPlan {
  id: string;
  name: string;
  patientId: string;
  phases: TreatmentPlanPhase[];
  createdDate: string;
  status: "Active" | "Completed" | "Cancelled";
}

export interface TreatmentPlanPhase {
  id: string;
  name: string;
  procedures: TreatmentPlanProcedure[];
}

export interface TreatmentPlanProcedure {
  id: string;
  code: string;
  description: string;
  tooth?: string;
  surface?: string;
  diagnosedProvider: string;
  fee: number;
  insuranceEstimate: number;
  status: "Planned" | "Scheduled" | "Completed";
}

// ===== ADDITIONAL METADATA API FUNCTIONS =====

/**
 * Fetch all appointment status types
 */
export const fetchAppointmentStatuses = async (): Promise<AppointmentStatus[]> => {
  const response = await api.get<{ statuses: AppointmentStatus[] }>(
    "/api/v1/scheduler/appointment-statuses"
  );
  return response.data.statuses;
};

/**
 * Fetch all appointment types (if different from procedure types)
 */
export const fetchAppointmentTypes = async (): Promise<AppointmentType[]> => {
  const response = await api.get<{ appointment_types: AppointmentType[] }>(
    "/api/v1/scheduler/appointment-types"
  );
  return response.data.appointment_types;
};

/**
 * Fetch all procedure codes for Quick Add
 * @param category - Optional category filter
 * @param search - Optional search term (searches code, userCode, description)
 */
export const fetchProcedureCodes = async (
  category?: string,
  search?: string
): Promise<ProcedureCode[]> => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (search) params.search = search;

  const response = await api.get<{ procedure_codes?: ProcedureCode[]; procedureCodes?: any[] }>(
    "/api/v1/procedures/codes",
    { params }
  );
  
  // Handle both snake_case and camelCase response formats
  const rawCodes = response.data.procedure_codes || response.data.procedureCodes || [];
  
  // Transform snake_case API response to camelCase TypeScript interface
  return rawCodes.map((code: any) => ({
    code: code.code,
    userCode: code.user_code || code.userCode || "",
    description: code.description,
    category: code.category,
    requirements: {
      tooth: code.requirements?.tooth || false,
      surface: code.requirements?.surface || false,
      quadrant: code.requirements?.quadrant || false,
      materials: code.requirements?.materials || false,
    },
    defaultFee: code.default_fee || code.defaultFee || 0,
    defaultDuration: code.default_duration || code.defaultDuration,
  }));
};

/**
 * Fetch all procedure categories
 */
export const fetchProcedureCategories = async (): Promise<ProcedureCategory[]> => {
  const response = await api.get<{ categories: any[] }>(
    "/api/v1/procedures/categories"
  );
  
  const rawCategories = response.data.categories || [];
  
  // Transform snake_case API response to camelCase TypeScript interface
  return rawCategories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    displayName: cat.display_name || cat.displayName || cat.name,
  }));
};

/**
 * Fetch treatment plans for a patient
 * @param patientId - Patient ID
 */
export const fetchTreatmentPlans = async (patientId: string): Promise<TreatmentPlan[]> => {
  const response = await api.get<{ treatment_plans?: TreatmentPlan[]; treatmentPlans?: any[] }>(
    `/api/v1/patients/${patientId}/treatment-plans`
  );
  
  // Handle both snake_case and camelCase response formats
  const rawPlans = response.data.treatment_plans || response.data.treatmentPlans || [];
  
  // Transform API response (snake_case) to TypeScript interface (camelCase)
  return rawPlans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    patientId: plan.patient_id || plan.patientId,
    phases: (plan.phases || []).map((phase: any) => ({
      id: phase.id,
      name: phase.name,
      procedures: (phase.procedures || []).map((proc: any) => ({
        id: proc.id,
        code: proc.code,
        description: proc.description,
        tooth: proc.tooth || "",
        surface: proc.surface || "",
        diagnosedProvider: proc.diagnosed_provider || proc.diagnosedProvider || "",
        fee: proc.fee || 0,
        insuranceEstimate: proc.insurance_estimate || proc.insuranceEstimate || 0,
        status: proc.status || "Planned",
      })),
    })),
    createdDate: plan.created_date || plan.createdDate || new Date().toISOString(),
    status: plan.status || "Active",
  }));
};