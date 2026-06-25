// Transaction-entry popup for the Account Ledger. Reuses the already-built,
// dynamic Transactions Entry tabs (category-button Add Procedures + Payments +
// Adjustments) inside a properly-backdropped modal — so a user can post charges,
// payments and adjustments without leaving the ledger, fully end-to-end. The
// ledger refreshes after every post via onChanged().

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { fetchProviders, type Provider } from '@/services/schedulerApi';
import { useDefinitions } from '@/hooks/useDefinitions';
import type { PatientProcedureRead } from '@/api/generated/model';
import {
  loadOutstandingProcedures,
  codeDescription,
} from '@/features/transactions/transactionsService';
import {
  providerLabelResolver,
  todayDisplay,
  toIsoDate,
} from '@/features/transactions/transactionsModel';
import AddProceduresTab from '@/features/transactions/AddProceduresTab';
import PaymentsTab from '@/features/transactions/PaymentsTab';
import AdjustmentsTab from '@/features/transactions/AdjustmentsTab';

type Tab = 'add' | 'payments' | 'adjustments';

interface Props {
  patientId: number;
  officeId: number | null;
  patientName: string;
  initialTab?: Tab;
  onClose: () => void;
  /** Called after any charge/payment/adjustment posts, so the ledger can refresh. */
  onChanged: () => void;
}

const HEADER_BG = 'linear-gradient(180deg,#2a4a73,#1d3a5f)';
const ACCENT = '#1f6fc4';

export default function TransactionEntryModal({
  patientId,
  officeId,
  patientName,
  initialTab = 'add',
  onClose,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [transactionDate, setTransactionDate] = useState(todayDisplay());
  const [appliedIso, setAppliedIso] = useState(toIsoDate(todayDisplay()));
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [outstanding, setOutstanding] = useState<PatientProcedureRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const { definitions: paymentDefs } = useDefinitions('payment_method');
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');

  const providerLabel = useMemo(() => providerLabelResolver(providers), [providers]);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Providers (office-scoped).
  useEffect(() => {
    let alive = true;
    fetchProviders(officeId != null ? String(officeId) : undefined)
      .then((list) => alive && setProviders(list))
      .catch(() => alive && setProviders([]));
    return () => {
      alive = false;
    };
  }, [officeId]);

  // Outstanding (claim/payment-eligible) procedures for the Payments/Adjustments grids.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadOutstandingProcedures(patientId)
      .then((out) => alive && setOutstanding(out))
      .catch(() => alive && setOutstanding([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [patientId, reloadKey]);

  // A post happened: refresh both the modal's outstanding list and the parent ledger.
  const handlePosted = () => {
    setReloadKey((k) => k + 1);
    onChanged();
  };

  const handleGo = () => setAppliedIso(toIsoDate(transactionDate));

  // Suppress unused-var lint for paymentDefs/adjustmentDefs — the tabs resolve their
  // own labels; we only need the definitions warmed in cache here.
  void paymentDefs;
  void adjustmentDefs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: HEADER_BG }}>
          <div>
            <div className="text-sm font-semibold">Transactions Entry</div>
            <div className="text-xs text-white/80">
              Patient: {patientName}
              {officeId != null && <> &nbsp;|&nbsp; Office: {officeId}</>}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2">
          <label className="text-xs font-semibold text-slate-600">Transaction Date</label>
          <input
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            onBlur={handleGo}
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-[#1f6fc4] focus:outline-none"
          />
          <button onClick={handleGo} className="rounded px-3 py-1 text-xs font-bold text-white shadow-sm" style={{ background: ACCENT }}>
            GO
          </button>
          {tab === 'add' && (
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
              title="Treating provider for procedures added here"
            >
              <option value="">-- Select Provider --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} : {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-[#F7F9FC]">
          {([
            ['add', 'Add Procedures'],
            ['payments', 'Payments'],
            ['adjustments', 'Adjustments'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                tab === key
                  ? 'border-b-2 border-[#1f6fc4] bg-white text-[#1d4ed8]'
                  : 'text-slate-500 hover:text-[#155a9e]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-white p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tab === 'add' ? (
            <AddProceduresTab
              patientId={patientId}
              officeId={officeId}
              providerId={providerId}
              transactionDateIso={appliedIso}
              onPosted={handlePosted}
            />
          ) : tab === 'payments' ? (
            <PaymentsTab
              patientId={patientId}
              officeId={officeId}
              transactionDateIso={appliedIso}
              patientName={patientName}
              outstanding={outstanding}
              providerLabel={providerLabel}
              codeDescription={codeDescription}
              onApplied={handlePosted}
            />
          ) : (
            <AdjustmentsTab
              patientId={patientId}
              officeId={officeId}
              transactionDateIso={appliedIso}
              patientName={patientName}
              outstanding={outstanding}
              providers={providers}
              providerLabel={providerLabel}
              codeDescription={codeDescription}
              onApplied={handlePosted}
            />
          )}
        </div>
      </div>
    </div>
  );
}
