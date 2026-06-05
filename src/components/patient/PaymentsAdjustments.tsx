import { useState } from 'react';
import { X, Search, DollarSign, Plus, Loader2 } from 'lucide-react';
import { components } from '../../styles/theme';
import { createPatientPayment } from '@/api/generated/endpoints/billing/billing';

// MM/DD/YYYY (or any parseable string) -> YYYY-MM-DD for the API.
const toIsoDate = (s: string): string => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
};

interface OutstandingProcedure {
  id: string;
  selected: boolean;
  dos: string;
  patient: string;
  office: string;
  code: string;
  tooth: string;
  surface: string;
  description: string;
  provider: string;
  providerId: string;
  bill: string;
  duration: string;
  estPat: number;
  estIns: number;
  patPaid: number;
  patAdj: number;
  remaining: number;
  newAmount: number;
}

interface PaymentCode {
  code: string;
  description: string;
  type: 'Cash' | 'Check' | 'Credit Card' | 'Debit Card' | 'E-Check' | 'Third-Party';
}

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
  const [activeTab, setActiveTab] = useState<'add-procedures' | 'payments' | 'adjustments'>('payments');
  const [transactionDate, setTransactionDate] = useState(new Date().toLocaleDateString('en-US'));
  const [saving, setSaving] = useState(false);
  
  // Payment fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [applyTo, setApplyTo] = useState<'Patient' | 'Responsible Party'>('Patient');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchDescription, setSearchDescription] = useState('');

  // Adjustment fields
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Payment codes
  const paymentCodes: PaymentCode[] = [
    { code: 'H0006', description: 'PMT DST-American Express', type: 'Credit Card' },
    { code: 'PF001', description: 'PMT DST-Care Credit', type: 'Third-Party' },
    { code: '01005', description: 'PMT DST-Cash', type: 'Cash' },
    { code: 'H0007', description: 'PMT DST-Check', type: 'Check' },
    { code: 'H0008', description: 'PMT DST-Visa', type: 'Credit Card' },
    { code: 'H0009', description: 'PMT DST-MasterCard', type: 'Credit Card' },
    { code: 'H0010', description: 'PMT DST-Discover', type: 'Credit Card' },
    { code: 'H0011', description: 'PMT DST-Debit Card', type: 'Debit Card' },
    { code: 'H0012', description: 'PMT DST-E-Check', type: 'E-Check' }
  ];

  // Adjustment codes
  const adjustmentCodes = [
    { code: 'ADJ01', description: 'ADJ OFF - Courtesy Discount' },
    { code: 'ADJ02', description: 'ADJ OFF - Write-Off' },
    { code: 'ADJ03', description: 'ADJ OFF - Professional Adjustment' },
    { code: 'ADJ04', description: 'ADJ OFF - Administrative Adjustment' }
  ];

  // Outstanding procedures. There is no backend endpoint for per-procedure
  // payment allocation yet (the patient-payments resource records a flat payment
  // and exposes a separate /allocate route), so this starts empty rather than
  // showing mock rows. See docs/patients/patients_backend_devreport.md.
  const [procedures, setProcedures] = useState<OutstandingProcedure[]>([]);

  // Provider list (derived from procedures)
  const providers = Array.from(new Set(procedures.map(p => ({
    id: p.providerId,
    name: p.provider
  }))));

  const filteredPaymentCodes = paymentCodes.filter(code => 
    (searchCode === '' || code.code.toLowerCase().includes(searchCode.toLowerCase())) &&
    (searchDescription === '' || code.description.toLowerCase().includes(searchDescription.toLowerCase()))
  );

  const filteredAdjustmentCodes = adjustmentCodes.filter(code => 
    (searchCode === '' || code.code.toLowerCase().includes(searchCode.toLowerCase())) &&
    (searchDescription === '' || code.description.toLowerCase().includes(searchDescription.toLowerCase()))
  );

  const handleSelectProcedure = (id: string) => {
    setProcedures(procedures.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const handleSelectAll = () => {
    const allSelected = procedures.every(p => p.selected);
    setProcedures(procedures.map(p => ({ ...p, selected: !allSelected })));
  };

  const selectedProcedures = procedures.filter(p => p.selected);
  const totalRemaining = selectedProcedures.reduce((sum, p) => sum + p.remaining, 0);

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

    const officeNum = office ? Number(String(office).replace(/\D/g, '')) : undefined;

    setSaving(true);
    try {
      await createPatientPayment({
        id: crypto.randomUUID(),
        patient_id: pid,
        office_id: officeNum && Number.isFinite(officeNum) ? officeNum : null,
        payment_date: toIsoDate(transactionDate),
        amount: amount.toFixed(2),
        payment_type: 'patient',
        payment_method: paymentMethod,
        ...(checkNumber ? { check_number: checkNumber } : {}),
        ...(notes ? { notes } : {}),
      });

      // Reset form
      setPaymentAmount('');
      setPaymentMethod('');
      setCheckNumber('');
      setBankNumber('');
      setNotes('');
      onApplied?.();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyAdjustment = () => {
    // No backend: neither /patients/{id}/adjustments nor /patient-adjustments
    // exist (both 404). See docs/patients/patients_backend_devreport.md.
    alert(
      'Adjustments are not yet available — the backend has no adjustments endpoint. ' +
        'This is tracked as a backend gap.',
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-2 border-[#E2E8F0]">
          {/* Header - Medical Slate */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg border-b-2 border-[#16293B]">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wide">Payments & Adjustments</h2>
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

          {/* Transaction Date & Filter */}
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
            <button className={components.buttonPrimary}>
              GO
            </button>
            <div className="flex-1"></div>
            <button className={components.buttonSecondary}>
              Show All
            </button>
          </div>

          {/* Tabs */}
          <div className={components.tabList}>
            <button
              onClick={() => setActiveTab('add-procedures')}
              className={`${components.tabButton} ${
                activeTab === 'add-procedures'
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              ADD PROCEDURES
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`${components.tabButton} ${
                activeTab === 'payments'
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              PAYMENTS
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`${components.tabButton} ${
                activeTab === 'adjustments'
                  ? components.tabActive
                  : components.tabInactive
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
                  <div className="grid grid-cols-3 gap-3 mb-3">
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">All</label>
                      <select className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm">
                        <option>All</option>
                        <option>Cash</option>
                        <option>Check</option>
                        <option>Credit Card</option>
                      </select>
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
                        onClick={() => setPaymentMethod(code.description)}
                        className={`px-3 py-2 border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                          paymentMethod === code.description ? 'bg-blue-100' : ''
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bank #</label>
                      <input
                        type="text"
                        value={bankNumber}
                        onChange={(e) => setBankNumber(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Apply To*</label>
                      <select
                        value={applyTo}
                        onChange={(e) => setApplyTo(e.target.value as 'Patient' | 'Responsible Party')}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      >
                        <option>Patient</option>
                        <option>Responsible Party</option>
                      </select>
                    </div>
                  </div>

                  {/* Provider Selection - NEW REQUIREMENT */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Apply Payment To Provider* (NEW)
                      </label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-500 rounded text-sm bg-yellow-50"
                      >
                        <option value="">-- Select Provider --</option>
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.name}>
                            {provider.name} (ID: {provider.id})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-600 mt-1 font-semibold">
                        ✨ NEW: Provider-based payment attribution ensures accurate collections
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADJUSTMENTS TAB */}
            {activeTab === 'adjustments' && (
              <div className="space-y-4">
                {/* Adjustment Code Search */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-3 mb-3">
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">All</label>
                      <select className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm">
                        <option>All</option>
                      </select>
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
                        onClick={() => setAdjustmentReason(code.description)}
                        className={`px-3 py-2 border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                          adjustmentReason === code.description ? 'bg-blue-100' : ''
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">Apply To</label>
                      <select
                        value={applyTo}
                        onChange={(e) => setApplyTo(e.target.value as 'Patient' | 'Responsible Party')}
                        className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                      >
                        <option>Patient</option>
                        <option>Responsible Party</option>
                      </select>
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

            {/* ADD PROCEDURES TAB */}
            {activeTab === 'add-procedures' && (
              <div className="bg-white border-2 border-slate-300 rounded-lg p-8 text-center">
                <Plus className="w-16 h-16 text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-slate-600">Add Procedures functionality would be implemented here</p>
              </div>
            )}

            {/* PROCEDURES TO POST - Common to all tabs */}
            <div className="bg-white border-2 border-[#E2E8F0] rounded-lg overflow-hidden mt-6">
              <div className="bg-[#E8EFF7] px-4 py-2 flex items-center justify-between border-b-2 border-[#E2E8F0]">
                <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Procedures To Post</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-[#1E293B]">
                    Selected: {selectedProcedures.length} | Total Remaining: ${totalRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                    <tr>
                      <th className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={procedures.length > 0 && procedures.every(p => p.selected)}
                          onChange={handleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">DOS</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Patient</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Office</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Code</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Th</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Surf</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Description</th>
                      <th className="px-2 py-3 text-left font-bold uppercase tracking-wide">Provider</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Est Pat</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Est Ins</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Pat Paid</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Pat Adj</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">Remaining</th>
                      <th className="px-2 py-3 text-right font-bold uppercase tracking-wide">New Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {procedures.map((proc) => (
                      <tr
                        key={proc.id}
                        className={`hover:bg-[#F7F9FC] transition-colors ${
                          proc.selected ? 'bg-[#F7F9FC]' : ''
                        }`}
                      >
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={proc.selected}
                            onChange={() => handleSelectProcedure(proc.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-2 py-2 text-slate-900">{proc.dos}</td>
                        <td className="px-2 py-2 text-slate-900">{proc.patient}</td>
                        <td className="px-2 py-2 text-slate-900">{proc.office}</td>
                        <td className="px-2 py-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                            {proc.code}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-900 text-center">{proc.tooth || '-'}</td>
                        <td className="px-2 py-2 text-slate-900">{proc.surface || '-'}</td>
                        <td className="px-2 py-2 text-slate-900">{proc.description}</td>
                        <td className="px-2 py-2 text-slate-900 font-semibold">{proc.providerId}</td>
                        <td className="px-2 py-2 text-right text-slate-900">${proc.estPat.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-slate-900">${proc.estIns.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-slate-900">${proc.patPaid.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-slate-900">${proc.patAdj.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right text-green-700 font-bold">${proc.remaining.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            value={proc.newAmount}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              setProcedures(procedures.map(p => 
                                p.id === proc.id ? { ...p, newAmount: newVal } : p
                              ));
                            }}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-right"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
            {activeTab === 'payments' && (
              <button
                onClick={handleApplyPayment}
                disabled={saving}
                className={components.buttonPrimary + " flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"}
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
                className={components.buttonPrimary + " flex items-center gap-2"}
              >
                <DollarSign className="w-4 h-4" strokeWidth={2} />
                APPLY
              </button>
            )}
            <button
              onClick={onClose}
              className={components.buttonSecondary}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </>
  );
}