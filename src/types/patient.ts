// Patient-related type definitions

export interface DuplicatePatient {
  birthdate: string;
  name: string;
  officeShortId: string;
  patientId: string;
  email: string;
  provider: string;
  status: string;
  source: string;
}

export interface CheckDuplicatePayload {
  birthdate: string;
  firstName: string;
  lastName: string;
  office: string;
}