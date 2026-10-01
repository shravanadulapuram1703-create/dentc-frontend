// LEGACY read fallback for the INSURANCE DETAILS fields that had NO column on
// `insurance_plans` until 2026-09 (Fees to Print, Claim Options, Form to Print,
// Reporting Subtype, Network Type, NOA Only, Per Visit Co-Pay, Lifetime Ortho
// Benefits, Plan Notes — devreport PLAN-DTL-1). They were kept per plan id in
// localStorage; now that the backend has the columns nothing is WRITTEN here
// any more. `loadPlanDetails` reads a stored entry once when the server row is
// still empty, and `savePlanDetails` removes it after the values land server-side.

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

/** True when this browser still holds a pre-column copy for the plan. */
export function hasLegacyPlanExtras(plan_id: number): boolean {
  try {
    return localStorage.getItem(key(plan_id)) != null;
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
