// Redirects of today's /reports/* paths (07 §2.2). One table, rendered as <Route> elements
// inside the module (the pattern of utilityLegacyRedirects()). Paths are relative to /reports.

export interface LegacyRedirect {
  from: string;
  to: string;
}

/**
 * Old runner ids -> engine report keys (provisional; final keys are owned by catalog/*).
 * Registered only when the engine is `on`.
 */
export const LEGACY_REPORT_ID_MAP: Readonly<Record<string, string>> = {
  production: "daily.production_report",
  collections: "daily.collection_report",
  "patient-list": "lists.patient_list",
  appointments: "appointment.appointment_list",
  "treatment-plans": "treatment_plan.treatment_plan_status",
  "insurance-claims": "insurance.claims_list",
};

/** Path redirects when the engine is `on` (07 §2.2 and the restored menu paths of §1.6). */
export const ENGINE_ON_REDIRECTS: readonly LegacyRedirect[] = [
  { from: "ledger", to: "/reports/c/ledger" },
  { from: "appointment", to: "/reports/c/appointment" },
  { from: "treatment-plan", to: "/reports/c/treatment_plan" },
  { from: "insurance", to: "/reports/c/insurance" },
  { from: "lists/patient-list", to: "/reports/c/lists?subcategory=patient" },
  { from: "lists/responsible-party-list", to: "/reports/c/lists?subcategory=patient" },
  { from: "lists/provider-list", to: "/reports/c/lists?subcategory=provider" },
  { from: "lists/security-list", to: "/reports/c/lists?subcategory=security" },
  { from: "lists/setup-list", to: "/reports/c/lists?subcategory=setup" },
  // Worklists arrive in P3; until then the worklist index.
  { from: "interactive/unsigned-progress-notes", to: "/reports/worklists" },
  { from: "interactive/eligibility-verification", to: "/reports/worklists" },
  // Placeholders of other customers' reports are deleted; Office Reports become custom reports.
  { from: "office/*", to: "/reports/c/custom" },
  // Pre-f7332be menu paths without a route today.
  { from: "daily", to: "/reports/c/daily" },
  { from: "monthly", to: "/reports/c/monthly" },
  { from: "management", to: "/reports/c/management" },
  { from: "referral", to: "/reports/c/referral" },
  { from: "recall", to: "/reports/c/recall" },
  { from: "ortho", to: "/reports/c/ortho" },
  { from: "statements", to: "/reports/c/statements" },
  { from: "my-reports", to: "/reports/c/my_reports" },
  { from: "my-favorites", to: "/reports/library/favorites" },
  { from: "search", to: "/reports" },
  { from: "old", to: "/reports" },
];

/** Engine `off`: today's nav targets keep working (they point at the old runner ids). */
export const ENGINE_OFF_REDIRECTS: readonly LegacyRedirect[] = [
  { from: "ledger", to: "/reports/run/production" },
  { from: "appointment", to: "/reports/run/appointments" },
  { from: "treatment-plan", to: "/reports/run/treatment-plans" },
  { from: "insurance", to: "/reports/run/insurance-claims" },
  { from: "lists/patient-list", to: "/reports/run/patient-list" },
];

export function engineReportPath(old_report_id: string | undefined): string {
  const key = old_report_id ? LEGACY_REPORT_ID_MAP[old_report_id] : undefined;
  return key ? `/reports/r/${key}` : "/reports";
}
