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
  listAppointments,
  getAppointment as getAppointmentApi,
  createAppointment as createAppointmentApi,
  updateAppointment as updateAppointmentApi,
  deleteAppointment as deleteAppointmentApi,
} from "@/api/generated/endpoints/appointments/appointments";
import {
  listOperatories,
  listProviders,
  getOffice,
} from "@/api/generated/endpoints/organization/organization";
import { listProcedureCodes } from "@/api/generated/endpoints/procedures/procedures";
import { listTreatmentPlans } from "@/api/generated/endpoints/treatment-plans/treatment-plans";
import { listDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import type { AppointmentRead } from "@/api/generated/model";

const PAGE = { size: 500 } as const;

/** "OFF-1" | "1" -> 1 (numeric office id the backend filters expect) */
const officeIdNum = (officeId?: string): number | undefined => {
  if (!officeId) return undefined;
  const m = String(officeId).match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
};

// ===== TYPES (unchanged public surface) =====
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
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
  patient_id: string;
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
  patient_id?: string;
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
  patientId: a.patient_id != null ? String(a.patient_id) : "",
  patientName:
    (a.patient_id != null && names?.patients?.get(a.patient_id)) ||
    (a.patient_id != null ? `Patient ${a.patient_id}` : ""),
  date: a.date,
  startTime: a.start_time,
  endTime: a.end_time,
  duration: a.duration,
  procedureType: a.procedure_label ?? "",
  status: (a.status as Appointment["status"]) ?? "Scheduled",
  operatory:
    (a.operatory_id != null &&
      (names?.operatories?.get(String(a.operatory_id)) ??
        String(a.operatory_id))) ||
    "",
  provider:
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
  campaign_id: a.campaign_id ?? undefined,
  treatment_plan_id: a.treatment_plan_id ?? undefined,
});

// ===== APPOINTMENTS =====

export const fetchAppointments = async (
  startDate: string,
  endDate?: string,
  officeId?: string,
): Promise<Appointment[]> => {
  const oid = officeIdNum(officeId);
  const [appts, providersRes, operatoriesRes] = await Promise.all([
    listAppointments({
      date_from: startDate,
      date_to: endDate ?? startDate,
      ...(oid != null ? { office_id: oid } : {}),
      ...PAGE,
    }),
    listProviders(PAGE).catch(() => null),
    listOperatories(PAGE).catch(() => null),
  ]);

  const providerNames = new Map<string, string>(
    (providersRes?.items ?? []).map((p): [string, string] => [
      String(p.id),
      p.name,
    ]),
  );
  const operatoryNames = new Map<string, string>(
    (operatoriesRes?.items ?? []).map((o): [string, string] => [
      String(o.id),
      o.name,
    ]),
  );

  return (appts.items ?? []).map((a) =>
    mapAppointment(a, {
      providers: providerNames,
      operatories: operatoryNames,
    }),
  );
};

export const fetchAppointment = async (id: string): Promise<Appointment> => {
  const a = await getAppointmentApi(id);
  return mapAppointment(a);
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
    patient_id: data.patient_id ?? data.patientId ?? null,
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
  return mapAppointment(created);
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

  const patch: Record<string, unknown> = {
    patient_id: data.patient_id ?? data.patientId,
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
  return mapAppointment(updated);
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await deleteAppointmentApi(id);
};

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment["status"],
): Promise<Appointment> => {
  const updated = await updateAppointmentApi(id, {
    status,
    is_missed: status === "Missed",
    is_cancelled: status === "Cancelled",
  } as any);
  return mapAppointment(updated);
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
    provider: "",
    office: o.office_id != null ? String(o.office_id) : "",
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
  }));
};

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
  return defs.map((d) => ({
    id: d.key1 ?? String(d.id),
    name: d.key1 ?? d.description,
    displayName: d.description,
  }));
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
