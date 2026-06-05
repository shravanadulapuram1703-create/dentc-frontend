import {
  createPatient as createPatientApi,
  updatePatient as updatePatientApi,
  getPatient,
  listPatients,
  listPatientInsurance,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientInsuranceRead } from "@/api/generated/model";
import type { PatientCreate, PatientUpdate, PatientRead } from "@/api/generated/model";

// ===== TYPES =====
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

// ===== API FUNCTIONS =====

/**
 * Create a new patient
 * Chart number is auto-generated if not provided
 * Transforms flat structure to nested structure expected by backend
 * Sends complete schema with null values for missing fields
 */
/* =========================================================
   Mappers between the backend's flat PatientRead/PatientCreate
   and the UI's camelCase Patient / nested PatientDetails shapes.
========================================================= */

/** Flat backend PatientRead -> flat camelCase Patient. */
/** Flat backend PatientRead -> the UI's nested PatientDetails (partial). */
const toPatientDetails = (p: PatientRead): PatientDetails =>
  ({
    id: p.id,
    chart_no: p.chart_no ?? "",
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    preferred_name: p.preferred_name ?? undefined,
    dob: p.dob ?? undefined,
    gender: p.gender as PatientDetails["gender"],
    title: p.title ?? undefined,
    marital_status: p.marital_status ?? undefined,
    guardian_name: p.guardian_name ?? undefined,
    guardian_phone: p.guardian_phone ?? undefined,
    address: {
      address_line_1: p.address_line1 ?? undefined,
      address_line_2: p.address_line2 ?? undefined,
      city: p.city ?? undefined,
      state: p.state ?? undefined,
      zip: p.zip ?? undefined,
    },
    contact: {
      home_phone: p.phone ?? undefined,
      cell_phone: p.cell_phone ?? undefined,
      work_phone: p.work_phone ?? undefined,
      email: p.email ?? undefined,
      preferred_contact: p.preferred_contact ?? undefined,
    },
    office: { home_office_id: p.home_office_id ?? undefined },
    provider: { preferred_provider_id: p.preferred_provider_id ?? undefined },
    patient_flags: {
      is_active: p.is_active,
      hipaa_agreement: p.hipaa_agreement ?? undefined,
      no_auto_email: p.no_auto_email ?? undefined,
      no_auto_sms: p.no_auto_sms ?? undefined,
    },
    clinical: {
      first_visit: p.first_visit ?? undefined,
      last_visit: p.last_visit ?? undefined,
      next_recall: p.next_recall ?? undefined,
    },
    // insurance / responsible_party / appointments / recalls / balances are
    // separate resources — composed by their own screens, omitted here.
  }) as PatientDetails;

/**
 * Flatten the UI's nested patient form payload (identity/address/contact/...)
 * into the backend's flat PatientCreate/PatientUpdate. Tolerates already-flat
 * payloads too.
 */
const flattenPatientPayload = (data: any): PatientCreate => {
  const id = data.identity ?? {};
  const addr = data.address ?? {};
  const c = data.contact ?? {};
  const off = data.office ?? {};
  const prov = data.provider ?? {};
  const ref = data.referral ?? {};
  const g = data.guardian ?? {};
  const notes = data.notes ?? {};
  const flags = data.patient_flags ?? {};
  const pick = (...vals: any[]) => vals.find((v) => v != null) ?? null;
  return {
    home_office_id: pick(off.home_office_id, data.home_office_id),
    chart_no: pick(id.chart_no, data.chart_no),
    first_name: pick(id.first_name, data.first_name),
    last_name: pick(id.last_name, data.last_name),
    preferred_name: pick(id.preferred_name, data.preferred_name),
    title: pick(id.title, data.title),
    middle_initial: pick(id.middle_initial, data.middle_initial),
    dob: pick(id.dob, data.dob),
    gender: pick(id.gender, data.gender),
    ssn: pick(id.ssn, data.ssn),
    marital_status: pick(id.marital_status, data.marital_status),
    phone: pick(c.home_phone, data.phone),
    cell_phone: pick(c.cell_phone, data.cell_phone),
    work_phone: pick(c.work_phone, data.work_phone),
    email: pick(c.email, data.email),
    preferred_contact: pick(c.preferred_contact, data.preferred_contact),
    address_line1: pick(addr.address_line_1, data.address_line1),
    address_line2: pick(addr.address_line_2, data.address_line2),
    city: pick(addr.city, data.city),
    state: pick(addr.state, data.state),
    zip: pick(addr.zip, data.zip),
    preferred_provider_id: pick(prov.preferred_provider_id, data.preferred_provider_id),
    referral_type: pick(ref.referral_type, data.referral_type),
    referred_by: pick(ref.referred_by, data.referred_by),
    guardian_name: pick(g.guardian_name, data.guardian_name),
    guardian_phone: pick(g.guardian_phone, data.guardian_phone),
    patient_notes: pick(notes.patient_notes, data.patient_notes),
    hipaa_agreement: pick(flags.hipaa_agreement, data.hipaa_agreement),
    no_auto_email: pick(flags.no_auto_email, data.no_auto_email),
    no_auto_sms: pick(flags.no_auto_sms, data.no_auto_sms),
    is_active: pick(flags.is_active, data.is_active),
  } as PatientCreate;
};

/**
 * Get a patient by chart number
 */
export const getPatientByChartNo = async (chartNo: string): Promise<PatientRead> => {
  // Normalize chart number - remove "CH" prefix and any dashes if present
  // e.g., "CH014" -> "014", "CH-014" -> "014"
  let normalizedChartNo = chartNo.trim();
  if (normalizedChartNo.toUpperCase().startsWith("CH")) {
    normalizedChartNo = normalizedChartNo.substring(2).replace(/^-/, "").trim();
  }

  // Exact-match lookup via the canonical list endpoint's chart_no filter.
  const res = await listPatients({ chart_no: normalizedChartNo, size: 1 });
  const first = res.items[0];
  if (!first) {
    throw new Error(`Patient not found with chart number: ${chartNo}`);
  }
  return first;
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
    } catch {
      throw new Error(`Patient not found with chart number: ${patientId}. Please use the numeric patient ID.`);
    }
  } else {
    // It's a numeric ID
    numericId = typeof patientId === 'string' ? Number(patientId) : patientId;
    
    if (isNaN(numericId)) {
      throw new Error(`Invalid patient ID: ${patientId}. Expected numeric ID or chart number.`);
    }
  }
  
  const [p, insRes] = await Promise.all([
    getPatient(numericId),
    listPatientInsurance({ patient_id: numericId, size: 50 }).catch(() => null),
  ]);
  const details = toPatientDetails(p);
  details.insurance = mapInsurance(insRes?.items ?? []);
  return details;
};

/**
 * Group the patient's insurance records into the UI's
 * { primary_dental, secondary_dental, primary_medical, secondary_medical } shape.
 * No explicit primary/secondary flag exists on the record, so the first active
 * record of each type is treated as primary, the second as secondary.
 * (Responsible-party / guarantor has no backend resource — left undefined.)
 */
const mapInsurance = (
  records: PatientInsuranceRead[],
): PatientDetails["insurance"] => {
  const active = records.filter((r) => r.is_active !== false);
  const isDental = (t?: string | null) => /dent|^d$/i.test(t ?? "");
  const isMedical = (t?: string | null) => /med|^m$/i.test(t ?? "");
  const dental = active.filter((r) => isDental(r.insurance_type));
  const medical = active.filter((r) => isMedical(r.insurance_type));
  return {
    primary_dental: dental[0] ?? null,
    secondary_dental: dental[1] ?? null,
    primary_medical: medical[0] ?? null,
    secondary_medical: medical[1] ?? null,
  };
};

/**
 * Create a new patient with full details (for AddNewPatient form).
 * Flattens the nested form payload to the backend's flat PatientCreate.
 */
export const createPatientFull = async (
  data: PatientCreateRequestFull
): Promise<PatientDetails> => {
  const created = await createPatientApi(flattenPatientPayload(data));
  return toPatientDetails(created);
};

/**
 * Update an existing patient with full details (for EditPatientModal).
 * Flattens the nested form payload and PATCHes the canonical resource.
 */
export const updatePatientFull = async (
  patientId: number | string,
  data: PatientUpdateRequestFull
): Promise<PatientDetails> => {
  const numericId = typeof patientId === "string" ? Number(patientId) : patientId;
  if (isNaN(numericId)) {
    throw new Error(`Invalid patient ID: ${patientId}. Expected numeric ID.`);
  }
  const updated = await updatePatientApi(
    numericId,
    flattenPatientPayload(data) as PatientUpdate,
  );
  return toPatientDetails(updated);
};
