// Appointment procedure lines (the TREATMENTS grid on Add / Edit Appointment).
//
// These persist to the real backend resource `/api/v1/appointment-procedures`
// (tag Appointments, full CRUD). Before this module the form built a
// `treatments` array and handed it to createAppointment/updateAppointment,
// which silently dropped it — every procedure added to an appointment was lost
// on save.
//
// Backend gaps (see docs/scheduler/add_edit_appointment_backend_devreport.md):
//   APPT-PROC-1  no `duration` column        → duration falls back to the
//                                              procedure code's default
//   APPT-PROC-2  no `provider_units` column  → always rendered as 1
//   APPT-PROC-3  no `bill_to` column         → always "Patient"
//   APPT-PROC-4  DELETE is a SOFT delete (sets is_archived) and the list
//                endpoint has no is_archived filter and returns archived rows,
//                so removed procedures reappear unless filtered client-side.

import {
  listAppointmentProcedures,
  createAppointmentProcedure,
  updateAppointmentProcedure,
  deleteAppointmentProcedure,
} from "@/api/generated/endpoints/appointments/appointments";
import type { AppointmentProcedureRead } from "@/api/generated/model";

const PAGE = { size: 200 } as const;

const num = (v: string | number | null | undefined): number => {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** One row of the TREATMENTS grid. snake_case to match the backend resource. */
export interface AppointmentProcedureLine {
  /** Stable client-side row key. */
  row_id: string;
  /** appointment_procedures.id once persisted; absent for unsaved rows. */
  backend_id?: number;
  status: string;
  procedure_code: string;
  tooth: string;
  surface: string;
  description: string;
  /** Not persisted — backend gap APPT-PROC-3. */
  bill_to: string;
  /** Not persisted — backend gap APPT-PROC-1. */
  duration: number;
  provider_id: string;
  /** Not persisted — backend gap APPT-PROC-2. */
  provider_units: number;
  est_patient: number;
  est_insurance: number;
  fee: number;
  /** Set when the line came from a treatment plan item. */
  treatment_plan_id?: string | null;
  notes?: string | null;
}

export const newRowId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const fromRead = (p: AppointmentProcedureRead): AppointmentProcedureLine => {
  const fee = num(p.fee);
  const est_insurance = num(p.insurance_estimate);
  return {
    row_id: `ap-${p.id}`,
    backend_id: p.id,
    status: p.status || "TP",
    procedure_code: p.procedure_code,
    tooth: p.tooth ?? "",
    surface: p.surface ?? "",
    description: p.description ?? "",
    bill_to: "Patient",
    duration: 0, // filled in by the caller from the procedure code default
    provider_id: p.provider_id ?? "",
    provider_units: 1,
    est_patient:
      p.est_patient != null ? num(p.est_patient) : Math.max(fee - est_insurance, 0),
    est_insurance,
    fee,
    treatment_plan_id: p.treatment_plan_id ?? null,
    notes: p.notes ?? null,
  };
};

/**
 * Every *live* procedure line attached to an appointment.
 *
 * DELETE only archives the row and the list endpoint takes no is_archived
 * filter (gap APPT-PROC-4), so deleted lines come back in the payload — they
 * are dropped here.
 */
export const loadAppointmentProcedures = async (
  appointmentId: string,
): Promise<AppointmentProcedureLine[]> => {
  const res = await listAppointmentProcedures({
    appointment_id: appointmentId,
    ...PAGE,
  }).catch(() => null);
  return (res?.items ?? []).filter((p) => !p.is_archived).map(fromRead);
};

const toBody = (appointmentId: string, line: AppointmentProcedureLine) => ({
  appointment_id: appointmentId,
  procedure_code: line.procedure_code,
  provider_id: line.provider_id || null,
  treatment_plan_id: line.treatment_plan_id || null,
  tooth: line.tooth || null,
  surface: line.surface || null,
  description: line.description || null,
  fee: line.fee,
  insurance_estimate: line.est_insurance,
  est_patient: line.est_patient,
  status: line.status || "TP",
  notes: line.notes || null,
});

const sameLine = (
  a: AppointmentProcedureLine,
  b: AppointmentProcedureLine,
): boolean =>
  a.procedure_code === b.procedure_code &&
  a.tooth === b.tooth &&
  a.surface === b.surface &&
  a.description === b.description &&
  a.status === b.status &&
  a.provider_id === b.provider_id &&
  a.fee === b.fee &&
  a.est_insurance === b.est_insurance &&
  a.est_patient === b.est_patient;

/**
 * Reconcile the grid against what the backend holds for this appointment:
 * create new rows, PATCH changed ones, DELETE rows the user removed.
 * Returns the persisted lines so the caller can adopt the backend ids.
 */
export const syncAppointmentProcedures = async (
  appointmentId: string,
  lines: AppointmentProcedureLine[],
): Promise<AppointmentProcedureLine[]> => {
  const existing = await loadAppointmentProcedures(appointmentId);
  const keptIds = new Set(
    lines.map((l) => l.backend_id).filter((id): id is number => id != null),
  );

  await Promise.all(
    existing
      .filter((e) => e.backend_id != null && !keptIds.has(e.backend_id))
      .map((e) => deleteAppointmentProcedure(e.backend_id as number)),
  );

  const byId = new Map(existing.map((e) => [e.backend_id, e]));
  const saved = await Promise.all(
    lines.map(async (line): Promise<AppointmentProcedureLine> => {
      if (line.backend_id != null) {
        const prev = byId.get(line.backend_id);
        if (prev && sameLine(prev, line)) return line;
        const updated = await updateAppointmentProcedure(
          line.backend_id,
          toBody(appointmentId, line),
        );
        return { ...fromRead(updated), duration: line.duration };
      }
      const created = await createAppointmentProcedure(toBody(appointmentId, line));
      return { ...fromRead(created), duration: line.duration };
    }),
  );
  return saved;
};
