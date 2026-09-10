// Claim status vocabulary for the claim screen's UPDATE STATUS action.
//
// The backend stores `insurance_claims.status` as a free-text String(30) with no
// enum, but POST /insurance-claims/{id}/status branches on the *exact* lowercase
// value to derive the lifecycle dates:
//
//   status == "submitted" → submitted_date = today (only if not already set)
//   status == "paid"      → paid_date = today
//   status == "closed"    → close_date = today AND is_active = false
//
// (app/services/patient_extra_service.py::set_claim_status).
//
// That is why the status must be picked from this list rather than typed: a
// free-text "Submitted" or "submited" saves the literal string, silently skips
// the date side-effect, and reads on screen as "nothing happened".

export interface ClaimStatusOption {
  /** Exact value sent to the backend. */
  value: string;
  label: string;
  /** What the transition does, shown next to the option. */
  effect: string;
  /** Needs an extra confirm because it takes the claim out of active lists. */
  destructive?: boolean;
}

export const CLAIM_STATUS_OPTIONS: ClaimStatusOption[] = [
  {
    value: "draft",
    label: "Draft",
    effect: "Claim created, not sent. No dates are set.",
  },
  {
    value: "submitted",
    label: "Submitted",
    effect: "Stamps Claim Sent Date with today (if not already sent).",
  },
  {
    value: "paid",
    label: "Paid",
    effect: "Stamps the claim paid date with today.",
  },
  {
    value: "denied",
    label: "Denied",
    effect: "Marks the claim denied. No dates are set.",
  },
  {
    value: "closed",
    label: "Closed",
    effect: "Stamps Claim Close Date and removes the claim from active claim lists.",
    destructive: true,
  },
];

/** Match a stored status (any casing / spacing) to a known option. */
export function findClaimStatus(status?: string | null): ClaimStatusOption | undefined {
  const key = (status || "").trim().toLowerCase();
  if (!key) return undefined;
  return CLAIM_STATUS_OPTIONS.find((o) => o.value === key);
}

/**
 * Display label for a stored status. Legacy/free-text values that predate the
 * picker are shown as-is rather than hidden.
 */
export function claimStatusLabel(status?: string | null): string {
  const raw = (status || "").trim();
  if (!raw) return "-";
  return findClaimStatus(raw)?.label ?? raw;
}

/** True when the stored value is not one this app can round-trip. */
export function isUnknownClaimStatus(status?: string | null): boolean {
  const raw = (status || "").trim();
  return raw !== "" && !findClaimStatus(raw);
}
