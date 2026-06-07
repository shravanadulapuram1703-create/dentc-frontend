import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { FileText, DollarSign, Plus, Loader2, AlertCircle } from 'lucide-react';
import PaymentsAdjustments from '../patient/PaymentsAdjustments';
import AddProcedure from '../patient/AddProcedure';
import { components } from '../../styles/theme';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import {
  getPatientLedger,
  getPatientBalances,
  type BalancesResponse,
} from '../../services/ledgerApi';
import type { LedgerEntry, LedgerResponse, PatientProcedureRead } from '@/api/generated/model';
import { createInsuranceClaim } from '@/api/generated/endpoints/billing/billing';
import {
  listPatientProcedures,
  updatePatientProcedure,
} from '@/api/generated/endpoints/clinical/clinical';

// Format YYYY-MM-DD (or ISO) to MM/DD/YYYY for display.
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Format ISO string to MM/DD/YYYY HH:MM AM/PM (used by the Balances recent-activity rows).
const formatDateTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const datePart = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
  } catch {
    return dateStr;
  }
};

// Parse a free-text MM/DD/YYYY filter input to the backend's YYYY-MM-DD, or null.
const toApiDate = (input: string): string | null => {
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  if (!month || !day || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const money = (value: number | undefined | null): string => `$${(value ?? 0).toFixed(2)}`;

export default function PatientLedger() {
  const { patient } = useOutletContext<{ patient: any }>();
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ledger' | 'balances'>('ledger');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPaymentsAdjustments, setShowPaymentsAdjustments] = useState(false);
  const [showAddProcedure, setShowAddProcedure] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  // Ledger data (real backend contract)
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [balanceData, setBalanceData] = useState<BalancesResponse | null>(null);

  // Create-claim: unbilled procedures are sourced from /patient-procedures (the
  // ledger feed is a thin running-balance view and carries no procedure_id/claim_id).
  const [unbilled, setUnbilled] = useState<PatientProcedureRead[]>([]);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(new Set());
  const [creatingClaim, setCreatingClaim] = useState(false);

  // Get patient ID from context (preferred) or URL params (fallback)
  const patientId = patient?.id || patientIdParam;
  const patientName = patient?.name || 'Unknown Patient';

  const entries: LedgerEntry[] = ledger?.entries ?? [];
  const total = ledger?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
      const response = await getPatientLedger(patientId, {
        date_from: toApiDate(dateFrom),
        date_to: toApiDate(dateTo),
        page: currentPage,
        size: pageSize,
      });
      setLedger(response);
    } catch (err: any) {
      console.error('Error fetching ledger entries:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load ledger entries');
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, [patientId, currentPage, pageSize, dateFrom, dateTo]);

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

  // Fetch unbilled (claim-eligible) procedures for the create-claim flow
  const fetchUnbilled = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await listPatientProcedures({
        patient_id: Number(patientId),
        is_void: false,
        size: 200,
      });
      const items = (res.items ?? []).filter((p) => !p.claim_id);
      setUnbilled(items);
      // Prune any selections that are no longer eligible
      setSelectedProcedureIds((prev) => new Set([...prev].filter((id) => items.some((p) => p.id === id))));
    } catch (err) {
      console.error('Error fetching unbilled procedures:', err);
      setUnbilled([]);
    }
  }, [patientId]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

  useEffect(() => {
    fetchUnbilled();
  }, [fetchUnbilled]);

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances();
    }
  }, [activeTab, fetchBalances]);

  const toggleProcedure = (id: string) => {
    setSelectedProcedureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllUnbilled = (checked: boolean) => {
    setSelectedProcedureIds(checked ? new Set(unbilled.map((p) => p.id)) : new Set());
  };

  const selectedProcedures = unbilled.filter((p) => selectedProcedureIds.has(p.id));
  const canCreateClaim = selectedProcedures.length > 0 && !creatingClaim;

  // Handle create claim from selected procedures
  const handleCreateClaim = async () => {
    if (selectedProcedures.length === 0 || !patientId) return;

    setCreatingClaim(true);
    try {
      const dates = selectedProcedures
        .map((p) => new Date(p.date_of_service))
        .filter((d) => !isNaN(d.getTime()));
      const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
      const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();

      // office_id comes straight off the procedure (snake_case, numeric) — no
      // camelCase patient.officeId regex-stripping.
      const officeId = selectedProcedures[0]?.office_id ?? null;
      const totalBilled = selectedProcedures.reduce((s, p) => s + (Number(p.fee) || 0), 0);
      const totalEstIns = selectedProcedures.reduce((s, p) => s + (Number(p.insurance_estimate) || 0), 0);
      const newClaimId = crypto.randomUUID();

      await createInsuranceClaim({
        id: newClaimId,
        patient_id: Number(patientId),
        office_id: officeId,
        claim_number: String(Date.now()),
        claim_type: 'dental',
        billing_order: 'primary',
        date_of_service_from: minDate.toISOString().split('T')[0],
        date_of_service_to: maxDate.toISOString().split('T')[0],
        total_billed: totalBilled.toFixed(2),
        est_insurance: totalEstIns.toFixed(2),
      });

      // Link the selected procedures to the new claim. Surface (don't swallow)
      // partial failures so a half-linked claim isn't silently created.
      const results = await Promise.allSettled(
        selectedProcedures.map((p) => updatePatientProcedure(p.id, { claim_id: newClaimId })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        alert(
          `Claim created, but ${failed} of ${selectedProcedures.length} procedure(s) could not be linked. Please review the claim.`,
        );
      }

      navigate(`/patient/${patientId}/claim/${newClaimId}`);
    } catch (err: any) {
      console.error('Error creating claim:', err);
      alert(err.response?.data?.error?.message || err.message || 'Failed to create claim');
    } finally {
      setCreatingClaim(false);
    }
  };

  // Handle save procedure from AddProcedure modal
  const handleSaveProcedure = async () => {
    await fetchLedgerEntries();
    await fetchUnbilled();
    if (activeTab === 'balances') {
      await fetchBalances();
    }
  };

  // Reset to first page and refetch when the date filter changes
  const handleDateFilterChange = () => {
    setCurrentPage(1);
  };

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
        <button className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PATIENT LEDGER
        </button>

        <button
          onClick={handleCreateClaim}
          disabled={!canCreateClaim}
          className={`px-6 py-2 rounded flex items-center gap-2 transition-colors ${
            canCreateClaim ? components.buttonSecondary : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {creatingClaim ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          CREATE CLAIM
          {selectedProcedures.length > 0 && ` (${selectedProcedures.length})`}
        </button>

        <button
          onClick={() => setShowPaymentsAdjustments(true)}
          className={components.buttonSuccess + ' flex items-center gap-2'}
        >
          <DollarSign className="w-4 h-4" />
          PAYMENTS / ADJUSTMENTS
        </button>

        <button
          onClick={() => setShowAddProcedure(true)}
          className={components.buttonPrimary + ' flex items-center gap-2'}
        >
          <Plus className="w-4 h-4" />
          ADD PROCEDURE
        </button>
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
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Unbilled procedures (claim-eligible) */}
      {unbilled.length > 0 && (
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg shadow-sm mb-4">
          <div className="flex items-center justify-between px-4 py-2 bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
            <span className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">
              Unbilled Procedures ({unbilled.length})
            </span>
            <label className="flex items-center gap-2 text-xs text-[#64748B]">
              <input
                type="checkbox"
                checked={selectedProcedureIds.size === unbilled.length && unbilled.length > 0}
                onChange={(e) => toggleSelectAllUnbilled(e.target.checked)}
                className="rounded"
              />
              Select all for claim
            </label>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-[#64748B] uppercase tracking-wide border-b">
              <tr>
                <th className="w-[40px] px-3 py-2"></th>
                <th className="px-3 py-2 text-left">DOS</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-center">Tooth</th>
                <th className="px-3 py-2 text-center">Surface</th>
                <th className="px-3 py-2 text-right">Fee</th>
                <th className="px-3 py-2 text-right">Est. Ins</th>
              </tr>
            </thead>
            <tbody>
              {unbilled.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedProcedureIds.has(p.id)}
                      onChange={() => toggleProcedure(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(p.date_of_service)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.procedure_code}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs">{p.tooth || ''}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs">{p.surface || ''}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(Number(p.fee))}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-700">
                    {money(Number(p.insurance_estimate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No ledger entries found</div>
            ) : (
              <>
                {/* Ledger Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">Posted</span>
                            </TooltipTrigger>
                            <TooltipContent>Date the transaction was posted to the account</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Type</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Code</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">Tooth</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Details</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Payment</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide">Charge</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide">Credit</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">Running Bal</span>
                            </TooltipTrigger>
                            <TooltipContent>Account balance after this transaction</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => (
                        <tr key={`${entry.source_id}-${idx}`} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900 font-mono text-xs whitespace-nowrap">
                            {formatDate(entry.entry_date)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-mono ${
                                entry.entry_type === 'payment'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {entry.entry_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-mono text-xs">{entry.procedure_code || ''}</td>
                          <td className="px-3 py-2 text-gray-700 text-center font-mono">{entry.tooth || ''}</td>
                          <td className="px-3 py-2 text-gray-900 text-xs">{entry.description || ''}</td>
                          <td className="px-3 py-2 text-gray-700 text-xs">{entry.payment_type || ''}</td>
                          <td className="px-3 py-2 text-right text-gray-900 font-mono">
                            {entry.charge ? money(entry.charge) : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-green-700 font-mono">
                            {entry.credit ? money(entry.credit) : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 font-mono">
                            {money(entry.running_balance)}
                          </td>
                          <td className="px-3 py-2 text-gray-700 text-xs">{entry.status || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Showing {total === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, total)} of {total}
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
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
                      disabled={currentPage >= totalPages || loading}
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
                      <span className="text-gray-900">{money(balanceData.account_balance)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Patient Balance:</span>
                      <span className="text-red-700">{money(balanceData.patient_balance)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Estimated Insurance:</span>
                      <span className="text-blue-700">{money(balanceData.estimated_insurance)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Estimated Patient:</span>
                      <span className="text-red-700">{money(balanceData.estimated_patient)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Insurance Balance:</span>
                      <span className="text-blue-700">{money(balanceData.insurance_balance)}</span>
                    </div>
                  </div>
                </div>

                {/* Aging Buckets */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-gray-900 mb-4">Aging Buckets</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Current:</span>
                      <span className="text-gray-900">{money(balanceData.aging.current)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">30 Days:</span>
                      <span className="text-gray-900">{money(balanceData.aging.age_30)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">60 Days:</span>
                      <span className="text-orange-600">{money(balanceData.aging.age_60)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">90 Days:</span>
                      <span className="text-orange-700">{money(balanceData.aging.age_90)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">120+ Days:</span>
                      <span className="text-red-700">{money(balanceData.aging.age_120)}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Today's Charges:</span>
                      <span className="text-gray-900">{money(balanceData.recent_activity.today_charges)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-gray-700">Today's Payments:</span>
                      <span className="text-gray-900">{money(balanceData.recent_activity.today_payments)}</span>
                    </div>
                    {balanceData.recent_activity.last_insurance_payment && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-700">Last Insurance Payment:</span>
                        <span className="text-blue-700">
                          {money(balanceData.recent_activity.last_insurance_payment.amount)}{' '}
                          <span className="text-gray-500 text-xs">
                            ({formatDateTime(balanceData.recent_activity.last_insurance_payment.date)})
                          </span>
                        </span>
                      </div>
                    )}
                    {balanceData.recent_activity.last_patient_payment && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-700">Last Patient Payment:</span>
                        <span className="text-green-700">
                          {money(balanceData.recent_activity.last_patient_payment.amount)}{' '}
                          <span className="text-gray-500 text-xs">
                            ({formatDateTime(balanceData.recent_activity.last_patient_payment.date)})
                          </span>
                        </span>
                      </div>
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
          office={patient?.officeId || patient?.office || ''}
          onApplied={() => {
            fetchLedgerEntries();
            fetchUnbilled();
            fetchBalances();
          }}
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
