/**
 * Which office a NEW record is stamped with — declared once per entity so
 * screens stop inventing their own source. Mirrors the "Write stamp" column of
 * the data-classification matrix in the office-scope plan.
 *
 *   working  — the office selected in the top bar (point-of-service day data)
 *   posting  — the patient shell's posting-office snapshot (home office until
 *              Phase 4 flips it to the working office at chart open)
 *   home     — the patient's `home_office_id` (ownership / contract records)
 *   record   — the row's own or parent's office (claim = first billable
 *              procedure, EOB line = its procedure, SMS reply = its thread)
 *   pick     — an explicit user field (Setup rows); nothing to resolve here
 */

export type StampSource = "working" | "posting" | "home" | "record" | "pick";

export const STAMP = {
  appointment: "working",
  appointment_from_request: "record",
  patient_create: "working",
  patient_edit: "home",
  responsible_party: "home",
  insurance_subscriber: "posting",
  procedure: "posting",
  payment: "posting",
  adjustment: "posting",
  refund: "posting",
  statement: "posting",
  plan_installment: "record",
  claim: "record",
  secondary_claim: "record",
  eob_line: "record",
  treatment_plan: "posting",
  progress_note: "posting",
  perio_exam: "posting",
  chart_condition: "posting",
  prescription: "posting",
  patient_note: "posting",
  document: "posting",
  image: "posting",
  recall: "posting",
  payment_plan: "home",
  ortho_plan: "home",
  ortho_created_office: "working",
  sms_existing_thread: "record",
  sms_new_thread: "working",
  email_new_thread: "working",
  letter_context: "working",
  time_clock: "working",
  utility_run: "working",
  lab_case: "record",
  fee_schedule: "pick",
  lab: "pick",
  referral: "pick",
} as const satisfies Record<string, StampSource>;

export type StampKind = keyof typeof STAMP;

export interface StampContext {
  /** Office selected in the top bar. */
  working_office_id: number | null;
  /** Patient shell snapshot (see usePatientOffice). */
  posting_office_id?: number | null;
  /** `patient.home_office_id`. */
  home_office_id?: number | null;
  /** The parent row's office for `record` stamps. */
  record_office_id?: number | null;
}

/** Resolve the office to stamp for `kind`, or null when nothing applies (caller decides). */
export function resolveStamp(kind: StampKind, ctx: StampContext): number | null {
  const source: StampSource = STAMP[kind];
  const working = ctx.working_office_id ?? null;
  const home = ctx.home_office_id ?? null;
  const posting = ctx.posting_office_id ?? home ?? working;
  switch (source) {
    case "working":
      return working;
    case "posting":
      return posting;
    case "home":
      return home;
    case "record":
      return ctx.record_office_id ?? posting;
    case "pick":
      return null;
  }
}
