// Mock data for Office Setup module

export interface Office {
  id: string;
  officeId: number;
  officeName: string;
  shortId: string;
  
  // Address
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  timeZone: string;
  
  // Contact
  phone1: string;
  phone1Ext?: string;
  phone2?: string;
  email: string;
  
  // Billing
  billingProviderId: string;
  billingProviderName: string;
  useBillingLicense: boolean;
  taxId: string;
  openingDate: string;
  officeGroup?: string;
  
  // Fee Schedules
  defaultUCRFeeSchedule: string;
  defaultFeeSchedule: string;
  
  // Scheduler
  schedulerTimeInterval: number; // in minutes
  
  // Statement
  statementMessages: {
    general: string;
    current: string;
    day30: string;
    day60: string;
    day90: string;
    day120: string;
  };
  correspondenceName: string;
  statementName: string;
  statementAddress: string;
  statementPhone: string;
  logoUrl?: string;
  
  // Integrations
  eClaims?: {
    vendorType: string;
    username: string;
    password: string;
  };
  transworld?: {
    acceleratorAccount: string;
    collectionsAccount: string;
    userId: string;
    password: string;
    agingDays: number;
  };
  imaging?: {
    system1?: { name: string; linkType: string; mode: string };
    system2?: { name: string; linkType: string; mode: string };
    system3?: { name: string; linkType: string; mode: string };
  };
  textMessaging?: {
    phoneNumber: string;
    verified: boolean;
  };
  patientUrls?: {
    formsUrl: string;
    schedulingUrl: string;
    financingUrl: string;
    customUrl1?: string;
    customUrl2?: string;
  };
  acceptedCards: string[];
  
  // Operatories
  operatories: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  
  // Schedule
  schedule: {
    monday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    tuesday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    wednesday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    thursday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    friday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    saturday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
    sunday: { start: string; end: string; lunchStart: string; lunchEnd: string; closed: boolean };
  };
  
  // Holidays
  holidays: Array<{
    id: string;
    name: string;
    fromDate: string;
    toDate: string;
  }>;
  
  // Advanced
  advanced: {
    annualFinanceChargePercent: number;
    minimumBalance: number;
    minimumFinanceCharge: number;
    daysBeforeFinanceCharge: number;
    salesTaxPercent: number;
    insuranceGroup?: string;
    schedulerEndDate: string;
    eligibilityThresholdDays: number;
    sendECard: boolean;
    defaultPlaceOfService: string;
    defaultAppointmentDuration: number;
    defaultAreaCode: string;
    defaultCity: string;
    defaultState: string;
    defaultZip: string;
    preferredProvider?: string;
    defaultCoverageType: string;
    isOrthoOffice: boolean;
    hipaaNotice: boolean;
    consentForm: boolean;
    additionalConsentForm: boolean;
    automatedCampaignsEffectiveDate?: string;
  };
  
  // SmartAssist
  smartAssist: {
    enabled: boolean;
    items: {
      payment: { enabled: boolean; frequency: string; includeBal: boolean };
      email: { enabled: boolean; frequency: string };
      cellPhone: { enabled: boolean; frequency: string };
      eligibility: { enabled: boolean; frequency: string };
      medicalHistory: { enabled: boolean; frequency: string; template?: string };
      hipaa: { enabled: boolean; frequency: string; template?: string };
      consentForm1: { enabled: boolean; frequency: string; template?: string };
      consentForm2: { enabled: boolean; frequency: string; template?: string };
      consentForm3: { enabled: boolean; frequency: string; template?: string };
      consentForm4: { enabled: boolean; frequency: string; template?: string };
      progressNotes: { enabled: boolean; frequency: string };
      ledgerPosting: { enabled: boolean; frequency: string };
    };
  };
  
  // Metadata
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
  isActive: boolean;
}

export const mockOffices: Office[] = [
  {
    id: "off-001",
    officeId: 1001,
    officeName: "Main Street Dental",
    shortId: "MSD",
    address1: "123 Main Street",
    address2: "Suite 200",
    city: "San Francisco",
    state: "CA",
    zip: "94102",
    timeZone: "America/Los_Angeles",
    phone1: "(415) 555-1234",
    phone1Ext: "100",
    phone2: "(415) 555-1235",
    email: "contact@mainstreetdental.com",
    billingProviderId: "prov-001",
    billingProviderName: "Dr. Sarah Johnson",
    useBillingLicense: true,
    taxId: "94-1234567",
    openingDate: "2020-01-15",
    officeGroup: "Bay Area Group",
    defaultUCRFeeSchedule: "UCR California 2024",
    defaultFeeSchedule: "Standard Fee Schedule",
    schedulerTimeInterval: 10,
    statementMessages: {
      general: "Thank you for choosing Main Street Dental for your dental care needs.",
      current: "Payment is due upon receipt.",
      day30: "Your account is 30 days past due. Please remit payment immediately.",
      day60: "Your account is 60 days past due. Please contact our office.",
      day90: "Your account is 90 days past due. This is your final notice.",
      day120: "Your account has been sent to collections."
    },
    correspondenceName: "Main Street Dental",
    statementName: "Main Street Dental - Billing Department",
    statementAddress: "123 Main Street, Suite 200, San Francisco, CA 94102",
    statementPhone: "(415) 555-1234",
    eClaims: {
      vendorType: "DentalXChange",
      username: "msd_claims",
      password: "encrypted"
    },
    imaging: {
      system1: { name: "Dentiray", linkType: "Patient ID", mode: "Default" },
      system2: { name: "XVWeb", linkType: "Patient ID", mode: "Default" }
    },
    textMessaging: {
      phoneNumber: "(415) 555-9999",
      verified: true
    },
    patientUrls: {
      formsUrl: "https://forms.mainstreetdental.com",
      schedulingUrl: "https://schedule.mainstreetdental.com",
      financingUrl: "https://carecredit.com/mainstreet"
    },
    acceptedCards: ["Visa", "Mastercard", "AmEx", "Discover"],
    operatories: [
      { id: "op-001", name: "OP 1", order: 1 },
      { id: "op-002", name: "OP 2", order: 2 },
      { id: "op-003", name: "OP 3", order: 3 },
      { id: "op-004", name: "OP 4", order: 4 },
      { id: "op-005", name: "Hygiene 1", order: 5 },
      { id: "op-006", name: "Hygiene 2", order: 6 }
    ],
    schedule: {
      monday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
      tuesday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
      wednesday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
      thursday: { start: "08:00", end: "17:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
      friday: { start: "08:00", end: "16:00", lunchStart: "12:00", lunchEnd: "13:00", closed: false },
      saturday: { start: "09:00", end: "13:00", lunchStart: "", lunchEnd: "", closed: false },
      sunday: { start: "", end: "", lunchStart: "", lunchEnd: "", closed: true }
    },
    holidays: [
      { id: "hol-001", name: "New Year's Day", fromDate: "2025-01-01", toDate: "2025-01-01" },
      { id: "hol-002", name: "Memorial Day", fromDate: "2025-05-26", toDate: "2025-05-26" },
      { id: "hol-003", name: "Independence Day", fromDate: "2025-07-04", toDate: "2025-07-04" },
      { id: "hol-004", name: "Labor Day", fromDate: "2025-09-01", toDate: "2025-09-01" },
      { id: "hol-005", name: "Thanksgiving", fromDate: "2025-11-27", toDate: "2025-11-28" },
      { id: "hol-006", name: "Christmas", fromDate: "2025-12-24", toDate: "2025-12-26" }
    ],
    advanced: {
      annualFinanceChargePercent: 18.0,
      minimumBalance: 50.0,
      minimumFinanceCharge: 2.0,
      daysBeforeFinanceCharge: 30,
      salesTaxPercent: 8.5,
      insuranceGroup: "PPO Network A",
      schedulerEndDate: "2026-12-31",
      eligibilityThresholdDays: 30,
      sendECard: true,
      defaultPlaceOfService: "Office",
      defaultAppointmentDuration: 60,
      defaultAreaCode: "415",
      defaultCity: "San Francisco",
      defaultState: "CA",
      defaultZip: "94102",
      preferredProvider: "Dr. Sarah Johnson",
      defaultCoverageType: "PPO",
      isOrthoOffice: false,
      hipaaNotice: true,
      consentForm: true,
      additionalConsentForm: false,
      automatedCampaignsEffectiveDate: "2024-01-01"
    },
    smartAssist: {
      enabled: true,
      items: {
        payment: { enabled: true, frequency: "Every Visit", includeBal: true },
        email: { enabled: true, frequency: "Every Year" },
        cellPhone: { enabled: true, frequency: "Every Year" },
        eligibility: { enabled: true, frequency: "Every Visit" },
        medicalHistory: { enabled: true, frequency: "Every Year", template: "Standard Medical History" },
        hipaa: { enabled: true, frequency: "Every Year", template: "HIPAA Consent 2024" },
        consentForm1: { enabled: true, frequency: "Every Visit", template: "Treatment Consent" },
        consentForm2: { enabled: false, frequency: "Every Visit" },
        consentForm3: { enabled: false, frequency: "Every Visit" },
        consentForm4: { enabled: false, frequency: "Every Visit" },
        progressNotes: { enabled: true, frequency: "Every Visit" },
        ledgerPosting: { enabled: true, frequency: "Every Visit" }
      }
    },
    createdBy: "admin",
    createdDate: "2020-01-15T08:00:00Z",
    modifiedBy: "sarah.johnson",
    modifiedDate: "2024-12-15T10:30:00Z",
    isActive: true
  },
  {
    id: "off-002",
    officeId: 1002,
    officeName: "Downtown Dental Center",
    shortId: "DDC",
    address1: "456 Market Street",
    city: "San Francisco",
    state: "CA",
    zip: "94103",
    timeZone: "America/Los_Angeles",
    phone1: "(415) 555-5678",
    email: "info@downtowndental.com",
    billingProviderId: "prov-002",
    billingProviderName: "Dr. Michael Chen",
    useBillingLicense: true,
    taxId: "94-7654321",
    openingDate: "2021-06-01",
    officeGroup: "Bay Area Group",
    defaultUCRFeeSchedule: "UCR California 2024",
    defaultFeeSchedule: "Standard Fee Schedule",
    schedulerTimeInterval: 15,
    statementMessages: {
      general: "Downtown Dental Center - Quality Care in the Heart of SF",
      current: "Thank you for your prompt payment.",
      day30: "Reminder: Your payment is now 30 days overdue.",
      day60: "Important: Please contact us regarding your past due balance.",
      day90: "Final Notice: Your account will be sent to collections if not paid.",
      day120: "Your account has been forwarded to our collection agency."
    },
    correspondenceName: "Downtown Dental Center",
    statementName: "Downtown Dental Center",
    statementAddress: "456 Market Street, San Francisco, CA 94103",
    statementPhone: "(415) 555-5678",
    acceptedCards: ["Visa", "Mastercard"],
    operatories: [
      { id: "op-007", name: "Treatment Room 1", order: 1 },
      { id: "op-008", name: "Treatment Room 2", order: 2 },
      { id: "op-009", name: "Hygiene Suite", order: 3 }
    ],
    schedule: {
      monday: { start: "09:00", end: "18:00", lunchStart: "13:00", lunchEnd: "14:00", closed: false },
      tuesday: { start: "09:00", end: "18:00", lunchStart: "13:00", lunchEnd: "14:00", closed: false },
      wednesday: { start: "09:00", end: "18:00", lunchStart: "13:00", lunchEnd: "14:00", closed: false },
      thursday: { start: "09:00", end: "18:00", lunchStart: "13:00", lunchEnd: "14:00", closed: false },
      friday: { start: "09:00", end: "17:00", lunchStart: "13:00", lunchEnd: "14:00", closed: false },
      saturday: { start: "", end: "", lunchStart: "", lunchEnd: "", closed: true },
      sunday: { start: "", end: "", lunchStart: "", lunchEnd: "", closed: true }
    },
    holidays: [
      { id: "hol-007", name: "New Year's Day", fromDate: "2025-01-01", toDate: "2025-01-01" },
      { id: "hol-008", name: "Thanksgiving", fromDate: "2025-11-27", toDate: "2025-11-28" },
      { id: "hol-009", name: "Christmas", fromDate: "2025-12-25", toDate: "2025-12-25" }
    ],
    advanced: {
      annualFinanceChargePercent: 18.0,
      minimumBalance: 50.0,
      minimumFinanceCharge: 2.0,
      daysBeforeFinanceCharge: 30,
      salesTaxPercent: 8.5,
      schedulerEndDate: "2026-12-31",
      eligibilityThresholdDays: 30,
      sendECard: false,
      defaultPlaceOfService: "Office",
      defaultAppointmentDuration: 60,
      defaultAreaCode: "415",
      defaultCity: "San Francisco",
      defaultState: "CA",
      defaultZip: "94103",
      defaultCoverageType: "PPO",
      isOrthoOffice: false,
      hipaaNotice: true,
      consentForm: true,
      additionalConsentForm: false
    },
    smartAssist: {
      enabled: false,
      items: {
        payment: { enabled: false, frequency: "Every Visit", includeBal: false },
        email: { enabled: false, frequency: "Every Year" },
        cellPhone: { enabled: false, frequency: "Every Year" },
        eligibility: { enabled: false, frequency: "Every Visit" },
        medicalHistory: { enabled: false, frequency: "Every Year" },
        hipaa: { enabled: false, frequency: "Every Year" },
        consentForm1: { enabled: false, frequency: "Every Visit" },
        consentForm2: { enabled: false, frequency: "Every Visit" },
        consentForm3: { enabled: false, frequency: "Every Visit" },
        consentForm4: { enabled: false, frequency: "Every Visit" },
        progressNotes: { enabled: false, frequency: "Every Visit" },
        ledgerPosting: { enabled: false, frequency: "Every Visit" }
      }
    },
    createdBy: "admin",
    createdDate: "2021-06-01T09:00:00Z",
    modifiedBy: "michael.chen",
    modifiedDate: "2024-11-20T14:15:00Z",
    isActive: true
  }
];

// Helper function to get next available office ID
export function getNextOfficeId(): number {
  const maxId = Math.max(...mockOffices.map(o => o.officeId));
  return maxId + 1;
}

// Helper function to get all offices
export function getAllOffices(): Office[] {
  return mockOffices.filter(o => o.isActive);
}

// Helper function to get office by ID
export function getOfficeById(id: string): Office | undefined {
  return mockOffices.find(o => o.id === id);
}
