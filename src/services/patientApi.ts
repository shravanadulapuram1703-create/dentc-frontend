import {
  createPatient as createPatientApi,
  updatePatient as updatePatientApi,
  getPatient,
  listPatients,
  listPatientInsurance,
  registerPatient as registerPatientApi,
  createPatientMedicalAlert,
  createPatientQuestionnaireResponse,
  setPatientOpeningBalance,
  createPatientRecall,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientInsuranceRead } from "@/api/generated/model";
import type {
  PatientCreate,
  PatientUpdate,
  PatientRead,
  RegisterRequest,
  RegisterResponse,
  PatientMedicalAlertCreate,
} from "@/api/generated/model";

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
  medicaid_id?: string; // Backend column for the UI's "Medi ID"
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
    /** The "Active" checkbox — must be sent or un-ticking it is silently ignored. */
    is_active?: boolean;
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

  // Visit history (captured on the wizard's Recall step).
  first_visit?: string;
  last_visit?: string;
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
    pronouns: (p as any).pronouns ?? undefined,
    marital_status: p.marital_status ?? undefined,
    medicaid_id: p.medicaid_id ?? undefined,
    patient_type: p.patient_type ?? undefined,
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
    office: {
      home_office_id: p.home_office_id ?? undefined,
      // LEG-16: the backend enriches these onto the response, but they are not
      // declared on `PatientRead` in the OpenAPI spec, so Orval does not type
      // them — read defensively and let callers fall back to an /offices lookup.
      home_office_name: (p as any).home_office_name ?? undefined,
      home_office_code: (p as any).home_office_code ?? undefined,
    },
    provider: {
      preferred_provider_id: p.preferred_provider_id ?? undefined,
      preferred_hygienist_id: (p as any).preferred_hygienist_id ?? undefined,
    },
    fee_schedule: (p as any).fee_schedule_id != null
      ? { fee_schedule_id: String((p as any).fee_schedule_id) }
      : undefined,
    patient_flags: {
      is_active: p.is_active,
      hipaa_agreement: p.hipaa_agreement ?? undefined,
      no_auto_email: p.no_auto_email ?? undefined,
      no_auto_sms: p.no_auto_sms ?? undefined,
      no_correspondence: (p as any).no_correspondence ?? undefined,
      assign_benefits: (p as any).assign_benefits ?? undefined,
      add_to_quickfill: (p as any).add_to_quickfill ?? undefined,
    },
    referral: {
      referral_type: (p as any).referral_type ?? undefined,
      referred_by: (p as any).referred_by ?? undefined,
      referred_to: (p as any).referred_to ?? undefined,
      referral_to_date: (p as any).referral_to_date ?? undefined,
    },
    responsible_party: {
      relationship: (p as any).responsible_party_relationship ?? undefined,
      id: (p as any).responsible_party_id ?? undefined,
    },
    notes: {
      patient_notes: (p as any).patient_notes ?? undefined,
      hipaa_sharing: (p as any).hipaa_sharing_notes ?? undefined,
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
  const rp = data.responsible_party ?? {};
  const fee = data.fee_schedule ?? {};
  const pick = (...vals: any[]) => vals.find((v) => v != null) ?? null;
  // fee_schedule_id is a numeric FK; tolerate a numeric string, else null.
  const feeScheduleId = (() => {
    const raw = pick(fee.fee_schedule_id, data.fee_schedule_id);
    if (raw == null) return null;
    const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : null;
  })();
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
    // UI label "Medi ID" → backend column `medicaid_id`. Accept the form's
    // `medi_id` alias as well as the canonical `medicaid_id`.
    medicaid_id: pick(id.medicaid_id, id.medi_id, data.medicaid_id, data.medi_id),
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
    preferred_hygienist_id: pick(prov.preferred_hygienist_id, data.preferred_hygienist_id),
    fee_schedule_id: feeScheduleId,
    referral_type: pick(ref.referral_type, data.referral_type),
    referred_by: pick(ref.referred_by, data.referred_by),
    referred_to: pick(ref.referred_to, data.referred_to),
    referral_to_date: pick(ref.referral_to_date, data.referral_to_date),
    guardian_name: pick(g.guardian_name, data.guardian_name),
    guardian_phone: pick(g.guardian_phone, data.guardian_phone),
    patient_notes: pick(notes.patient_notes, data.patient_notes),
    hipaa_sharing_notes: pick(notes.hipaa_sharing, notes.hipaa_sharing_notes, data.hipaa_sharing_notes),
    first_visit: pick(data.first_visit),
    last_visit: pick(data.last_visit),
    pronouns: pick(id.pronouns, data.pronouns),
    driver_license: pick(id.driver_license, data.driver_license),
    student_status: pick(id.student_status, data.student_status),
    school_name: pick(id.school_name, data.school_name),
    hipaa_agreement: pick(flags.hipaa_agreement, data.hipaa_agreement),
    no_auto_email: pick(flags.no_auto_email, data.no_auto_email),
    no_auto_sms: pick(flags.no_auto_sms, data.no_auto_sms),
    no_correspondence: pick(flags.no_correspondence, data.no_correspondence),
    assign_benefits: pick(flags.assign_benefits, data.assign_benefits),
    add_to_quickfill: pick(flags.add_to_quickfill, data.add_to_quickfill),
    // General/Ortho (and any single patient-type string) — backend `patient_type`.
    patient_type: pick(data.patient_type, id.patient_type),
    // Full set of patient-type codes (["CH","OR",…]) — backend JSON column.
    // Send null (not []) when none are selected: an empty array can trip
    // backends that treat the JSON column as non-empty/optional.
    patient_types: Array.isArray(data.patient_types) && data.patient_types.length > 0
      ? data.patient_types
      : null,
    responsible_party_relationship: pick(rp.relationship, data.responsible_party_relationship),
    responsible_party_id: pick(rp.responsible_party_id, data.responsible_party_id),
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
  await enrichDisplayNames(details, p);
  return details;
};

/**
 * Resolve the *_id fields the patient record stores into the display *_name
 * fields the Overview renders. Without this, Provider / Hygienist / Home Office /
 * Fee Schedule showed blank even though the ids were saved, because `PatientRead`
 * only carries ids (and `home_office_name` is not exposed — see LEG-16).
 *
 * Best-effort and non-blocking: any lookup that fails simply leaves that name
 * unset, and the lookups are cached by their own services.
 */
const enrichDisplayNames = async (details: PatientDetails, p: PatientRead): Promise<void> => {
  const providerId = p.preferred_provider_id ?? undefined;
  const hygienistId = (p as any).preferred_hygienist_id ?? undefined;
  const feeScheduleId = (p as any).fee_schedule_id ?? undefined;
  const officeId = p.home_office_id ?? undefined;

  await Promise.allSettled([
    // Providers are office-scoped; one call covers both provider and hygienist.
    (async () => {
      if (!providerId && !hygienistId) return;
      const { fetchProviders } = await import("./schedulerApi");
      const list = await fetchProviders(officeId != null ? String(officeId) : undefined);
      const byId = new Map(list.map((x) => [x.id, x.name]));
      if (details.provider) {
        if (providerId) details.provider.preferred_provider_name = byId.get(String(providerId));
        if (hygienistId) details.provider.preferred_hygienist_name = byId.get(String(hygienistId));
      }
    })(),
    (async () => {
      if (feeScheduleId == null) return;
      const { getFeeSchedules } = await import("@/api/feeSchedules");
      const res = await getFeeSchedules(officeId != null ? String(officeId) : undefined);
      const match = res.feeSchedules.find((f) => f.feeScheduleId === String(feeScheduleId));
      if (match) {
        details.fee_schedule = {
          fee_schedule_id: match.feeScheduleId,
          fee_schedule_name: match.feeScheduleName,
        };
      }
    })(),
    (async () => {
      // Prefer the (undeclared) enriched name; fall back to the offices lookup.
      if (details.office?.home_office_name || officeId == null) return;
      const { resolveOffice } = await import("./officeLookup");
      const office = await resolveOffice(String(officeId));
      if (office && details.office) {
        details.office.home_office_name = office.name;
        details.office.home_office_code = office.office_code ?? undefined;
      }
    })(),
  ]);
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
 * Public flattener: the nested wizard form payload → the backend's flat
 * `PatientCreate`, for embedding as `RegisterRequest.patient`.
 */
export const buildPatientCreate = (data: PatientCreateRequestFull): PatientCreate =>
  flattenPatientPayload(data);

/**
 * Atomic patient registration (GAP-AP-13/15/18). One transaction:
 * patient + responsible-party link + medical alerts + questionnaire responses
 * + recalls + opening balance. Any failure rolls the whole thing back.
 */
export const registerPatient = async (
  request: RegisterRequest,
): Promise<RegisterResponse> => {
  return registerPatientApi(request);
};

export interface ResilientRegisterResult {
  patient_id: number;
  chart_no?: string | null;
  /** Non-fatal issues (a sub-resource that failed to persist in the fallback path). */
  warnings: string[];
  /** True when the atomic /register endpoint failed and the chained fallback was used. */
  fellBack: boolean;
}

/**
 * Register a patient resiliently. Prefers the atomic `POST /patients/register`;
 * if that endpoint errors (e.g. the backend register handler is down), falls back
 * to the proven `POST /patients` plus best-effort persistence of each sub-section
 * through its own resource, so patient registration is never fully blocked by a
 * single endpoint. Sub-resource failures in the fallback are returned as warnings.
 */
export const registerPatientResilient = async (
  request: RegisterRequest,
): Promise<ResilientRegisterResult> => {
  try {
    const res = await registerPatientApi(request);
    return { patient_id: res.patient_id, chart_no: res.chart_no, warnings: [], fellBack: false };
  } catch (err) {
    // Fallback: create the patient row, then attach each sub-section individually.
    const created = await createPatientApi(request.patient);
    const patientId = created.id;
    const warnings: string[] = [];

    if (request.opening_balance) {
      try {
        await setPatientOpeningBalance(patientId, request.opening_balance);
      } catch {
        warnings.push("Opening balance could not be saved.");
      }
    }
    for (const alert of request.medical_alerts ?? []) {
      try {
        await createPatientMedicalAlert({
          patient_id: patientId,
          ...alert,
          // LEG-2 constrained `response` to yes|no|unknown; MedicalAlertIn still
          // types it as a plain string, so narrow it here.
          response: alert.response as PatientMedicalAlertCreate["response"],
        });
      } catch {
        warnings.push(`Medical alert "${alert.alert_code}" could not be saved.`);
      }
    }
    for (const answer of request.questionnaire_responses ?? []) {
      try {
        await createPatientQuestionnaireResponse({ patient_id: patientId, ...answer });
      } catch {
        warnings.push(`Questionnaire answer "${answer.question_code}" could not be saved.`);
      }
    }
    for (const recall of request.recalls ?? []) {
      try {
        await createPatientRecall({
          patient_id: patientId,
          recall_type: recall.recall_type,
          procedure_code: recall.procedure_code,
          due_date: recall.due_date,
          interval_months: recall.interval_months,
          office_id: recall.office_id,
          status: "Due",
          is_active: true,
        });
      } catch {
        warnings.push(`Recall "${recall.recall_type ?? recall.procedure_code}" could not be saved.`);
      }
    }
    console.warn("[registerPatientResilient] /patients/register failed; used fallback.", err);
    return { patient_id: patientId, chart_no: created.chart_no, warnings, fellBack: true };
  }
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
