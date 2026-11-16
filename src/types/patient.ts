// Patient-related type definitions

/**
 * One row of the "Identical Patients Found" table. Derived from the backend's
 * `DuplicateCandidate` (snake_case, same names) by `toDuplicatePatient`.
 */
export interface DuplicatePatient {
  /** `PatientRead.id` — what "Use This Patient" hands back to the host flow. */
  id: number;
  dob: string;
  name: string;
  home_office_short_id: string;
  patient_id: string;
  email: string;
  phone: string;
  provider: string;
  status: string;
  source: string;
  /** Fields that lined up (`last_name`, `first_name`, `dob`, `phone`, …). */
  match_on: string[];
  /** Confident enough that `POST /patients/register` would 409 without force_create. */
  is_strong: boolean;
}

export interface CheckDuplicatePayload {
  dob: string;
  first_name: string;
  last_name: string;
}