import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  Loader2,
  Printer,
  FileText,
  FilePlus2,
  DollarSign,
  Plus,
  BarChart3,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Paperclip,
  X,
} from 'lucide-react';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { useDefinitions } from '@/hooks/useDefinitions';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { createInsuranceClaim } from '@/api/generated/endpoints/billing/billing';
import { updatePatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import { getPatientBalances, type BalancesResponse } from '@/services/ledgerApi';
import PatientLedger from '@/components/pages/PatientLedger';
import TransactionEntryModal from './TransactionEntryModal';
import {
  loadAccountLedgerData,
  loadPaymentPlans,
  codeDescription,
  type AccountLedgerData,
  type PaymentPlans,
} from './accountLedgerService';
import {
  procedureRow,
  paymentRow,
  adjustmentRow,
  withRunningBalance,
  applyFilter,
  applyDateRange,
  applySort,
  parseDateInput,
  money,
  num,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  type LedgerRow,
  type LedgerFilter,
  type LedgerSort,
} from './accountLedgerModel';

interface OutletCtx {
  patient: {
    id: string;
    name: string;
    officeId?: string;
    office?: string;
    balance?: number;
  };
}

type BottomTab = 'balances' | 'contracts';

// Legacy "Account Ledger - Show All" grid columns, in order.
const GRID_COLS = [
  'Date', 'Patient', 'Office', 'A', 'Code', 'TH', 'Surf', 'T', 'N', 'At',
  '', 'Description', 'Bill', 'Durati…', 'Provider', 'Est Pat', 'Est Ins',
  'Amount', 'Balance', 'User',
] as const;

const HEADER_BG = 'linear-gradient(180deg,#1f6fc4,#155a9e)';
const BTN_BLUE = '#1f6fc4';

const dollars = (n: number): string => `$${money(n)}`;

export default function AccountLedgerPage() {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const patientId = Number(patient?.id ?? patientIdParam);
  const validId = Number.isFinite(patientId) && patientId > 0;
  const officeId = patient?.officeId ? Number(patient.officeId) : null;
  const patientName = patient?.name ?? 'Unknown Patient';

  // ---- Data ----
  const [data, setData] = useState<AccountLedgerData>({
    procs: [], pays: [], adjs: [], offices: [], users: [],
  });
  const [plans, setPlans] = useState<PaymentPlans>({ regular: null, orthoIns: null, secIns: null });
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { definitions: paymentDefs } = useDefinitions('payment_method');
  const { definitions: adjustmentDefs } = useDefinitions('adjustment');

  // ---- Toolbar / view state ----
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [sort, setSort] = useState<LedgerSort>('date_desc');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [view, setView] = useState<'account' | 'patient'>('account');
  const [txModal, setTxModal] = useState<null | 'add' | 'payments'>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showBalanceStat, setShowBalanceStat] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('balances');
  const [creatingClaim, setCreatingClaim] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Freeze the ledger behind any open overlay, and let Esc close the Balance
  // Statistics popup so the keyboard isn't stranded on a locked page (KAN-104).
  useBodyScrollLock(showBalanceStat || txModal !== null);
  useEffect(() => {
    if (!showBalanceStat) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowBalanceStat(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showBalanceStat]);

  // ---- Loaders ----
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([
      loadAccountLedgerData(patientId),
      loadPaymentPlans(patientId),
      getPatientBalances(patientId).catch(() => null),
    ])
      .then(([d, p, b]) => {
        if (!alive) return;
        setData(d);
        setPlans(p);
        setBalances(b);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Failed to load account ledger');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [validId, patientId, reloadKey]);

  // Close the Sort-By menu on outside click.
  useEffect(() => {
    if (!showSortMenu) return;
    const onClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showSortMenu]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // ---- Resolvers (memoised maps) ----
  const officeFn = useMemo(() => {
    const m = new Map(data.offices.map((o) => [o.id, o.short_id || o.office_code || o.name]));
    return (id: number | null | undefined) => (id != null ? m.get(id) || String(id) : '-');
  }, [data.offices]);

  const userFn = useMemo(() => {
    const m = new Map(data.users.map((u) => [u.id, u.short_id || u.username]));
    return (id: number | null | undefined) => (id != null ? m.get(id) || String(id) : '-');
  }, [data.users]);

  // Resolve provider ids against the WHOLE directory, not the office-scoped subset —
  // a ledger row can be posted by a provider who no longer works at this office.
  const { providerLabel: providerFn } = useProviderDirectory();
  const paymentFn = useMemo(() => {
    const m = new Map(paymentDefs.map((d) => [d.key1, d.description]));
    return (code: string | null | undefined) => (code ? m.get(code) || code : '');
  }, [paymentDefs]);
  const adjustmentFn = useMemo(() => {
    const m = new Map(adjustmentDefs.map((d) => [d.key1, d.description]));
    return (code: string | null | undefined) => (code ? m.get(code) || code : '');
  }, [adjustmentDefs]);

  // ---- Build rows: map -> running balance (whole feed) ----
  const allRows = useMemo<LedgerRow[]>(() => {
    const rows = [
      ...data.procs.map((p) => procedureRow(p, patientName, officeFn, providerFn, userFn, codeDescription)),
      ...data.pays.map((p) => paymentRow(p, patientName, officeFn, providerFn, userFn, paymentFn)),
      ...data.adjs.map((a) => adjustmentRow(a, patientName, officeFn, userFn, adjustmentFn)),
    ];
    return withRunningBalance(rows);
  }, [data, patientName, officeFn, providerFn, userFn, paymentFn, adjustmentFn]);

  // ---- Filter -> date range -> sort ----
  const viewRows = useMemo(() => {
    const filtered = applyDateRange(applyFilter(allRows, filter), appliedFrom, appliedTo);
    return applySort(filtered, sort);
  }, [allRows, filter, appliedFrom, appliedTo, sort]);

  const grandTotal = useMemo(() => viewRows.reduce((s, r) => s + r.amount, 0), [viewRows]);

  // Keep the current page in range as filters change.
  const totalItems = viewRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return viewRows.slice(start, start + pageSize);
  }, [viewRows, currentPage, pageSize]);

  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  // ---- Toolbar handlers ----
  const handleGo = () => {
    setAppliedFrom(parseDateInput(fromInput));
    setAppliedTo(parseDateInput(toInput));
    setCurrentPage(1);
  };
  const handleClear = () => {
    setFromInput('');
    setToInput('');
    setAppliedFrom(null);
    setAppliedTo(null);
    setFilter('all');
    setCurrentPage(1);
  };

  const handleCreateClaim = async () => {
    const billable = data.procs.filter((p) => !p.claim_id && !p.is_void);
    if (billable.length === 0) {
      alert('No unbilled procedures available to create a claim.');
      return;
    }
    setCreatingClaim(true);
    try {
      const dates = billable
        .map((p) => new Date(p.date_of_service))
        .filter((d) => !Number.isNaN(d.getTime()));
      const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
      const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
      const claimId = crypto.randomUUID();
      await createInsuranceClaim({
        id: claimId,
        patient_id: patientId,
        office_id: billable[0]?.office_id ?? officeId,
        claim_number: String(Date.now()),
        claim_type: 'dental',
        billing_order: 'primary',
        date_of_service_from: minDate.toISOString().slice(0, 10),
        date_of_service_to: maxDate.toISOString().slice(0, 10),
        total_billed: billable.reduce((s, p) => s + num(p.fee), 0).toFixed(2),
        est_insurance: billable.reduce((s, p) => s + num(p.insurance_estimate), 0).toFixed(2),
      });
      await Promise.allSettled(billable.map((p) => updatePatientProcedure(p.id, { claim_id: claimId })));
      navigate(`/patient/${patientId}/claim/${claimId}`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to create claim.');
    } finally {
      setCreatingClaim(false);
    }
  };

  if (!validId) {
    return <div className="p-6 text-center text-red-600">Patient context is required.</div>;
  }

  const accountBalance = balances?.account_balance ?? patient?.balance ?? 0;

  const toolbarBtn =
    'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50';

  return (
    <div className="bg-slate-50 p-3 text-[#1E293B]">
      {/* Ledger view toggle — one entry point, switch Patient <-> Account level */}
      <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        {([
          ['patient', 'Patient Ledger'],
          ['account', 'Account Ledger'],
        ] as ['patient' | 'account', string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              view === key ? 'bg-[#1f6fc4] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'patient' ? (
        <PatientLedger />
      ) : (
        <>
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(180deg,#2a4a73,#1d3a5f)' }}
      >
        <span>Account Ledger — {FILTER_OPTIONS.find((f) => f.value === filter)?.label}</span>
        <div className="flex items-center gap-4 text-xs font-normal">
          <span>
            Balance{' '}
            <span className={`font-bold ${accountBalance > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
              {dollars(accountBalance)}
            </span>
          </span>
          <button onClick={() => window.print()} className="rounded p-1 hover:bg-white/10" title="Print">
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-x border-b border-slate-200 bg-slate-100 px-3 py-2">
        <button className={toolbarBtn} style={{ background: BTN_BLUE }} title="Account Ledger (current view)">
          <FileText className="h-3.5 w-3.5" /> PATIENT LEDGER
        </button>
        <button onClick={handleCreateClaim} disabled={creatingClaim} className={toolbarBtn} style={{ background: BTN_BLUE }}>
          {creatingClaim ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
          CREATE CLAIM
        </button>
        <button onClick={() => setTxModal('payments')} className={toolbarBtn} style={{ background: BTN_BLUE }}>
          <DollarSign className="h-3.5 w-3.5" /> PAYMENTS/ADJUSTMENTS
        </button>
        <button onClick={() => setTxModal('add')} className={toolbarBtn} style={{ background: BTN_BLUE }}>
          <Plus className="h-3.5 w-3.5" /> ADD PROCEDURE
        </button>
        <button onClick={() => { setBottomTab('balances'); setShowBalanceStat(true); }} className={toolbarBtn} style={{ background: BTN_BLUE }}>
          <BarChart3 className="h-3.5 w-3.5" /> BALANCE STAT
        </button>

        {/* Sort By */}
        <div className="relative" ref={sortMenuRef}>
          <button onClick={() => setShowSortMenu((v) => !v)} className={toolbarBtn} style={{ background: BTN_BLUE }}>
            <ArrowUpDown className="h-3.5 w-3.5" /> SORT BY
          </button>
          {showSortMenu && (
            <div className="absolute z-20 mt-1 w-52 rounded border border-slate-200 bg-white py-1 shadow-lg">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setSort(o.value); setShowSortMenu(false); }}
                  className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 ${
                    sort === o.value ? 'font-bold text-[#1f6fc4]' : 'text-slate-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range + filter */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">From</label>
          <input
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            placeholder="MM/DD/YYYY"
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-[#1f6fc4] focus:outline-none"
          />
          <label className="text-xs font-semibold text-slate-600">To</label>
          <input
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            placeholder="MM/DD/YYYY"
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-[#1f6fc4] focus:outline-none"
          />
          <button onClick={handleGo} className={toolbarBtn} style={{ background: BTN_BLUE }}>GO</button>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value as LedgerFilter); setCurrentPage(1); }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={handleClear} className="flex items-center gap-1.5 rounded bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800">
            <X className="h-3.5 w-3.5" /> CLEAR
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border-x border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="text-white" style={{ background: HEADER_BG }}>
            <tr>
              {GRID_COLS.map((c, i) => (
                <th
                  key={i}
                  className={`whitespace-nowrap px-2 py-2 font-bold uppercase tracking-wide ${
                    ['Est Pat', 'Est Ins', 'Amount', 'Balance'].includes(c) ? 'text-right' : 'text-left'
                  }`}
                >
                  {c === '' ? <Paperclip className="h-3.5 w-3.5" /> : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={GRID_COLS.length} className="px-2 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={GRID_COLS.length} className="px-2 py-12 text-center text-red-600">
                  {error}{' '}
                  <button onClick={refresh} className="ml-2 underline">Retry</button>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={GRID_COLS.length} className="px-2 py-12 text-center text-slate-400">
                  No transactions to display.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                // Legacy color coding: credits (payments) & adjustments render in orange.
                const credit = r.kind !== 'procedure';
                const text = credit ? 'text-orange-600' : 'text-slate-700';
                return (
                  <tr key={r.key} className={`hover:bg-slate-50 ${credit ? 'bg-orange-50/40' : ''}`}>
                    <td className={`whitespace-nowrap px-2 py-1.5 font-mono ${text}`}>{r.date}</td>
                    <td className={`px-2 py-1.5 ${text}`}>{r.patient}</td>
                    <td className={`px-2 py-1.5 ${text}`}>{r.office}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>{r.apply_to}</td>
                    <td className={`px-2 py-1.5 font-semibold ${credit ? 'text-orange-700' : 'text-blue-800'}`}>{r.code}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>{r.tooth}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>{r.surface}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>{r.t}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>{r.n}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>-</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>-</td>
                    <td className={`px-2 py-1.5 ${credit ? 'text-orange-700' : 'text-slate-800'}`}>{r.description}</td>
                    <td className={`px-2 py-1.5 ${text}`}>{r.bill}</td>
                    <td className={`px-2 py-1.5 text-center ${text}`}>-</td>
                    <td className={`px-2 py-1.5 ${text}`}>{r.provider}</td>
                    <td className={`px-2 py-1.5 text-right ${text}`}>{dollars(r.est_pat)}</td>
                    <td className={`px-2 py-1.5 text-right ${text}`}>{dollars(r.est_ins)}</td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${credit ? 'text-orange-700' : 'text-slate-900'}`}>{dollars(r.amount)}</td>
                    <td className={`px-2 py-1.5 text-right font-mono ${text}`}>{dollars(r.balance)}</td>
                    <td className={`px-2 py-1.5 ${text}`}>{r.user}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!loading && !error && pageRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800">
                <td colSpan={17} className="px-2 py-2 text-right">Grand Total For Results :</td>
                <td className="px-2 py-2 text-right">{dollars(grandTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-x border-b border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing Items: <span className="font-semibold">{firstItem} to {lastItem}</span> of {totalItems}
          </span>
          <label className="flex items-center gap-1">
            Items Per Page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded border border-slate-300 bg-white px-1.5 py-0.5"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronsLeft className="h-4 w-4" /></button>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-2">Page <span className="font-semibold">{currentPage}</span> of {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"><ChevronsRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Bottom tabs */}
      <div className="mt-3 border border-slate-200 bg-white">
        <div className="flex border-b border-slate-200 bg-[#F7F9FC]">
          {(['balances', 'contracts'] as BottomTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setBottomTab(t)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-wide ${
                bottomTab === t ? 'border-b-2 border-[#1f6fc4] bg-white text-[#1f6fc4]' : 'text-slate-500 hover:text-[#155a9e]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-4">
          {bottomTab === 'balances'
            ? <BalancesPanel balances={balances} />
            : <ContractsPanel plans={plans} />}
        </div>
      </div>

      {/* Balance Stat modal */}
      {showBalanceStat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Balance Statistics"
          onClick={() => setShowBalanceStat(false)}
        >
          {/* Capped at 90vh with the body scrolling inside, so a tall balance
              list scrolls within the popup instead of pushing past the viewport
              and inviting a scroll of the page behind it (KAN-104). */}
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between rounded-t-lg px-4 py-2 text-white" style={{ background: HEADER_BG }}>
              <span className="text-sm font-semibold">Balance Statistics — {patientName}</span>
              <button onClick={() => setShowBalanceStat(false)} className="rounded p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <BalancesPanel balances={balances} />
            </div>
          </div>
        </div>
      )}

      {/* Transaction-entry popup — reuses the dynamic Transactions Entry tabs */}
      {txModal && (
        <TransactionEntryModal
          patientId={patientId}
          officeId={officeId}
          patientName={patientName}
          initialTab={txModal}
          onClose={() => setTxModal(null)}
          onChanged={refresh}
        />
      )}
        </>
      )}
    </div>
  );
}

// ---- Balances (BALANCES tab + BALANCE STAT modal) ----
function BalancesPanel({ balances }: { balances: BalancesResponse | null }) {
  if (!balances) {
    return <div className="text-center text-sm text-slate-400">No balance data available.</div>;
  }
  const Row = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono font-semibold ${tone ?? 'text-slate-900'}`}>{dollars(value)}</span>
    </div>
  );
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-lg border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Account Summary</h3>
        <Row label="Account Balance" value={balances.account_balance} />
        <Row label="Patient Balance" value={balances.patient_balance} tone="text-red-700" />
        <Row label="Insurance Balance" value={balances.insurance_balance} tone="text-blue-700" />
        <Row label="Estimated Patient" value={balances.estimated_patient} tone="text-red-700" />
        <Row label="Estimated Insurance" value={balances.estimated_insurance} tone="text-blue-700" />
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Aging Buckets</h3>
        <Row label="Current" value={balances.aging.current} />
        <Row label="30 Days" value={balances.aging.age_30} />
        <Row label="60 Days" value={balances.aging.age_60} tone="text-orange-600" />
        <Row label="90 Days" value={balances.aging.age_90} tone="text-orange-700" />
        <Row label="120+ Days" value={balances.aging.age_120} tone="text-red-700" />
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Recent Activity</h3>
        <Row label="Today's Charges" value={balances.recent_activity.today_charges} />
        <Row label="Today's Payments" value={balances.recent_activity.today_payments} tone="text-green-700" />
        {balances.recent_activity.last_insurance_payment && (
          <Row label="Last Insurance Payment" value={balances.recent_activity.last_insurance_payment.amount} tone="text-blue-700" />
        )}
        {balances.recent_activity.last_patient_payment && (
          <Row label="Last Patient Payment" value={balances.recent_activity.last_patient_payment.amount} tone="text-green-700" />
        )}
      </div>
    </div>
  );
}

// ---- Contracts (payment plans) ----
function ContractsPanel({ plans }: { plans: PaymentPlans }) {
  const reg = plans.regular;
  const ins = plans.orthoIns;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <PlanCard
        title="Regular - Patient Payment Plan"
        rows={[
          ['Plan Amount', reg?.amt_financed ?? reg?.plan_bal_amt],
          ['Down Pay', reg?.down_payment],
          ['Next Per. Amt', reg?.periodic_amt],
          ['Next Date', reg?.first_due_date],
          ['Rem. Total Amt', reg?.rem_total_amt],
          ['Rem. # Of Pay', reg?.rem_payments],
        ]}
      />
      {/* No clean backend resource for an ortho-specific patient plan (gap AL-3). */}
      <PlanCard
        title="Ortho - Patient Payment Plan"
        rows={[
          ['Plan Amount', null],
          ['Down Pay', null],
          ['Next Per. Amt', null],
          ['Next Date', null],
          ['Rem. Total Amt', null],
          ['Rem. # Of Pay', null],
        ]}
      />
      <PlanCard
        title="Ortho - Insurance Payment Plan"
        rows={[
          ['Plan Amount', null],
          ['Down Pay', null],
          ['Next Per. Amt', ins?.periodic_amt],
          ['Next Date', ins?.periodic_date],
          ['Rem. Total Amt', null],
          ['Rem. # Of Pay', null],
        ]}
      />
    </div>
  );
}

function PlanCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | number | null | undefined][];
}) {
  const fmt = (v: string | number | null | undefined): string => {
    if (v == null || v === '') return '—';
    if (typeof v === 'number') return String(v);
    // Date-ish strings -> MM/DD/YYYY; numeric-ish -> $amount.
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const [y, m, d] = v.slice(0, 10).split('-');
      return `${m}/${d}/${y}`;
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return `$${money(v)}`;
    return v;
  };
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-white" style={{ background: HEADER_BG }}>
        {title}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="w-1/2 bg-slate-50 px-3 py-1.5 font-semibold text-slate-600">{label}</td>
              <td className="px-3 py-1.5 font-mono text-slate-900">{fmt(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
