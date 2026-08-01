/**
 * Scheduler service — anti-corruption layer.
 *
 * Preserves the public interface the (large) Scheduler.tsx consumer expects,
 * but the legacy `/api/v1/scheduler/*` routes do not exist on this backend.
 * Internals now call the canonical generated resources:
 *   appointments  -> /appointments        operatories -> /operatories
 *   providers     -> /providers           procedure   -> /procedure-codes
 *   types/status  -> /definitions          plans       -> /treatment-plans
 *   config        -> /offices/{id} (schedule hours / slot interval)
 *
 * AppointmentRead has no denormalized patient/provider/operatory names, so the
 * read path enriches them from the providers/operatories/patients lists.
 */
import {
  listSchedulerAppointments,
  getAppointment as getAppointmentApi,
  createAppointment as createAppointmentApi,
  updateAppointment as updateAppointmentApi,
  updateAppointmentStatus as updateAppointmentStatusApi,
  deleteAppointment as deleteAppointmentApi,
  listAppointments,
  listAppointmentProcedures,
} from "@/api/generated/endpoints/appointments/appointments";
import {
  listOperatories,
  listProviders,
  getOffice,
} from "@/api/generated/endpoints/organization/organization";
import { listProcedureCodes } from "@/api/generated/endpoints/procedures/procedures";
import { listTreatmentPlans } from "@/api/generated/endpoints/treatment-plans/treatment-plans";
import { listDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import { getPatientBalance } from "@/api/generated/endpoints/billing/billing";
import {
  getPatient,
  getPatientContext,
  listPatientAlerts,
} from "@/api/generated/endpoints/patients/patients";
import type {
  AppointmentRead,
  AppointmentSchedulerRead,
  AppointmentProcedureRead,
  SchedulerPatientRead,
  PatientAlertRead,
  PatientBalance,
} from "@/api/generated/model";

// The backend caps `size` at 200 on every list endpoint (see Orval param models,
// e.g. ListProvidersParams `@maximum 200`). Sending more — `size: 500` was the
// cause of intermittent `GET /api/v1/providers -> 422` — fails validation.
const PAGE = { size: 200 } as const;

/** "OFF-1" | "1" -> 1 (numeric office id the backend filters expect).
 *  Exported so screens can scope their reference-data fetches to the
 *  selected office instead of loading every office's data. */
export const officeIdNum = (officeId?: string | number | null): number | undefined => {
  if (officeId == null || officeId === "") return undefined;
  const m = String(officeId).match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
};

/** Coerce any patient identifier the calendar may carry to the numeric
 *  patient_id the backend contract requires (number | null). Non-numeric
 *  sentinels like "NEW" or a chart_no ("CH-001") resolve to null rather than
 *  being forwarded as an invalid string that the API would 422 on — callers
 *  are responsible for passing the real numeric id (or creating the patient
 *  first and passing the returned id). */
const toPatientId = (value: unknown): number | null => {
  if (value == null || value === "" || value === "NEW") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// ===== TYPES =====
export type AppointmentStatusName =
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

/**
 * Scheduler read-model. Field names are snake_case to stay identical to the
 * backend (AppointmentRead), and the raw foreign-key ids are carried directly
 * (`patient_id`, `operatory_id`, `provider_id`) — binding to the ids, not
 * resolved names, is what lets the calendar columns/blocks match correctly.
 * The `*_name` fields are display-only enrichments (AppointmentRead has no
 * denormalized names) resolved from the providers/operatories/patients lists.
 */
export interface Appointment {
  id: string;
  patient_id: number | null;
  patient_name: string; // derived display name
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  procedure_label: string; // backend free-text procedure label
  status: AppointmentStatusName;
  operatory_id: string | null;
  operatory_name: string; // derived display name
  provider_id: string | null;
  provider_name: string; // derived display name
  notes?: string;
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string;
  lab_due_on?: string;
  lab_recvd_on?: string;
  missed?: boolean;
  cancelled?: boolean;
  is_new_patient?: boolean;
  is_blocked?: boolean;
  /** Server-owned status timestamps (set by PATCH /appointments/{id}/status). */
  confirmed_on?: string | null;
  checked_in_on?: string | null;
  checked_out_on?: string | null;
  campaign_id?: string;
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  treatments?: AppointmentTreatment[];
}

export interface Operatory {
  id: string;
  name: string;
  office: string;
  /** FK to providers (backend OperatoryRead.provider_id). Drives the
   *  operatory→provider auto-fill on the appointment forms. */
  provider_id: string | null;
}

export interface Provider {
  id: string;
  name: string;
  office?: string;
  /** Hex color set on the Provider Setup screen (ProviderRead.scheduler_color).
   *  Drives the provider's appointment color on the scheduler. */
  scheduler_color?: string | null;
  /** ProviderRead.role — e.g. "dentist" / "hygienist". Used to split the
   *  Preferred Provider vs Preferred Hygienist pickers. */
  role?: string;
  /** Display title (DMD/DDS…), handy for disambiguating duplicate names. */
  title?: string | null;
}

export interface ProcedureType {
  id: string;
  name: string;
  color?: string;
}

export interface SchedulerConfig {
  startHour: number;
  endHour: number;
  slotInterval: number;
}

export interface AppointmentTreatment {
  procedure_code: string;
  status: string;
  tooth?: string;
  surface?: string;
  description: string;
  bill_to?: string;
  duration: number;
  provider: string;
  provider_units?: number;
  est_patient?: number;
  est_insurance?: number;
  fee: number;
}

export interface AppointmentCreateRequest {
  /** Numeric patient_id per the backend contract (AppointmentCreate.patient_id
   *  is number | null). null is only valid for a not-yet-created patient — the
   *  caller must create the patient first and pass the returned numeric id. */
  patient_id: number | null;
  date: string;
  start_time: string;
  duration: number;
  procedure_type: string;
  operatory: string;
  provider: string;
  status?: Appointment["status"];
  notes?: string;
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string;
  lab_due_on?: string;
  lab_recvd_on?: string;
  missed?: boolean;
  cancelled?: boolean;
  campaign_id?: string;
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  treatments?: AppointmentTreatment[];
}

export interface AppointmentUpdateRequest {
  id: string;
  patient_id?: number | null;
  date?: string;
  start_time?: string;
  duration?: number;
  procedure_type?: string;
  operatory?: string;
  provider?: string;
  status?: Appointment["status"];
  notes?: string;
  lab?: boolean;
  lab_dds?: string;
  lab_cost?: number;
  lab_sent_on?: string;
  lab_due_on?: string;
  lab_recvd_on?: string;
  missed?: boolean;
  cancelled?: boolean;
  campaign_id?: string;
  treatment_plan_id?: string;
  treatment_plan_phase_id?: string;
  treatments?: AppointmentTreatment[];
}

// ===== HELPERS =====

const addMinutes = (hhmm: string, minutes: number): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + (minutes || 0);
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/** Find a list item whose id OR name matches the given value (calendar forms
 *  may carry either). */
const findByIdOrName = <T extends { id: string | number; name?: string | null }>(
  items: T[] | null | undefined,
  value: string | null | undefined,
): T | undefined => {
  if (value == null || value === "") return undefined;
  const v = String(value).trim();
  const list = items ?? [];
  return (
    list.find((i) => String(i.id) === v) ??
    list.find((i) => (i.name ?? "").trim().toLowerCase() === v.toLowerCase())
  );
};

/** Resolve a provider/operatory id from an id-or-name value; falls back to the
 *  raw value so the backend can still validate it. */
const resolveByIdOrName = (
  items: Array<{ id: string | number; name?: string | null }> | null | undefined,
  value: string | null | undefined,
): string | undefined => {
  const hit = findByIdOrName(items, value);
  if (hit) return String(hit.id);
  return value != null && value !== "" ? String(value) : undefined;
};

const newAppointmentId = (): string => {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `APPT-${uuid}`;
};

const mapAppointment = (
  a: AppointmentRead,
  names?: {
    patients?: Map<number, string>;
    providers?: Map<string, string>;
    operatories?: Map<string, string>;
  },
): Appointment => ({
  id: a.id,
  patient_id: a.patient_id ?? null,
  patient_name:
    (a.patient_id != null && names?.patients?.get(a.patient_id)) ||
    (a.patient_id != null ? `Patient ${a.patient_id}` : ""),
  date: a.date,
  start_time: a.start_time,
  end_time: a.end_time,
  duration: a.duration,
  procedure_label: a.procedure_label ?? "",
  status: (a.status as AppointmentStatusName) ?? "Scheduled",
  operatory_id: a.operatory_id != null ? String(a.operatory_id) : null,
  operatory_name:
    (a.operatory_id != null &&
      (names?.operatories?.get(String(a.operatory_id)) ??
        String(a.operatory_id))) ||
    "",
  provider_id: a.provider_id != null ? String(a.provider_id) : null,
  provider_name:
    (a.provider_id != null &&
      (names?.providers?.get(String(a.provider_id)) ??
        String(a.provider_id))) ||
    "",
  notes: a.notes ?? undefined,
  lab: a.has_lab ?? undefined,
  lab_cost: a.lab_cost != null ? Number(a.lab_cost) : undefined,
  lab_sent_on: a.lab_sent_on ?? undefined,
  lab_due_on: a.lab_due_on ?? undefined,
  lab_recvd_on: a.lab_received_on ?? undefined,
  missed: a.is_missed ?? undefined,
  cancelled: a.is_cancelled ?? undefined,
  is_new_patient: a.is_new_patient ?? undefined,
  is_blocked: a.is_blocked ?? undefined,
  confirmed_on: a.confirmed_on ?? null,
  checked_in_on: a.checked_in_on ?? null,
  checked_out_on: a.checked_out_on ?? null,
  campaign_id: a.campaign_id ?? undefined,
  treatment_plan_id: a.treatment_plan_id ?? undefined,
});

// ===== APPOINTMENTS =====

/** Resolve display names ("Last, First") for a set of patient ids. The backend
 *  does not denormalize the patient name onto AppointmentRead and offers no
 *  batch patient lookup, so this fans out getPatient per distinct id. Tracked
 *  as a backend gap (denormalized names / batch endpoint) in
 *  scheduler_backend_devreport.md. Failures degrade to "Patient <id>". */
const resolvePatientNames = async (
  ids: Array<number | null | undefined>,
): Promise<Map<number, string>> => {
  const unique = [
    ...new Set(ids.filter((n): n is number => typeof n === "number" && Number.isFinite(n))),
  ];
  const entries = await Promise.all(
    unique.map(async (id): Promise<[number, string]> => {
      try {
        const p = await getPatient(id);
        const name = `${p.last_name ?? ""}, ${p.first_name ?? ""}`
          .replace(/^,\s*|,\s*$/g, "")
          .trim();
        return [id, name || `Patient ${id}`];
      } catch {
        return [id, `Patient ${id}`];
      }
    }),
  );
  return new Map(entries);
};

/** id -> name map from a list endpoint result. */
const namesMap = (
  items: Array<{ id: string | number; name: string }> | null | undefined,
): Map<string, string> =>
  new Map((items ?? []).map((i): [string, string] => [String(i.id), i.name]));

export interface AppointmentFilters {
  status?: string;
  provider_id?: string;
  operatory_id?: string;
}

/** Map the denormalized scheduler feed row (names resolved server-side) to the
 *  view-model. No client-side name resolution needed → no N+1. */
const mapSchedulerAppointment = (a: AppointmentSchedulerRead): Appointment => ({
  id: a.id,
  patient_id: a.patient_id ?? null,
  patient_name:
    a.patient_name ?? (a.patient_id != null ? `Patient ${a.patient_id}` : ""),
  date: a.date,
  start_time: a.start_time,
  end_time: a.end_time,
  duration: a.duration,
  procedure_label: a.procedure_label ?? "",
  status: (a.status as AppointmentStatusName) ?? "Scheduled",
  operatory_id: a.operatory_id != null ? String(a.operatory_id) : null,
  operatory_name: a.operatory_name ?? "",
  provider_id: a.provider_id != null ? String(a.provider_id) : null,
  provider_name: a.provider_name ?? "",
  missed: a.is_missed ?? undefined,
  cancelled: a.is_cancelled ?? undefined,
  is_blocked: a.is_blocked ?? undefined,
  confirmed_on: a.confirmed_on ?? null,
  checked_in_on: a.checked_in_on ?? null,
  checked_out_on: a.checked_out_on ?? null,
});

export const fetchAppointments = async (
  startDate: string,
  endDate?: string,
  officeId?: string,
  filters?: AppointmentFilters,
): Promise<Appointment[]> => {
  const oid = officeIdNum(officeId);
  // Use the denormalized calendar feed: names resolved server-side (no N+1),
  // uncapped range (works for day/week/month). It only filters by date/office,
  // so status/provider/operatory filters are applied client-side below.
  const rows = await listSchedulerAppointments({
    date_from: startDate,
    date_to: endDate ?? startDate,
    ...(oid != null ? { office_id: oid } : {}),
  });

  let mapped = (rows ?? []).map(mapSchedulerAppointment);
  if (filters?.status)
    mapped = mapped.filter((a) => a.status === filters.status);
  if (filters?.provider_id)
    mapped = mapped.filter((a) => a.provider_id === filters.provider_id);
  if (filters?.operatory_id)
    mapped = mapped.filter((a) => a.operatory_id === filters.operatory_id);
  return mapped;
};

/** Map a single AppointmentRead to the view-model with real provider/operatory/
 *  patient names resolved (AppointmentRead carries only ids). Used by every
 *  single-appointment return so create/update/status results never leak ids
 *  or "Patient <id>" into the calendar/edit form. */
const enrichOne = async (a: AppointmentRead): Promise<Appointment> => {
  const [providersRes, operatoriesRes, patientNames] = await Promise.all([
    listProviders(PAGE).catch(() => null),
    listOperatories(PAGE).catch(() => null),
    resolvePatientNames([a.patient_id]),
  ]);
  return mapAppointment(a, {
    patients: patientNames,
    providers: namesMap(providersRes?.items),
    operatories: namesMap(operatoriesRes?.items),
  });
};

export const fetchAppointment = async (id: string): Promise<Appointment> => {
  return enrichOne(await getAppointmentApi(id));
};

export const createAppointment = async (
  data: AppointmentCreateRequest | any,
): Promise<Appointment> => {
  const startTime: string = data.start_time ?? data.startTime;
  const duration: number = Number(data.duration ?? 0);

  // AppointmentCreate requires id/provider_id/office_id/end_time. The calendar
  // may pass provider/operatory as ids OR names — resolve against the canonical
  // lists, and derive office_id from the chosen operatory when not provided.
  const [providersRes, operatoriesRes] = await Promise.all([
    listProviders(PAGE).catch(() => null),
    listOperatories(PAGE).catch(() => null),
  ]);
  const provider_id = resolveByIdOrName(
    providersRes?.items,
    data.provider_id ?? data.provider,
  );
  const op = findByIdOrName(operatoriesRes?.items, data.operatory_id ?? data.operatory);
  const operatory_id = op ? String(op.id) : (data.operatory_id ?? data.operatory ?? null);
  const office_id =
    officeIdNum(data.office_id ?? data.officeId) ?? op?.office_id ?? undefined;

  const created = await createAppointmentApi({
    id: data.id ?? newAppointmentId(),
    patient_id: toPatientId(data.patient_id ?? data.patientId),
    provider_id,
    operatory_id,
    office_id: office_id as number,
    date: data.date,
    start_time: startTime,
    end_time: data.end_time ?? addMinutes(startTime, duration),
    duration,
    status: data.status,
    procedure_label: data.procedure_type ?? data.procedureType ?? null,
    notes: data.notes ?? null,
    has_lab: data.lab ?? undefined,
    lab_cost: data.lab_cost ?? undefined,
    lab_sent_on: data.lab_sent_on ?? undefined,
    lab_due_on: data.lab_due_on ?? undefined,
    lab_received_on: data.lab_recvd_on ?? undefined,
    campaign_id: data.campaign_id ?? undefined,
    treatment_plan_id: data.treatment_plan_id ?? undefined,
  } as any);
  return enrichOne(created);
};

export const updateAppointment = async (
  data: AppointmentUpdateRequest | any,
): Promise<Appointment> => {
  const { id } = data;
  const startTime: string | undefined = data.start_time ?? data.startTime;
  const duration: number | undefined =
    data.duration != null ? Number(data.duration) : undefined;

  // Resolve provider/operatory (id or name) only when the edit touches them.
  let providerId = data.provider_id ?? data.provider;
  let operatoryId = data.operatory_id ?? data.operatory;
  if (providerId != null || operatoryId != null) {
    const [pRes, oRes] = await Promise.all([
      listProviders(PAGE).catch(() => null),
      listOperatories(PAGE).catch(() => null),
    ]);
    if (providerId != null) providerId = resolveByIdOrName(pRes?.items, providerId);
    if (operatoryId != null) {
      const opMatch = findByIdOrName(oRes?.items, operatoryId);
      operatoryId = opMatch ? String(opMatch.id) : operatoryId;
    }
  }

  const rawPatientId = data.patient_id ?? data.patientId;
  const patch: Record<string, unknown> = {
    patient_id: rawPatientId != null ? toPatientId(rawPatientId) : undefined,
    provider_id: providerId,
    operatory_id: operatoryId,
    date: data.date,
    start_time: startTime,
    end_time:
      data.end_time ??
      (startTime != null && duration != null
        ? addMinutes(startTime, duration)
        : undefined),
    duration,
    status: data.status,
    procedure_label: data.procedure_type ?? data.procedureType,
    notes: data.notes,
    has_lab: data.lab,
    lab_cost: data.lab_cost,
    lab_sent_on: data.lab_sent_on,
    lab_due_on: data.lab_due_on,
    lab_received_on: data.lab_recvd_on,
    is_missed: data.missed,
    is_cancelled: data.cancelled,
    campaign_id: data.campaign_id,
    treatment_plan_id: data.treatment_plan_id,
  };
  // Drop undefined keys so PATCH only touches provided fields.
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  const updated = await updateAppointmentApi(id, patch as any);
  return enrichOne(updated);
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await deleteAppointmentApi(id);
};

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment["status"],
): Promise<Appointment> => {
  // Status transitions are server-owned: PATCH /appointments/{id}/status stamps
  // confirmed_on/checked_in_on/checked_out_on and sets is_missed/is_cancelled,
  // and returns the denormalized row (names resolved). The client only sends the
  // status name (server normalizes it) — never timestamps.
  const updated = await updateAppointmentStatusApi(id, { status });
  return mapSchedulerAppointment(updated);
};

// ===== APPOINTMENT DETAILS (left-click pop-out) =====

/** A single procedure line attached to the appointment (shown in the details
 *  window's procedure grid and used to total the estimated patient portion). */
export interface AppointmentProcedureLine {
  id: number;
  tooth: string;
  procedure_code: string;
  description: string;
  fee: number;
  insurance_estimate: number;
  est_patient: number;
  status: string;
}

/** A related appointment row (upcoming for this patient, or same-day family). */
export interface RelatedAppointment {
  id: string;
  date: string;
  time: string;
  office: string;
  operatory_name: string;
  status: string;
  provider_name: string;
  duration: number;
  patient_name?: string;
}

/** A per-patient medical alert (the red-cross badge on the appointment). */
export interface PatientMedicalAlert {
  id: number;
  alert: string;
  blocks_charges: boolean;
}

/** A patient's computed account balance (drives the $ badge on the block and
 *  the balance line in the details pop-out). `balance` > 0 ⇒ money is owed. */
export interface PatientBalanceInfo {
  balance: number; // total account balance (charges − payments)
  patient_balance: number; // patient-responsibility portion
  insurance_balance: number; // outstanding expected-insurance portion
  total_charged: number;
  total_paid: number;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Map the typed PatientBalance (or the untyped context.balance dict, whose
 *  shape is identical) to the FE balance view-model. */
const mapPatientBalance = (
  b: PatientBalance | Record<string, unknown> | null | undefined,
): PatientBalanceInfo | null => {
  if (!b) return null;
  const src = b as Record<string, unknown>;
  return {
    balance: toNum(src.account_balance ?? src.balance),
    patient_balance: toNum(src.patient_balance),
    insurance_balance: toNum(src.insurance_balance),
    total_charged: toNum(src.total_charged),
    total_paid: toNum(src.total_paid),
  };
};

/**
 * Fully-hydrated appointment details for the left-click pop-out (PDF pages 6–7):
 * patient demographics + phones + current/preferred provider + responsible-party
 * type + preferred language; the appointment time/procedures/fees; created &
 * modified stamps; the status-timestamp grid; upcoming + same-day family
 * appointments; and the patient's medical alerts.
 */
export interface AppointmentDetails {
  appointment: Appointment;
  patient: SchedulerPatientRead | null;
  phones: { home: string; work: string; cell: string };
  provider_name: string;
  preferred_provider: string;
  responsible_party_type: string;
  preferred_language: string;
  procedures: AppointmentProcedureLine[];
  est_patient_total: number;
  fee_total: number;
  balance: PatientBalanceInfo | null;
  created_at?: string | null;
  updated_at?: string | null;
  upcoming: RelatedAppointment[];
  family: RelatedAppointment[];
  alerts: PatientMedicalAlert[];
}

const num = (v: string | number | null | undefined): number => {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const mapProcedureLine = (p: AppointmentProcedureRead): AppointmentProcedureLine => {
  const fee = num(p.fee);
  const ins = num(p.insurance_estimate);
  return {
    id: p.id,
    tooth: p.tooth ?? "",
    procedure_code: p.procedure_code,
    description: p.description ?? "",
    fee,
    insurance_estimate: ins,
    est_patient: Math.max(fee - ins, 0),
    status: p.status ?? "",
  };
};

/** Fetch everything the details pop-out needs, in parallel. Degrades field-by-
 *  field: a failed sub-fetch leaves that section empty rather than failing the
 *  whole window. */
export const fetchAppointmentDetails = async (
  appt: Appointment,
): Promise<AppointmentDetails> => {
  const today = appt.date;

  const [providersRes, operatoriesRes, proceduresRes, ctxRes, alertsRes, rawRes] =
    await Promise.all([
      listProviders(PAGE).catch(() => null),
      listOperatories(PAGE).catch(() => null),
      listAppointmentProcedures({ appointment_id: appt.id, ...PAGE }).catch(
        () => null,
      ),
      appt.patient_id != null
        ? getPatientContext(appt.patient_id).catch(() => null)
        : Promise.resolve(null),
      appt.patient_id != null
        ? listPatientAlerts({ patient_id: appt.patient_id, is_active: true, ...PAGE }).catch(
            () => null,
          )
        : Promise.resolve(null),
      getAppointmentApi(appt.id).catch(() => null),
    ]);

  const providerNames = namesMap(providersRes?.items);
  const operatoryNames = namesMap(operatoriesRes?.items);

  const procedures = (proceduresRes?.items ?? []).map(mapProcedureLine);
  const est_patient_total = procedures.reduce((s, p) => s + p.est_patient, 0);
  const fee_total = procedures.reduce((s, p) => s + p.fee, 0);

  const patient = ctxRes?.patient ?? null;
  const preferred_provider =
    (patient?.preferred_provider_id != null &&
      providerNames.get(String(patient.preferred_provider_id))) ||
    (patient?.preferred_provider_id ? String(patient.preferred_provider_id) : "");

  // Upcoming appointments for this patient (from today, ascending).
  let upcoming: RelatedAppointment[] = [];
  if (appt.patient_id != null) {
    const up = await listAppointments({
      patient_id: appt.patient_id,
      date_from: today,
      sort: "date",
      order: "asc",
      size: 25,
    }).catch(() => null);
    upcoming = (up?.items ?? [])
      .filter((a) => a.id !== appt.id && !a.is_cancelled)
      .map((a) => ({
        id: a.id,
        date: a.date,
        time: a.start_time,
        office: String(a.office_id ?? ""),
        operatory_name:
          (a.operatory_id != null && operatoryNames.get(String(a.operatory_id))) ||
          (a.operatory_id ? String(a.operatory_id) : ""),
        status: a.status,
        provider_name:
          (a.provider_id != null && providerNames.get(String(a.provider_id))) ||
          (a.provider_id ? String(a.provider_id) : ""),
        duration: a.duration,
      }));
  }

  return {
    appointment: appt,
    patient,
    phones: {
      home: patient?.phone ?? "",
      work: patient?.work_phone ?? "",
      cell: patient?.cell_phone ?? "",
    },
    provider_name: appt.provider_name,
    preferred_provider,
    responsible_party_type: patient?.patient_type ?? "",
    preferred_language: patient?.preferred_language ?? "",
    procedures,
    est_patient_total,
    fee_total,
    // The context aggregate already carries the balance — no extra call.
    balance: mapPatientBalance(ctxRes?.balance),
    created_at: rawRes?.created_at ?? null,
    updated_at: rawRes?.updated_at ?? null,
    upcoming,
    // Same-day family/account appointments require a responsible-party linkage
    // the backend does not expose on the feed — documented as a gap; left empty.
    family: [],
    alerts: (alertsRes?.items ?? []).map((a: PatientAlertRead) => ({
      id: a.id,
      alert: a.alert,
      blocks_charges: a.blocks_charges,
    })),
  };
};

/** Fetch just the patient's active medical alerts (red-cross badge / popover). */
export const fetchPatientAlerts = async (
  patientId: number | null | undefined,
): Promise<PatientMedicalAlert[]> => {
  if (patientId == null) return [];
  const res = await listPatientAlerts({
    patient_id: patientId,
    is_active: true,
    ...PAGE,
  }).catch(() => null);
  return (res?.items ?? []).map((a: PatientAlertRead) => ({
    id: a.id,
    alert: a.alert,
    blocks_charges: a.blocks_charges,
  }));
};

/** Fetch a patient's computed account balance (the $ badge on the block). Uses
 *  the dedicated cached-aggregate endpoint GET /patients/{id}/balance. */
export const fetchPatientBalance = async (
  patientId: number | null | undefined,
): Promise<PatientBalanceInfo | null> => {
  if (patientId == null) return null;
  const b = await getPatientBalance(patientId).catch(() => null);
  return mapPatientBalance(b);
};

// ===== REFERENCE DATA =====

export const fetchOperatories = async (
  officeId?: string,
): Promise<Operatory[]> => {
  const oid = officeIdNum(officeId);
  const res = await listOperatories({
    ...(oid != null ? { office_id: oid } : {}),
    ...PAGE,
  });
  return (res.items ?? []).map((o) => ({
    id: String(o.id),
    name: o.name,
    office: o.office_id != null ? String(o.office_id) : "",
    provider_id: o.provider_id ?? null,
  }));
};

export const fetchProviders = async (
  officeId?: string,
): Promise<Provider[]> => {
  const oid = officeIdNum(officeId);
  const res = await listProviders({
    ...(oid != null ? { office_id: oid } : {}),
    ...PAGE,
  });
  return (res.items ?? []).map((p) => ({
    id: String(p.id),
    name: p.name,
    office: p.office_id != null ? String(p.office_id) : undefined,
    scheduler_color: p.scheduler_color ?? null,
    role: p.role ?? undefined,
    title: p.title ?? null,
  }));
};

/** True when the provider's role marks them as a hygienist. */
export const isHygienist = (p: Provider): boolean => /hygien/i.test(p.role ?? "");

export const fetchSchedulerConfig = async (
  officeId?: string,
): Promise<SchedulerConfig> => {
  const oid = officeIdNum(officeId);
  if (oid == null) return { startHour: 8, endHour: 17, slotInterval: 10 };
  const office = await getOffice(oid);
  return {
    startHour: office.schedule_start_hour ?? 8,
    endHour: office.schedule_end_hour ?? 17,
    slotInterval: office.slot_interval_minutes ?? 10,
  };
};

// ===== METADATA =====

export interface AppointmentStatus {
  id: string;
  name: string;
  displayName: string;
  color?: string;
  sortOrder?: number;
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

/** Dropdown lookups now come from the shared `definitions` table. */
const definitionsAsList = async (groupCode: string) => {
  const res = await listDefinitions({
    group_code: groupCode,
    is_active: true,
    ...PAGE,
  }).catch(() => ({ items: [] }));
  return res.items ?? [];
};

export const fetchProcedureTypes = async (): Promise<ProcedureType[]> => {
  const defs = await definitionsAsList("procedure_type");
  return defs.map((d) => ({ id: d.key1 ?? String(d.id), name: d.description }));
};

export const fetchAppointmentStatuses = async (): Promise<
  AppointmentStatus[]
> => {
  const defs = await definitionsAsList("appt_status");
  return defs
    .map((d) => ({
      id: d.key1 ?? String(d.id),
      name: d.key1 ?? d.description,
      displayName: d.description,
      color: d.color ?? undefined,
      sortOrder: d.sort_order ?? undefined,
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
};

export const fetchAppointmentTypes = async (): Promise<AppointmentType[]> => {
  const defs = await definitionsAsList("appt_type");
  return defs.map((d) => ({
    id: d.key1 ?? String(d.id),
    name: d.description,
    description: d.description,
  }));
};

export const fetchProcedureCodes = async (
  category?: string,
  search?: string,
): Promise<ProcedureCode[]> => {
  const res = await listProcedureCodes({
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...PAGE,
  });
  return (res.items ?? []).map((c) => ({
    code: c.code,
    userCode: c.legacy_code ?? "",
    description: c.description ?? "",
    category: c.category ?? "",
    requirements: {
      tooth: c.requires_tooth ?? false,
      surface: c.requires_surface ?? false,
      quadrant: c.requires_quadrant ?? false,
      materials: false,
    },
    defaultFee: c.default_fee != null ? Number(c.default_fee) : 0,
    defaultDuration: c.default_duration_minutes ?? undefined,
  }));
};

export const fetchProcedureCategories = async (): Promise<
  ProcedureCategory[]
> => {
  // Distinct categories from procedure codes (no dedicated categories endpoint).
  const res = await listProcedureCodes(PAGE);
  const seen = new Set<string>();
  const cats: ProcedureCategory[] = [];
  for (const c of res.items ?? []) {
    const name = c.category;
    if (name && !seen.has(name)) {
      seen.add(name);
      cats.push({ id: name, name, displayName: name });
    }
  }
  return cats;
};

export const fetchTreatmentPlans = async (
  patientId: string,
): Promise<TreatmentPlan[]> => {
  const pid = Number(String(patientId).match(/(\d+)/)?.[1]);
  const res = await listTreatmentPlans({
    ...(Number.isFinite(pid) ? { patient_id: pid } : {}),
    ...PAGE,
  });
  // Phases/procedures live in /treatment-plan-items (compose as a follow-up).
  return (res.items ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    patientId: String(p.patient_id),
    phases: [],
    createdDate: p.created_at ?? "",
    status: (p.status as TreatmentPlan["status"]) ?? "Active",
  }));
};
