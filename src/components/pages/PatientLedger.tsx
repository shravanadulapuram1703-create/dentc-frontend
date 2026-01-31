import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { FileText, DollarSign, Plus, Filter, Calendar, Eye, X, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import PaymentsAdjustments from '../patient/PaymentsAdjustments';
import AddProcedure from '../patient/AddProcedure';
import { components } from '../../styles/theme';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import {
  getPatientLedger,
  getPatientBalances,
  createClaim,
  type LedgerEntry,
  type BalancesResponse,
} from '../../services/ledgerApi';

interface LedgerTransaction {
  id: string;
  date: string; // Formatted date and time string for display
  postedDateTime: number; // Timestamp (milliseconds) for sorting
  patientName: string;
  office: string;
  applyTo: string;
  code: string;
  tooth: string;
  surface: string;
  type: 'P' | 'C';
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
  procedure_id: string | null;
  claim_id: string | null; // If not null, procedure is already in a claim
}

// Helper function to format date only from YYYY-MM-DD to MM/DD/YYYY
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Helper function to format date and time from ISO string to MM/DD/YYYY HH:MM AM/PM
const formatDateTime = (dateStr: string, timeStr?: string): string => {
  try {
    // If dateStr includes time (ISO format), use it directly
    let dateTimeStr = dateStr;
    if (timeStr && !dateStr.includes('T')) {
      // If we have a separate time string and date doesn't have time, combine them
      dateTimeStr = `${dateStr}T${timeStr}`;
    }
    
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return original if invalid
    }
    
    // Format as MM/DD/YYYY HH:MM AM/PM
    const datePart = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timePart = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${datePart} ${timePart}`;
  } catch {
    return dateStr;
  }
};

// Helper function to get Date object for sorting (returns timestamp for reliable sorting)
const getDateTimeForSorting = (dateTimeStr: string): number => {
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      // If invalid, return 0 as fallback (will sort to beginning/end)
      console.warn('Invalid date for sorting:', dateTimeStr);
      return 0;
    }
    // Return timestamp (milliseconds since epoch) for reliable numeric sorting
    return date.getTime();
  } catch (error) {
    console.warn('Error parsing date for sorting:', dateTimeStr, error);
    return 0;
  }
};

// Helper function to map API status to UI status
const mapStatus = (status: string): LedgerTransaction['status'] => {
  const statusMap: Record<string, LedgerTransaction['status']> = {
    'not_sent': 'Not Sent',
    'sent': 'Sent',
    'paid': 'Paid',
    'partial': 'Partial',
    'denied': 'Denied',
    'posted': 'Posted',
  };
  return statusMap[status] || '';
};

// Helper function to map API transaction type to UI transaction type
const mapTransactionType = (type: string): LedgerTransaction['transactionType'] => {
  const typeMap: Record<string, LedgerTransaction['transactionType']> = {
    'procedure': 'Procedure',
    'patient_payment': 'Patient Payment',
    'insurance_payment': 'Insurance Payment',
    'adjustment': 'Adjustment',
    'claim_event': 'Claim Event',
  };
  return typeMap[type] || 'Procedure';
};

// Helper function to convert API LedgerEntry to UI LedgerTransaction
const mapLedgerEntryToTransaction = (entry: LedgerEntry): LedgerTransaction => {
  // Use created_at for time if posted_date doesn't have time component
  // Extract time from created_at (format: YYYY-MM-DDTHH:mm:ssZ)
  const postedDate = entry.posted_date || '';
  const createdAt = entry.created_at || '';
  
  // Determine the datetime to use for sorting and display
  let dateTimeForSorting: string;
  let timeStrForDisplay: string | undefined;
  
  if (postedDate.includes('T')) {
    // posted_date already has time component
    dateTimeForSorting = postedDate;
    timeStrForDisplay = undefined; // formatDateTime will use the full string
  } else if (createdAt.includes('T')) {
    // posted_date is just a date, use created_at time
    // Extract time from created_at (format: HH:mm:ss or HH:mm:ssZ)
    const timeMatch = createdAt.match(/T(\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/);
    if (timeMatch && timeMatch[1]) {
      timeStrForDisplay = timeMatch[1].split('.')[0]; // Remove milliseconds if present
      // Combine posted_date with time from created_at for sorting
      dateTimeForSorting = `${postedDate}T${timeMatch[1]}`;
    } else {
      // Fallback: use created_at directly for sorting
      dateTimeForSorting = createdAt;
      timeStrForDisplay = undefined;
    }
  } else {
    // Neither has time, use posted_date as-is
    dateTimeForSorting = postedDate;
    timeStrForDisplay = undefined;
  }
  
  const formattedDateTime = formatDateTime(postedDate, timeStrForDisplay);
  const sortDateTime = getDateTimeForSorting(dateTimeForSorting);
  
  return {
    id: entry.id,
    date: formattedDateTime,
    postedDateTime: sortDateTime, // Timestamp (number) for sorting
    patientName: entry.patient_name,
    office: entry.office_name,
    applyTo: entry.apply_to,
    code: entry.code,
    tooth: entry.tooth || '',
    surface: entry.surface || '',
    type: entry.type,
    hasNotes: entry.has_notes,
    hasEOB: entry.has_eob,
    description: entry.description,
    bill: entry.billing_order || '',
    duration: entry.duration_minutes ? entry.duration_minutes.toString() : '',
    provider: entry.provider_name,
    estPat: entry.est_patient,
    estIns: entry.est_insurance,
    amount: entry.posted_amount,
    balance: entry.running_balance,
    user: entry.created_by,
    status: mapStatus(entry.status),
    transactionType: mapTransactionType(entry.transaction_type),
    selected: false,
    procedure_id: entry.procedure_id,
    claim_id: entry.claim_id, // Map claim_id to track if procedure is already in a claim
  };
};

export default function PatientLedger() {
  const { patient } = useOutletContext<{ patient: any }>();
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ledger' | 'balances'>('ledger');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'provider' | 'code'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPaymentsAdjustments, setShowPaymentsAdjustments] = useState(false);
  const [showAddProcedure, setShowAddProcedure] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  // Data states
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [balanceData, setBalanceData] = useState<BalancesResponse | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 25,
    offset: 0,
    has_more: false,
  });

  // Get patient ID from context (preferred) or URL params (fallback)
  const patientId = patient?.id || patientIdParam;
  const patientName = patient?.name || 'Unknown Patient';

  // Fetch ledger entries
  const fetchLedgerEntries = useCallback(async () => {
    if (!patientId) {
      setError('Patient ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: Parameters<typeof getPatientLedger>[1] = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (dateFrom) {
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const parts = dateFrom.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          if (month && day && year) {
            params.date_from = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }

      if (dateTo) {
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const parts = dateTo.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          if (month && day && year) {
            params.date_to = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }

      const response = await getPatientLedger(patientId, params);
      
      const mappedTransactions = response.ledger_entries.map(mapLedgerEntryToTransaction);
      
      // Always sort by postedDateTime timestamp (numeric comparison for reliability)
      // Sort descending (newest first) by default, or based on sortOrder
      mappedTransactions.sort((a, b) => {
        // postedDateTime is a timestamp (number in milliseconds)
        const dateA = a.postedDateTime;
        const dateB = b.postedDateTime;
        // Sort descending (newest first) by default, or based on sortOrder
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
      
      setTransactions(mappedTransactions);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error fetching ledger entries:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load ledger entries');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, itemsPerPage, currentPage, sortBy, sortOrder, dateFrom, dateTo]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!patientId) {
      setErrorBalances('Patient ID is required');
      setLoadingBalances(false);
      return;
    }

    setLoadingBalances(true);
    setErrorBalances(null);

    try {
      const balances = await getPatientBalances(patientId);
      setBalanceData(balances);
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      setErrorBalances(err.response?.data?.error?.message || err.message || 'Failed to load balances');
    } finally {
      setLoadingBalances(false);
    }
  }, [patientId]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances();
    }
  }, [activeTab, fetchBalances]);

  // Toggle selection - only allow selection if procedure is not already in a claim
  const handleToggleSelection = (id: string) => {
    setTransactions(transactions.map(t => {
      if (t.id === id) {
        // Don't allow selection if procedure is already in a claim
        if (t.claim_id) {
          return t; // Keep current state, don't toggle
        }
        return { ...t, selected: !t.selected };
      }
      return t;
    }));
  };

  // Select all - only select procedures that are not already in a claim
  const handleSelectAll = (checked: boolean) => {
    setTransactions(transactions.map(t => 
      t.status === 'Not Sent' && t.transactionType === 'Procedure' && !t.claim_id
        ? { ...t, selected: checked } 
        : t
    ));
  };

  // Check if any procedures are selected (only procedures not already in claims)
  const selectedProcedures = transactions.filter(t => 
    t.selected && 
    t.status === 'Not Sent' && 
    t.transactionType === 'Procedure' &&
    !t.claim_id // Only procedures not already in a claim
  );
  const canCreateClaim = selectedProcedures.length > 0;

  // Handle create claim
  const handleCreateClaim = async () => {
    if (!canCreateClaim || !patientId) return;

    try {
      const procedureIds = selectedProcedures
        .map(t => t.procedure_id)
        .filter((id): id is string => id !== null);

      if (procedureIds.length === 0) {
        alert('No valid procedures selected');
        return;
      }

      // Get date range from selected procedures
      const dates = selectedProcedures.map(t => {
        const parts = t.date.split('/');
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const month = parts[0];
          const day = parts[1];
          const year = parts[2];
          return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
        return new Date();
      }).filter(d => !isNaN(d.getTime()));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      const claimData = {
        procedure_ids: procedureIds,
        claim_type: 'dental' as const,
        billing_order: 'primary',
        date_of_service_from: minDate.toISOString().split('T')[0],
        date_of_service_to: maxDate.toISOString().split('T')[0],
        notes: null,
      };

      const claim = await createClaim(patientId, claimData);
      
      // Navigate to Claim Detail screen
      navigate(`/patient/${patientId}/claim/${claim.claim_id}`);
    } catch (err: any) {
      console.error('Error creating claim:', err);
      alert(err.response?.data?.error?.message || err.message || 'Failed to create claim');
    }
  };

  // Handle add procedure
  const handleAddProcedure = () => {
    setShowAddProcedure(true);
  };

  // Handle save procedure from AddProcedure modal
  const handleSaveProcedure = async (newProcedure: any) => {
    // The AddProcedure component should call the API directly
    // This callback is just for UI updates
    // Refresh ledger entries after procedure is added
    await fetchLedgerEntries();
    if (activeTab === 'balances') {
      await fetchBalances();
    }
  };

  // Handle payments/adjustments
  const handlePaymentsAdjustments = () => {
    setShowPaymentsAdjustments(true);
  };

  // Handle date filter changes
  const handleDateFilterChange = () => {
    setCurrentPage(1);
    fetchLedgerEntries();
  };

  // Handle sort change
  const handleSortChange = (newSortBy: 'date' | 'amount' | 'provider' | 'code') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(pagination.total / itemsPerPage);

  if (!patientId) {
    return (
      <div className="p-6 bg-slate-50 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Patient ID is required</p>
        </div>
      </div>
    );
  }

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
          disabled={!canCreateClaim || loading}
          className={`px-6 py-2 rounded flex items-center gap-2 transition-colors ${
            canCreateClaim && !loading
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
          <select 
            className={components.select}
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as 'date' | 'amount' | 'provider' | 'code')}
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="provider">Provider</option>
            <option value="code">Code</option>
          </select>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className={components.label}>From:</label>
          <input
            type="text"
            placeholder="MM/DD/YYYY"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onBlur={handleDateFilterChange}
            className={components.input}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className={components.label}>To:</label>
          <input
            type="text"
            placeholder="MM/DD/YYYY"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onBlur={handleDateFilterChange}
            className={components.input}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setCurrentPage(1);
              fetchLedgerEntries();
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        )}
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
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading ledger entries...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchLedgerEntries}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No ledger entries found
              </div>
            ) : (
              <>
            {/* Ledger Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B] sticky top-0">
                  <tr>
                    <th className="w-[40px] px-2 py-3 text-left">
                      <input 
                        type="checkbox" 
                        onChange={(e) => handleSelectAll(e.target.checked)}
                            checked={transactions.some(t => 
                              t.status === 'Not Sent' && 
                              t.transactionType === 'Procedure' && 
                              !t.claim_id && 
                              t.selected
                            )}
                        className="rounded"
                            title="Select all procedures not yet in claims"
                      />
                    </th>
                    {/* <th className="w-[95px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">
                     */}
                     <th className="w-[150px] whitespace-nowrap px-2 py-3 text-left text-xs font-bold uppercase tracking-wide">

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
                      {transactions.map((txn) => (
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
                                disabled={!!txn.claim_id} // Disable if procedure is already in a claim
                                className={`rounded ${txn.claim_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={txn.claim_id ? 'This procedure is already in a claim' : ''}
                          />
                        )}
                      </td>
                          <td className="w-[160px] px-2 py-2 text-gray-900 font-mono text-xs truncate" title={txn.date}>{txn.date}</td>
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
                    <span>Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}</span>
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
                      disabled={currentPage === 1 || loading}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || loading}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="p-6">
            {loadingBalances ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading balances...</span>
              </div>
            ) : errorBalances ? (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{errorBalances}</p>
                <button
                  onClick={fetchBalances}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : balanceData ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Account Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Account Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Account Balance:</span>
                      <span className="text-gray-900">${balanceData.account_balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Patient Balance:</span>
                      <span className="text-red-700">${balanceData.patient_balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Estimated Insurance:</span>
                      <span className="text-blue-700">${balanceData.estimated_insurance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Estimated Patient:</span>
                      <span className="text-red-700">${balanceData.estimated_patient.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Aging Buckets */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Aging Buckets</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Current:</span>
                      <span className="text-gray-900">${balanceData.aging.current.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">30 Days:</span>
                      <span className="text-gray-900">${balanceData.aging.age_30.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">60 Days:</span>
                      <span className="text-orange-600">${balanceData.aging.age_60.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">90 Days:</span>
                      <span className="text-orange-700">${balanceData.aging.age_90.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">120+ Days:</span>
                      <span className="text-red-700">${balanceData.aging.age_120.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="border rounded-lg p-4">
                <h3 className="text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Today's Charges:</span>
                      <span className="text-gray-900">${balanceData.recent_activity.today_charges.toFixed(2)}</span>
                  </div>
                    {balanceData.recent_activity.last_insurance_payment && (
                      <>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Last Insurance Payment:</span>
                          <span className="text-blue-700">${balanceData.recent_activity.last_insurance_payment.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700 text-xs">Date:</span>
                          <span className="text-gray-600 text-xs">{formatDateTime(balanceData.recent_activity.last_insurance_payment.date)}</span>
                  </div>
                      </>
                    )}
                    {balanceData.recent_activity.last_patient_payment && (
                      <>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700">Last Patient Payment:</span>
                          <span className="text-green-700">${balanceData.recent_activity.last_patient_payment.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-700 text-xs">Date:</span>
                          <span className="text-gray-600 text-xs">{formatDateTime(balanceData.recent_activity.last_patient_payment.date)}</span>
                  </div>
                      </>
                    )}
                </div>
              </div>
            </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Payments Adjustments Dialog */}
      {showPaymentsAdjustments && (
        <PaymentsAdjustments
          isOpen={showPaymentsAdjustments}
          onClose={() => setShowPaymentsAdjustments(false)}
          patientName={patientName}
          patientId={patientId}
        />
      )}

      {/* Add Procedure Dialog */}
      {showAddProcedure && (
        <AddProcedure
          isOpen={showAddProcedure}
          onClose={() => setShowAddProcedure(false)}
          patientName={patientName}
          patientId={patientId}
          office={patient?.officeId || patient?.office || ''}
          onSave={handleSaveProcedure}
        />
      )}
    </div>
  );
}
