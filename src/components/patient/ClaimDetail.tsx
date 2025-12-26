import { useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { 
  Printer, 
  Send, 
  Save, 
  X, 
  CheckCircle, 
  Trash2,
  RefreshCw,
  Plus,
  Edit
} from 'lucide-react';
import { components } from '../../styles/theme';

interface ClaimProcedure {
  id: string;
  dos: string;
  code: string;
  tooth: string;
  surface: string;
  description: string;
  bref: string;
  submitted: number;
  fee: number;
  estIns: number;
  insPayD: number;
  insOverD: number;
  insAllocat: number;
  overDtc: number;
  writeOff1: number;
  writeOff2: number;
  writeOff3: number;
  otherIns: number;
  reasonCo: string;
}

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
}

interface OutletContext {
  patient: PatientData;
}

export default function ClaimDetail() {
  const navigate = useNavigate();
  const { patientId, claimId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  // DXC Validation Modal state
  const [showDXCModal, setShowDXCModal] = useState(true);
  const [dxcValidationMessages, setDxcValidationMessages] = useState<{
    type: 'warning' | 'info';
    messages: string[];
  }>({
    type: 'warning',
    messages: [
      'One or more procedures in this claim require attachments (e.g., X-rays).',
      'PATIENT INFORMATION DOES NOT MATCH SUBSCRIBER INFORMATION WHEN RELATIONSHIP IS "SELF"'
    ]
  });

  // Mock claim data
  const [claim] = useState({
    claimId: claimId || '108',
    pgid: '2829',
    status: 'Claim Created, Not Sent',
    createdDate: '12/19/2025',
    createdBy: 'UDAIVS',
    createdTime: '10/23/2025 11:06 AM PT',
    lastStatusUpdateDate: '',
    claimType: 'Dental',
    claimBillingOrder: 'Dental',
    claimDOSDates: '12/19/2025',
    claimSentDate: '',
    claimSentStatus: '',
    claimCloseDate: '',
    claimClosedBy: '',
    dxcAttachmentId: '',
    icd10Codes: '',
    
    // Patient/Subscriber Info
    patientName: 'Miller, Nicolas',
    patientId: '920097',
    patientDOB: '12/09/1993',
    subscriberName: 'Miller, Nick',
    subscriberID: 'mmmmm',
    subscriberDOB: '12/08/1993',
    responsibleParty: 'Miller, Nick',
    rpID: '920088',
    rpDOB: '12/08/1993',
    
    // Coverage Info
    insuranceCarrier: 'United Concordia',
    carrierPhone: '',
    groupPlan: '',
    benefitsUsed: '',
    employerName: 'No Employer',
    deductiblesUsed: '',
    
    // Billing Dentist
    billingDentist: 'Jinna, Onileaip DMD',
    
    // Treating Dentist
    treatingDentist: 'Sharma, Neha',
    
    // Amounts
    totalSubmittedFees: 1795.00,
    totalFee: 665.79,
    totalEstIns: 469.95,
    totalInsPaid: 0.00,
    variance: 469.95,
    checkNumber: '',
    bankNumber: '',
    eobNumber: '',
    
    // Flags
    attachmentRequired: true,
    dxcValidationMessage: 'DXC claim validation message:\nPATIENT INFORMATION DOES NOT MATCH SUBSCRIBER INFORMATION WHEN RELATIONSHIP IS "SELF"'
  });

  // Mock procedures in claim
  const [procedures] = useState<ClaimProcedure[]>([
    {
      id: '1',
      dos: '12/19/2025',
      code: 'D0140',
      tooth: '',
      surface: '-',
      description: 'Limited Oral Eval...',
      bref: '7/15',
      submitted: 100.00,
      fee: 36.59,
      estIns: 36.59,
      insPayD: 0.00,
      insOverD: 0.00,
      insAllocat: 0.00,
      overDtc: 0.00,
      writeOff1: 0.00,
      writeOff2: 0.00,
      writeOff3: 0.00,
      otherIns: 0.00,
      reasonCo: '-'
    },
    {
      id: '2',
      dos: '12/19/2025',
      code: 'D3330',
      tooth: '31',
      surface: '-',
      description: 'Endodontic Thera...',
      bref: '7/15',
      submitted: 1600.00,
      fee: 629.20,
      estIns: 433.36,
      insPayD: 0.00,
      insOverD: 0.00,
      insAllocat: 0.00,
      overDtc: 0.00,
      writeOff1: 0.00,
      writeOff2: 0.00,
      writeOff3: 0.00,
      otherIns: 0.00,
      reasonCo: '-'
    }
  ]);

  const totalRow = {
    submitted: procedures.reduce((sum, p) => sum + p.submitted, 0),
    fee: procedures.reduce((sum, p) => sum + p.fee, 0),
    estIns: procedures.reduce((sum, p) => sum + p.estIns, 0),
    insPayD: 0.00,
    insOverD: 0.00,
    insAllocat: 0.00,
    overDtc: 0.00,
    writeOff1: 0.00,
    writeOff2: 0.00,
    writeOff3: 0.00,
    otherIns: 0.00
  };

  const handleDXCValidate = () => {
    alert('Validating claim with DentalXchange...');
  };

  const handleDXCAttachment = () => {
    alert('Opening DXC Attachment Manager...');
  };

  const handleClaimFillOut = () => {
    alert('Opening Claim Fill-Out Information...');
  };

  const handleInsurancePayment = () => {
    alert('Opening Insurance Payment Entry...');
  };

  const handleDeleteClaim = () => {
    if (confirm('Are you sure you want to delete this claim?')) {
      alert('Claim deleted');
      navigate(`/patient/${patientId}/ledger`);
    }
  };

  const handleDirectPrint = () => {
    alert('Printing ADA Dental Claim Form...');
  };

  const handleCloseClaim = () => {
    if (confirm('Are you sure you want to close this claim?')) {
      alert('Claim closed');
      navigate(`/patient/${patientId}/ledger`);
    }
  };

  const handleEClaim = () => {
    alert('Adding claim to E-Claim batch queue...');
  };

  const handleUpdateStatus = () => {
    alert('Updating claim status from DentalXchange...');
  };

  const handleSave = () => {
    alert('Claim saved');
  };

  const handleCancel = () => {
    navigate(`/patient/${patientId}/ledger`);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* DXC Validation Modal */}
      {showDXCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-2xl border-4 max-w-md w-full mx-4 ${
            dxcValidationMessages.type === 'warning' 
              ? 'border-orange-500' 
              : 'border-green-500'
          }`}>
            <div className={`px-6 py-4 rounded-t-lg ${
              dxcValidationMessages.type === 'warning' 
                ? 'bg-orange-100 border-b-2 border-orange-300' 
                : 'bg-green-100 border-b-2 border-green-300'
            }`}>
              <h3 className={`font-bold ${
                dxcValidationMessages.type === 'warning' 
                  ? 'text-orange-900' 
                  : 'text-green-900'
              }`}>
                DXC Claim Validation Message
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {dxcValidationMessages.messages.map((msg, idx) => (
                  <p key={idx} className={`text-sm ${
                    dxcValidationMessages.type === 'warning' 
                      ? 'text-orange-900' 
                      : 'text-green-900'
                  }`}>
                    {msg}
                  </p>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowDXCModal(false)}
                className={components.buttonPrimary}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between border-b-2 border-[#16293B]">
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            Primary Dental Insurance Claim
          </h1>
          <div className="text-white text-sm font-bold">
            PGID {claim.pgid} / CID-CLM-{claim.claimId}
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="bg-white border-b-2 border-[#E2E8F0] px-6 py-3 flex items-center gap-3">
          <button
            onClick={handleDXCValidate}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            DXC - VALIDATE CLAIM
          </button>
          <button
            onClick={handleDXCAttachment}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            DXC CLAIM ATTACHMENT
          </button>
          <button
            onClick={handleClaimFillOut}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            CLAIM FILL-OUT INFORMATION
          </button>
          <button
            onClick={handleInsurancePayment}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            INSURANCE PAYMENT
          </button>
        </div>

        {/* Main Content Area */}
        <div className="relative px-6 py-4 bg-[#F7F9FC]">
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Patient / Subscriber Information */}
              <div className={components.card}>
                <div className={components.cardHeader + " bg-[#E8EFF7]"}>
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Patient / Subscriber Information</h2>
                </div>
                <div className={components.cardBody}>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Patient Name</label>
                      <p className="font-semibold text-slate-900">{claim.patientName}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Pat ID</label>
                      <p className="font-semibold text-slate-900">{claim.patientId}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Pat DOB</label>
                      <p className="font-semibold text-slate-900">{claim.patientDOB}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Subscriber Name</label>
                      <p className="font-semibold text-slate-900">{claim.subscriberName}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Sub ID</label>
                      <p className="font-semibold text-slate-900">{claim.subscriberID}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Sub DOB</label>
                      <p className="font-semibold text-slate-900">{claim.subscriberDOB}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Responsible Party</label>
                      <p className="font-semibold text-slate-900">{claim.responsibleParty}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">RP ID</label>
                      <p className="font-semibold text-slate-900">{claim.rpID}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">RP DOB</label>
                      <p className="font-semibold text-slate-900">{claim.rpDOB}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Dentist */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Billing Dentist</h2>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600">Name</label>
                    <p className="text-xs font-semibold text-[#3A6EA5] flex items-center gap-1">
                      <Edit className="w-3 h-3" strokeWidth={2} />
                      {claim.billingDentist}
                    </p>
                  </div>
                </div>
              </div>

              {/* Procedures in this Claim */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Procedures in this Claim</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                      <tr>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">DOS</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Code</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Th</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Surf</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Description</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Bref</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Submitted...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Fee</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Est. Ins</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Ins Pay D...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Ins Over D...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Ins Allocat...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Over Dtc ©</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Write-Off...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Write-Off...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Write-Off...</th>
                        <th className="px-2 py-2 text-right font-bold whitespace-nowrap uppercase tracking-wide">Other Ins...</th>
                        <th className="px-2 py-2 text-left font-bold whitespace-nowrap uppercase tracking-wide">Reason Co...</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {procedures.map((proc) => (
                        <tr key={proc.id} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-slate-900">{proc.dos}</td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                              {proc.code}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-slate-900 text-center">{proc.tooth || '-'}</td>
                          <td className="px-2 py-1.5 text-slate-900">{proc.surface}</td>
                          <td className="px-2 py-1.5 text-slate-900">{proc.description}</td>
                          <td className="px-2 py-1.5 text-slate-900">{proc.bref}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.submitted.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.fee.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.estIns.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.insPayD.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.insOverD.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.insAllocat.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.overDtc.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.writeOff1.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.writeOff2.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.writeOff3.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-900">${proc.otherIns.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-slate-900">{proc.reasonCo}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={6} className="px-2 py-1.5 text-right">Total</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.submitted.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.fee.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.estIns.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.insPayD.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.insOverD.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.insAllocat.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.overDtc.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.writeOff1.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.writeOff2.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.writeOff3.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right text-slate-900">${totalRow.otherIns.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Claim Info */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Claim Info</h2>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Claim ID</label>
                      <p className="font-semibold text-slate-900">{claim.claimId}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Claim Billing Order</label>
                      <p className="font-semibold text-slate-900">{claim.claimBillingOrder}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Claim DOS Dates</label>
                      <p className="font-semibold text-slate-900">{claim.claimDOSDates}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Claim Created By / On</label>
                      <p className="font-semibold text-slate-900">{claim.createdBy} {claim.createdTime}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Last Status Update Date</label>
                      <p className="font-semibold text-slate-900">{claim.lastStatusUpdateDate || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">ICD-10 (Diagnostic Codes)</label>
                      <p className="font-semibold text-slate-900">{claim.icd10Codes || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Coverage Information */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Coverage Information</h2>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-0.5">Carrier Name</label>
                      <p className="font-semibold text-slate-900">{claim.insuranceCarrier}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Group Plan</label>
                      <p className="font-semibold text-slate-900">{claim.groupPlan || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Carrier Phone</label>
                      <p className="font-semibold text-slate-900">{claim.carrierPhone || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Benefits Used</label>
                      <p className="font-semibold text-slate-900">{claim.benefitsUsed || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Employer Name</label>
                      <p className="font-semibold text-slate-900">{claim.employerName}</p>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Deductibles Used</label>
                      <p className="font-semibold text-slate-900">{claim.deductiblesUsed || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Treating Dentist */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Treating Dentist</h2>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600">Name</label>
                    <p className="text-xs font-semibold text-[#3A6EA5] flex items-center gap-1">
                      <Edit className="w-3 h-3" strokeWidth={2} />
                      {claim.treatingDentist}
                    </p>
                  </div>
                </div>
              </div>

              {/* Claim Status */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Claim Status</h2>
                </div>
                <div className="p-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <label className="text-slate-600">Claim Sent Date / Claim Type</label>
                      <p className="font-semibold text-slate-900">{claim.claimSentDate || '-'}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">Claim Sent Status</label>
                      <p className="font-bold text-orange-600">{claim.status}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">Claim Close Date</label>
                      <p className="font-semibold text-slate-900">{claim.claimCloseDate || '-'}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">Claim Closed By</label>
                      <p className="font-semibold text-slate-900">{claim.claimClosedBy || '-'}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">Claim Status</label>
                      <p className="font-semibold text-slate-900">{claim.status}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">DXC Attachment ID</label>
                      <p className="font-semibold text-slate-900">{claim.dxcAttachmentId || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance Payment */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded">
                <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0]">
                  <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Insurance Payment</h2>
                </div>
                <div className="p-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <label className="text-slate-600">a. Total Submitted Fees</label>
                      <p className="font-bold text-slate-900">${claim.totalSubmittedFees.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">b. Total Fee</label>
                      <p className="font-bold text-slate-900">${claim.totalFee.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">c. Total Est. Ins</label>
                      <p className="font-bold text-slate-900">${claim.totalEstIns.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">d. Total Ins. Paid</label>
                      <p className="font-bold text-slate-900">${claim.totalInsPaid.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <label className="text-slate-900 font-bold">e. Variance (c-d)</label>
                      <p className="font-bold text-orange-600">${claim.variance.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between pt-2">
                      <label className="text-slate-600">Check #</label>
                      <p className="font-semibold text-slate-900">{claim.checkNumber || '-'}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">Bank #</label>
                      <p className="font-semibold text-slate-900">{claim.bankNumber || '-'}</p>
                    </div>
                    <div className="flex justify-between">
                      <label className="text-slate-600">EOB #</label>
                      <p className="font-semibold text-slate-900">{claim.eobNumber || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Claim Notes Section */}
          <div className="mt-4 bg-white border-2 border-[#E2E8F0] rounded">
            <div className="bg-[#E8EFF7] px-3 py-1.5 border-b-2 border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Claim Notes</h2>
              <button className={components.buttonSecondary + " text-xs flex items-center gap-1"}>
                <Plus className="w-3 h-3" strokeWidth={2} />
                ADD NOTE MACROS
              </button>
            </div>
            <div className="p-3 min-h-[80px]">
              <p className="text-xs text-slate-500 italic">No notes added yet.</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-3 flex items-center justify-center gap-3">
          <button
            onClick={handleDeleteClaim}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            DELETE CLAIM
          </button>
          <button
            onClick={handleDirectPrint}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <Printer className="w-4 h-4" strokeWidth={2} />
            DIRECT PRINT
          </button>
          <button
            onClick={handleCloseClaim}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <CheckCircle className="w-4 h-4" strokeWidth={2} />
            CLOSE CLAIM
          </button>
          <button
            onClick={handleEClaim}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <Send className="w-4 h-4" strokeWidth={2} />
            E-CLAIM
          </button>
          <button
            onClick={handleUpdateStatus}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            UPDATE STATUS
          </button>
          <button
            onClick={handleSave}
            className={components.buttonPrimary + " flex items-center gap-2"}
          >
            <Save className="w-4 h-4" strokeWidth={2} />
            SAVE
          </button>
          <button
            onClick={handleCancel}
            className={components.buttonSecondary + " flex items-center gap-2"}
          >
            <X className="w-4 h-4" strokeWidth={2} />
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}