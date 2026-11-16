/**
 * Live "is this person already a patient?" lookup for every create-a-patient
 * surface (Scheduler quick New Patient Appointment form, Add New Patient
 * wizard — page and embedded modal).
 *
 * As soon as first name + last name + a valid birth date are entered, it asks
 * the same backend the manual "Check Patient" button and the register 409 use
 * (`POST /patients/check-duplicate` via `checkDuplicatePatient`), debounced so
 * typing does not fire a request per keystroke. Stale responses are dropped.
 *
 * Only candidates that are plausibly the SAME person are returned: a strong
 * match, or at least two of {last name, first name, DOB}. The backend scores
 * any single-field hit (every "Smith", every patient born that day) and those
 * would bury the real record under noise.
 */
import { useEffect, useState } from "react";
import { checkDuplicatePatient } from "@/services/patient.service";
import type { DuplicatePatient } from "@/types/patient";
import { validateDob } from "@/utils/datetime";

const DEBOUNCE_MS = 450;
const IDENTITY_FIELDS = ["last_name", "first_name", "dob"] as const;

export interface ExistingPatientIdentity {
  first_name: string;
  last_name: string;
  /** YYYY-MM-DD */
  dob: string;
}

export type ExistingPatientMatchStatus = "idle" | "searching" | "done" | "error";

export interface ExistingPatientMatches {
  status: ExistingPatientMatchStatus;
  matches: DuplicatePatient[];
}

/** Same person, not just a shared surname or birthday. */
export const isLikelySamePatient = (c: DuplicatePatient): boolean =>
  c.is_strong || IDENTITY_FIELDS.filter((f) => c.match_on.includes(f)).length >= 2;

export function useExistingPatientMatches(
  identity: ExistingPatientIdentity,
  enabled = true,
): ExistingPatientMatches {
  const first_name = identity.first_name.trim();
  const last_name = identity.last_name.trim();
  const dob = identity.dob;
  const ready = enabled && !!first_name && !!last_name && validateDob(dob) === null;

  const [state, setState] = useState<ExistingPatientMatches>({ status: "idle", matches: [] });

  useEffect(() => {
    if (!ready) {
      setState({ status: "idle", matches: [] });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ status: "searching", matches: prev.matches }));
    const timer = window.setTimeout(() => {
      checkDuplicatePatient({ first_name, last_name, dob })
        .then((rows) => {
          if (!cancelled) setState({ status: "done", matches: rows.filter(isLikelySamePatient) });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error", matches: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, first_name, last_name, dob]);

  return state;
}
