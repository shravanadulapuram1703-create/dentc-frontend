// Fee Schedule Setup + Assignments — form models.
//
// Forms bind DIRECTLY to the backend snake_case contract (CLAUDE.md) — no
// camelCase aliases, no mapper. Keys mirror FeeScheduleRead/Update,
// FeeScheduleEntryRead/Update and FeeScheduleAssignmentRead/Create exactly.

import type {
  FeeScheduleRead,
  FeeScheduleCreate,
  FeeScheduleUpdate,
  FeeScheduleEntryRead,
  FeeScheduleEntryCreate,
  FeeScheduleEntryUpdate,
  FeeScheduleAssignmentCreate,
  FeeScheduleAssignmentUpdate,
  FeeScheduleAssignmentRead,
} from "@/api/generated/model";

function money(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

// ---------------------------------------------------------------------------
// Fee schedule (master)
// ---------------------------------------------------------------------------

export interface FeeScheduleForm {
  name: string;
  fee_type: string;
  /** "percentage" | "copay" (docs/pricing §3.1). Copay only valid on plan/carrier types. */
  pricing_model: string;
  ins_plan_id: number | null;
  office_id: number | null;
  is_active: boolean;
}

export function emptyFeeScheduleForm(): FeeScheduleForm {
  return { name: "", fee_type: "", pricing_model: "percentage", ins_plan_id: null, office_id: null, is_active: true };
}

export function feeScheduleToForm(f: FeeScheduleRead): FeeScheduleForm {
  return {
    name: f.name ?? "",
    fee_type: f.fee_type ?? "",
    pricing_model: f.pricing_model ?? "percentage",
    ins_plan_id: f.ins_plan_id ?? null,
    office_id: f.office_id ?? null,
    is_active: f.is_active ?? true,
  };
}

function feeScheduleCommonBody(f: FeeScheduleForm) {
  return {
    name: f.name.trim(),
    fee_type: f.fee_type.trim() || null,
    pricing_model: f.pricing_model || "percentage",
    ins_plan_id: f.ins_plan_id,
    office_id: f.office_id,
    is_active: f.is_active,
  };
}

export function buildFeeScheduleCreate(f: FeeScheduleForm): FeeScheduleCreate {
  return { ...feeScheduleCommonBody(f) };
}

export function buildFeeScheduleUpdate(f: FeeScheduleForm): FeeScheduleUpdate {
  return { ...feeScheduleCommonBody(f) };
}

// ---------------------------------------------------------------------------
// Fee schedule entry (code → fees)
// ---------------------------------------------------------------------------

export interface EntryForm {
  procedure_code: string;
  patient_fee: string;
  insurance_fee: string;
  effective_date: string;
  /** Explicit "$0 is the real price" flag — distinguishes a true zero from a blank (docs/pricing §1.4). */
  is_no_charge: boolean;
}

export function emptyEntryForm(effectiveDate = ""): EntryForm {
  return { procedure_code: "", patient_fee: "", insurance_fee: "", effective_date: effectiveDate, is_no_charge: false };
}

export function entryToForm(e: FeeScheduleEntryRead): EntryForm {
  return {
    procedure_code: e.procedure_code ?? "",
    patient_fee: e.patient_fee ?? "",
    insurance_fee: e.insurance_fee ?? "",
    effective_date: e.effective_date ?? "",
    is_no_charge: e.is_no_charge ?? false,
  };
}

export function buildEntryCreate(feeScheduleId: number, f: EntryForm): FeeScheduleEntryCreate {
  return {
    fee_schedule_id: feeScheduleId,
    procedure_code: f.procedure_code.trim(),
    patient_fee: money(f.patient_fee),
    insurance_fee: money(f.insurance_fee),
    effective_date: f.effective_date.trim() || null,
    is_no_charge: f.is_no_charge,
  };
}

export function buildEntryUpdate(f: EntryForm): FeeScheduleEntryUpdate {
  return {
    procedure_code: f.procedure_code.trim(),
    patient_fee: money(f.patient_fee),
    insurance_fee: money(f.insurance_fee),
    effective_date: f.effective_date.trim() || null,
    is_no_charge: f.is_no_charge,
  };
}

// ---------------------------------------------------------------------------
// Fee schedule assignment (lineage: schedule → carrier/plan/provider/office)
// ---------------------------------------------------------------------------

export interface AssignmentForm {
  fee_schedule_id: number | null;
  carrier_id: number | null;
  ins_plan_id: number | null;
  provider_id: string | null;
  office_id: number | null;
  office_group_id: number | null;
  specialty_id: string | null;
}

export function emptyAssignmentForm(): AssignmentForm {
  return {
    fee_schedule_id: null,
    carrier_id: null,
    ins_plan_id: null,
    provider_id: null,
    office_id: null,
    office_group_id: null,
    specialty_id: null,
  };
}

export function assignmentToForm(a: FeeScheduleAssignmentRead): AssignmentForm {
  return {
    fee_schedule_id: a.fee_schedule_id ?? null,
    carrier_id: a.carrier_id ?? null,
    ins_plan_id: a.ins_plan_id ?? null,
    provider_id: a.provider_id ?? null,
    office_id: a.office_id ?? null,
    office_group_id: a.office_group_id ?? null,
    specialty_id: a.specialty_id ?? null,
  };
}

function assignmentCommonBody(f: AssignmentForm) {
  return {
    carrier_id: f.carrier_id,
    ins_plan_id: f.ins_plan_id,
    provider_id: f.provider_id,
    office_id: f.office_id,
    office_group_id: f.office_group_id,
    specialty_id: f.specialty_id,
  };
}

export function buildAssignmentCreate(f: AssignmentForm): FeeScheduleAssignmentCreate {
  return {
    fee_schedule_id: f.fee_schedule_id as number, // caller guards non-null
    ...assignmentCommonBody(f),
  };
}

export function buildAssignmentUpdate(f: AssignmentForm): FeeScheduleAssignmentUpdate {
  return {
    fee_schedule_id: f.fee_schedule_id,
    ...assignmentCommonBody(f),
  };
}

/** The rank tier a saved assignment resolves to (docs/pricing §1.4 — payer › provider). */
export function assignmentRankLabel(a: {
  ins_plan_id?: number | null;
  carrier_id?: number | null;
  provider_id?: string | null;
  specialty_id?: string | null;
}): string {
  if (a.ins_plan_id != null) return "Plan";
  if (a.carrier_id != null) return "Carrier";
  if (a.provider_id) return "Provider";
  if (a.specialty_id) return "Specialty";
  return "— (no target)";
}
