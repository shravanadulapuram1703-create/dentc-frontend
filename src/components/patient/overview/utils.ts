// Patient Overview Utilities - Data Mapping & Adapters

import { PatientData, ResponsibleParty, DentalInsurance, AccountMember, Appointment, Recall, BalanceData } from './types';

/**
 * Maps raw patient data to PatientData view model
 * This keeps the component clean and backend-agnostic
 * Now accepts PatientDetails from API
 */
export function mapPatientToViewModel(patient: any): PatientData {
  // Calculate age from DOB
  let age = 0;
  if (patient?.dob || patient?.identity?.dob) {
    const dob = patient.dob || patient.identity?.dob;
    const birthDate = new Date(dob);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  // Format DOB from YYYY-MM-DD to MM/DD/YYYY
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format name
  const lastName = patient?.last_name || patient?.identity?.last_name || '';
  const firstName = patient?.first_name || patient?.identity?.first_name || '';
  const preferredName = patient?.preferred_name || patient?.identity?.preferred_name;
  const name = preferredName 
    ? `${lastName}, ${firstName} (${preferredName})`
    : `${lastName}, ${firstName}`;

  return {
    name: name || 'Unknown Patient',
    age: age || patient?.age || 0,
    sex: patient?.gender || patient?.identity?.gender || 'M',
    dob: formatDate(patient?.dob || patient?.identity?.dob) || '',
    patientId: patient?.id?.toString() || patient?.chart_no ||  '',
    chartNum: patient?.chart_no || patient?.id?.toString() || '',
    homePhone: patient?.contact?.home_phone || '',
    workPhone: patient?.contact?.work_phone || '',
    cellPhone: patient?.contact?.cell_phone || '',
    email: patient?.contact?.email || '',
    address: patient?.address?.address_line_1 || '',
    city: patient?.address?.city || '',
    state: patient?.address?.state || '',
    zip: patient?.address?.zip || '',
    provider: patient?.provider?.preferred_provider_name || '',
    hygienist: patient?.provider?.preferred_hygienist_name || '',
    homeOffice: patient?.office?.home_office_name || '',
    firstVisit: formatDate(patient?.clinical?.first_visit) || '',
    lastVisit: formatDate(patient?.clinical?.last_visit) || '',
    nextVisit: formatDate(patient?.clinical?.next_visit) || '',
    nextRecall: formatDate(patient?.clinical?.next_recall) || '',
    preferredLanguage: patient?.preferences?.preferred_language || 'English',
    medicalAlerts: patient?.clinical?.medical_alerts?.map((alert: any) => 
      `(${formatDate(alert.date)} ${alert.entered_by}) ${alert.alert}`
    ).join(', ') || '',
    patientNotes: patient?.notes?.patient_notes || '',
    referralType: patient?.referral?.referral_type || '',
    referredBy: patient?.referral?.referred_by || '',
    referredTo: patient?.referral?.referred_to || '',
    lastPanoChart: formatDate(patient?.clinical?.last_pano_chart) || '',
    contactPref: patient?.preferences?.contact_preference || patient?.contact?.preferred_contact || '',
    feeSchedule: patient?.fee_schedule?.fee_schedule_name || '',
    type: patient?.patient_type || ''
  };
}

/**
 * Maps responsible party data
 */
export function mapResponsibleParty(patient: any): ResponsibleParty {
  if (patient?.responsible_party) {
    return {
      name: patient.responsible_party.name || '',
      id: patient.responsible_party.id || '',
      type: patient.responsible_party.type || '',
      cellPhone: patient.responsible_party.phone || '',
      email: patient.responsible_party.email || '',
      homeOffice: patient.responsible_party.home_office || ''
    };
  }
  
  // Fallback for old format
  return patient?.responsibleParty ?? {
    name: '',
    id: '',
    type: '',
    cellPhone: '',
    email: '',
    homeOffice: ''
  };
}

/**
 * Mock data generators - replace with API calls in production
 */
export function getMockDentalInsurance(): DentalInsurance {
  return {
    primary: {
      carrierName: 'United Concordia',
      groupNumber: 'TEST PLAN',
      carrierPhone: '',
      subscriber: 'Miller, Nick (Self)',
      indMaxRemain: '$1,500.00 ($1,500.08)',
      indDedRemain: '$50.00 ($0.00)'
    },
    secondary: null
  };
}

export function getMockAccountMembers(): AccountMember[] {
  return [
    { name: 'Miller, Nick', age: 32, sex: 'M', nextVisit: '12/19/2025', recall: '', lastVisit: '03/04/2017', active: 'Yes' },
    { name: 'Miller, Chloe', age: 30, sex: 'F', nextVisit: '-', recall: '-', lastVisit: '-', active: 'Yes' }
  ];
}

export function getMockAppointments(): Appointment[] {
  return [
    {
      date: '12/19/2025',
      time: '11:30 AM',
      office: 'WDFOR',
      operator: 'Prophylaxis - Adult',
      provider: '999X',
      duration: '30',
      status: 'Confirmed',
      lastUpdated: '04/08/25',
      member: 'Miller, Nicolas',
      current: '($177.73)',
      over30: '$0.00',
      over60: '$0.00',
      over90: '$0.00',
      over120: '$0.00',
      balance: '($177.73)',
      estPat: '($39.66)',
      estIns: '$0.00'
    },
    {
      date: '07/14/2021',
      time: '11:30 AM',
      office: 'WDFOR',
      operator: 'Procedures',
      provider: '262x',
      duration: '50',
      status: 'Scheduled',
      lastUpdated: 'NICOLASM',
      member: 'Miller, Nicolas',
      current: '($177.73)',
      over30: '$0.00',
      over60: '$0.00',
      over90: '$0.00',
      over120: '$0.00',
      balance: '($177.73)',
      estPat: '($39.66)',
      estIns: '$60.55'
    },
    {
      date: '07/07/2021',
      time: '12:30 AM',
      office: 'WDFOR',
      operator: 'Statement',
      provider: '999Z',
      duration: '30',
      status: 'Confirmed',
      lastUpdated: 'REMOTEEA',
      member: 'Miller, Nicolas',
      current: '$0.00',
      over30: '$0.00',
      over60: '$0.00',
      over90: '$0.00',
      over120: '$0.00',
      balance: '$0.00',
      estPat: '$0.00',
      estIns: '$0.00'
    }
  ];
}

export function getMockRecalls(): Recall[] {
  return [
    { code: 'D110', age: '6 M -12', nextDate: '04/27/2026', freq: 'Prophylaxis - Adult' },
    { code: 'D0330', age: '3 Y - 1D', nextDate: '08/16/2023', freq: 'Panoramic Radiographic Image' }
  ];
}

export function getMockBalanceData(): BalanceData {
  return {
    accountBalance: '($177.73)',
    todayCharges: '$0.00',
    todayEstInsurance: '$0.00',
    todayEstPatient: '$0.00',
    lastInsPayment: '$93.98',
    lastInsPaymentDate: '10/03/2020',
    lastPatPayment: '$32.10',
    lastPatPaymentDate: '04/22/2020'
  };
}
