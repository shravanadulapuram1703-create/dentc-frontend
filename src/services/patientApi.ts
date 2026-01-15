import api from "./api";

// ===== TYPES =====
export interface Patient {
  id: number;
  chartNo: string;
  firstName: string;
  lastName: string;
  dob?: string; // YYYY-MM-DD format
  gender?: "M" | "F" | "O";
  phone?: string;
  email?: string;
  homeOfficeId?: number;
  createdAt?: string; // ISO 8601 format
  updatedAt?: string | null; // ISO 8601 format or null
}

export interface PatientCreateRequest {
  firstName: string;
  lastName: string;
  chartNo?: string; // Optional - auto-generated if not provided
  dob?: string; // YYYY-MM-DD format
  gender?: "M" | "F" | "O";
  phone?: string;
  email?: string;
  homeOfficeId?: number;
}

export interface PatientUpdateRequest {
  firstName?: string;
  lastName?: string;
  chartNo?: string;
  dob?: string;
  gender?: "M" | "F" | "O";
  phone?: string;
  email?: string;
  homeOfficeId?: number;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
}

// ===== API FUNCTIONS =====

/**
 * Create a new patient
 * Chart number is auto-generated if not provided
 */
export const createPatient = async (
  data: PatientCreateRequest
): Promise<Patient> => {
  const response = await api.post<Patient>("/api/v1/patients", data);
  return response.data;
};

/**
 * Get a list of patients with optional search and pagination
 * @param search - Optional search term (searches in first name, last name, chart number, phone, email)
 * @param limit - Maximum number of results (1-1000, default: 100)
 * @param offset - Number of results to skip for pagination (default: 0)
 */
export const getPatients = async (
  search?: string,
  limit?: number,
  offset?: number
): Promise<PatientListResponse> => {
  const params: Record<string, string> = {};
  
  if (search) {
    params.search = search;
  }
  
  if (limit !== undefined) {
    params.limit = limit.toString();
  }
  
  if (offset !== undefined) {
    params.offset = offset.toString();
  }

  const response = await api.get<PatientListResponse>("/api/v1/patients", {
    params,
  });
  
  return response.data;
};

/**
 * Get a single patient by ID
 */
export const getPatientById = async (patientId: number): Promise<Patient> => {
  const response = await api.get<Patient>(`/api/v1/patients/${patientId}`);
  return response.data;
};

/**
 * Get a patient by chart number
 */
export const getPatientByChartNo = async (chartNo: string): Promise<Patient> => {
  const response = await api.get<Patient>(`/api/v1/patients/chart/${chartNo}`);
  return response.data;
};

/**
 * Update an existing patient
 */
export const updatePatient = async (
  patientId: number,
  data: PatientUpdateRequest
): Promise<Patient> => {
  const response = await api.put<Patient>(`/api/v1/patients/${patientId}`, data);
  return response.data;
};

/**
 * Delete a patient
 */
export const deletePatient = async (patientId: number): Promise<void> => {
  await api.delete(`/api/v1/patients/${patientId}`);
};
