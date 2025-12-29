// Shared TypeScript interfaces for Patient Overview components

export interface PatientData {
  name: string;
  age: number;
  sex: string;
  dob: string;
  patientId: string;
  chartNum: string;
  homePhone: string;
  workPhone: string;
  cellPhone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  provider: string;
  hygienist: string;
  homeOffice: string;
  firstVisit: string;
  lastVisit: string;
  nextVisit: string;
  nextRecall: string;
  preferredLanguage: string;
  medicalAlerts: string;
  patientNotes: string;
  referralType: string;
  referredBy: string;
  referredTo: string;
  lastPanoChart: string;
  contactPref: string;
  feeSchedule: string;
  type: string;
}

export interface ResponsibleParty {
  name: string;
  id: string;
  type: string;
  cellPhone: string;
  email: string;
  homeOffice: string;
}

export interface InsurancePlan {
  carrierName: string;
  groupNumber: string;
  carrierPhone: string;
  subscriber: string;
  indMaxRemain: string;
  indDedRemain: string;
}

export interface DentalInsurance {
  primary: InsurancePlan;
  secondary: InsurancePlan | null;
}

export interface AccountMember {
  name: string;
  age: number;
  sex: string;
  nextVisit: string;
  recall: string;
  lastVisit: string;
  active: string;
}

export interface Appointment {
  date: string;
  time: string;
  office: string;
  operator: string;
  provider: string;
  duration: string;
  status: string;
  lastUpdated: string;
  member: string;
  current: string;
  over30: string;
  over60: string;
  over90: string;
  over120: string;
  balance: string;
  estPat: string;
  estIns: string;
}

export interface Recall {
  code: string;
  age: string;
  nextDate: string;
  freq: string;
}

export interface BalanceData {
  accountBalance: string;
  todayCharges: string;
  todayEstInsurance: string;
  todayEstPatient: string;
  lastInsPayment: string;
  lastInsPaymentDate: string;
  lastPatPayment: string;
  lastPatPaymentDate: string;
}
