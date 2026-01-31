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

// Comprehensive patient details interface (for Patient Overview)
export interface PatientDetails {
  id: number;
  chart_no: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  dob?: string;
  gender?: "M" | "F" | "O";
  title?: string;
  pronouns?: string;
  marital_status?: string;
  guardian_name?: string; // May be at root level in API response
  guardian_phone?: string; // May be at root level in API response
  
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  contact?: {
    home_phone?: string;
    cell_phone?: string;
    work_phone?: string;
    email?: string;
    preferred_contact?: string;
  };
  
  office?: {
    home_office_id?: number;
    home_office_name?: string;
    home_office_code?: string;
  };
  
  provider?: {
    preferred_provider_id?: string;
    preferred_provider_name?: string;
    preferred_hygienist_id?: string;
    preferred_hygienist_name?: string;
  };
  
  fee_schedule?: {
    fee_schedule_id?: string;
    fee_schedule_name?: string;
  };
  
  patient_type?: string;
  patient_flags?: {
    is_active?: boolean;
    is_ortho?: boolean;
    is_child?: boolean;
    is_collection_problem?: boolean;
    is_employee_family?: boolean;
    is_short_notice?: boolean;
    is_senior?: boolean;
    is_spanish_speaking?: boolean;
    assign_benefits?: boolean;
    hipaa_agreement?: boolean;
    no_correspondence?: boolean;
    no_auto_email?: boolean;
    no_auto_sms?: boolean;
    add_to_quickfill?: boolean;
  };
  
  responsible_party?: {
    id?: string;
    name?: string;
    type?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    home_office?: string;
  };
  
  insurance?: {
    primary_dental?: any;
    secondary_dental?: any;
    primary_medical?: any;
    secondary_medical?: any;
  };
  
  account_members?: Array<{
    id: number;
    name: string;
    age: number;
    gender: string;
    next_visit?: string;
    recall?: string;
    last_visit?: string;
    is_active: boolean;
  }>;
  
  appointments?: Array<{
    id: string;
    date: string;
    time: string;
    office: string;
    operatory: string;
    procedure: string;
    provider: string;
    duration: number;
    status: string;
    last_updated: string;
    member: string;
  }>;
  
  recalls?: Array<{
    code: string;
    age_range: string;
    next_date: string;
    frequency: string;
  }>;
  
  balances?: {
    account_balance: number | string; // Backend may return string or number
    today_charges: number | string;
    today_est_insurance: number | string;
    today_est_patient: number | string;
    last_insurance_payment?: number | string | null;
    last_insurance_payment_date?: string | null;
    last_patient_payment?: number | string | null;
    last_patient_payment_date?: string | null;
    aging?: {
      current: number | string;
      over_30: number | string;
      over_60: number | string;
      over_90: number | string;
      over_120: number | string;
    };
  };
  
  clinical?: {
    first_visit?: string;
    last_visit?: string;
    next_visit?: string;
    next_recall?: string;
    last_pano_chart?: string;
    medical_alerts?: Array<{
      alert: string;
      date: string;
      entered_by: string;
    }>;
  };
  
  notes?: {
    patient_notes?: string;
    hipaa_sharing?: string;
  };
  
  referral?: {
    referral_type?: string;
    referred_by?: string;
    referred_to?: string;
    referral_to_date?: string;
  };
  
  guardian?: {
    guardian_name?: string;
    guardian_phone?: string;
  };
  
  preferences?: {
    preferred_language?: string;
    contact_preference?: string;
  };
  
  created_at?: string;
  updated_at?: string;
}

// Comprehensive patient create request (for AddNewPatient form)
export interface PatientCreateRequestFull {
  identity: {
    first_name: string;
    last_name: string;
    preferred_name?: string;
    dob: string; // YYYY-MM-DD
    gender?: "M" | "F" | "O";
    title?: string;
    pronouns?: string;
    marital_status?: string;
    ssn?: string; // Social Security Number (digits only, no dashes)
  };
  
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  contact?: {
    home_phone?: string;
    cell_phone?: string;
    work_phone?: string;
    email?: string;
    preferred_contact?: string;
  };
  
  office: {
    home_office_id: number;
  };
  
  provider?: {
    preferred_provider_id?: string;
    preferred_hygienist_id?: string;
  };
  
  fee_schedule?: {
    fee_schedule_id?: string;
  };
  
  patient_type?: string;
  patient_flags?: {
    is_ortho?: boolean;
    is_child?: boolean;
    is_collection_problem?: boolean;
    is_employee_family?: boolean;
    is_short_notice?: boolean;
    is_senior?: boolean;
    is_spanish_speaking?: boolean;
    assign_benefits?: boolean;
    hipaa_agreement?: boolean;
    no_correspondence?: boolean;
    no_auto_email?: boolean;
    no_auto_sms?: boolean;
    add_to_quickfill?: boolean;
  };
  
  responsible_party?: {
    relationship?: string;
    responsible_party_id?: string;
  };
  
  coverage?: {
    no_coverage?: boolean;
    primary_dental?: boolean;
    secondary_dental?: boolean;
    primary_medical?: boolean;
    secondary_medical?: boolean;
  };
  
  referral?: {
    referral_type?: string;
    referred_by?: string;
    referred_to?: string;
    referral_to_date?: string;
  };
  
  guardian?: {
    guardian_name?: string;
    guardian_phone?: string;
  };
  
  notes?: {
    patient_notes?: string;
    hipaa_sharing?: string;
  };
  
  starting_balances?: {
    current?: number;
    over_30?: number;
    over_60?: number;
    over_90?: number;
    over_120?: number;
  };
  
  patient_types?: string[]; // Array of patient type codes (e.g., ["CH", "OR"])
}

/**
 * Update Patient Request (Full) - Same structure as PatientCreateRequestFull
 * Used for updating existing patients with all fields
 */
export interface PatientUpdateRequestFull {
  identity?: {
    first_name?: string;
    last_name?: string;
    preferred_name?: string;
    dob?: string; // YYYY-MM-DD
    gender?: "M" | "F" | "O";
    title?: string;
    pronouns?: string;
    marital_status?: string;
    ssn?: string; // Social Security Number (digits only, no dashes)
  };
  
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  contact?: {
    home_phone?: string;
    cell_phone?: string;
    work_phone?: string;
    email?: string;
    preferred_contact?: string;
  };
  
  office?: {
    home_office_id?: number;
  };
  
  provider?: {
    preferred_provider_id?: string;
    preferred_hygienist_id?: string;
  };
  
  fee_schedule?: {
    fee_schedule_id?: string;
  };
  
  patient_type?: string;
  patient_flags?: {
    is_ortho?: boolean;
    is_child?: boolean;
    is_collection_problem?: boolean;
    is_employee_family?: boolean;
    is_short_notice?: boolean;
    is_senior?: boolean;
    is_spanish_speaking?: boolean;
    assign_benefits?: boolean;
    hipaa_agreement?: boolean;
    no_correspondence?: boolean;
    no_auto_email?: boolean;
    no_auto_sms?: boolean;
    add_to_quickfill?: boolean;
  };
  
  responsible_party?: {
    relationship?: string;
    responsible_party_id?: string;
  };
  
  coverage?: {
    no_coverage?: boolean;
    primary_dental?: boolean;
    secondary_dental?: boolean;
    primary_medical?: boolean;
    secondary_medical?: boolean;
  };
  
  referral?: {
    referral_type?: string;
    referred_by?: string;
    referred_to?: string;
    referral_to_date?: string;
  };
  
  guardian?: {
    guardian_name?: string;
    guardian_phone?: string;
  };
  
  notes?: {
    patient_notes?: string;
    hipaa_sharing?: string;
  };
  
  starting_balances?: {
    current?: number;
    over_30?: number;
    over_60?: number;
    over_90?: number;
    over_120?: number;
  };
  
  patient_types?: string[]; // Array of patient type codes (e.g., ["CH", "OR"])
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
}

// Advanced search parameters
export interface PatientSearchParams {
  searchBy?: string; // Field to search in (e.g., 'lastName', 'firstName', 'chartNumber', etc.)
  searchValue?: string; // The search term
  searchFor?: 'patient' | 'responsible'; // Search for patient or responsible party
  patientType?: 'both' | 'general' | 'ortho'; // Filter by patient type
  searchScope?: 'current' | 'all' | 'group'; // Search scope (current office, all offices, office group)
  includeInactive?: boolean; // Include inactive patients
  officeId?: string; // Current office ID for scope filtering
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
}

// ===== API FUNCTIONS =====

/**
 * Extract numeric office ID from office string or use directly if it's already an ID
 * Handles formats like: "Office Name [108]" -> 108, "OFF-1" -> 1, "1" -> 1
 */
const extractOfficeId = (officeStr: string | number | undefined): number | undefined => {
  if (!officeStr) return undefined;
  
  // If already a number, return as-is
  if (typeof officeStr === 'number') {
    return officeStr;
  }
  
  const officeStrValue = String(officeStr).trim();
  
  // If already just a number, return as-is
  if (/^\d+$/.test(officeStrValue)) {
    return parseInt(officeStrValue, 10);
  }
  
  // First, try to extract from brackets: "Office Name [108]" -> 108
  const bracketMatch = officeStrValue.match(/\[(\d+)\]/);
  if (bracketMatch && bracketMatch[1]) {
    return parseInt(bracketMatch[1], 10);
  }
  
  // Try to extract number from "OFF-{number}" format: "OFF-1" -> 1
  const offMatch = officeStrValue.match(/(?:OFF-|OFF\s*)(\d+)/i);
  if (offMatch && offMatch[1]) {
    return parseInt(offMatch[1], 10);
  }
  
  // Try to extract any trailing number: "Office Name 108" -> 108
  const trailingMatch = officeStrValue.match(/(\d+)$/);
  if (trailingMatch && trailingMatch[1]) {
    return parseInt(trailingMatch[1], 10);
  }
  
  return undefined;
};

/**
 * Create a new patient
 * Chart number is auto-generated if not provided
 * Transforms flat structure to nested structure expected by backend
 * Sends complete schema with null values for missing fields
 */
export const createPatient = async (
  data: PatientCreateRequest
): Promise<Patient> => {
  // Transform flat structure to nested structure expected by backend
  // Send complete schema structure even if values are null/undefined
  const payload: any = {
    identity: {
      first_name: data.firstName,
      last_name: data.lastName,
      preferred_name: null,
      dob: data.dob || null,
      gender: data.gender || null,
      title: null,
      pronouns: null,
      marital_status: null,
      ssn: null,
      medi_id: null,
    },
    address: {
      address_line_1: null,
      address_line_2: null,
      city: null,
      state: null,
      zip: null,
      country: "USA",
    },
    contact: {
      home_phone: null,
      cell_phone: data.phone ? data.phone.replace(/\D/g, '') : null, // Remove non-digits
      work_phone: null,
      email: data.email || null,
      preferred_contact: data.phone ? 'Cell' : null,
    },
    office: {
      home_office_id: (() => {
        if (!data.homeOfficeId) {
          throw new Error("home_office_id is required to create a patient");
        }
        return typeof data.homeOfficeId === 'number' 
          ? data.homeOfficeId 
          : parseInt(String(data.homeOfficeId), 10);
      })(),
    },
    provider: {
      preferred_provider_id: null,
      preferred_hygienist_id: null,
    },
    fee_schedule: {
      fee_schedule_id: null,
    },
    patient_type: "General",
    patient_flags: {
      is_ortho: false,
      is_child: false,
      is_collection_problem: false,
      is_employee_family: false,
      is_short_notice: false,
      is_senior: false,
      is_spanish_speaking: false,
      assign_benefits: true,
      hipaa_agreement: false,
      no_correspondence: false,
      no_auto_email: false,
      no_auto_sms: false,
      add_to_quickfill: false,
    },
    responsible_party: {
      _relationship: null,
      responsible_party_id: null,
    },
    coverage: {
      no_coverage: false,
      primary_dental: false,
      secondary_dental: false,
      primary_medical: false,
      secondary_medical: false,
    },
    referral: {
      referral_type: null,
      referred_by: null,
      referred_to: null,
      referral_to_date: null,
    },
    guardian: {
      guardian_name: null,
      guardian_phone: null,
    },
    notes: {
      patient_notes: null,
      hipaa_sharing: null,
    },
    starting_balances: {
      current: "0.00",
      over_30: "0.00",
      over_60: "0.00",
      over_90: "0.00",
      over_120: "0.00",
    },
  };

  const response = await api.post<Patient>("/api/v1/patients", payload);
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
 * Advanced patient search with field-specific search and filters
 * @param params - Search parameters including searchBy, searchValue, filters, etc.
 */
export const searchPatients = async (
  params: PatientSearchParams
): Promise<PatientListResponse> => {
  const queryParams: Record<string, string> = {};
  
  // Add search parameters
  if (params.searchBy && params.searchValue) {
    queryParams.search_by = params.searchBy;
    queryParams.search_value = params.searchValue;
  }
  
  // Add filters
  if (params.searchFor) {
    queryParams.search_for = params.searchFor;
  }
  
  if (params.patientType && params.patientType !== 'both') {
    queryParams.patient_type = params.patientType;
  }
  
  if (params.searchScope) {
    queryParams.search_scope = params.searchScope;
  }
  
  if (params.includeInactive !== undefined) {
    queryParams.include_inactive = params.includeInactive.toString();
  }
  
  if (params.officeId) {
    queryParams.office_id = params.officeId;
  }
  
  // Add pagination
  if (params.limit !== undefined) {
    queryParams.limit = params.limit.toString();
  }
  
  if (params.offset !== undefined) {
    queryParams.offset = params.offset.toString();
  }

  const response = await api.get<PatientListResponse>("/api/v1/patients/search", {
    params: queryParams,
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
  // Normalize chart number - remove "CH" prefix and any dashes if present
  // e.g., "CH014" -> "014", "CH-014" -> "014"
  let normalizedChartNo = chartNo.trim();
  if (normalizedChartNo.toUpperCase().startsWith('CH')) {
    normalizedChartNo = normalizedChartNo.substring(2).replace(/^-/, '').trim();
  }
  
  // Try with normalized chart number first
  try {
    const response = await api.get<Patient>(`/api/v1/patients/chart/${normalizedChartNo}`);
    return response.data;
  } catch (err: any) {
    // If normalized fails, try with original chart number
    if (normalizedChartNo !== chartNo) {
      try {
        const response = await api.get<Patient>(`/api/v1/patients/chart/${chartNo}`);
        return response.data;
      } catch (err2: any) {
        throw err; // Throw original error
      }
    }
    throw err;
  }
};

/**
 * Get comprehensive patient details (for Patient Overview screen)
 * @param patientId - Patient numeric ID or chart number (e.g., "123" or "CH014")
 */
export const getPatientDetails = async (patientId: string | number): Promise<PatientDetails> => {
  let numericId: number;
  
  // Check if patientId is a chart number (contains non-numeric characters)
  if (typeof patientId === 'string' && !/^\d+$/.test(patientId)) {
    // It's a chart number, first get the patient by chart number to retrieve the numeric ID
    try {
      const patient = await getPatientByChartNo(patientId);
      numericId = patient.id;
    } catch (err: any) {
      throw new Error(`Patient not found with chart number: ${patientId}. Please use the numeric patient ID.`);
    }
  } else {
    // It's a numeric ID
    numericId = typeof patientId === 'string' ? Number(patientId) : patientId;
    
    if (isNaN(numericId)) {
      throw new Error(`Invalid patient ID: ${patientId}. Expected numeric ID or chart number.`);
    }
  }
  
  const response = await api.get<PatientDetails>(`/api/v1/patients/${numericId}`);
  return response.data;
};

/**
 * Create a new patient with full details (for AddNewPatient form)
 */
export const createPatientFull = async (
  data: PatientCreateRequestFull
): Promise<PatientDetails> => {
  const response = await api.post<PatientDetails>("/api/v1/patients", data);
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
 * Update an existing patient with full details (for EditPatientModal)
 * @param patientId - Patient numeric ID
 * @param data - Full patient update request
 */
export const updatePatientFull = async (
  patientId: number | string,
  data: PatientUpdateRequestFull
): Promise<PatientDetails> => {
  // Convert to number - API expects numeric ID
  const numericId = typeof patientId === 'string' ? Number(patientId) : patientId;
  
  if (isNaN(numericId)) {
    throw new Error(`Invalid patient ID: ${patientId}. Expected numeric ID.`);
  }
  
  const response = await api.put<PatientDetails>(`/api/v1/patients/${numericId}`, data);
  return response.data;
};

/**
 * Delete a patient
 */
export const deletePatient = async (patientId: number): Promise<void> => {
  await api.delete(`/api/v1/patients/${patientId}`);
};
