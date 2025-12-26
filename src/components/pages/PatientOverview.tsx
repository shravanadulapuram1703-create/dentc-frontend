import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Edit2, Save, X, User, Phone, Mail, MapPin, Calendar, FileText, AlertCircle, Plus, Archive, Eye, DollarSign } from 'lucide-react';
import EditPatientModal from '../modals/EditPatientModal';
import { components } from '../../styles/theme';

// No props needed - gets data from outlet context
export default function PatientOverview() {
  const { patient } = useOutletContext<{ patient: any }>();
  const [activeTab, setActiveTab] = useState<'summary' | 'balances' | 'contracts'>('summary');
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showEditResponsible, setShowEditResponsible] = useState(false);

  const handleSavePatient = (data: any) => {
    console.log('Saving patient data:', data);
    // Here you would typically send the data to your backend
  };

  // Mock patient data - in production, this comes from patient context
  const patientData = {
    name: patient?.name || 'Miller, Nicolas (Nick)',
    age: patient?.age || 32,
    sex: patient?.gender || 'M',
    dob: patient?.dob || '12/04/1993',
    patientId: patient?.id || '900097',
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

  const responsibleParty = {
    name: 'Miller, Nick',
    id: '900069',
    type: 'Cash',
    cellPhone: '814-473-3058',
    email: '',
    homeOffice: 'Excel Dental- Moon, PA'
  };

  const dentalInsurance = {
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

  const accountMembers = [
    { name: 'Miller, Nick', age: 32, sex: 'M', nextVisit: '12/19/2025', recall: '', lastVisit: '03/04/2017', active: 'Yes' },
    { name: 'Miller, Chloe', age: 30, sex: 'F', nextVisit: '-', recall: '-', lastVisit: '-', active: 'Yes' }
  ];

  const appointments = [
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

  const recalls = [
    { code: 'D110', age: '6 M -12', nextDate: '04/27/2026', freq: 'Prophylaxis - Adult' },
    { code: 'D0330', age: '3 Y - 1D', nextDate: '08/16/2023', freq: 'Panoramic Radiographic Image' }
  ];

  const balanceData = {
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
    <div className="p-6 bg-[#F7F9FC]">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Patient Information Section */}
        <div className="bg-white rounded-lg shadow border border-[#E2E8F0]">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide">PATIENT INFORMATION</h2>
            <button
              onClick={() => setShowEditPatient(true)}
              className={components.buttonSecondary + " flex items-center gap-2"}
            >
              <Edit2 className="w-4 h-4" strokeWidth={2} />
              EDIT
            </button>
          </div>
          <div className="p-6">
            <div className="flex gap-6 mb-6">
              {/* Patient Photo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0] flex items-center justify-center">
                  <User className="w-12 h-12 text-[#64748B]" strokeWidth={2} />
                </div>
              </div>

              {/* Patient Basic Info */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[#1E293B] font-bold mb-1">{patientData.name}</div>
                  <div className="text-[#475569] mb-1">{patientData.age} / {patientData.sex}</div>
                  <div className="text-[#EF4444] cursor-pointer hover:underline font-semibold">
                    (C) {patientData.homePhone}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Calendar className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">DOB</div>
                      <div className="text-[#1E293B] font-semibold">{patientData.dob}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">ID</div>
                      <div className="text-[#1E293B] font-semibold">{patientData.patientId}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Chart</div>
                      <div className="text-[#1E293B] font-semibold">{patientData.chartNum}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[#64748B] text-xs uppercase tracking-wide">Next Visit</div>
                  <div className="text-[#64748B] text-xs uppercase tracking-wide">Next Recall</div>
                  <div className="text-[#64748B] text-xs uppercase tracking-wide">Last Visit</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[#1E293B] font-semibold">{patientData.nextVisit}</div>
                  <div className="text-[#1E293B] font-semibold">{patientData.nextRecall || '-'}</div>
                  <div className="text-[#1E293B] font-semibold">{patientData.lastVisit || '-'}</div>
                </div>
              </div>
            </div>

            {/* Additional Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Provider</div>
                <div className="text-[#1E293B] font-semibold">{patientData.provider}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Referral Type</div>
                <div className="text-[#1E293B] font-semibold">{patientData.referralType}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Hygienist</div>
                <div className="text-[#1E293B] font-semibold">{patientData.hygienist || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Referred By</div>
                <div className="text-[#1E293B] font-semibold">{patientData.referredBy || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Home Office</div>
                <div className="text-[#1E293B] font-semibold">{patientData.homeOffice}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Referred To</div>
                <div className="text-[#1E293B] font-semibold">{patientData.referredTo || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">First Visit</div>
                <div className="text-[#1E293B] font-semibold">{patientData.firstVisit}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Last Pano Chart</div>
                <div className="text-[#1E293B] font-semibold">{patientData.lastPanoChart || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Home</div>
                <div className="text-[#EF4444] font-semibold">{patientData.homePhone || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Contact Pref</div>
                <div className="text-[#1E293B] font-semibold">{patientData.contactPref || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Work</div>
                <div className="text-[#1E293B] font-semibold">{patientData.workPhone || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Fee Schedule a</div>
                <div className="text-[#1E293B] font-semibold">{patientData.feeSchedule}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Address</div>
                <div className="text-[#1E293B] font-semibold">{patientData.address}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Type</div>
                <div className="text-[#1E293B] font-semibold">{patientData.type || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">City, State and Zip</div>
                <div className="text-[#1E293B] font-semibold">{patientData.city}, {patientData.state} {patientData.zip}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Preferred Language</div>
                <div className="text-[#1E293B] font-semibold">{patientData.preferredLanguage}</div>
              </div>
            </div>

            {/* Medical Alerts */}
            {patientData.medicalAlerts && (
              <div className={components.alertError + " mt-4"}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#EF4444]" strokeWidth={2} />
                  <span className="font-semibold">Medical Alerts: {patientData.medicalAlerts}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Responsible Party Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
              <h2 className="text-white font-bold uppercase tracking-wide">RESPONSIBLE PARTY</h2>
              <button
                onClick={() => setShowEditResponsible(true)}
                className={components.buttonSecondary + " flex items-center gap-2"}
              >
                <Edit2 className="w-4 h-4" strokeWidth={2} />
                EDIT
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Name</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.name}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Cell</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.cellPhone}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Responsible Party ID</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.id}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Email</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.email || '-'}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Type</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.type}</div>
              </div>
              <div>
                <div className="text-[#64748B] text-xs uppercase tracking-wide">Home Office</div>
                <div className="text-[#1E293B] font-semibold">{responsibleParty.homeOffice}</div>
              </div>
            </div>
          </div>

          {/* Insurance Sections */}
          <div className="bg-white rounded-lg shadow border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
              <h2 className="text-white font-bold uppercase tracking-wide">DENTAL INS PRI / SEC</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Primary Insurance */}
                <div>
                  <div className="text-[#1F3A5F] font-bold mb-3 pb-2 border-b-2 border-[#E2E8F0] uppercase tracking-wide">Primary</div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Carrier Name</div>
                      <div className="text-[#1E293B] font-semibold">{dentalInsurance.primary.carrierName}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Group Number</div>
                      <div className="text-[#1E293B] font-semibold">{dentalInsurance.primary.groupNumber}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Carrier Phone</div>
                      <div className="text-[#1E293B] font-semibold">{dentalInsurance.primary.carrierPhone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Subscriber (Rel.)</div>
                      <div className="text-[#1E293B] font-semibold">{dentalInsurance.primary.subscriber}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Indl. Max (Rem.)</div>
                      <div className="text-[#2FB9A7] font-semibold">{dentalInsurance.primary.indMaxRemain}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B] text-xs uppercase tracking-wide">Indl. Ded (Rem.)</div>
                      <div className="text-[#1E293B] font-semibold">{dentalInsurance.primary.indDedRemain}</div>
                    </div>
                  </div>
                </div>

                {/* Secondary Insurance */}
                <div>
                  <div className="text-[#1F3A5F] font-bold mb-3 pb-2 border-b-2 border-[#E2E8F0] uppercase tracking-wide">Secondary</div>
                  <div className="text-[#94A3B8] italic text-sm">No secondary insurance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Insurance Placeholder */}
          <div className="bg-white rounded-lg shadow border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#EF4444] to-[#DC2626]">
              <h2 className="text-white font-bold uppercase tracking-wide">MEDICAL INS PRI / SEC</h2>
            </div>
            <div className="p-6">
              <div className="text-[#94A3B8] italic text-sm">No medical insurance configured</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Members */}
      <div className="bg-white rounded-lg shadow border border-[#E2E8F0] mb-6">
        <div className="p-4 border-b-2 border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <h2 className="text-white font-bold uppercase tracking-wide">ACCOUNT MEMBERS</h2>
          <button className={components.buttonSecondary + " flex items-center gap-2 !text-white !border-white hover:!bg-white/10"}>
            <Plus className="w-4 h-4" />
            ADD NEW MEMBER
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Member</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Age / Sex</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Next Visit</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Next Recall</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Sched Recall</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Last Visit</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {accountMembers.map((member, index) => (
                <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-6 py-4 text-[#1E293B] font-medium">{member.name}</td>
                  <td className="px-6 py-4 text-[#1E293B]">{member.age} / {member.sex}</td>
                  <td className="px-6 py-4 text-[#1E293B]">{member.nextVisit}</td>
                  <td className="px-6 py-4 text-[#1E293B]">{member.recall}</td>
                  <td className="px-6 py-4 text-[#1E293B]">-</td>
                  <td className="px-6 py-4 text-[#1E293B]">{member.lastVisit}</td>
                  <td className="px-6 py-4 text-[#1E293B]">{member.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-lg shadow border border-[#E2E8F0]">
        <div className="border-b-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <div className="flex gap-0 px-6">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wide transition-colors border-b-4 ${
                activeTab === 'summary'
                  ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50'
              }`}
            >
              SUMMARY
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wide transition-colors border-b-4 ${
                activeTab === 'balances'
                  ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50'
              }`}
            >
              BALANCES
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wide transition-colors border-b-4 ${
                activeTab === 'contracts'
                  ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50'
              }`}
            >
              CONTRACTS
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div>
              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button className={components.buttonPrimary + " flex items-center gap-2"}>
                  <Archive className="w-4 h-4" />
                  ARCHIVE APPT
                </button>
                <button className={components.buttonPrimary + " flex items-center gap-2"}>
                  <Plus className="w-4 h-4" />
                  ADD NEW APPT
                </button>
                <button className={components.buttonPrimary + " flex items-center gap-2"}>
                  <Eye className="w-4 h-4" />
                  VIEW FUTURE FAMILY APPT
                </button>
                <button className={components.buttonPrimary + " flex items-center gap-2"}>
                  <DollarSign className="w-4 h-4" />
                  BALANCES
                </button>
                <button className={components.buttonPrimary + " flex items-center gap-2 ml-auto"}>
                  <FileText className="w-4 h-4" />
                  LEDGER
                </button>
              </div>

              {/* Appointments Section */}
              <div className="mb-6">
                <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-4">APPOINTMENTS</h3>
                <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Appt Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Appt Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Office</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Operator</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Provider</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Last Updated</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Member</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Current</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 30</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 60</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 90</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 120</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Est Pat</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Est Ins</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {appointments.map((appt, index) => (
                        <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                          <td className="px-4 py-3 text-[#1E293B]">{appt.date}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.time}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.office}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.operator}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.provider}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.duration}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.status}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.lastUpdated}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.member}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.current}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.over30}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.over60}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.over90}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.over120}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.balance}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.estPat}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{appt.estIns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recalls Section */}
              <div>
                <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-4">RECALLS</h3>
                <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Next Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Freq</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Sch Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Sch Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Appoints Req</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Last Pat Day</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Rem Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Hsg</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Ortho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {recalls.map((recall, index) => (
                        <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                          <td className="px-4 py-3 text-[#1E293B]">{recall.code}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{recall.age}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{recall.nextDate}</td>
                          <td className="px-4 py-3 text-[#1E293B]">{recall.freq}</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                          <td className="px-4 py-3 text-[#1E293B]">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'balances' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-gray-600 mb-2">Account Balance</div>
                  <div className="text-red-600">{balanceData.accountBalance}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-gray-600 mb-2">Today's Charges</div>
                  <div className="text-yellow-600">{balanceData.todayCharges}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-gray-600 mb-2">Today's Est Insurance</div>
                  <div className="text-green-600">{balanceData.todayEstInsurance}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-gray-600 mb-2">Today's Est Patient</div>
                  <div className="text-blue-600">{balanceData.todayEstPatient}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-gray-900">Last Insurance Payment</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="text-gray-600">Amount: <span className="text-gray-900">{balanceData.lastInsPayment}</span></div>
                    <div className="text-gray-600">Date: <span className="text-gray-900">{balanceData.lastInsPaymentDate}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-gray-900">Last Patient Payment</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="text-gray-600">Amount: <span className="text-gray-900">{balanceData.lastPatPayment}</span></div>
                    <div className="text-gray-600">Date: <span className="text-gray-900">{balanceData.lastPatPaymentDate}</span></div>
                  </div>
                </div>
              </div>

              {/* Member Balances Table */}
              <div className="mt-6">
                <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-4">Member Balances</h3>
                <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Member</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Current</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 30</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 60</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 90</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Over 120</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {accountMembers.map((member, index) => (
                        <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                          <td className="px-4 py-3 text-[#1E293B]">{member.name}</td>
                          <td className="px-4 py-3 text-[#1E293B]">($177.73)</td>
                          <td className="px-4 py-3 text-[#1E293B]">$0.00</td>
                          <td className="px-4 py-3 text-[#1E293B]">$0.00</td>
                          <td className="px-4 py-3 text-[#1E293B]">$0.00</td>
                          <td className="px-4 py-3 text-[#1E293B]">$0.00</td>
                          <td className="px-4 py-3 text-[#1E293B]">($177.73)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-gray-700 mb-2">Payment Plans & Contracts</h3>
                <p className="text-gray-600">
                  This section will display regular patient payment plans, ortho patient payment plans, 
                  and ortho insurance payment plans. Feature available in future release.
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    EDIT ORTHO
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    EDIT REGULAR
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                  <div className="text-gray-600 mb-2">Regular Patient Payment Plan</div>
                  <div className="text-gray-400 italic">Not configured</div>
                </div>
                <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                  <div className="text-gray-600 mb-2">Ortho Patient Payment Plan</div>
                  <div className="text-gray-400 italic">Not configured</div>
                </div>
                <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
                  <div className="text-gray-600 mb-2">Ortho Insurance Payment Plan</div>
                  <div className="text-gray-400 italic">Not configured</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Patient Modal */}
      <EditPatientModal
        isOpen={showEditPatient}
        onClose={() => setShowEditPatient(false)}
        onSave={handleSavePatient}
        patientData={patientData}
      />
    </div>
  );
}