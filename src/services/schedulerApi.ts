import api from "./api";

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
  notes: string;
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

export interface AppointmentCreateRequest {
  patientId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // minutes
  procedureType: string;
  operatory: string;
  provider: string;
  notes?: string;
  status?: Appointment["status"];
}

export interface AppointmentUpdateRequest extends Partial<AppointmentCreateRequest> {
  id: string;
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
  // The API expects snake_case format as per APPOINTMENT_API_CONTRACTS.md
  // If data is in camelCase (old format), transform it
  // If data is already in snake_case or nested format (new format), send as-is
  const response = await api.post<{ appointment: Appointment }>("/api/v1/scheduler/appointments", data);
  return response.data.appointment;
};

/**
 * Update an existing appointment
 */
export const updateAppointment = async (
  data: AppointmentUpdateRequest
): Promise<Appointment> => {
  const { id, ...updateData } = data;
  const response = await api.put<{ appointment: Appointment }>(
    `/api/v1/scheduler/appointments/${id}`,
    updateData
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
  const response = await api.patch<{ appointment: Appointment }>(
    `/api/v1/scheduler/appointments/${id}/status`,
    { status }
  );
  return response.data.appointment;
};

/**
 * Fetch all operatories for an office
 * @param officeId - Optional office ID to filter by
 */
export const fetchOperatories = async (officeId?: string): Promise<Operatory[]> => {
  const params = officeId ? { office_id: officeId } : {};
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
  const params = officeId ? { office_id: officeId } : {};
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
  const params = officeId ? { office_id: officeId } : {};
  const response = await api.get<{ config: SchedulerConfig }>("/api/v1/scheduler/config", {
    params,
  });
  return response.data.config;
};
