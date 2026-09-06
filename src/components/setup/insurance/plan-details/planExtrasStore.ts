// Browser-side persistence for the INSURANCE DETAILS fields that have NO column
// on `insurance_plans` (Fees to Print, Claim Options, Form to Print, Reporting
// Subtype, Network Type, NOA Only, Per Visit Co-Pay, Lifetime Ortho Benefits,
// Plan Notes). Same pattern as the claim fill-out form: keyed by plan id, held
// in localStorage until the backend grows the columns (devreport PLAN-DTL-1).
//
// The wizard labels these plainly as "not yet stored on the server" rather than
// pretending they round-trip.

import { type PlanExtras, emptyPlanExtras, PLAN_EXTRA_KEYS } from "./planDetailsModel";

const PREFIX = "dentc:ins_plan_extras:";

function key(plan_id: number): string {
  return `${PREFIX}${plan_id}`;
}

export function loadPlanExtras(plan_id: number): PlanExtras {
  const base = emptyPlanExtras();
  try {
    const raw = localStorage.getItem(key(plan_id));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<keyof PlanExtras, unknown>>;
    const out: Record<keyof PlanExtras, string | boolean> = { ...base };
    for (const k of PLAN_EXTRA_KEYS) {
      const v = parsed[k];
      if (v === undefined || v === null) continue;
      out[k] = typeof base[k] === "boolean" ? !!v : String(v);
    }
    return out as PlanExtras;
  } catch {
    return base;
  }
}

export function savePlanExtras(plan_id: number, extras: PlanExtras): boolean {
  try {
    localStorage.setItem(key(plan_id), JSON.stringify(extras));
    return true;
  } catch {
    return false;
  }
}

export function removePlanExtras(plan_id: number): void {
  try {
    localStorage.removeItem(key(plan_id));
  } catch {
    // ignore
  }
}
