import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Edit2, Archive, Plus, Eye, DollarSign, FileText } from 'lucide-react';

import EditPatientModal from '../../modals/EditPatientModal';
import PatientHeader from './PatientHeader';
import PatientDetailsGrid from './PatientDetailsGrid';
import ResponsiblePartyCard from './ResponsiblePartyCard';
import InsuranceCard from './InsuranceCard';
import AccountMembersTable from './AccountMembersTable';
import AppointmentsTable from './AppointmentsTable';
import RecallsTable from './RecallsTable';
import BalancesTab from './BalancesTab';
import ContractsTab from './ContractsTab';

import {
  PatientData,
  ResponsibleParty,
  DentalInsurance,
  AccountMember,
  Appointment,
  Recall,
  BalanceData
} from './types';

export default function PatientOverview() {
  const outlet = useOutletContext<{ patient?: any }>();
  const patient = outlet?.patient;

  const [activeTab, setActiveTab] = useState<'summary' | 'balances' | 'contracts'>('summary');
  const [showEditPatient, setShowEditPatient] = useState(false);

  const handleSavePatient = (data: any) => {
    console.log('Saving patient data:', data);
    // TODO: send to backend
  };

  /* ---------------------------------
     SAFETY GUARD (PREVENT RUNTIME CRASH)
  ---------------------------------- */
  if (!patient) {
    return (
      <div className="p-4 bg-[#F7F9FC] flex items-center justify-center min-h-screen">
        <div className="text-[#64748B] text-lg">Loading patient data...</div>
      </div>
    );
  }

  /* ---------------------------------
     NORMALIZED PATIENT DATA
  ---------------------------------- */
  const patientData: PatientData = {
    name: patient.name ?? 'Miller, Nicolas (Nick)',
    age: patient.age ?? 32,
    sex: patient.gender ?? 'M',
    dob: patient.dob ?? '12/04/1993',

    // 🔐 SAFE ID NORMALIZATION
    patientId: patient.patientId ?? patient.id ?? '900097',
    chartNum: patient.chartNum ?? patient.patientId ?? patient.id ?? '900097',

    homePhone: patient.homePhone ?? '814-473-3058',
    workPhone: patient.workPhone ?? '',
    cellPhone: patient.cellPhone ?? '814-473-3058',
    email: patient.email ?? '',

    address: patient.address ?? '910 Watson St.',
    city: patient.city ?? 'Coraopolis',
    state: patient.state ?? 'PA',
    zip: patient.zip ?? '15108',

    provider: patient.provider ?? 'Jinna, Dhileep',
    hygienist: patient.hygienist ?? '',
    homeOffice: patient.homeOffice ?? 'Excel Dental- Moon, PA',

    firstVisit: patient.firstVisit ?? '09/04/2015',
    lastVisit: patient.lastVisit ?? '',
    nextVisit: patient.nextVisit ?? '12/19/2025',
    nextRecall: patient.nextRecall ?? '',

    preferredLanguage: patient.preferredLanguage ?? 'English',
    medicalAlerts: patient.medicalAlerts ?? '(08/12/2015 01:37 PM PT)',

    patientNotes: patient.patientNotes ?? '',
    referralType: patient.referralType ?? 'Patient',
    referredBy: patient.referredBy ?? '',
    referredTo: patient.referredTo ?? '',
    lastPanoChart: patient.lastPanoChart ?? '',
    contactPref: patient.contactPref ?? '',
    feeSchedule: patient.feeSchedule ?? 'United Concordia PPO Plan',
    type: patient.type ?? ''
  };

  /* ---------------------------------
     RESPONSIBLE PARTY
  ---------------------------------- */
  const responsibleParty: ResponsibleParty =
    patient.responsibleParty ?? {
      name: 'Miller, Nick',
      id: '900069',
      type: 'Cash',
      cellPhone: '814-473-3058',
      email: '',
      homeOffice: 'Excel Dental- Moon, PA'
    };

  /* ---------------------------------
     INSURANCE (SAFE FALLBACK)
  ---------------------------------- */
  const dentalInsurance: DentalInsurance =
    patient.dentalInsurance ?? {
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

  /* ---------------------------------
     MOCK DATA (TODO: API)
  ---------------------------------- */
  const accountMembers: AccountMember[] = [
    { name: 'Miller, Nick', age: 32, sex: 'M', nextVisit: '12/19/2025', recall: '', lastVisit: '03/04/2017', active: 'Yes' },
    { name: 'Miller, Chloe', age: 30, sex: 'F', nextVisit: '-', recall: '-', lastVisit: '-', active: 'Yes' }
  ];

  const appointments: Appointment[] = [
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
    }
  ];

  const recalls: Recall[] = [
    { code: 'D110', age: '6 M -12', nextDate: '04/27/2026', freq: 'Prophylaxis - Adult' }
  ];

  const balanceData: BalanceData = {
    accountBalance: '($177.73)',
    todayCharges: '$0.00',
    todayEstInsurance: '$0.00',
    todayEstPatient: '$0.00',
    lastInsPayment: '$93.98',
    lastInsPaymentDate: '10/03/2020',
    lastPatPayment: '$32.10',
    lastPatPaymentDate: '04/22/2020'
  };

  return (
    <div className="p-4 bg-[#F7F9FC]">
      {/* TOP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
          <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide text-sm">PATIENT INFORMATION</h2>
            <button
              onClick={() => setShowEditPatient(true)}
              className="px-3 py-1.5 bg-white text-[#1F3A5F] border-2 border-white rounded hover:bg-[#F7F9FC] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              EDIT
            </button>
          </div>
          <div className="p-4">
            <PatientHeader patient={patientData} />
            <PatientDetailsGrid patient={patientData} />
          </div>
        </div>

        <div className="space-y-4">
          <ResponsiblePartyCard responsibleParty={responsibleParty} />
          <InsuranceCard dentalInsurance={dentalInsurance} showMedical />
        </div>
      </div>

      <AccountMembersTable members={accountMembers} />

      {/* TABS */}
      <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
        <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 flex">
          {(['summary', 'balances', 'contracts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-bold text-sm uppercase tracking-wide border-b-4 ${
                activeTab === tab
                  ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                  : 'border-transparent text-[#64748B]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'summary' && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                <button className="btn-primary"><Archive className="w-4 h-4" /> ARCHIVE APPT</button>
                <button className="btn-primary"><Plus className="w-4 h-4" /> ADD NEW APPT</button>
                <button className="btn-primary"><Eye className="w-4 h-4" /> VIEW FAMILY APPT</button>
                <button className="btn-primary"><DollarSign className="w-4 h-4" /> BALANCES</button>
                <button className="btn-success ml-auto"><FileText className="w-4 h-4" /> LEDGER</button>
              </div>

              <AppointmentsTable appointments={appointments} />
              <RecallsTable recalls={recalls} />
            </>
          )}

          {activeTab === 'balances' && (
            <BalancesTab balanceData={balanceData} accountMembers={accountMembers} />
          )}

          {activeTab === 'contracts' && <ContractsTab />}
        </div>
      </div>

      <EditPatientModal
        isOpen={showEditPatient}
        onClose={() => setShowEditPatient(false)}
        onSave={handleSavePatient}
        patientData={patientData}
      />
    </div>
  );
}
