// Consistency rules for the Add / Edit Patient checkbox groups.
//
// Patient Status, Coverage Type and Patient Type were plain independent
// checkboxes, so the form happily accepted states that cannot be true at once —
// every Coverage Type ticked at the same time as "No Coverage", a patient that
// is both "CH – Child" and "SR – Senior Citizen", "No Correspondence" alongside
// e-mail and SMS left enabled.
//
// Every group is funnelled through the helpers below so a click can flip the
// boxes it implies (and clear the ones it contradicts) instead of the screen
// having to police each combination itself. Both the create and the edit paths
// render from `AddNewPatient.tsx`, so wiring it there covers both.

// ---------------------------------------------------------------------------
// Coverage Type
// ---------------------------------------------------------------------------

export interface CoverageFlags {
  noCoverage: boolean;
  primaryDental: boolean;
  secondaryDental: boolean;
  primaryMedical: boolean;
  secondaryMedical: boolean;
}

export type CoverageField = keyof CoverageFlags;

const SPECIFIC_COVERAGE: CoverageField[] = [
  "primaryDental",
  "secondaryDental",
  "primaryMedical",
  "secondaryMedical",
];

/** True when the patient carries at least one real coverage. */
export const hasAnyCoverage = (c: CoverageFlags): boolean =>
  SPECIFIC_COVERAGE.some((k) => c[k]);

/**
 * Coverage is a partition: either the patient has **no** coverage, or they have
 * one or more specific coverages — never both, never neither.
 *
 * - Ticking "No Coverage" clears every specific coverage.
 * - Ticking any specific coverage clears "No Coverage".
 * - A secondary plan cannot exist without its primary, so ticking Secondary
 *   Dental/Medical ticks the matching Primary, and un-ticking a Primary drops
 *   its Secondary.
 * - Clearing the last specific coverage falls back to "No Coverage" — that is
 *   what the state then means. For the same reason "No Coverage" cannot simply
 *   be un-ticked into an empty state; pick a coverage to clear it.
 */
export function applyCoverageChange(
  current: CoverageFlags,
  field: CoverageField,
  checked: boolean,
): CoverageFlags {
  if (field === "noCoverage") {
    // Un-ticking "No Coverage" on its own would leave the group saying nothing.
    if (!checked) return current;
    return {
      noCoverage: true,
      primaryDental: false,
      secondaryDental: false,
      primaryMedical: false,
      secondaryMedical: false,
    };
  }

  const next: CoverageFlags = { ...current, [field]: checked };

  if (checked) {
    next.noCoverage = false;
    // A secondary plan implies a primary one.
    if (field === "secondaryDental") next.primaryDental = true;
    if (field === "secondaryMedical") next.primaryMedical = true;
  } else {
    // Dropping a primary drops the secondary that hung off it.
    if (field === "primaryDental") next.secondaryDental = false;
    if (field === "primaryMedical") next.secondaryMedical = false;
  }

  if (!hasAnyCoverage(next)) next.noCoverage = true;
  return next;
}

/** Why a coverage box is locked, or "" when it is freely editable. */
export function coverageLockReason(
  current: CoverageFlags,
  field: CoverageField,
): string {
  if (field === "noCoverage" && current.noCoverage && !hasAnyCoverage(current)) {
    return "Select a coverage type to clear this.";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Patient Status
// ---------------------------------------------------------------------------

export interface StatusFlags {
  active: boolean;
  assignBenefits: boolean;
  hipaaAgreement: boolean;
  noCorrespondence: boolean;
  noAutoEmail: boolean;
  noAutoSMS: boolean;
  addToQuickFill: boolean;
}

export type StatusField = keyof StatusFlags;

/**
 * - "No Correspondence" is the umbrella over the automated channels: ticking it
 *   ticks "No Auto Email" and "No Auto SMS"; re-enabling either channel means
 *   correspondence is no longer blanket-suppressed, so the umbrella clears.
 * - The Quick-Fill list is a call list for live patients — an inactive patient
 *   drops off it, and adding someone to it makes them active again.
 * - "Assign Benefits to Patient" only means something when there is insurance,
 *   so it clears (and locks) while the patient has no coverage.
 */
export function applyStatusChange(
  current: StatusFlags,
  coverage: CoverageFlags,
  field: StatusField,
  checked: boolean,
): StatusFlags {
  const next: StatusFlags = { ...current, [field]: checked };

  switch (field) {
    case "noCorrespondence":
      if (checked) {
        next.noAutoEmail = true;
        next.noAutoSMS = true;
      }
      break;
    case "noAutoEmail":
    case "noAutoSMS":
      if (!checked) next.noCorrespondence = false;
      break;
    case "active":
      if (!checked) next.addToQuickFill = false;
      break;
    case "addToQuickFill":
      if (checked) next.active = true;
      break;
    default:
      break;
  }

  if (!hasAnyCoverage(coverage)) next.assignBenefits = false;
  return next;
}

/** Re-apply the cross-group rules after a coverage change. */
export function reconcileStatusWithCoverage(
  current: StatusFlags,
  coverage: CoverageFlags,
): StatusFlags {
  if (hasAnyCoverage(coverage) || !current.assignBenefits) return current;
  return { ...current, assignBenefits: false };
}

/** Why a status box is locked, or "" when it is freely editable. */
export function statusLockReason(
  current: StatusFlags,
  coverage: CoverageFlags,
  field: StatusField,
): string {
  if (field === "assignBenefits" && !hasAnyCoverage(coverage)) {
    return "Only applies when the patient has insurance coverage.";
  }
  if (field === "addToQuickFill" && !current.active) {
    return "Only active patients can be on the Quick-Fill list.";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Patient Type
// ---------------------------------------------------------------------------

export type PatientTypeFlags = Record<string, boolean>;

/**
 * Patient types are mostly independent labels, but a patient cannot be both a
 * child and a senior citizen — ticking one clears the other.
 */
const MUTUALLY_EXCLUSIVE_TYPES: Array<[string, string]> = [["CH", "SR"]];

export function applyPatientTypeChange<T extends PatientTypeFlags>(
  current: T,
  code: keyof T & string,
  checked: boolean,
): T {
  const next = { ...current, [code]: checked } as T;
  if (!checked) return next;
  for (const [a, b] of MUTUALLY_EXCLUSIVE_TYPES) {
    if (code === a && b in next) (next as PatientTypeFlags)[b] = false;
    if (code === b && a in next) (next as PatientTypeFlags)[a] = false;
  }
  return next;
}

/** The type this one excludes, for the tooltip — "" when it excludes nothing. */
export function patientTypeConflict(code: string): string {
  for (const [a, b] of MUTUALLY_EXCLUSIVE_TYPES) {
    if (code === a) return b;
    if (code === b) return a;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Normalising a stored record
// ---------------------------------------------------------------------------

/**
 * Settle a loaded patient's Coverage + Status flags before the form renders.
 * Records saved before these rules existed can hold combinations the UI can no
 * longer produce (no coverage yet benefits assigned, secondary without primary,
 * "No Correspondence" with a channel still open).
 */
export function normalizeLoadedFlags(
  loaded: CoverageFlags & StatusFlags,
): CoverageFlags & StatusFlags {
  const coverage: CoverageFlags = {
    noCoverage: loaded.noCoverage,
    primaryDental: loaded.primaryDental,
    secondaryDental: loaded.secondaryDental && loaded.primaryDental,
    primaryMedical: loaded.primaryMedical,
    secondaryMedical: loaded.secondaryMedical && loaded.primaryMedical,
  };
  if (hasAnyCoverage(coverage)) coverage.noCoverage = false;
  else coverage.noCoverage = true;

  const status: StatusFlags = {
    active: loaded.active,
    assignBenefits: loaded.assignBenefits && hasAnyCoverage(coverage),
    hipaaAgreement: loaded.hipaaAgreement,
    noCorrespondence:
      loaded.noCorrespondence && loaded.noAutoEmail && loaded.noAutoSMS,
    noAutoEmail: loaded.noAutoEmail || loaded.noCorrespondence,
    noAutoSMS: loaded.noAutoSMS || loaded.noCorrespondence,
    addToQuickFill: loaded.addToQuickFill && loaded.active,
  };
  // "No Correspondence" is the umbrella: if it was stored on, both channels are
  // suppressed, so it stays on rather than being downgraded.
  if (loaded.noCorrespondence) status.noCorrespondence = true;

  return { ...coverage, ...status };
}

/** Drop the losing side of any mutually-exclusive pair on a stored record. */
export function normalizeLoadedPatientTypes<T extends PatientTypeFlags>(
  loaded: T,
): T {
  const next = { ...loaded } as T;
  for (const [a, b] of MUTUALLY_EXCLUSIVE_TYPES) {
    if (next[a] && next[b]) {
      // Keep the first of the pair; the record cannot be both.
      (next as PatientTypeFlags)[b] = false;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------
//
// The screens keep these flags inside one large form object. Passing that whole
// object into the rules and spreading the result back would carry every other
// field along with it — and spreading a stale copy last silently undoes the
// change being made. Always narrow to the group first.

export const pickCoverage = (f: CoverageFlags): CoverageFlags => ({
  noCoverage: f.noCoverage,
  primaryDental: f.primaryDental,
  secondaryDental: f.secondaryDental,
  primaryMedical: f.primaryMedical,
  secondaryMedical: f.secondaryMedical,
});

export const pickStatus = (f: StatusFlags): StatusFlags => ({
  active: f.active,
  assignBenefits: f.assignBenefits,
  hipaaAgreement: f.hipaaAgreement,
  noCorrespondence: f.noCorrespondence,
  noAutoEmail: f.noAutoEmail,
  noAutoSMS: f.noAutoSMS,
  addToQuickFill: f.addToQuickFill,
});
