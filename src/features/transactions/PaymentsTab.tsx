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
import {
  PAYMENT_CATEGORIES,
  PAYMENT_APPLY_TO,
  CARD_EXP_MONTHS,
  DEFAULT_CARD_EXP_MONTH,
  cardExpYears,
  defaultCardExpYear,
  cardNote,
  paymentCodeOptions,
  paymentPanel,
  type PaymentCategory,
} from './transactionCodes';

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

const INPUT = 'w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-[#2566a8] focus:outline-none';
const INPUT_DISABLED = 'w-full rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-xs text-slate-400';

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
  // Legacy catalog overlaid by whatever the backend has seeded (see transactionCodes.ts).
  const codes = useMemo(() => paymentCodeOptions(paymentDefs), [paymentDefs]);

  const [searchCode, setSearchCode] = useState('');
  const [searchCategory, setSearchCategory] = useState<'All' | PaymentCategory>('All');
  const [searchDescription, setSearchDescription] = useState('');
  /** Selected payment code — stored as `payment_method`. */
  const [payment_method, setPaymentMethod] = useState('');

  const selectedCode = codes.find((c) => c.code === payment_method) ?? null;
  const category: PaymentCategory | null = selectedCode?.category ?? null;
  const panel = paymentPanel(category);

  const [amount, setAmount] = useState('');
  const [check_number, setCheckNumber] = useState('');
  const [bank_number, setBankNumber] = useState('');
  const [card_last4, setCardLast4] = useState('');
  const [card_exp_month, setCardExpMonth] = useState(DEFAULT_CARD_EXP_MONTH);
  const [card_exp_year, setCardExpYear] = useState(() => defaultCardExpYear());
  const [payment_type, setPaymentType] = useState<'patient' | 'insurance'>('patient');
  const [provider_id, setProviderId] = useState(defaultProviderId);
  const [notes, setNotes] = useState('');

  // Follow the toolbar provider until the user overrides it here.
  useEffect(() => setProviderId(defaultProviderId), [defaultProviderId]);

  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** True once the user types an Amount by hand — from then on it stops tracking the grid. */
  const [amountTouched, setAmountTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expYears = useMemo(() => cardExpYears(), []);

  const visibleCodes = codes.filter(
    (c) =>
      (!searchCode || c.code.toLowerCase().includes(searchCode.toLowerCase())) &&
      (searchCategory === 'All' || c.category === searchCategory) &&
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

  /** Picking a code in another tender category drops the fields that category doesn't have. */
  const pickCode = (code: string) => {
    const next = codes.find((c) => c.code === code);
    setPaymentMethod(code);
    setError(null);
    const nextPanel = paymentPanel(next?.category ?? null);
    if (!nextPanel.check_number) setCheckNumber('');
    if (!nextPanel.bank_number) setBankNumber('');
    if (!nextPanel.card) setCardLast4('');
  };

  const reset = () => {
    setAmount('');
    setAmountTouched(false);
    setCheckNumber('');
    setBankNumber('');
    setCardLast4('');
    setCardExpMonth(DEFAULT_CARD_EXP_MONTH);
    setCardExpYear(defaultCardExpYear());
    setNotes('');
    setPaymentMethod('');
    setPaymentType('patient');
    setProviderId(defaultProviderId);
    setAllocAmounts({});
    setSelected(new Set());
    setError(null);
  };

  const apply = async () => {
    if (!payment_method) {
      setError('Select a payment code from the list.');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (panel.check_number_required && !check_number.trim()) {
      setError('Check # is required for a check payment.');
      return;
    }
    if (panel.card && card_last4 && card_last4.replace(/\D/g, '').length < 4) {
      setError('Enter the last 4 digits of the card.');
      return;
    }
    if (totalAllocated > amt + 0.001) {
      setError(`Allocated total (${money(totalAllocated)}) exceeds the payment amount (${money(amt)}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // No card columns on patient_payments (gap PAY-3): keep last-4 + expiry in notes.
      const card = panel.card ? cardNote(card_last4, card_exp_month, card_exp_year) : '';
      const mergedNotes = [card, notes.trim()].filter(Boolean).join(' — ');

      const payment = await createPatientPayment({
        id: genId(),
        patient_id: patientId,
        office_id: officeId,
        payment_date: transactionDateIso,
        amount: amt.toFixed(2),
        payment_type,
        payment_method,
        ...(provider_id ? { provider_id } : {}),
        ...(panel.check_number && check_number.trim() ? { check_number: check_number.trim() } : {}),
        ...(panel.bank_number && bank_number.trim() ? { bank_number: bank_number.trim() } : {}),
        ...(mergedNotes ? { notes: mergedNotes } : {}),
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[460px_1fr]">
        {/* Payment code picker: Search | All (tender category) | Description */}
        <div className="rounded border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)] gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search"
              title="Search by payment code"
              className="w-full min-w-0 rounded border border-[#2566a8] px-2 py-1.5 text-xs focus:outline-none"
            />
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value as 'All' | PaymentCategory)}
              title="Filter by tender type"
              className="tx-select w-full min-w-0 rounded border border-slate-300 px-1 py-1.5 text-xs"
            >
              <option value="All">All</option>
              {PAYMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'None' ? '-' : c}
                </option>
              ))}
            </select>
            <input
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Description"
              title="Search by description"
              className="w-full min-w-0 rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <div
            className="grid grid-cols-[86px_150px_minmax(0,1fr)] gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: HEADER_GRADIENT }}
          >
            <span>Search</span>
            <span>All</span>
            <span>Description</span>
          </div>
          <div className="max-h-48 overflow-y-auto" data-testid="payment-code-list">
            {visibleCodes.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400">No payment codes match.</div>
            ) : (
              visibleCodes.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pickCode(c.code)}
                  data-code={c.code}
                  className={`grid w-full grid-cols-[86px_150px_minmax(0,1fr)] items-center gap-2 border-b border-slate-100 px-3 py-1.5 text-left text-xs transition hover:bg-sky-50 ${
                    payment_method === c.code ? 'bg-sky-100' : ''
                  }`}
                >
                  <span className="font-semibold text-[#1d4ed8]">{c.code}</span>
                  <span className="text-slate-700">{c.category === 'None' ? '-' : c.category}</span>
                  <span className="min-w-0 truncate text-slate-800" title={c.description}>
                    {c.description}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Payment entry panel — shape follows the selected code's tender category */}
        <div className="rounded border border-slate-200 bg-white" data-testid="payment-panel" data-category={category ?? ''}>
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#E8EFF7] px-3 py-1.5">
            <span className="text-xs font-bold text-[#16406e]">{panel.title}</span>
            <span className="text-[11px] text-slate-600">
              {selectedCode ? (
                <>
                  <span className="font-semibold text-[#1d4ed8]">{selectedCode.code}</span> · {selectedCode.description}
                </>
              ) : (
                'Select a payment code to open its entry form'
              )}
            </span>
          </div>
          <div className="space-y-3 p-3">
            {/* Row 1: Amount | category-specific #1 | category-specific #2 */}
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
                  className={`${INPUT} text-right`}
                />
              </Labeled>
              {panel.check_number ? (
                <Labeled label="Check #" required={panel.check_number_required}>
                  <input
                    value={check_number}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className={INPUT}
                    data-testid="check-number"
                  />
                </Labeled>
              ) : panel.card ? (
                <Labeled label="Credit Card # (last 4)">
                  <input
                    value={card_last4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    title="Only the last four digits are stored (in the payment notes)"
                    className={INPUT}
                    data-testid="card-last4"
                  />
                </Labeled>
              ) : (
                <Placeholder />
              )}
              {panel.bank_number ? (
                <Labeled label="Bank #">
                  <input
                    value={bank_number}
                    onChange={(e) => setBankNumber(e.target.value)}
                    title="Deposit bank number — persisted on the payment"
                    className={INPUT}
                    data-testid="bank-number"
                  />
                </Labeled>
              ) : (
                <Placeholder />
              )}
            </div>

            {/* Row 2: Apply To | Provider | Exp. Date (card only) */}
            <div className="grid grid-cols-3 gap-3">
              <Labeled label="Apply To">
                <select
                  value={payment_type}
                  onChange={(e) => setPaymentType(e.target.value as 'patient' | 'insurance')}
                  className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                >
                  {PAYMENT_APPLY_TO.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Provider">
                <ProviderSelect
                  kind="treating"
                  value={provider_id}
                  onChange={setProviderId}
                  officeProviders={providers}
                  allProviders={allProviders}
                  placeholder="-- No Provider --"
                  className="tx-select w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                  title="Provider credited with this payment"
                />
              </Labeled>
              {panel.card ? (
                <Labeled label="Exp. Date">
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={card_exp_month}
                      onChange={(e) => setCardExpMonth(e.target.value)}
                      className="tx-select w-full rounded border border-slate-300 px-1 py-1.5 text-xs"
                      data-testid="card-exp-month"
                    >
                      {CARD_EXP_MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={card_exp_year}
                      onChange={(e) => setCardExpYear(e.target.value)}
                      className="tx-select w-full rounded border border-slate-300 px-1 py-1.5 text-xs"
                      data-testid="card-exp-year"
                    >
                      {expYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </Labeled>
              ) : (
                <Placeholder />
              )}
            </div>

            <Labeled label="Notes">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} />
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

/** Greyed-out slot, like the legacy panel's inactive boxes — keeps the grid shape stable across categories. */
function Placeholder() {
  return (
    <div aria-hidden="true">
      <div className="mb-1 h-[15px]" />
      <div className={INPUT_DISABLED}>&nbsp;</div>
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
  disabled,
  disabledReason,
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
  /** Per-procedure split not available (e.g. debit adjustments) — rows render read-only. */
  disabled?: boolean;
  disabledReason?: string;
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
        {disabled && disabledReason && (
          <span className="text-[11px] font-semibold text-amber-700">{disabledReason}</span>
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
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p)}
                        disabled={disabled}
                        className="rounded"
                      />
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
                        disabled={disabled}
                        placeholder="0.00"
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100 disabled:text-slate-400"
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
