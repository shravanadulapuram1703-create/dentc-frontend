// Patient-related type definitions

/**
 * One row of the "Identical Patients Found" table. Derived from the backend's
 * `DuplicateCandidate` (snake_case, same names) by `toDuplicatePatient`.
 */
export interface DuplicatePatient {
  dob: string;
  name: string;
  home_office_short_id: string;
  patient_id: string;
  email: string;
  provider: string;
  status: string;
  source: string;
}

export interface CheckDuplicatePayload {
  dob: string;
  first_name: string;
  last_name: string;
}