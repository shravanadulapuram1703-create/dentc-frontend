import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FileText, DollarSign, Plus, Filter, Calendar, Eye, X, FileCheck } from 'lucide-react';
import PaymentsAdjustments from '../patient/PaymentsAdjustments';
import AddProcedure from '../patient/AddProcedure';
import { components } from '../../styles/theme';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface LedgerTransaction {
  id: string;
  date: string;
  patientName: string;
  office: string;
  applyTo: string; // Responsible party initial
  code: string; // CDT code, AUTO, PMT, CLM-P, ADJ
  tooth: string;
  surface: string;
  type: 'P' | 'C'; // Production or Collection
  hasNotes: boolean;
  hasEOB: boolean;
  description: string;
  bill: string;
  duration: string;
  provider: string;
  estPat: number;
  estIns: number;
  amount: number;
  balance: number;
  user: string;
  status: 'Not Sent' | 'Sent' | 'Paid' | 'Partial' | 'Denied' | 'Posted' | '';
  transactionType: 'Procedure' | 'Patient Payment' | 'Insurance Payment' | 'Adjustment' | 'Claim Event';
  selected: boolean;
}

// No props needed - gets data from outlet context
export default function PatientLedger() {
  const { patient } = useOutletContext<{ patient: any }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ledger' | 'balances'>('ledger');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPaymentsAdjustments, setShowPaymentsAdjustments] = useState(false);
  const [showAddProcedure, setShowAddProcedure] = useState(false);

  // Get patient data from context
  const patientData = {
    id: patient?.id || '12345',
    name: patient?.name || 'Sarah Johnson',
    age: patient?.age || 28,
    gender: patient?.gender || 'F',
    dob: patient?.dob || '05/22/1996',
    responsibleParty: patient?.responsibleParty || 'Self',
    homeOffice: patient?.homeOffice || 'Cranberry Dental Arts [108]',
    primaryInsurance: patient?.primaryInsurance || 'Delta Dental PPO',
    secondaryInsurance: patient?.secondaryInsurance || '',
    accountBalance: patient?.accountBalance || 1245.00,
    estInsurance: patient?.estInsurance || 850.00,
    estPatient: patient?.estPatient || 395.00,
    firstVisit: patient?.firstVisit || '01/15/2018',
    lastVisit: patient?.lastVisit || '11/20/2024',
    nextVisit: patient?.nextVisit || '01/15/2025',
    nextRecall: patient?.nextRecall || '05/20/2025'
  };

  // Mock ledger transactions
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([
    {
      id: '1',
      date: '12/15/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'D0150',
      tooth: '',
      surface: '',
      type: 'P',
      hasNotes: true,
      hasEOB: false,
      description: 'Comprehensive Oral Evaluation',
      bill: 'P',
      duration: '30',
      provider: 'Dr. Jinna',
      estPat: 35.00,
      estIns: 85.00,
      amount: 120.00,
      balance: 1245.00,
      user: 'ADMIN',
      status: 'Not Sent',
      transactionType: 'Procedure',
      selected: false
    },
    {
      id: '2',
      date: '12/15/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'D1110',
      tooth: '',
      surface: '',
      type: 'P',
      hasNotes: true,
      hasEOB: false,
      description: 'Prophylaxis - Adult',
      bill: 'P',
      duration: '45',
      provider: 'Dr. Jinna',
      estPat: 20.00,
      estIns: 80.00,
      amount: 100.00,
      balance: 1345.00,
      user: 'ADMIN',
      status: 'Not Sent',
      transactionType: 'Procedure',
      selected: false
    },
    {
      id: '3',
      date: '12/15/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'D0274',
      tooth: '',
      surface: '',
      type: 'P',
      hasNotes: false,
      hasEOB: false,
      description: 'Bitewing - Four Films',
      bill: 'P',
      duration: '15',
      provider: 'Dr. Jinna',
      estPat: 10.00,
      estIns: 50.00,
      amount: 60.00,
      balance: 1405.00,
      user: 'ADMIN',
      status: 'Not Sent',
      transactionType: 'Procedure',
      selected: false
    },
    {
      id: '4',
      date: '11/20/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'D2391',
      tooth: '14',
      surface: 'MOD',
      type: 'P',
      hasNotes: true,
      hasEOB: true,
      description: 'Resin - One Surface Posterior',
      bill: 'P',
      duration: '60',
      provider: 'Dr. Smith',
      estPat: 50.00,
      estIns: 200.00,
      amount: 250.00,
      balance: 1405.00,
      user: 'ADMIN',
      status: 'Paid',
      transactionType: 'Procedure',
      selected: false
    },
    {
      id: '5',
      date: '11/25/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'CLM-P',
      tooth: '',
      surface: '',
      type: 'C',
      hasNotes: false,
      hasEOB: true,
      description: 'Insurance Payment - Delta Dental',
      bill: '',
      duration: '',
      provider: '',
      estPat: 0,
      estIns: -200.00,
      amount: -200.00,
      balance: 1205.00,
      user: 'AUTO',
      status: 'Posted',
      transactionType: 'Insurance Payment',
      selected: false
    },
    {
      id: '6',
      date: '11/25/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'PMT',
      tooth: '',
      surface: '',
      type: 'C',
      hasNotes: false,
      hasEOB: false,
      description: 'Patient Payment - Check #1234',
      bill: '',
      duration: '',
      provider: '',
      estPat: -50.00,
      estIns: 0,
      amount: -50.00,
      balance: 1155.00,
      user: 'ADMIN',
      status: 'Posted',
      transactionType: 'Patient Payment',
      selected: false
    },
    {
      id: '7',
      date: '10/10/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'D2740',
      tooth: '3',
      surface: '',
      type: 'P',
      hasNotes: true,
      hasEOB: true,
      description: 'Crown - Porcelain Fused to High Noble Metal',
      bill: 'P',
      duration: '90',
      provider: 'Dr. Smith',
      estPat: 300.00,
      estIns: 650.00,
      amount: 950.00,
      balance: 1205.00,
      user: 'ADMIN',
      status: 'Partial',
      transactionType: 'Procedure',
      selected: false
    },
    {
      id: '8',
      date: '10/15/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'CLM-P',
      tooth: '',
      surface: '',
      type: 'C',
      hasNotes: false,
      hasEOB: true,
      description: 'Insurance Payment - Delta Dental',
      bill: '',
      duration: '',
      provider: '',
      estPat: 0,
      estIns: -650.00,
      amount: -650.00,
      balance: 555.00,
      user: 'AUTO',
      status: 'Posted',
      transactionType: 'Insurance Payment',
      selected: false
    },
    {
      id: '9',
      date: '10/15/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'ADJ',
      tooth: '',
      surface: '',
      type: 'C',
      hasNotes: true,
      hasEOB: false,
      description: 'Contractual Adjustment - Insurance Write-off',
      bill: '',
      duration: '',
      provider: '',
      estPat: 0,
      estIns: 0,
      amount: -100.00,
      balance: 455.00,
      user: 'ADMIN',
      status: '',
      transactionType: 'Adjustment',
      selected: false
    },
    {
      id: '10',
      date: '10/20/2024',
      patientName: 'Miller, Nicolas',
      office: 'Moon, PA',
      applyTo: 'M',
      code: 'PMT',
      tooth: '',
      surface: '',
      type: 'C',
      hasNotes: false,
      hasEOB: false,
      description: 'Patient Payment - Credit Card',
      bill: '',
      duration: '',
      provider: '',
      estPat: -210.00,
      estIns: 0,
      amount: -210.00,
      balance: 245.00,
      user: 'ADMIN',
      status: 'Posted',
      transactionType: 'Patient Payment',
      selected: false
    }
  ]);

  // Balances and aging
  const balanceData = {
    accountBalance: 1245.00,
    patientBalance: 395.00,
    current: 280.00,
    age30: 65.00,
    age60: 35.00,
    age90: 15.00,
    age120: 0.00,
    estInsurance: 850.00,
    estPatient: 395.00,
    todayCharges: 280.00,
    lastInsPmt: 200.00,
    lastInsPmtDate: '11/25/2024',
    lastPatPmt: 50.00,
    lastPatPmtDate: '11/25/2024'
  };

  // Calculate pagination
  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const displayedTransactions = transactions.slice(startIndex, endIndex);

  // Toggle selection
  const handleToggleSelection = (id: string) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  // Select all
  const handleSelectAll = (checked: boolean) => {
    setTransactions(transactions.map(t => 
      t.status === 'Not Sent' && t.transactionType === 'Procedure' 
        ? { ...t, selected: checked } 
        : t
    ));
  };

  // Check if any procedures are selected
  const selectedProcedures = transactions.filter(t => t.selected && t.status === 'Not Sent');
  const canCreateClaim = selectedProcedures.length > 0;

  // Handle create claim
  const handleCreateClaim = () => {
    if (canCreateClaim) {
      // Generate a unique claim ID
      const claimId = `CLM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
      // Navigate to Claim Detail screen with selected procedures
      navigate(`/patient/${patientData.id}/claim/${claimId}`, {
        state: { 
          procedures: selectedProcedures,
          createdDate: new Date().toLocaleDateString('en-US'),
          createdTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          createdBy: 'ADMIN'
        }
      });
    }
  };

  // Handle add procedure
  const handleAddProcedure = () => {
    setShowAddProcedure(true);
  };

  // Handle save procedure from AddProcedure modal
  const handleSaveProcedure = (newProcedure: any) => {
    // STEP 11: Add to ledger and recalculate balances
    const newTransaction: LedgerTransaction = {
      id: newProcedure.id,
      date: newProcedure.date,
      patientName: newProcedure.patientName,
      office: newProcedure.office,
      applyTo: 'M',
      code: newProcedure.code,
      tooth: newProcedure.tooth,
      surface: newProcedure.surfaces,
      type: 'P',
      hasNotes: newProcedure.notes ? true : false,
      hasEOB: false,
      description: newProcedure.description,
      bill: 'P',
      duration: newProcedure.duration,
      provider: newProcedure.provider,
      estPat: newProcedure.estPatient,
      estIns: newProcedure.estInsurance,
      amount: newProcedure.fee,
      balance: transactions[0]?.balance + newProcedure.fee || newProcedure.fee,
      user: newProcedure.createdBy,
      status: 'Not Sent',
      transactionType: 'Procedure',
      selected: false
    };

    // Add to top of transactions list
    setTransactions([newTransaction, ...transactions]);
    
    // Success message
    alert(`Procedure ${newProcedure.code} added successfully to ledger!`);
  };

  // Handle payments/adjustments
  const handlePaymentsAdjustments = () => {
    setShowPaymentsAdjustments(true);
  };

  return (
    <div className="p-6 bg-slate-50">
      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button 
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          PATIENT LEDGER
        </button>
        
        <button 
          onClick={handleCreateClaim}
          disabled={!canCreateClaim}
          className={`px-6 py-2 rounded flex items-center gap-2 transition-colors ${
            canCreateClaim 
              ? components.buttonSecondary
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4" />
          CREATE CLAIM
        </button>
        
        <button 
          onClick={handlePaymentsAdjustments}
          className={components.buttonSuccess + " flex items-center gap-2"}
        >
          <DollarSign className="w-4 h-4" />
          PAYMENTS / ADJUSTMENTS
        </button>
        
        <button 
          onClick={handleAddProcedure}
          className={components.buttonPrimary + " flex items-center gap-2"}
        >
          <Plus className="w-4 h-4" />
          ADD PROCEDURE
        </button>

        <button className={components.buttonSecondary}>
          BALANCE STATEMENT
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className={components.label}>Sort By:</label>
          <select className={components.select}>
            <option>Date</option>
            <option>Amount</option>
            <option>Provider</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-[#E2E8F0] rounded-lg shadow-sm">
        <div className="flex border-b-2 border-[#E2E8F0] bg-[#F7F9FC]">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-b-4 transition-colors ${
              activeTab === 'ledger'
                ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50'
            }`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-b-4 transition-colors ${
              activeTab === 'balances'
                ? 'border-[#3A6EA5] text-[#3A6EA5] bg-white'
                : 'border-transparent text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50'
            }`}
          >
            Balances
          </button>
        </div>

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <div>
            {/* Ledger Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B] sticky top-0">
                  <tr>
                    <th className="w-[40px] px-2 py-3 text-left">
                      <input 
                        type="checkbox" 
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="w-[95px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">POSTED</span>
                        </TooltipTrigger>
                        <TooltipContent>Date the transaction was posted to the account</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[120px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">MEMBER</span>
                        </TooltipTrigger>
                        <TooltipContent>Patient associated with this transaction</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[80px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">LOC</span>
                        </TooltipTrigger>
                        <TooltipContent>Office or location where the transaction occurred</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[60px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">APPLY</span>
                        </TooltipTrigger>
                        <TooltipContent>Indicates who the transaction is applied to (Patient or Responsible Party)</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[80px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">PROC</span>
                        </TooltipTrigger>
                        <TooltipContent>Procedure or transaction code associated with this entry</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[60px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">TOOTH</span>
                        </TooltipTrigger>
                        <TooltipContent>Tooth number related to the procedure</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[60px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">AREA</span>
                        </TooltipTrigger>
                        <TooltipContent>Tooth surface(s) involved in the procedure</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[50px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">TYPE</span>
                        </TooltipTrigger>
                        <TooltipContent>Financial type of the transaction (Production or Collection)</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[50px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">NOTES</span>
                        </TooltipTrigger>
                        <TooltipContent>Indicates whether notes exist for this transaction</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[50px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">DOCS</span>
                        </TooltipTrigger>
                        <TooltipContent>Indicates whether supporting documents or EOBs are attached</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[260px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">DETAILS</span>
                        </TooltipTrigger>
                        <TooltipContent>Description of the procedure or transaction</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[70px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">BILLING</span>
                        </TooltipTrigger>
                        <TooltipContent>Billing status and order used for insurance processing</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[60px] px-2 py-3 text-center text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">TIME</span>
                        </TooltipTrigger>
                        <TooltipContent>Duration of the procedure in minutes</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[100px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">RENDERED BY</span>
                        </TooltipTrigger>
                        <TooltipContent>Provider who performed the procedure</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[90px] px-2 py-3 text-right text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">PAT EST</span>
                        </TooltipTrigger>
                        <TooltipContent>Estimated portion expected from the patient</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[90px] px-2 py-3 text-right text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">INS EST</span>
                        </TooltipTrigger>
                        <TooltipContent>Estimated portion expected from insurance</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[100px] px-2 py-3 text-right text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">POSTED AMT</span>
                        </TooltipTrigger>
                        <TooltipContent>Actual posted transaction amount</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[110px] px-2 py-3 text-right text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">RUNNING BAL</span>
                        </TooltipTrigger>
                        <TooltipContent>Account balance after this transaction</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="w-[80px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">CREATED BY</span>
                        </TooltipTrigger>
                        <TooltipContent>User who created or posted this transaction</TooltipContent>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((txn, index) => (
                    <tr 
                      key={txn.id} 
                      className={`border-b hover:bg-gray-50 ${
                        txn.status === 'Not Sent' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="w-[40px] px-2 py-2">
                        {txn.status === 'Not Sent' && txn.transactionType === 'Procedure' && (
                          <input 
                            type="checkbox" 
                            checked={txn.selected}
                            onChange={() => handleToggleSelection(txn.id)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="w-[95px] px-2 py-2 text-gray-900 font-mono truncate">{txn.date}</td>
                      <td className="w-[120px] px-2 py-2 text-gray-900 text-xs truncate">{txn.patientName}</td>
                      <td className="w-[80px] px-2 py-2 text-gray-700 text-xs truncate">{txn.office}</td>
                      <td className="w-[60px] px-2 py-2 text-gray-700 text-center font-mono">{txn.applyTo}</td>
                      <td className="w-[80px] px-2 py-2">
                        <span className={`text-xs px-1 py-0.5 rounded font-mono ${
                          txn.code === 'PMT' ? 'bg-green-100 text-green-800' :
                          txn.code === 'CLM-P' ? 'bg-blue-100 text-blue-800' :
                          txn.code === 'ADJ' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {txn.code}
                        </span>
                      </td>
                      <td className="w-[60px] px-2 py-2 text-gray-700 text-center font-mono">{txn.tooth}</td>
                      <td className="w-[60px] px-2 py-2 text-gray-700 text-xs text-center font-mono">{txn.surface}</td>
                      <td className="w-[50px] px-2 py-2 text-gray-700 text-center font-mono">{txn.type}</td>
                      <td className="w-[50px] px-2 py-2 text-center">
                        {txn.hasNotes && <FileText className="w-3 h-3 text-blue-600 inline" />}
                      </td>
                      <td className="w-[50px] px-2 py-2 text-center">
                        {txn.hasEOB && <FileText className="w-3 h-3 text-green-600 inline" />}
                      </td>
                      <td className="w-[260px] px-2 py-2 text-gray-900 text-xs truncate">{txn.description}</td>
                      <td className="w-[70px] px-2 py-2 text-gray-700 text-center font-mono">{txn.bill}</td>
                      <td className="w-[60px] px-2 py-2 text-gray-700 text-xs text-center font-mono">{txn.duration}</td>
                      <td className="w-[100px] px-2 py-2 text-gray-700 text-xs truncate">{txn.provider}</td>
                      <td className="w-[90px] px-2 py-2 text-right text-red-700 font-mono">
                        {txn.estPat !== 0 ? `$${Math.abs(txn.estPat).toFixed(2)}` : ''}
                      </td>
                      <td className="w-[90px] px-2 py-2 text-right text-blue-700 font-mono">
                        {txn.estIns !== 0 ? `$${Math.abs(txn.estIns).toFixed(2)}` : ''}
                      </td>
                      <td className={`w-[100px] px-2 py-2 text-right font-mono ${
                        txn.amount < 0 ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        ${Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="w-[110px] px-2 py-2 text-right text-gray-900 font-mono">
                        ${txn.balance.toFixed(2)}
                      </td>
                      <td className="w-[80px] px-2 py-2 text-gray-700 text-xs truncate">{txn.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Showing {startIndex + 1} to {endIndex} of {totalItems}</span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border rounded text-gray-700"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Account Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Account Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Account Balance:</span>
                    <span className="text-gray-900">${balanceData.accountBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Patient Balance:</span>
                    <span className="text-red-700">${balanceData.patientBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Estimated Insurance:</span>
                    <span className="text-blue-700">${balanceData.estInsurance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Estimated Patient:</span>
                    <span className="text-red-700">${balanceData.estPatient.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Aging Buckets */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Aging Buckets</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Current:</span>
                    <span className="text-gray-900">${balanceData.current.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">30 Days:</span>
                    <span className="text-gray-900">${balanceData.age30.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">60 Days:</span>
                    <span className="text-orange-600">${balanceData.age60.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">90 Days:</span>
                    <span className="text-orange-700">${balanceData.age90.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">120+ Days:</span>
                    <span className="text-red-700">${balanceData.age120.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Today's Charges:</span>
                    <span className="text-gray-900">${balanceData.todayCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Last Insurance Payment:</span>
                    <span className="text-blue-700">${balanceData.lastInsPmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700 text-xs">Date:</span>
                    <span className="text-gray-600 text-xs">{balanceData.lastInsPmtDate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Last Patient Payment:</span>
                    <span className="text-green-700">${balanceData.lastPatPmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700 text-xs">Date:</span>
                    <span className="text-gray-600 text-xs">{balanceData.lastPatPmtDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payments Adjustments Dialog */}
      {showPaymentsAdjustments && (
        <PaymentsAdjustments
          isOpen={showPaymentsAdjustments}
          onClose={() => setShowPaymentsAdjustments(false)}
          patientName={patientData.name}
          patientId={patientData.id}
        />
      )}

      {/* Add Procedure Dialog */}
      {showAddProcedure && (
        <AddProcedure
          isOpen={showAddProcedure}
          onClose={() => setShowAddProcedure(false)}
          patientName={patientData.name}
          patientId={patientData.id}
          office={patientData.homeOffice}
          onSave={handleSaveProcedure}
        />
      )}
    </div>
  );
}