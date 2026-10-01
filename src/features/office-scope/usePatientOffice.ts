import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useOfficeScope } from "./OfficeScopeContext";

/**
 * What PatientShellLayout publishes on the router outlet for the patient
 * screens — the patient's office fan-out, numeric and snake_case.
 *
 *   home_office_id     `patients.home_office_id` of the open chart (live).
 *   posting_office_id  The office new clinical/financial rows for this patient
 *                      are stamped with. Phase 4: this is the WORKING office
 *                      selected in the top bar (live) — you post where you are
 *                      working — falling back to the patient's home office when
 *                      no office is selected. Records stampPolicy marks `home`
 *                      (payment plans) keep using `home_office_id`, not this.
 */
export interface PatientOfficeContext {
  home_office_id: number | null;
  posting_office_id: number | null;
}

export interface PatientOffice extends PatientOfficeContext {
  /** The office selected in the top bar (== posting office in a chart). */
  working_office_id: number | null;
  /** The patient is homed in an office other than the working one (both known). */
  is_cross_office: boolean;
}

/**
 * The patient's office, read from the patient shell's outlet context. Every
 * patient screen takes its office from here instead of parsing the shell's
 * display model — one derivation, one place that owns the Phase-4 posting rule.
 *
 * Outside a patient shell (no outlet context) everything resolves to null; a
 * caller must not treat that as "no office" for stamping — it means "not in a
 * patient chart".
 */
export function usePatientOffice(): PatientOffice {
  const ctx = useOutletContext<Partial<PatientOfficeContext> | undefined>();
  const { office_id: working_office_id } = useOfficeScope();
  const home_office_id = ctx?.home_office_id ?? null;
  const posting_office_id = ctx?.posting_office_id ?? null;

  return useMemo<PatientOffice>(
    () => ({
      home_office_id,
      posting_office_id,
      working_office_id,
      is_cross_office:
        home_office_id != null && working_office_id != null && home_office_id !== working_office_id,
    }),
    [home_office_id, posting_office_id, working_office_id],
  );
}
