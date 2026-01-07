// Patient Overview Utilities - Data Mapping & Adapters

import { PatientData, ResponsibleParty, DentalInsurance, AccountMember, Appointment, Recall, BalanceData } from './types';

/**
 * Maps raw patient data to PatientData view model
 * This keeps the component clean and backend-agnostic
 */
export function mapPatientToViewModel(patient: any): PatientData {
  return {
    name: patient?.name || 'Miller, Nicolas (Nick)',
    age: patient?.age || 32,
    sex: patient?.gender || 'M',
    dob: patient?.dob || '12/04/1993',
    patientId: patient?.patientId || '900097',
    chartNum: patient?.chartNum || '900097',
    homePhone: patient?.homePhone || '814-473-3058',
    workPhone: patient?.workPhone || '',
    cellPhone: patient?.cellPhone || '814-473-3058',
    email: patient?.email || '',
    address: patient?.address || '910 Watson St.',
    city: patient?.city || 'Coraopolis',
    state: patient?.state || 'PA',
    zip: patient?.zip || '15108',
    provider: patient?.provider || 'Jinna, Dhileep',
    hygienist: patient?.hygienist || '',
    homeOffice: patient?.homeOffice || 'Excel Dental- Moon, PA',
    firstVisit: patient?.firstVisit || '09/04/2015',
    lastVisit: patient?.lastVisit || '',
    nextVisit: patient?.nextVisit || '12/19/2025',
    nextRecall: patient?.nextRecall || '',
    preferredLanguage: patient?.preferredLanguage || 'English',
    medicalAlerts: patient?.medicalAlerts || '(08/12/2015 01:37 PM PT)',
    patientNotes: patient?.patientNotes || '',
    referralType: patient?.referralType || 'Patient',
    referredBy: patient?.referredBy || '',
    referredTo: patient?.referredTo || '',
    lastPanoChart: patient?.lastPanoChart || '',
    contactPref: patient?.contactPref || '',
    feeSchedule: patient?.feeSchedule || 'United Concordia PPO Plan',
    type: patient?.type || ''
  };
}

/**
 * Maps responsible party data
 */
export function mapResponsibleParty(patient: any): ResponsibleParty {
  return patient?.responsibleParty ?? {
    name: 'Miller, Nick',
    id: '900069',
    type: 'Cash',
    cellPhone: '814-473-3058',
    email: '',
    homeOffice: 'Excel Dental- Moon, PA'
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
