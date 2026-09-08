// The one way to add a procedure, wherever the user is standing.
//
// A dental procedure has two lives in the backend:
//   planned   → a `treatment_plan_item` on one of the patient's treatment plans
//   completed → a `patient_procedure` (a charge on the ledger)
// and one link between them: the charge's `treatment_plan_id` (plan-level — the
// API has no item↔procedure foreign key, so an item and its charge are paired by
// plan + code + tooth + surface, see `procedureMatchKey`).
//
// The Transactions Entry page, the Account Ledger's Add Proc, the Restorative
// Chart (Completed / Tx Plans tabs + Post to Ledger) and the Treatment Plan page
// all go through `postCompletedProcedure` / `planProcedure` below, so:
//   • a charge posted anywhere carries the same fields (tooth, surface, hygienist,
//     fee split, apply_to) and shows on the chart as COMPLETED;
//   • a charge that fulfils an open planned item marks that item posted instead
//     of leaving a duplicate TX-PLAN row behind;
//   • a planned item added anywhere carries tooth/surface/diagnosed date so the
//     chart can draw it;
//   • every screen is told to refresh (`announceProcedureChange`).

import { createPatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import {
  createTreatmentPlan,
  createTreatmentPlanItem,
  listPatientTreatmentPlanItems,
  listTreatmentPlanItems,
  listTreatmentPlans,
  updateTreatmentPlanItem,
} from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import type {
  PatientProcedureCreate,
  PatientProcedureRead,
  TreatmentPlanItemCreate,
  TreatmentPlanItemCreateStatus,
  TreatmentPlanItemRead,
  TreatmentPlanRead,
} from '@/api/generated/model';
import { announceProcedureChange } from './procedureSync';

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Today's LOCAL date as YYYY-MM-DD (toISOString() is UTC and flips a day early in the evening). */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

// ---- Matching a planned item to the charge that completed it --------------

/** Surfaces as a canonical string: upper-case, letters sorted ("DOM" == "MOD"), '' when none. */
export function normalizeSurface(surface: string | null | undefined): string {
  return [...(surface ?? '').toUpperCase().replace(/[^A-Z]/g, '')].sort().join('');
}

export function normalizeTooth(tooth: string | number | null | undefined): string {
  return String(tooth ?? '').trim().toUpperCase();
}

/** Identity of a procedure for pairing plan items with charges: code + tooth + surface. */
export function procedureMatchKey(row: { procedure_code: string; tooth?: string | number | null; surface?: string | null }): string {
  return `${row.procedure_code.trim().toUpperCase()}|${normalizeTooth(row.tooth)}|${normalizeSurface(row.surface)}`;
}

/**
 * Keys of every charge that was posted from a treatment plan (optionally one plan).
 * Feed this to `isPlanItemPosted` to hide/flag the items those charges fulfilled.
 */
export function postedProcedureKeys(procedures: readonly PatientProcedureRead[], plan_id?: string | null): Set<string> {
  const keys = new Set<string>();
  for (const p of procedures) {
    if (p.is_void || !p.treatment_plan_id) continue;
    if (plan_id && p.treatment_plan_id !== plan_id) continue;
    keys.add(procedureMatchKey(p));
  }
  return keys;
}

/**
 * A planned item is "posted" (completed) when it was marked with an end date and a
 * charge linked to its plan exists for the same code/tooth/surface. Both halves
 * are required so an item merely edited with an end date, or a charge for a
 * duplicate item, does not hide the wrong row.
 */
export function isPlanItemPosted(item: TreatmentPlanItemRead, postedKeys: ReadonlySet<string>): boolean {
  return !!item.end_date && postedKeys.has(procedureMatchKey(item));
}

/** Items still open on a plan: not archived, not posted, not referred out. */
export function isPlanItemOpen(item: TreatmentPlanItemRead): boolean {
  return !item.is_archived && !item.end_date && !/referred/i.test(item.status ?? '');
}

// ---- Treatment plans ------------------------------------------------------

/** Active plan = highest by created_at (legacy "defaults to the highest treatment plan ID"). */
export function activeTreatmentPlan(plans: readonly TreatmentPlanRead[]): TreatmentPlanRead | null {
  if (!plans.length) return null;
  return [...plans].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id))[0] ?? null;
}

export async function loadPatientPlans(patient_id: number): Promise<TreatmentPlanRead[]> {
  const res = await listTreatmentPlans({ patient_id, size: 200 });
  return res.items ?? [];
}

/** Every plan item of the patient across all plans (patient endpoint, with a per-plan fallback). */
export async function loadPatientPlanItems(patient_id: number, plans?: readonly TreatmentPlanRead[]): Promise<TreatmentPlanItemRead[]> {
  try {
    const rows = await listPatientTreatmentPlanItems(patient_id);
    if (Array.isArray(rows)) return rows;
  } catch {
    /* endpoint not deployed on this backend — fall back to per-plan lists */
  }
  const planList = plans ?? (await loadPatientPlans(patient_id));
  const results = await Promise.all(planList.map((p) => listTreatmentPlanItems({ plan_id: p.id, size: 200 })));
  return results.flatMap((r) => r.items ?? []);
}

/**
 * Resolve the plan a new item belongs to: the given plan, else the patient's
 * active plan, else a freshly created "Treatment Plan 1".
 */
export async function ensureTreatmentPlan(args: {
  patient_id: number;
  office_id: number | null;
  plan_id?: string | null;
  plans?: readonly TreatmentPlanRead[];
  name?: string;
}): Promise<{ plan_id: string; created: boolean }> {
  if (args.plan_id) return { plan_id: args.plan_id, created: false };
  const plans = args.plans ?? (await loadPatientPlans(args.patient_id));
  const active = activeTreatmentPlan(plans);
  if (active) return { plan_id: active.id, created: false };
  const id = genId();
  await createTreatmentPlan({ id, patient_id: args.patient_id, office_id: args.office_id, name: args.name ?? 'Treatment Plan 1', status: 'active' });
  return { plan_id: id, created: true };
}

/**
 * Find the open planned item a new charge fulfils. Exact code+tooth+surface
 * first; then a planned item for the same code that was entered without a
 * tooth (legacy Treatment Plan entries) when the charge has one. Oldest wins.
 */
export async function findOpenPlanItem(
  patient_id: number,
  proc: { procedure_code: string; tooth?: string | null; surface?: string | null },
  items?: readonly TreatmentPlanItemRead[],
): Promise<TreatmentPlanItemRead | null> {
  const all = items ?? (await loadPatientPlanItems(patient_id));
  const open = all.filter(isPlanItemOpen).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const key = procedureMatchKey(proc);
  const exact = open.find((it) => procedureMatchKey(it) === key);
  if (exact) return exact;
  const code = proc.procedure_code.trim().toUpperCase();
  return open.find((it) => it.procedure_code.trim().toUpperCase() === code && !normalizeTooth(it.tooth) && !normalizeSurface(it.surface)) ?? null;
}

/** Mark a planned item as posted to the ledger (accepted, ended on the service date). */
export async function markPlanItemPosted(
  item: TreatmentPlanItemRead,
  args: { end_date: string; provider_id?: string | null; tooth?: string | null; surface?: string | null },
): Promise<TreatmentPlanItemRead> {
  return updateTreatmentPlanItem(item.id, {
    status: 'accepted',
    end_date: args.end_date,
    ...(args.provider_id ? { provider_id: args.provider_id, diagnosed_by: item.diagnosed_by ?? args.provider_id } : {}),
    // A tooth-less legacy entry adopts the tooth/surface it was completed on so
    // the chart can draw it and the pairing key matches from now on.
    ...(!normalizeTooth(item.tooth) && args.tooth ? { tooth: args.tooth } : {}),
    ...(!normalizeSurface(item.surface) && args.surface ? { surface: args.surface } : {}),
  });
}

// ---- Completed procedure (ledger charge) ----------------------------------

export interface CompletedProcedureInput {
  patient_id: number;
  office_id: number;
  procedure_code: string;
  /** Service / transaction date, YYYY-MM-DD. */
  date_of_service: string;
  provider_id: string;
  hygienist_id?: string | null;
  tooth?: string | null;
  surface?: string | null;
  quadrant?: string | null;
  fee: number | string;
  insurance_estimate?: number | string | null;
  patient_estimate?: number | string | null;
  ucr_fee?: number | string | null;
  material_id?: number | null;
  notes?: string | null;
  appointment_id?: string | null;
  /**
   * The planned item this charge completes. When omitted the patient's open plan
   * items are searched for a match (`findOpenPlanItem`); pass `null` with
   * `reconcile_plan: false` to post a stand-alone charge.
   */
  plan_item?: TreatmentPlanItemRead | null;
  /** Search the treatment plans for an item to complete (default true). */
  reconcile_plan?: boolean;
  /** Already-loaded plan items, to avoid a round trip. */
  plan_items?: readonly TreatmentPlanItemRead[];
  /** Notify every screen (default true). Turn off when batching; announce once at the end. */
  announce?: boolean;
}

export interface CompletedProcedureResult {
  procedure: PatientProcedureRead;
  /** The planned item this charge fulfilled, if any. */
  plan_item: TreatmentPlanItemRead | null;
  /** False when the charge posted but the plan item could not be marked (it stays open). */
  plan_item_marked: boolean;
}

/**
 * Post a completed procedure (a ledger charge). Links it to — and closes — the
 * planned item it fulfils, so the Treatment Plan shows it Completed and the
 * Restorative Chart swaps the red TX-PLAN glyph for the green COMPLETED one.
 */
export async function postCompletedProcedure(input: CompletedProcedureInput): Promise<CompletedProcedureResult> {
  if (!input.provider_id) throw new Error('A treating provider is required to post a procedure.');
  if (input.office_id == null) throw new Error('Missing office context for this patient.');

  let plan_item = input.plan_item ?? null;
  if (!plan_item && input.reconcile_plan !== false) {
    plan_item = await findOpenPlanItem(input.patient_id, input, input.plan_items).catch(() => null);
  }

  const fee = num(input.fee);
  const insurance_estimate = input.insurance_estimate != null ? num(input.insurance_estimate) : 0;
  const patient_estimate = input.patient_estimate != null ? num(input.patient_estimate) : Math.max(0, fee - insurance_estimate);

  const body: PatientProcedureCreate = {
    id: genId(),
    patient_id: input.patient_id,
    office_id: input.office_id,
    procedure_code: input.procedure_code,
    date_of_service: input.date_of_service,
    provider_id: input.provider_id,
    ...(input.hygienist_id ? { hygienist_id: input.hygienist_id } : {}),
    tooth: input.tooth || null,
    surface: input.surface || null,
    quadrant: input.quadrant || null,
    fee: fee.toFixed(2),
    insurance_estimate: insurance_estimate.toFixed(2),
    patient_estimate: patient_estimate.toFixed(2),
    ...(input.ucr_fee != null ? { ucr_fee: input.ucr_fee } : {}),
    ...(input.material_id != null ? { material_id: input.material_id } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.appointment_id ? { appointment_id: input.appointment_id } : {}),
    ...(plan_item ? { treatment_plan_id: plan_item.plan_id } : {}),
    apply_to: 'P',
  };

  const procedure = await createPatientProcedure(body);

  let plan_item_marked = false;
  if (plan_item) {
    try {
      plan_item = await markPlanItemPosted(plan_item, {
        end_date: input.date_of_service,
        provider_id: input.provider_id,
        tooth: input.tooth,
        surface: input.surface,
      });
      plan_item_marked = true;
    } catch (err) {
      // The charge exists; the item simply stays open. Never re-post to "fix" it.
      console.warn('Charge posted but the planned item could not be marked completed', err);
    }
  }

  if (input.announce !== false) {
    announceProcedureChange({ patient_id: input.patient_id, kinds: plan_item ? ['procedure', 'plan_item'] : ['procedure'] });
  }
  return { procedure, plan_item, plan_item_marked };
}

// ---- Planned procedure (treatment plan item) ------------------------------

export interface PlannedProcedureInput {
  patient_id: number;
  office_id: number | null;
  /** Target plan; omitted → the active plan, created if the patient has none. */
  plan_id?: string | null;
  /** Already-loaded plans (saves a round trip when `plan_id` is omitted). */
  plans?: readonly TreatmentPlanRead[];
  /** Name for a plan that has to be created. */
  plan_name?: string;
  procedure_code: string;
  description?: string | null;
  tooth?: string | null;
  surface?: string | null;
  fee: number | string;
  insurance_estimate?: number | string | null;
  discount?: number | string | null;
  /** Legacy Order ID. */
  priority?: number | null;
  /** Legacy Phase ID (also written to the `billing_order` stopgap). */
  phase_id?: number | null;
  provider_id?: string | null;
  diagnosed_date?: string | null;
  status?: TreatmentPlanItemCreateStatus;
  announce?: boolean;
}

export interface PlannedProcedureResult {
  item: TreatmentPlanItemRead;
  plan_id: string;
  /** True when a plan had to be created for this item. */
  created_plan: boolean;
}

/**
 * Add a procedure to a treatment plan. Carries tooth/surface/provider/dates so
 * the Treatment Plan page and the Restorative Chart both render it fully.
 */
export async function planProcedure(input: PlannedProcedureInput): Promise<PlannedProcedureResult> {
  const { plan_id, created } = await ensureTreatmentPlan({
    patient_id: input.patient_id,
    office_id: input.office_id,
    plan_id: input.plan_id,
    plans: input.plans,
    name: input.plan_name,
  });
  const priority = input.priority && input.priority > 0 ? input.priority : 1;
  const phase = input.phase_id && input.phase_id > 0 ? input.phase_id : 1;
  const provider = input.provider_id || null;

  const body: TreatmentPlanItemCreate = {
    id: genId(),
    plan_id,
    procedure_code: input.procedure_code,
    description: input.description ?? null,
    tooth: input.tooth || null,
    surface: input.surface || null,
    fee: num(input.fee).toFixed(2),
    insurance_estimate: num(input.insurance_estimate).toFixed(2),
    ...(input.discount != null ? { discount: input.discount } : {}),
    priority,
    phase_id: phase,
    billing_order: String(phase),
    status: input.status ?? 'diagnosed',
    // Dual-write: real provider_id + legacy diagnosed_by, which older rows/grids read.
    provider_id: provider,
    diagnosed_by: provider,
    diagnosed_date: input.diagnosed_date || todayIso(),
  };
  const item = await createTreatmentPlanItem(body);

  if (input.announce !== false) {
    announceProcedureChange({ patient_id: input.patient_id, kinds: created ? ['plan_item', 'plan'] : ['plan_item'] });
  }
  return { item, plan_id, created_plan: created };
}

/**
 * Post an already-planned item to the ledger (legacy "Post to Ledger"): the
 * charge inherits the item's code/tooth/surface/fee split and closes the item.
 */
export async function postPlanItemToLedger(args: {
  patient_id: number;
  office_id: number;
  item: TreatmentPlanItemRead;
  provider_id: string;
  date_of_service: string;
  hygienist_id?: string | null;
  announce?: boolean;
}): Promise<CompletedProcedureResult> {
  const { item } = args;
  return postCompletedProcedure({
    patient_id: args.patient_id,
    office_id: args.office_id,
    procedure_code: item.procedure_code,
    date_of_service: args.date_of_service,
    provider_id: args.provider_id,
    hygienist_id: args.hygienist_id,
    tooth: item.tooth,
    surface: item.surface,
    fee: item.fee,
    insurance_estimate: item.insurance_estimate,
    patient_estimate: Math.max(0, num(item.fee) - num(item.insurance_estimate)),
    plan_item: item,
    reconcile_plan: false,
    announce: args.announce,
  });
}
