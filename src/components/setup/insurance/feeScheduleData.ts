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
  ins_plan_id: number | null;
  office_id: number | null;
  is_active: boolean;
}

export function emptyFeeScheduleForm(): FeeScheduleForm {
  return { name: "", fee_type: "", ins_plan_id: null, office_id: null, is_active: true };
}

export function feeScheduleToForm(f: FeeScheduleRead): FeeScheduleForm {
  return {
    name: f.name ?? "",
    fee_type: f.fee_type ?? "",
    ins_plan_id: f.ins_plan_id ?? null,
    office_id: f.office_id ?? null,
    is_active: f.is_active ?? true,
  };
}

function feeScheduleCommonBody(f: FeeScheduleForm) {
  return {
    name: f.name.trim(),
    fee_type: f.fee_type.trim() || null,
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
}

export function emptyEntryForm(effectiveDate = ""): EntryForm {
  return { procedure_code: "", patient_fee: "", insurance_fee: "", effective_date: effectiveDate };
}

export function entryToForm(e: FeeScheduleEntryRead): EntryForm {
  return {
    procedure_code: e.procedure_code ?? "",
    patient_fee: e.patient_fee ?? "",
    insurance_fee: e.insurance_fee ?? "",
    effective_date: e.effective_date ?? "",
  };
}

export function buildEntryCreate(feeScheduleId: number, f: EntryForm): FeeScheduleEntryCreate {
  return {
    fee_schedule_id: feeScheduleId,
    procedure_code: f.procedure_code.trim(),
    patient_fee: money(f.patient_fee),
    insurance_fee: money(f.insurance_fee),
    effective_date: f.effective_date.trim() || null,
  };
}

export function buildEntryUpdate(f: EntryForm): FeeScheduleEntryUpdate {
  return {
    procedure_code: f.procedure_code.trim(),
    patient_fee: money(f.patient_fee),
    insurance_fee: money(f.insurance_fee),
    effective_date: f.effective_date.trim() || null,
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
  specialty_id: string | null;
}

export function emptyAssignmentForm(): AssignmentForm {
  return {
    fee_schedule_id: null,
    carrier_id: null,
    ins_plan_id: null,
    provider_id: null,
    office_id: null,
    specialty_id: null,
  };
}

export function buildAssignmentCreate(f: AssignmentForm): FeeScheduleAssignmentCreate {
  return {
    fee_schedule_id: f.fee_schedule_id as number, // caller guards non-null
    carrier_id: f.carrier_id,
    ins_plan_id: f.ins_plan_id,
    provider_id: f.provider_id,
    office_id: f.office_id,
    specialty_id: f.specialty_id,
  };
}
