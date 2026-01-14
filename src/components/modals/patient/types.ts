// Patient Modal Types

export interface PatientFormData {
  patientId: string;
  respPartyId: string;
  title: string;
  preferredName: string;
  pronouns: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  maritalStatus: string;
  ethnicity: string;
  referralType: string;
  referredBy: string;
  preferredLanguage: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  weightUnit: string;
  chartNum: string;
  ssn: string;
  driverLicense: string;
  mediId: string;
  homePhone: string;
  cellPhone: string;
  workPhone: string;
  preferredContactMethod: string;
  schoolName: string;
  active: boolean;
  noAutoSMS: boolean;
  noAutoEmail: boolean;
  assignBenefitsToPatient: boolean;
  noCorrespondence: boolean;
  hipaaAgreement: boolean;
  addToQuickFill: boolean;
  preferredAppointmentTimes: string;
  healthcareGuardianName: string;
  healthcareGuardianPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  feeSchedule: string;
  preferredProvider: string;
  preferredHygienist: string;
  referredTo: string;
  referredToDate: string;
}

export interface PatientTypes {
  child: boolean;
  collectionProblem: boolean;
  employeeFamily: boolean;
  geriatric: boolean;
  shortNoticeAppointment: boolean;
  singleParent: boolean;
  spanishSpeaking: boolean;
}

export interface AppointmentPreferences {
  mon: { am: boolean; pm: boolean };
  tue: { am: boolean; pm: boolean };
  wed: { am: boolean; pm: boolean };
  thu: { am: boolean; pm: boolean };
  fri: { am: boolean; pm: boolean };
  sat: { am: boolean; pm: boolean };
  sun: { am: boolean; pm: boolean };
}

export type PatientFormAction =
  | { type: 'SET_FIELD'; field: keyof PatientFormData; value: any }
  | { type: 'SET_MULTIPLE_FIELDS'; fields: Partial<PatientFormData> }
  | { type: 'RESET'; data: PatientFormData };

export type PatientTypesAction =
  | { type: 'TOGGLE_TYPE'; typeKey: keyof PatientTypes }
  | { type: 'RESET'; data: PatientTypes };
