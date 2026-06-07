import { useState, useEffect, useCallback } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';
import { components } from '../../styles/theme';
import {
  createPatientPayment,
  createPatientAdjustment,
  allocatePayment,
} from '@/api/generated/endpoints/billing/billing';
import { listPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import type { PatientProcedureRead, AllocationLine } from '@/api/generated/model';
import { useDefinitions } from '../../hooks/useDefinitions';
import { fetchProviders, type Provider } from '../../services/schedulerApi';

// MM/DD/YYYY (or any parseable string) -> YYYY-MM-DD for the API.
const toIsoDate = (s: string): string => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
};

const money = (value: number): string => `$${value.toFixed(2)}`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  /** Office id (e.g. "OFF-3" or "3") the payment is recorded at. */
  office?: string;
  /** Called after a payment is successfully recorded, so the ledger can refresh. */
  onApplied?: () => void;
}

export default function PaymentsAdjustments({ isOpen, onClose, patientName, patientId, office, onApplied }: Props) {
  const [activeTab, setActiveTab] = useState<'payments' | 'adjustments'>('payments');
  const [transactionDate, setTransactionDate] = useState(new Date().toLocaleDateString('en-US'));
  const [saving, setSaving] = useState(false);

  // Payment fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // stores the definition value (key1)
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchDescription, setSearchDescription] = useState('');

  // Adjustment fields
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState(''); // stores the definition value (key1)

  // Seeded lookups from /definitions (key1 = code/value, description = label).
  const { definitions: paymentDefs } = useDefinitions('payment_method');
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');
  const paymentCodes = paymentDefs.map((d) => ({ code: d.key1, description: d.description, type: d.key2 ?? '' }));
  const adjustmentCodes = adjustmentDefs.map((d) => ({ code: d.key1, description: d.description }));

  // Providers for attribution (real office provider list, not derived from rows).
  const [providers, setProviders] = useState<Provider[]>([]);

  // Outstanding procedures for per-procedure payment allocation. The New Amt a
  // user enters per row is distributed via POST /patient-payments/{id}/allocate
  // (which guards over-allocation server-side) after the payment is created.
  const [outstanding, setOutstanding] = useState<PatientProcedureRead[]>([]);
  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});

  const loadProviders = useCallback(async () => {
    try {
      setProviders(await fetchProviders(office));
    } catch {
      setProviders([]);
    }
  }, [office]);

  const loadOutstanding = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await listPatientProcedures({ patient_id: Number(patientId), is_void: false, size: 200 });
      setOutstanding(res.items ?? []);
    } catch {
      setOutstanding([]);
    }
  }, [patientId]);

  useEffect(() => {
    if (!isOpen) return;
    loadProviders();
    loadOutstanding();
  }, [isOpen, loadProviders, loadOutstanding]);

  const filteredPaymentCodes = paymentCodes.filter(
    (code) =>
      (searchCode === '' || code.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (searchDescription === '' || code.description.toLowerCase().includes(searchDescription.toLowerCase())),
  );

  const filteredAdjustmentCodes = adjustmentCodes.filter(
    (code) =>
      (searchCode === '' || code.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (searchDescription === '' || code.description.toLowerCase().includes(searchDescription.toLowerCase())),
  );

  const totalAllocated = Object.values(allocAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  const handleApplyPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    const pid = Number(patientId);
    if (!Number.isFinite(pid)) {
      alert('Missing patient context. Please reopen the patient and try again.');
      return;
    }
    // Client-side over-allocation guard (the backend allocate route also guards).
    if (totalAllocated > amount + 0.001) {
      alert(`Allocated total (${money(totalAllocated)}) exceeds the payment amount (${money(amount)}).`);
      return;
    }

    const officeNum = office ? Number(String(office).replace(/\D/g, '')) : undefined;

    setSaving(true);
    try {
      const payment = await createPatientPayment({
        id: crypto.randomUUID(),
        patient_id: pid,
        office_id: officeNum && Number.isFinite(officeNum) ? officeNum : null,
        payment_date: toIsoDate(transactionDate),
        amount: amount.toFixed(2),
        payment_type: 'patient',
        payment_method: paymentMethod,
        ...(selectedProviderId ? { provider_id: selectedProviderId } : {}),
        ...(checkNumber ? { check_number: checkNumber } : {}),
        ...(notes ? { notes } : {}),
      });

      // Distribute the per-procedure amounts the user entered.
      const allocations: AllocationLine[] = outstanding
        .map((p) => ({ id: p.id, amount: parseFloat(allocAmounts[p.id] || '0') }))
        .filter((a) => a.amount > 0)
        .map((a) => ({
          procedure_id: a.id,
          amount: a.amount.toFixed(2),
          alloc_date: toIsoDate(transactionDate),
          ...(selectedProviderId ? { provider_id: selectedProviderId } : {}),
        }));
      if (allocations.length > 0) {
        await allocatePayment(payment.id, { allocations });
      }

      // Reset form
      setPaymentAmount('');
      setPaymentMethod('');
      setCheckNumber('');
      setNotes('');
      setSelectedProviderId('');
      setAllocAmounts({});
      onApplied?.();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyAdjustment = async () => {
    const amount = parseFloat(adjustmentAmount);
    if (!adjustmentAmount || Number.isNaN(amount) || amount <= 0) {
      alert('Please enter a valid adjustment amount');
      return;
    }
    if (!adjustmentReason) {
      alert('Please select an adjustment reason');
      return;
    }
    const pid = Number(patientId);
    if (!Number.isFinite(pid)) {
      alert('Missing patient context. Please reopen the patient and try again.');
      return;
    }

    const officeNum = office ? Number(String(office).replace(/\D/g, '')) : undefined;

    setSaving(true);
    try {
      await createPatientAdjustment({
        patient_id: pid,
        office_id: officeNum && Number.isFinite(officeNum) ? officeNum : null,
        adjustment_date: toIsoDate(transactionDate),
        amount: amount.toFixed(2),
        adjustment_type: adjustmentReason,
        ...(notes ? { notes } : {}),
      });

      setAdjustmentAmount('');
      setAdjustmentReason('');
      setNotes('');
      onApplied?.();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to record adjustment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-2 border-[#E2E8F0]">
          {/* Header - Medical Slate */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg border-b-2 border-[#16293B]">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wide">Payments &amp; Adjustments</h2>
              <p className="text-sm text-white/80">
                Patient: {patientName} | ID: {patientId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-[#16314d] rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Transaction Date */}
          <div className="px-6 py-3 bg-[#F7F9FC] border-b-2 border-[#E2E8F0] flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={components.label}>Transaction Date:</label>
              <input
                type="text"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={components.input}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className={components.tabList}>
            <button
              onClick={() => setActiveTab('payments')}
              className={`${components.tabButton} ${
                activeTab === 'payments' ? components.tabActive : components.tabInactive
              }`}
            >
              PAYMENTS
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`${components.tabButton} ${
                activeTab === 'adjustments' ? components.tabActive : components.tabInactive
              }`}
            >
              ADJUSTMENTS
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto px-6 py-4 bg-[#F7F9FC]">
            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {/* Payment Code Search */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Search code</label>
                      <input
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm"
                        placeholder="Enter code"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Search Description</label>
                      <input
                        type="text"
                        value={searchDescription}
                        onChange={(e) => setSearchDescription(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm"
                        placeholder="Enter description"
                      />
                    </div>
                  </div>

                  {/* Payment Codes List */}
                  <div className="border-2 border-slate-300 rounded max-h-32 overflow-y-auto">
                    {filteredPaymentCodes.map((code) => (
                      <div
                        key={code.code}
                        onClick={() => setPaymentMethod(code.code)}
                        className={`px-3 py-2 border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                          paymentMethod === code.code ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="grid grid-cols-3 text-sm">
                          <span className="font-semibold text-blue-700">{code.code}</span>
                          <span className="font-semibold text-slate-700">{code.type}</span>
                          <span className="text-slate-900">{code.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Entry Fields */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Amount*</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Check #</label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Apply To Provider</label>
                      <select
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      >
                        <option value="">-- Select Provider --</option>
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name} (ID: {provider.id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                      <input
                        type="text"
                        value={paymentMethod}
                        readOnly
                        placeholder="Select from list above"
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Procedures To Post (per-procedure allocation) */}
                <div className="bg-white border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                  <div className="bg-[#E8EFF7] px-4 py-2 flex items-center justify-between border-b-2 border-[#E2E8F0]">
                    <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Allocate To Procedures</h3>
                    <span className="text-sm font-semibold text-[#1E293B]">
                      Allocated: {money(totalAllocated)} of {money(parseFloat(paymentAmount) || 0)}
                    </span>
                  </div>

                  {outstanding.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      No procedures to allocate against.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                          <tr>
                            <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">DOS</th>
                            <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Code</th>
                            <th className="px-2 py-3 text-center font-bold uppercase tracking-wide">Th</th>
                            <th className="px-2 py-3 text-center font-bold uppercase tracking-wide">Surf</th>
                            <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Fee</th>
                            <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Est Pat</th>
                            <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">New Amt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {outstanding.map((proc) => (
                            <tr key={proc.id} className="hover:bg-[#F7F9FC] transition-colors">
                              <td className="px-2 py-2 text-slate-900 font-mono">{proc.date_of_service}</td>
                              <td className="px-2 py-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                                  {proc.procedure_code}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-slate-900 text-center">{proc.tooth || '-'}</td>
                              <td className="px-2 py-2 text-slate-900 text-center">{proc.surface || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-900">{money(Number(proc.fee) || 0)}</td>
                              <td className="px-2 py-2 text-right text-slate-900">
                                {money(Number(proc.patient_estimate) || 0)}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <input
                                  type="number"
                                  value={allocAmounts[proc.id] ?? ''}
                                  onChange={(e) =>
                                    setAllocAmounts((prev) => ({ ...prev, [proc.id]: e.target.value }))
                                  }
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-right"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADJUSTMENTS TAB */}
            {activeTab === 'adjustments' && (
              <div className="space-y-4">
                {/* Adjustment Code Search */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Search code</label>
                      <input
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm"
                        placeholder="Enter code"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Search Description</label>
                      <input
                        type="text"
                        value={searchDescription}
                        onChange={(e) => setSearchDescription(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm"
                        placeholder="Enter description"
                      />
                    </div>
                  </div>

                  {/* Adjustment Codes List */}
                  <div className="border-2 border-slate-300 rounded max-h-32 overflow-y-auto">
                    {filteredAdjustmentCodes.map((code) => (
                      <div
                        key={code.code}
                        onClick={() => setAdjustmentReason(code.code)}
                        className={`px-3 py-2 border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                          adjustmentReason === code.code ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="grid grid-cols-2 text-sm">
                          <span className="font-semibold text-blue-700">{code.code}</span>
                          <span className="text-slate-900">{code.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adjustment Entry Fields */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Amount*</label>
                      <input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                      <input
                        type="text"
                        value={adjustmentReason}
                        readOnly
                        placeholder="Select from list above"
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
            {activeTab === 'payments' && (
              <button
                onClick={handleApplyPayment}
                disabled={saving}
                className={components.buttonPrimary + ' flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  <DollarSign className="w-4 h-4" strokeWidth={2} />
                )}
                {saving ? 'APPLYING…' : 'APPLY'}
              </button>
            )}
            {activeTab === 'adjustments' && (
              <button
                onClick={handleApplyAdjustment}
                disabled={saving}
                className={components.buttonPrimary + ' flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  <DollarSign className="w-4 h-4" strokeWidth={2} />
                )}
                {saving ? 'APPLYING…' : 'APPLY'}
              </button>
            )}
            <button onClick={onClose} className={components.buttonSecondary}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
