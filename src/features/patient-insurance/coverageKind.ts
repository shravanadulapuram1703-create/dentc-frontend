// Insured vs Cash-Pay — drives the scheduler block's insurance badge.
//
// The scheduler feed's `insurance_eligibility` cannot answer this on its own:
// the backend leaves it null both for a patient with no coverage AND for one
// whose subscriber row has no `elig_status` (gap SCHED-INS-1), so the badge
// reads the patient's active patient_insurance rows directly.

import { listPatientInsurance } from "@/api/generated/endpoints/patients/patients";

export interface PatientCoverage {
  /** "insurance" = at least one active DENTAL plan; otherwise cash-pay. */
  kind: "insurance" | "cash";
  /** Active dental ranks on file, e.g. ["primary", "secondary"]. */
  dental_ranks: string[];
  /** True when a medical plan is on file (shown in the tooltip only). */
  has_medical: boolean;
}

const RANK_ORDER = ["primary", "secondary", "tertiary", "quaternary"];

export async function fetchPatientCoverage(patient_id: number): Promise<PatientCoverage> {
  const res = await listPatientInsurance({ patient_id, is_active: true, size: 50 });
  const active = (res.items ?? []).filter((r) => r.is_active !== false && r.ins_plan_id != null);
  const isDental = (t: string | null | undefined) =>
    (t ?? "").trim().toUpperCase().startsWith("D");
  const dental_ranks = [
    ...new Set(
      active
        .filter((r) => isDental(r.legacy_plan_type))
        .map((r) => (r.insurance_type ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));
  return {
    kind: dental_ranks.length > 0 ? "insurance" : "cash",
    dental_ranks,
    has_medical: active.some((r) => !isDental(r.legacy_plan_type)),
  };
}

/** Tooltip text for the badge; `eligibility` is the feed's per-appointment value. */
export function coverageTitle(
  c: PatientCoverage,
  eligibility?: "eligible" | "ineligible" | "unknown" | null,
): string {
  if (c.kind === "cash") {
    return c.has_medical
      ? "Cash-Pay patient (no dental insurance; medical plan on file)"
      : "Cash-Pay patient (no insurance on file)";
  }
  const ranks = c.dental_ranks.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(" + ");
  const elig =
    eligibility === "eligible"
      ? " — eligibility verified"
      : eligibility === "ineligible"
        ? " — NOT ELIGIBLE / termed"
        : " — eligibility not verified";
  return `Insured: ${ranks} dental${elig}`;
}
