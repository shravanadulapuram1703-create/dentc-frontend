import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check, XCircle } from 'lucide-react';
import type { PatientProcedureRead, AllocationLine } from '@/api/generated/model';
import { createPatientPayment, allocatePayment } from '@/api/generated/endpoints/billing/billing';
import { useDefinitions } from '@/hooks/useDefinitions';
import { type ProviderOption } from '@/services/providerDirectory';
import ProviderSelect from './ProviderSelect';
import {
  fmtDate,
  genId,
  money,
  cents,
  procedureBalance,
  HEADER_GRADIENT,
  ACCENT_BLUE,
  type EntryKind,
} from './transactionsModel';

interface Props {
  patientId: number;
  officeId: number | null;
  transactionDateIso: string;
  patientName: string;
  outstanding: PatientProcedureRead[];
  /** Providers serving this office; `allProviders` keeps the rest reachable. */
  providers: ProviderOption[];
  allProviders: ProviderOption[];
  /** Provider chosen in the page toolbar — seeds the payment's provider. */
  defaultProviderId: string;
  providerLabel: (id: string | null | undefined) => string;
  codeDescription: (code: string) => string;
  onApplied: () => void;
}

export default function PaymentsTab({
  patientId,
  officeId,
  transactionDateIso,
  patientName,
  outstanding,
  providers,
  allProviders,
  defaultProviderId,
  providerLabel,
  codeDescription,
  onApplied,
}: Props) {
  const { definitions: paymentDefs } = useDefinitions('payment_method');
  const codes = paymentDefs.map((d) => ({ code: d.key1, type: d.key2 ?? '', description: d.description }));

  const [searchCode, setSearchCode] = useState('');
  const [searchType, setSearchType] = useState('All');
  const [searchDescription, setSearchDescription] = useState('');
  const [method, setMethod] = useState('');

  const [amount, setAmount] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [applyTo, setApplyTo] = useState<'patient' | 'insurance'>('patient');
  const [providerId, setProviderId] = useState(defaultProviderId);
  const [notes, setNotes] = useState('');

  // Follow the toolbar provider until the user overrides it here.
  useEffect(() => setProviderId(defaultProviderId), [defaultProviderId]);

  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** True once the user types an Amount by hand — from then on it stops tracking the grid. */
  const [amountTouched, setAmountTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `DefinitionRead.key2` is the payment code's type. It is blank on every
  // seeded `payment_method` row today, so the filter renders only when the
  // backend actually supplies types — an "All"-only dropdown is not metadata.
  const types = useMemo(() => [...new Set(codes.map((c) => c.type).filter(Boolean))], [codes]);
  const hasTypes = types.length > 0;

  const visibleCodes = codes.filter(
    (c) =>
      (!searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (!hasTypes || searchType === 'All' || c.type === searchType) &&
      (!searchDescription || c.description.toLowerCase().includes(searchDescription.toLowerCase())),
  );

  const totalAllocated = cents(
    Object.values(allocAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
  );

  // Selecting procedures drives the payment Amount (and deselecting recalculates it)
  // until the user overrides it — the legacy screen's "post what's outstanding" flow.
  useEffect(() => {
    if (amountTouched) return;
    const next = totalAllocated > 0 ? totalAllocated.toFixed(2) : '';
    setAmount((prev) => (prev === next ? prev : next));
  }, [totalAllocated, amountTouched]);

  const reset = () => {
    setAmount('');
    setAmountTouched(false);
    setCheckNumber('');
    setBankNumber('');
    setNotes('');
    setMethod('');
    setProviderId(defaultProviderId);
    setAllocAmounts({});
    setSelected(new Set());
  };

  const apply = async () => {
    const amt = parseFloat(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (!method) {
      setError('Select a payment code from the list.');
      return;
    }
    if (totalAllocated > amt + 0.001) {
      setError(`Allocated total (${money(totalAllocated)}) exceeds the payment amount (${money(amt)}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payment = await createPatientPayment({
        id: genId(),
        patient_id: patientId,
        office_id: officeId,
        payment_date: transactionDateIso,
        amount: amt.toFixed(2),
        payment_type: applyTo,
        payment_method: method,
        ...(providerId ? { provider_id: providerId } : {}),
        ...(checkNumber ? { check_number: checkNumber } : {}),
        ...(bankNumber ? { bank_number: bankNumber } : {}),
        ...(notes ? { notes } : {}),
      });

      const allocations: AllocationLine[] = outstanding
        .map((p) => ({ procedure_id: p.id, raw: parseFloat(allocAmounts[p.id] || '0') }))
        .filter((a) => a.raw > 0)
        .map((a) => ({ procedure_id: a.procedure_id, amount: a.raw.toFixed(2), alloc_date: transactionDateIso }));
      if (allocations.length > 0) {
        await allocatePayment(payment.id, { allocations });
      }

      reset();
      onApplied();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        {/* Payment code picker */}
        <div className="rounded border border-slate-200 bg-white">
          <div
            className={`grid gap-px border-b border-slate-200 bg-slate-50 p-2 ${
              hasTypes ? 'grid-cols-[1fr_110px_1fr]' : 'grid-cols-[1fr_1fr]'
            }`}
          >
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search code"
              className="rounded border border-[#2566a8] px-2 py-1.5 text-xs focus:outline-none"
            />
            {hasTypes && (
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="tx-select rounded border border-slate-300 px-2 py-1.5 text-xs"
              >
                {['All', ...types].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            <input
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Search Description"
              className="rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {visibleCodes.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">No payment codes defined.</div>
            ) : (
              visibleCodes.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setMethod(c.code)}
                  className={`grid w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs transition hover:bg-sky-50 ${
                    hasTypes ? 'grid-cols-[110px_1fr_1fr]' : 'grid-cols-[110px_1fr]'
                  } ${method === c.code ? 'bg-sky-100' : ''}`}
                >
                  <span className="font-semibold text-[#1d4ed8]">{c.code}</span>
                  {hasTypes && <span className="text-slate-700">{c.type}</span>}
                  <span className="text-slate-800">{c.description}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Payment entry fields */}
        <div className="space-y-3 rounded border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-3 gap-3">
            <Labeled label="Amount" required>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountTouched(true);
                }}
                placeholder="0.00"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-right text-xs focus:border-[#2566a8] focus:outline-none"
              />
            </Labeled>
            <Labeled label="Check #">
              <input
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
              />
            </Labeled>
            <Labeled label="Bank #">
              <input
                value={bankNumber}
                onChange={(e) => setBankNumber(e.target.value)}
                title="Deposit bank number — persisted on the payment"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
              />
            </Labeled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Apply To">
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as 'patient' | 'insurance')}
                className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
              >
                <option value="patient">Responsible Party</option>
                <option value="insurance">Insurance</option>
              </select>
            </Labeled>
            <Labeled label="Provider">
              <ProviderSelect
                kind="treating"
                value={providerId}
                onChange={setProviderId}
                officeProviders={providers}
                allProviders={allProviders}
                placeholder="-- No Provider --"
                className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                title="Provider credited with this payment"
              />
            </Labeled>
          </div>
          <Labeled label="Notes">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none"
            />
          </Labeled>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              onClick={apply}
              disabled={saving}
              style={{ background: ACCENT_BLUE }}
              className="flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              APPLY
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded bg-slate-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-slate-600"
            >
              <XCircle className="h-3.5 w-3.5" />
              CANCEL
            </button>
          </div>
        </div>
      </div>

      <ProceduresToPost
        kind="payment"
        outstanding={outstanding}
        patientName={patientName}
        providerLabel={providerLabel}
        codeDescription={codeDescription}
        allocAmounts={allocAmounts}
        setAllocAmounts={setAllocAmounts}
        selected={selected}
        setSelected={setSelected}
        totalAllocated={totalAllocated}
        paymentAmount={parseFloat(amount) || 0}
        capAmount={amountTouched ? parseFloat(amount) || 0 : undefined}
      />
    </div>
  );
}

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// Shared "Procedures To Post" grid used by both Payments and Adjustments tabs.
export function ProceduresToPost({
  kind,
  outstanding,
  patientName,
  providerLabel,
  codeDescription,
  allocAmounts,
  setAllocAmounts,
  selected,
  setSelected,
  totalAllocated,
  paymentAmount,
  capAmount,
}: {
  kind: EntryKind;
  outstanding: PatientProcedureRead[];
  patientName: string;
  providerLabel: (id: string | null | undefined) => string;
  codeDescription: (code: string) => string;
  allocAmounts: Record<string, string>;
  setAllocAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalAllocated: number;
  paymentAmount?: number;
  /** Payment amount the user typed by hand — selections never allocate past it. */
  capAmount?: number;
}) {
  /** Sum of every row's New Amt except `skipId`. */
  const allocatedExcept = (alloc: Record<string, string>, skipId: string) =>
    Object.entries(alloc).reduce((s, [k, v]) => (k === skipId ? s : s + (parseFloat(v) || 0)), 0);

  /** Checking a row posts its outstanding balance to New Amt; unchecking clears it. */
  const toggle = (p: PatientProcedureRead) => {
    const checked = !selected.has(p.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(p.id);
      else next.delete(p.id);
      return next;
    });
    setAllocAmounts((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[p.id];
        return next;
      }
      const remaining = procedureBalance(p).remaining;
      const room =
        capAmount != null && capAmount > 0
          ? Math.max(0, cents(capAmount - allocatedExcept(prev, p.id)))
          : remaining;
      next[p.id] = cents(Math.min(remaining, room)).toFixed(2);
      return next;
    });
  };

  /** Hand-editing New Amt keeps the Sel checkbox in step with the typed value. */
  const editAmount = (id: string, value: string) => {
    setAllocAmounts((prev) => ({ ...prev, [id]: value }));
    setSelected((prev) => {
      const has = prev.has(id);
      const wanted = (parseFloat(value) || 0) > 0;
      if (has === wanted) return prev;
      const next = new Set(prev);
      if (wanted) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="rounded border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#E8EFF7] px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[#16406e]">Procedures To Post</span>
        {kind === 'payment' && (
          <span className="text-xs font-semibold text-slate-700">
            Allocated: {money(totalAllocated)} of {money(paymentAmount ?? 0)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-white" style={{ background: HEADER_GRADIENT }}>
            <tr>
              <th className="w-10 px-2 py-2 text-center font-bold uppercase">Sel</th>
              <th className="px-2 py-2 text-left font-bold uppercase">Date</th>
              <th className="px-2 py-2 text-left font-bold uppercase">Patient</th>
              <th className="px-2 py-2 text-left font-bold uppercase">Code</th>
              <th className="px-2 py-2 text-center font-bold uppercase">Th</th>
              <th className="px-2 py-2 text-center font-bold uppercase">Surf</th>
              <th className="px-2 py-2 text-left font-bold uppercase">Description</th>
              <th className="px-2 py-2 text-left font-bold uppercase">Provider</th>
              <th className="px-2 py-2 text-right font-bold uppercase">Fee</th>
              <th className="px-2 py-2 text-right font-bold uppercase">Est Ins</th>
              <th className="px-2 py-2 text-right font-bold uppercase">Pat Paid</th>
              <th className="px-2 py-2 text-right font-bold uppercase">Pat Adj</th>
              <th className="px-2 py-2 text-right font-bold uppercase">Rem Amt</th>
              <th className="px-2 py-2 text-right font-bold uppercase">New Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {outstanding.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-2 py-8 text-center text-slate-400">
                  No records to display.
                </td>
              </tr>
            ) : (
              outstanding.map((p) => {
                const { fee, est_ins, pat_paid, pat_adj, remaining } = procedureBalance(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-center">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p)} className="rounded" />
                    </td>
                    <td className="px-2 py-1.5 font-mono text-slate-700">{fmtDate(p.date_of_service)}</td>
                    <td className="px-2 py-1.5 text-slate-700">{patientName}</td>
                    <td className="px-2 py-1.5">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">{p.procedure_code}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{p.tooth || '-'}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{p.surface || '-'}</td>
                    <td className="px-2 py-1.5 text-slate-800">{codeDescription(p.procedure_code) || p.procedure_code}</td>
                    <td className="px-2 py-1.5 text-slate-700">{providerLabel(p.provider_id)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-900">{money(fee)}</td>
                    <td className="px-2 py-1.5 text-right text-blue-700">{money(est_ins)}</td>
                    <td className={`px-2 py-1.5 text-right ${pat_paid ? 'text-slate-700' : 'text-slate-400'}`}>
                      {money(pat_paid)}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${pat_adj ? 'text-slate-700' : 'text-slate-400'}`}>
                      {money(pat_adj)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-900">{money(remaining)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={allocAmounts[p.id] ?? ''}
                        onChange={(e) => editAmount(p.id, e.target.value)}
                        placeholder="0.00"
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
