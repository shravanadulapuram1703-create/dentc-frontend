// Payment Plan data access — wraps the generated Orval client only (no raw
// axios) and passes snake_case bodies through unchanged.
//
// Resources used:
//   /ortho-plans                    → the Ortho Payment Plan record
//   /patient-payment-plans          → the Regular Payment Plan contract
//   /patient-ins-payment-plans      → primary-insurance periodic billing rows
//   /patient-sec-ins-payment-plans  → secondary-insurance periodic billing rows

import {
  listOrthoPlans,
  createOrthoPlan,
  updateOrthoPlan,
  deleteOrthoPlan,
  listPatientPaymentPlans,
  createPatientPaymentPlan,
  updatePatientPaymentPlan,
  deletePatientPaymentPlan,
  listPatientInsPaymentPlans,
  createPatientInsPaymentPlan,
  deletePatientInsPaymentPlan,
  listPatientSecInsPaymentPlans,
  createPatientSecInsPaymentPlan,
  deletePatientSecInsPaymentPlan,
  getPatientBalance,
} from "@/api/generated/endpoints/billing/billing";
import { listProviders, listOffices } from "@/api/generated/endpoints/organization/organization";
import { listTreatmentPlans } from "@/api/generated/endpoints/treatment-plans/treatment-plans";
import { listPatientInsurance } from "@/api/generated/endpoints/patients/patients";
import { getInsurancePlan, getInsuranceCarrier } from "@/api/generated/endpoints/insurance/insurance";
import { loadProcedureCodes } from "@/components/setup/insurance/procedureCodeService";
import type {
  OrthoPlanRead,
  OrthoPlanFullCreate,
  OrthoPlanFullUpdate,
  PatientPaymentPlanRead,
  PatientPaymentPlanCreate,
  PatientPaymentPlanUpdate,
  PatientInsPaymentPlanRead,
  PatientSecInsPaymentPlanRead,
  PatientBalance,
  ProviderRead,
  ProcedureCodeRead,
  TreatmentPlanRead,
  OfficeRead,
} from "@/api/generated/model";
import type { ScheduleRow } from "./planModel";

// ---------------------------------------------------------------------------
// Ortho plan
// ---------------------------------------------------------------------------

/**
 * The patient's current ortho plan, or null when none.
 *
 * DELETE /ortho-plans/{id} is a SOFT delete (204, sets is_active=false) and the
 * list endpoint returns soft-deleted rows even when `is_active=true` is passed
 * (gap PP-1), so inactive rows are filtered out client-side too — otherwise a
 * deleted contract reappears on the next load.
 */
export async function loadOrthoPlan(patient_id: number): Promise<OrthoPlanRead | null> {
  const res = await listOrthoPlans({ patient_id, is_active: true, size: 50 }).catch(() => ({
    items: [] as OrthoPlanRead[],
  }));
  return (res.items ?? []).find((p) => p.is_active !== false) ?? null;
}

export async function saveOrthoPlan(
  id: number | null,
  body: OrthoPlanFullCreate | OrthoPlanFullUpdate,
): Promise<OrthoPlanRead> {
  return id == null
    ? createOrthoPlan(body as OrthoPlanFullCreate)
    : updateOrthoPlan(id, body as OrthoPlanFullUpdate);
}

export async function removeOrthoPlan(id: number): Promise<void> {
  await deleteOrthoPlan(id);
}

// ---------------------------------------------------------------------------
// Regular plan
// ---------------------------------------------------------------------------

const is_ortho_type = (t?: string | null) => (t ?? "").trim().toLowerCase().startsWith("o");

/**
 * The patient's current regular contract. `/patient-payment-plans` also holds
 * ortho-typed rows for legacy accounts, so anything whose plan_type starts with
 * "o" is filtered out here. Soft-deleted rows are dropped for the same reason
 * as `loadOrthoPlan` (gap PP-1).
 */
export async function loadRegularPlan(patient_id: number): Promise<PatientPaymentPlanRead | null> {
  const res = await listPatientPaymentPlans({ patient_id, is_active: true, size: 50 }).catch(() => ({
    items: [] as PatientPaymentPlanRead[],
  }));
  return (
    (res.items ?? []).find((p) => p.is_active !== false && !is_ortho_type(p.plan_type)) ?? null
  );
}

export async function saveRegularPlan(
  id: number | null,
  body: PatientPaymentPlanCreate | PatientPaymentPlanUpdate,
): Promise<PatientPaymentPlanRead> {
  return id == null
    ? createPatientPaymentPlan(body as PatientPaymentPlanCreate)
    : updatePatientPaymentPlan(id, body as PatientPaymentPlanUpdate);
}

export async function removeRegularPlan(id: number): Promise<void> {
  await deletePatientPaymentPlan(id);
}

// ---------------------------------------------------------------------------
// Periodic insurance billing rows (the "BILLING DETAILS" / "UPDATE PERIODIC
// BILLING" actions on the two insurance columns of the ortho screen)
// ---------------------------------------------------------------------------

export type InsTier = "primary" | "secondary";

function to_schedule<T extends PatientInsPaymentPlanRead | PatientSecInsPaymentPlanRead>(
  rows: T[],
): ScheduleRow[] {
  return rows
    .slice()
    .sort((a, b) => (a.periodic_order ?? 0) - (b.periodic_order ?? 0))
    .map((r) => ({
      periodic_order: r.periodic_order ?? 0,
      periodic_date: (r.periodic_date ?? "").slice(0, 10),
      periodic_amt: Number(r.periodic_amt ?? 0),
      rem_payments: r.rem_payments ?? 0,
      rem_total_amt: Number(r.rem_total_amt ?? 0),
      is_billed: r.is_billed,
      billing_code: r.billing_code,
      ledger_id: r.ledger_id,
    }));
}

/** Persisted periodic billing rows for one insurance tier. */
export async function loadInsSchedule(patient_id: number, tier: InsTier): Promise<ScheduleRow[]> {
  if (tier === "primary") {
    const res = await listPatientInsPaymentPlans({ patient_id, size: 200 }).catch(() => ({
      items: [] as PatientInsPaymentPlanRead[],
    }));
    return to_schedule(res.items ?? []);
  }
  const res = await listPatientSecInsPaymentPlans({ patient_id, size: 200 }).catch(() => ({
    items: [] as PatientSecInsPaymentPlanRead[],
  }));
  return to_schedule(res.items ?? []);
}

export interface PeriodicRewriteInput {
  patient_id: number;
  tier: InsTier;
  legacy_plan_id: string | null;
  billing_code: string | null;
  plan_amount: number;
  down_payment: number;
  rows: ScheduleRow[];
}

/**
 * Regenerate a tier's periodic billing rows ("UPDATE PERIODIC BILLING").
 *
 * Already-billed instalments are preserved — the legacy screen only ever
 * rewrites the unbilled tail, so a mid-contract change of terms cannot
 * retroactively alter what was already posted to the ledger.
 * Returns the number of rows written and the number kept.
 */
export async function rewritePeriodicBilling(
  input: PeriodicRewriteInput,
): Promise<{ written: number; kept: number }> {
  const existing_raw =
    input.tier === "primary"
      ? (await listPatientInsPaymentPlans({ patient_id: input.patient_id, size: 200 })).items ?? []
      : (await listPatientSecInsPaymentPlans({ patient_id: input.patient_id, size: 200 })).items ?? [];

  const billed = existing_raw.filter((r) => r.is_billed);
  const unbilled = existing_raw.filter((r) => !r.is_billed);

  const del = input.tier === "primary" ? deletePatientInsPaymentPlan : deletePatientSecInsPaymentPlan;
  for (const row of unbilled) {
    await del(row.id);
  }

  const billed_orders = new Set(billed.map((r) => r.periodic_order ?? 0));
  const to_write = input.rows.filter((r) => !billed_orders.has(r.periodic_order));

  const create =
    input.tier === "primary" ? createPatientInsPaymentPlan : createPatientSecInsPaymentPlan;
  for (const row of to_write) {
    await create({
      patient_id: input.patient_id,
      legacy_plan_id: input.legacy_plan_id,
      periodic_order: row.periodic_order,
      periodic_date: row.periodic_date,
      periodic_amt: row.periodic_amt,
      plan_amount: input.plan_amount,
      down_payment: input.down_payment,
      rem_total_amt: row.rem_total_amt,
      rem_payments: row.rem_payments,
      is_billed: false,
      billing_code: input.billing_code,
    });
  }

  return { written: to_write.length, kept: billed.length };
}

// ---------------------------------------------------------------------------
// Screen context (lookups both screens need)
// ---------------------------------------------------------------------------

export interface InsuranceSlotOption {
  /** patient_insurance.ins_plan_id — what ortho_plans.ins_plan_id points at. */
  ins_plan_id: number;
  insurance_type: string;
  legacy_plan_type: string | null;
  label: string;
  ortho_remaining: string | null;
}

export interface PlanContext {
  treatment_plans: TreatmentPlanRead[];
  providers: ProviderRead[];
  /** D8xxx codes — the legacy Initial / Periodic billing-code pickers. */
  ortho_codes: ProcedureCodeRead[];
  insurance_slots: InsuranceSlotOption[];
  offices: OfficeRead[];
}

const ORTHO_CODE_RE = /^D8/i;

/**
 * Everything the two screens need beside the plan row itself: the treatment
 * plans (which drive "Treatment Plan Patient Balance for ID"), the provider
 * list, the ortho procedure codes, the patient's insurance slots and the office
 * table for the printed contract header.
 *
 * The account balance is deliberately NOT part of this call — a cold
 * `/patients/{id}/balance` takes ~23 s (gap PP-5) and would hold the whole
 * screen behind a spinner. Load it separately with `loadBalance`.
 *
 * Each lookup is independently fault-tolerant so one failing resource can't
 * blank the screen.
 */
export async function loadPlanContext(patient_id: number): Promise<PlanContext> {
  const [tx_plans, providers, code_map, ins_rows, offices] = await Promise.all([
    listTreatmentPlans({ patient_id, size: 200 })
      .then((r) => r.items ?? [])
      .catch(() => [] as TreatmentPlanRead[]),
    listProviders({ size: 200, is_active: true })
      .then((r) => r.items ?? [])
      .catch(() => [] as ProviderRead[]),
    loadProcedureCodes().catch(() => new Map<string, ProcedureCodeRead>()),
    listPatientInsurance({ patient_id, size: 50 })
      .then((r) => r.items ?? [])
      .catch(() => []),
    listOffices({ size: 200 })
      .then((r) => r.items ?? [])
      .catch(() => [] as OfficeRead[]),
  ]);

  const ortho_codes = [...code_map.values()]
    .filter((c) => ORTHO_CODE_RE.test(c.code))
    .sort((a, b) => a.code.localeCompare(b.code));

  // Resolve each insurance slot to a carrier/plan label for the picker.
  const insurance_slots = await Promise.all(
    ins_rows
      .filter((r) => r.is_active !== false && r.ins_plan_id != null)
      .map(async (r): Promise<InsuranceSlotOption> => {
        const tier = (r.insurance_type ?? "").replace(/_/g, " ");
        let label = `#${r.ins_plan_id}`;
        try {
          const plan = await getInsurancePlan(r.ins_plan_id!);
          const carrier = plan.carrier_id ? await getInsuranceCarrier(plan.carrier_id) : null;
          const parts = [carrier?.name, plan.group_number ? `Grp ${plan.group_number}` : null].filter(
            Boolean,
          );
          if (parts.length) label = parts.join(" — ");
        } catch {
          /* keep the id-only label */
        }
        return {
          ins_plan_id: r.ins_plan_id!,
          insurance_type: r.insurance_type,
          legacy_plan_type: r.legacy_plan_type ?? null,
          label: `${cap(tier)}: ${label}`,
          ortho_remaining: r.ortho_remaining ?? null,
        };
      }),
  );

  return { treatment_plans: tx_plans, providers, ortho_codes, insurance_slots, offices };
}

/**
 * The account balance, fetched on its own so a slow cold computation (gap PP-5)
 * never blocks the contract form from rendering. Resolves to null on failure.
 */
export async function loadBalance(patient_id: number): Promise<PatientBalance | null> {
  return getPatientBalance(patient_id).catch(() => null);
}

/** Office name + phone for the printed contract header. */
export function office_header(
  offices: OfficeRead[],
  office_id: number | null,
): { office_name: string; office_phone: string } {
  const office = offices.find((o) => o.id === office_id) ?? offices[0];
  return {
    office_name: office?.name ?? "",
    office_phone: office?.phone ?? office?.phone_2 ?? "",
  };
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Display label for a provider, legacy style: "736TC : Jinna, Dhileep DMD". */
export function provider_label(p: ProviderRead): string {
  const name =
    p.last_name || p.first_name
      ? [p.last_name, p.first_name].filter(Boolean).join(", ")
      : p.name;
  const suffix = p.title ? ` ${p.title}` : "";
  return `${p.short_id ?? p.legacy_id ?? p.id} : ${name}${suffix}`;
}
