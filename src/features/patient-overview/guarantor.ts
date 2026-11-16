// Responsible-party (guarantor) resolution for the Patient Overview.
//
// The account hierarchy is: ACCOUNT -> its RESPONSIBLE PARTY (guarantor) ->
// every PATIENT billed to that guarantor. `patients.responsible_party_id` is the
// only link, and today it is an overloaded STRING (gap RP-1 in
// docs/patients/responsible_party_backend_devreport.md). It can hold:
//
//   * the patient's OWN id ("132" on patient 132)  -> self-guarantor; the
//     backend's registration writes exactly this for `is_self` (no
//     responsible_parties row exists, so /responsible-parties/{id} 404s);
//   * a `responsible_parties.id`                    -> non-patient guarantor;
//   * ANOTHER patient's id                          -> patient-as-guarantor
//     (legacy Denticon: the head of household is a patient who is their own RP);
//   * a legacy guarantor id                         -> resolvable only once
//     legacy guarantors are migrated (responsible_parties.legacy_id);
//   * null                                          -> nothing configured; the
//     patient is billed as an account of one.
//
// This module classifies the key the same way the backend resolver does
// (numeric RP row first, then legacy_id) and adds the two cases the backend
// leaves unresolved: self and patient-as-guarantor.

import {
  getResponsibleParty,
  getPatient,
  listResponsibleParties,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientRead, ResponsiblePartyRead } from "@/api/generated/model";

export type GuarantorKind =
  /** responsible_party_id is the patient's own id. */
  | "self"
  /** responsible_party_id is empty — no guarantor configured; billed as self. */
  | "unlinked"
  /** A responsible_parties row (non-patient guarantor). */
  | "responsible_party"
  /** Another patient is the guarantor (head of household). */
  | "patient"
  /** A key that matches nothing (unmigrated legacy guarantor). */
  | "unresolved";

export interface Guarantor {
  kind: GuarantorKind;
  /** The raw account key carried on the patient (null when unlinked). */
  account_key: string | null;
  /** Set when kind = "responsible_party". */
  responsible_party: ResponsiblePartyRead | null;
  /** Set when kind = "self" | "unlinked" | "patient" — the person who pays. */
  guarantor_patient: PatientRead | null;
}

/** responsible_party_relationship codes (backend RESP_PARTY_RELATIONSHIPS). */
const RELATIONSHIP_LABELS: Record<string, string> = {
  S: "Self",
  SP: "Spouse",
  P: "Parent",
  G: "Guardian",
  C: "Child",
  D: "Dependent",
  O: "Other",
};

/** Label for a stored relationship code; labels / unknown values pass through. */
export function relationship_label(code?: string | null): string {
  const raw = (code ?? "").trim();
  if (!raw) return "";
  return RELATIONSHIP_LABELS[raw.toUpperCase()] ?? raw;
}

/** The account key on a patient, trimmed; empty string -> null. */
export function account_key_of(patient?: Pick<PatientRead, "responsible_party_id"> | null) {
  const key = (patient?.responsible_party_id ?? "").trim();
  return key || null;
}

/**
 * Resolve who the patient's guarantor is. Never throws: lookups that 404 are
 * expected states (self ids, unmigrated legacy ids), not errors.
 */
export async function resolve_guarantor(patient: PatientRead): Promise<Guarantor> {
  const account_key = account_key_of(patient);
  const base = { account_key, responsible_party: null, guarantor_patient: null };

  if (!account_key) return { ...base, kind: "unlinked", guarantor_patient: patient };
  if (account_key === String(patient.id)) return { ...base, kind: "self", guarantor_patient: patient };

  if (/^\d+$/.test(account_key)) {
    // Same precedence as the backend's resolve_responsible_party: the numeric
    // key is a responsible_parties.id first …
    const rp = await getResponsibleParty(Number(account_key)).catch(() => null);
    if (rp) return { ...base, kind: "responsible_party", responsible_party: rp };

    // … then another patient who heads the account. Only accepted when that
    // patient is their OWN guarantor on the same key — otherwise a legacy id
    // that happens to equal some patient id would bill the wrong person.
    const head = await getPatient(Number(account_key)).catch(() => null);
    if (head && account_key_of(head) === account_key) {
      return { ...base, kind: "patient", guarantor_patient: head };
    }
  }

  // Finally a migrated legacy guarantor (responsible_parties.legacy_id).
  const by_legacy = await listResponsibleParties({ legacy_id: account_key, size: 1 })
    .then((r) => r.items?.[0] ?? null)
    .catch(() => null);
  if (by_legacy) return { ...base, kind: "responsible_party", responsible_party: by_legacy };

  return { ...base, kind: "unresolved" };
}
