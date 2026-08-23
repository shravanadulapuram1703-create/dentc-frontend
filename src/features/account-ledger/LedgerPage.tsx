import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  Loader2,
  Printer,
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
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { createInsuranceClaim } from '@/api/generated/endpoints/billing/billing';
import { updatePatientProcedure } from '@/api/generated/endpoints/clinical/clinical';
import { getPatientBalances, type BalancesResponse } from '@/services/ledgerApi';
import TransactionEntryModal from './TransactionEntryModal';
import EditTransactionModal from './EditTransactionModal';
import ClaimDetailsModal from './ClaimDetailsModal';
import PaymentAllocationModal from './PaymentAllocationModal';
import LedgerGrid from './LedgerGrid';
import {
  loadAccountMembers,
  loadLedgerFeed,
  loadPaymentPlans,
  type AccountMember,
  type LedgerFeed,
  type LedgerScope,
  type PaymentPlans,
} from './accountLedgerService';
import {
  apiRow,
  claimRow,
  withRunningBalance,
  applyFilter,
  applyDateRange,
  applySort,
  parseDateInput,
  money,
  dollars,
  HEADER_BG,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  type LedgerRow,
  type LedgerFilter,
  type LedgerSort,
  type LedgerTarget,
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


/** Per-member balance snapshot for the legacy BALANCES table. */
interface MemberBalance {
  member: AccountMember;
  balances: BalancesResponse | null;
}

export default function LedgerPage({ defaultScope = 'account' }: { defaultScope?: LedgerScope }) {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const patientId = Number(patient?.id ?? patientIdParam);
  const validId = Number.isFinite(patientId) && patientId > 0;
  const officeId = patient?.officeId ? Number(patient.officeId) : null;
  const patientName = patient?.name ?? 'Unknown Patient';

  // ---- Scope (Patient Ledger <-> Account Ledger) ----
  const [scope, setScope] = useState<LedgerScope>(defaultScope);

  // ---- Data ----
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [feed, setFeed] = useState<LedgerFeed>({ feeds: [], offices: [], users: [] });
  const [plans, setPlans] = useState<PaymentPlans>({ regular: null, orthoIns: null, secIns: null });
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // ---- Toolbar / view state ----
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [sort, setSort] = useState<LedgerSort>('date_asc');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [txModal, setTxModal] = useState<null | 'add' | 'payments'>(null);
  // Ledger drill-down targets — one row at a time, whichever link was clicked.
  const [detailRow, setDetailRow] = useState<LedgerRow | null>(null);
  const [claimDetailsRow, setClaimDetailsRow] = useState<LedgerRow | null>(null);
  const [allocRow, setAllocRow] = useState<LedgerRow | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showBalanceStat, setShowBalanceStat] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('balances');
  const [creatingClaim, setCreatingClaim] = useState(false);

  // Legacy "Prn" row selection — keyed by LedgerRow.key.
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // ---- Members (scope-dependent) ----
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    loadAccountMembers(patientId, scope)
      .then((m) => alive && setMembers(m))
      .catch(() => alive && setMembers([{ patient_id: patientId, name: patientName }]));
    return () => { alive = false; };
  }, [validId, patientId, patientName, scope, reloadKey]);

  // ---- Feed ----
  useEffect(() => {
    if (!validId || members.length === 0) return;
    let alive = true;
    setLoading(true);
    setError(null);
    loadLedgerFeed(members, { date_from: appliedFrom, date_to: appliedTo })
      .then((f) => alive && setFeed(f))
      .catch((err) => alive && setError(err?.message || 'Failed to load ledger'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [validId, members, appliedFrom, appliedTo]);

  // ---- Contracts (always the selected patient's plans) ----
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    loadPaymentPlans(patientId).then((p) => alive && setPlans(p)).catch(() => {});
    return () => { alive = false; };
  }, [validId, patientId, reloadKey]);

  // ---- Balances: one call per member, resolved independently so a slow
  // /balance (it can take ~20s cold) never blocks the grid. ----
  useEffect(() => {
    if (members.length === 0) return;
    let alive = true;
    setMemberBalances(members.map((member) => ({ member, balances: null })));
    members.forEach((member) => {
      getPatientBalances(member.patient_id)
        .then((b) => {
          if (!alive) return;
          setMemberBalances((prev) =>
            prev.map((mb) => (mb.member.patient_id === member.patient_id ? { ...mb, balances: b } : mb)),
          );
        })
        .catch(() => {});
    });
    return () => { alive = false; };
  }, [members, reloadKey]);

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

  // ---- Resolvers ----
  const officeLabel = useMemo(() => {
    const m = new Map(feed.offices.map((o) => [o.id, o.short_id || o.office_code || o.name]));
    return (id: number | null | undefined) => (id != null ? m.get(id) || String(id) : '-');
  }, [feed.offices]);

  const userLabel = useMemo(() => {
    const m = new Map(feed.users.map((u) => [u.id, u.short_id || u.username]));
    return (id: number | null | undefined) => (id != null ? m.get(id) || String(id) : '');
  }, [feed.users]);

  // ---- Build rows: map -> running balance over the whole feed ----
  const allRows = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = [];
    for (const f of feed.feeds) {
      for (const r of f.rows) rows.push(apiRow(r, f.member.patient_id, f.member.name, userLabel, f.held));
      for (const c of f.claims) rows.push(claimRow(c, f.member.name, officeLabel, userLabel));
    }
    return withRunningBalance(rows);
  }, [feed, officeLabel, userLabel]);

  // ---- Filter -> date range -> sort ----
  const viewRows = useMemo(() => {
    const filtered = applyDateRange(applyFilter(allRows, filter), appliedFrom, appliedTo);
    return applySort(filtered, sort);
  }, [allRows, filter, appliedFrom, appliedTo, sort]);

  const grandTotal = useMemo(() => viewRows.reduce((s, r) => s + r.amount, 0), [viewRows]);

  /**
   * Ledger-derived balance per patient (charges − credits over the whole feed).
   *
   * This is what the legacy screen shows, and it is what the grid's running
   * balance column adds up to. `GET /patients/{id}/balance` currently reports
   * a different number because migrated payments are stored with a negative
   * `amount` and the endpoint subtracts them (gap AL-9), so the header and the
   * BALANCES "Balance" column are taken from the feed to keep the screen
   * internally consistent.
   */
  const ledgerBalanceByPatient = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of allRows) {
      m.set(r.patient_id, Math.round(((m.get(r.patient_id) ?? 0) + r.amount) * 100) / 100);
    }
    return m;
  }, [allRows]);

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

  // ---- Selection (legacy "Prn" checkboxes) ----
  // Only unbilled procedure charges may go on a claim; everything else renders
  // a disabled checkbox, exactly as the legacy grid does.
  const claimableRows = useMemo(() => viewRows.filter((r) => r.claimable), [viewRows]);
  const selectedRows = useMemo(
    () => claimableRows.filter((r) => selected.has(r.key)),
    [claimableRows, selected],
  );
  const pageClaimable = pageRows.filter((r) => r.claimable);
  const allPageSelected =
    pageClaimable.length > 0 && pageClaimable.every((r) => selected.has(r.key));

  // Drop selections that no longer exist (filter change, reload).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(claimableRows.map((r) => r.key));
      const next = new Set([...prev].filter((k) => live.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [claimableRows]);

  const toggleRow = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const togglePage = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of pageClaimable) {
        if (checked) next.add(r.key);
        else next.delete(r.key);
      }
      return next;
    });

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

  /**
   * Create a claim from the CHECKED rows only (legacy behaviour: only
   * claim-eligible transactions can be selected and sent). Rows spanning
   * several account members produce one claim per patient.
   */
  const handleCreateClaim = async () => {
    if (selectedRows.length === 0) return;
    setCreatingClaim(true);
    try {
      const byPatient = new Map<number, LedgerRow[]>();
      for (const r of selectedRows) {
        const list = byPatient.get(r.patient_id) ?? [];
        list.push(r);
        byPatient.set(r.patient_id, list);
      }

      const createdIds: string[] = [];
      let linkFailures = 0;

      for (const [pid, rows] of byPatient) {
        const isos = rows.map((r) => r.iso).filter(Boolean).sort();
        const claimId = crypto.randomUUID();
        await createInsuranceClaim({
          id: claimId,
          patient_id: pid,
          office_id: rows[0]?.office_id ?? officeId,
          claim_number: String(Date.now()),
          claim_type: 'dental',
          billing_order: 'primary',
          date_of_service_from: isos[0] || new Date().toISOString().slice(0, 10),
          date_of_service_to: isos[isos.length - 1] || new Date().toISOString().slice(0, 10),
          total_billed: rows.reduce((s, r) => s + r.amount, 0).toFixed(2),
          est_insurance: rows.reduce((s, r) => s + r.est_ins, 0).toFixed(2),
        });
        const results = await Promise.allSettled(
          rows.map((r) => updatePatientProcedure(r.source_id, { claim_id: claimId })),
        );
        linkFailures += results.filter((r) => r.status === 'rejected').length;
        createdIds.push(claimId);
      }

      if (linkFailures > 0) {
        alert(
          `Claim created, but ${linkFailures} of ${selectedRows.length} procedure(s) could not be linked. Please review the claim.`,
        );
      }
      setSelected(new Set());
      navigate(`/patient/${byPatient.keys().next().value}/claim/${createdIds[0]}`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to create claim.');
    } finally {
      setCreatingClaim(false);
    }
  };

  /**
   * Legacy ledger drill-down. Which window opens depends on BOTH the column
   * clicked and the transaction type, exactly as on-prem:
   *
   *   Date        charge/payment -> Edit Treatment / Edit Payment (in-place)
   *               claim          -> the full Primary Dental Insurance Claim screen
   *   Description claim          -> the Claim Details popup
   *   Amount      non-claim      -> the Payment Allocation Detail popup
   */
  const openRow = (r: LedgerRow, target: LedgerTarget) => {
    if (target === 'allocation') {
      setAllocRow(r);
      return;
    }
    if (target === 'claim-details') {
      setClaimDetailsRow(r);
      return;
    }
    // target === 'detail' (the Date column)
    if (r.kind === 'claim') {
      navigate(`/patient/${r.patient_id}/claim/${r.source_id}`);
      return;
    }
    if (r.kind === 'charge' || r.kind === 'payment') setDetailRow(r);
  };

  if (!validId) {
    return <div className="p-6 text-center text-red-600">Patient context is required.</div>;
  }

  // Title-bar balance: the account total in Account scope, this patient's in
  // Patient scope — always the ledger's own arithmetic (see AL-9 above).
  const headerBalance = members.reduce(
    (s, m) => s + (ledgerBalanceByPatient.get(m.patient_id) ?? 0),
    0,
  );

  const truncated = feed.feeds.some((f) => f.truncated);
  const scopeLabel = scope === 'account' ? 'Account Ledger' : 'Patient Ledger';

  // One compact control bar: scope toggle + actions + date/type filter + balance.
  // Light surface on purpose — it sits directly above the blue grid header, so a
  // second dark band there would read as one muddy block. Everything stays on a
  // single row (wrapping only when the viewport forces it) so the grid starts as
  // high up the page as possible.
  const btnBase =
    'flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold uppercase ' +
    'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6fc4]/40';
  // Emphasised action (Create Claim, Go).
  const btnPrimary = `${btnBase} bg-[#1f6fc4] text-white shadow-sm hover:bg-[#175aa8]`;
  // Everything else: quiet white chips so the row does not read as a wall of blue.
  const btnGhost =
    `${btnBase} border border-slate-300 bg-white text-slate-700 shadow-sm ` +
    'hover:border-[#1f6fc4] hover:bg-[#EFF6FE] hover:text-[#155a9e]';
  const icon = 'h-3.5 w-3.5 text-[#1f6fc4]';
  const field =
    'h-[28px] rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-[#1f6fc4] focus:outline-none ' +
    'focus:ring-2 focus:ring-[#1f6fc4]/20';
  const divider = <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;

  // Money owed reads amber, a zero/credit balance reads green.
  const owes = headerBalance > 0;

  return (
    <div className="bg-slate-50 p-3 text-[#1E293B]">
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-slate-200 bg-gradient-to-b from-white to-slate-50 px-2 py-1.5 shadow-sm">
        {/* Scope toggle — the two views are the same screen; only the feed's
            scope changes. This is the only Patient/Account switch. */}
        <div
          role="group"
          aria-label="Ledger scope"
          className="inline-flex shrink-0 rounded-md border border-slate-300 bg-slate-100 p-0.5"
        >
          {([
            ['patient', 'Patient', "Show only this patient's transactions"],
            [
              'account',
              // The member count rides on the button rather than a separate chip
              // so the whole bar still fits on one row.
              members.length > 1 ? `Account (${members.length})` : 'Account',
              'Show every transaction on the account',
            ],
          ] as [LedgerScope, string, string][]).map(([key, label, hint]) => (
            <button
              key={key}
              onClick={() => { setScope(key); setCurrentPage(1); setSelected(new Set()); }}
              title={hint}
              aria-pressed={scope === key}
              className={`rounded px-2 py-1 text-[11px] font-bold uppercase transition ${
                scope === key
                  ? 'bg-[#1f6fc4] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {divider}

        <button
          onClick={handleCreateClaim}
          disabled={creatingClaim || selectedRows.length === 0}
          title={
            selectedRows.length === 0
              ? 'Select one or more unbilled procedures (Prn column) to create a claim'
              : `Create a claim from ${selectedRows.length} selected transaction(s)`
          }
          className={`${btnPrimary} disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none`}
        >
          {creatingClaim
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FilePlus2 className="h-3.5 w-3.5" />}
          Create Claim{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
        </button>
        <button onClick={() => setTxModal('payments')} className={btnGhost} title="Payments / Adjustments">
          <DollarSign className={icon} /> Pay/Adj
        </button>
        <button onClick={() => setTxModal('add')} className={btnGhost} title="Add Procedure">
          <Plus className={icon} /> Add Proc
        </button>
        <button
          onClick={() => { setBottomTab('balances'); setShowBalanceStat(true); }}
          className={btnGhost}
          title="Balance Statistics"
        >
          <BarChart3 className={icon} /> Bal Stat
        </button>

        {/* Sort By */}
        <div className="relative" ref={sortMenuRef}>
          <button onClick={() => setShowSortMenu((v) => !v)} className={btnGhost} title="Sort By">
            <ArrowUpDown className={icon} /> Sort
          </button>
          {showSortMenu && (
            <div className="absolute z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
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

        {/* Date range + type filter + balance */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <input
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            placeholder="From"
            aria-label="From date (MM/DD/YYYY)"
            title="From date (MM/DD/YYYY)"
            className={`${field} w-[80px]`}
          />
          <input
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            placeholder="To"
            aria-label="To date (MM/DD/YYYY)"
            title="To date (MM/DD/YYYY)"
            className={`${field} w-[80px]`}
          />
          <button onClick={handleGo} className={btnPrimary} title="Apply the date range">Go</button>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value as LedgerFilter); setCurrentPage(1); }}
            aria-label="Transaction type"
            className={`${field} w-[96px] cursor-pointer pr-1`}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={handleClear} className={btnGhost} title="Clear date range and type filter">
            <X className="h-3.5 w-3.5 text-slate-400" /> Clear
          </button>

          {divider}

          {/* Balance — the number people scan for, so it gets a tinted chip
              rather than another line of grey text. */}
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 ${
              owes
                ? 'border-amber-300 bg-amber-50'
                : 'border-emerald-300 bg-emerald-50'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Balance
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold tabular-nums ${
                owes ? 'text-amber-800' : 'text-emerald-800'
              }`}
            >
              {dollars(headerBalance)}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-500 shadow-sm hover:border-[#1f6fc4] hover:bg-[#EFF6FE] hover:text-[#1f6fc4]"
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {truncated && (
        <div className="border-x border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          Showing the first 500 transactions per patient — narrow the date range to see older activity.
        </div>
      )}

      {/* Grid */}
      <LedgerGrid
        rows={pageRows}
        loading={loading}
        error={error}
        onRetry={refresh}
        grandTotal={grandTotal}
        onOpen={openRow}
        selection={{
          selected,
          onToggleRow: toggleRow,
          onTogglePage: togglePage,
          allPageSelected,
          anyClaimable: pageClaimable.length > 0,
        }}
      />

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
          {selectedRows.length > 0 && (
            <span className="font-semibold text-[#1f6fc4]">{selectedRows.length} selected</span>
          )}
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
            ? <BalancesTable rows={memberBalances} ledgerBalance={ledgerBalanceByPatient} />
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
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between rounded-t-lg px-4 py-2 text-white" style={{ background: HEADER_BG }}>
              <span className="text-sm font-semibold">Balance Statistics — {scopeLabel}</span>
              <button onClick={() => setShowBalanceStat(false)} className="rounded p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-auto p-4">
              <BalancesTable rows={memberBalances} ledgerBalance={ledgerBalanceByPatient} />
            </div>
          </div>
        </div>
      )}

      {/* Ledger drill-down — legacy Edit Treatment / Edit Payment window */}
      {detailRow && (
        <EditTransactionModal
          row={detailRow}
          officeLabel={officeLabel}
          userLabel={userLabel}
          onClose={() => setDetailRow(null)}
          onChanged={refresh}
        />
      )}

      {/* Claim Details popup — legacy claim-row Description drill-down */}
      {claimDetailsRow && (
        <ClaimDetailsModal
          row={claimDetailsRow}
          allRows={allRows}
          userLabel={userLabel}
          onClose={() => setClaimDetailsRow(null)}
          onChanged={refresh}
        />
      )}

      {/* Payment Allocation Detail — legacy Amount drill-down */}
      {allocRow && (
        <PaymentAllocationModal
          row={allocRow}
          allRows={allRows}
          onClose={() => setAllocRow(null)}
        />
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
    </div>
  );
}

// ---- Balances (BALANCES tab + BALANCE STAT modal) --------------------------
// Legacy layout: one aggregate "Account Balance" row followed by one row per
// patient on the account. In Patient scope there is a single member, so the
// table degenerates to the legacy two-row (Account / patient) form.
function BalancesTable({
  rows,
  ledgerBalance,
}: {
  rows: MemberBalance[];
  ledgerBalance: Map<number, number>;
}) {
  const cols = [
    'Patient', 'Current', 'Over 30', 'Over 60', 'Over 90', 'Over 120', 'Balance',
    'Est Ins', 'Est Pat', "Today's Charges", "Today's Payments",
    'Last Ins. Pay', 'Last Ins. Pay Date', 'Last Pat. Pay', 'Last Pat. Date',
  ];

  if (rows.length === 0) {
    return <div className="text-center text-sm text-slate-400">No balance data available.</div>;
  }

  const sum = (pick: (b: BalancesResponse) => number): number =>
    rows.reduce((s, r) => s + (r.balances ? pick(r.balances) : 0), 0);

  const fmtDay = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
  };

  const cell = (v: number, tone?: string) => (
    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-mono ${tone ?? 'text-slate-900'}`}>
      {dollars(v)}
    </td>
  );

  const bodyRow = (label: string, b: BalancesResponse | null, balance: number, bold: boolean) => (
    <tr key={label} className={`border-b border-slate-100 last:border-0 ${bold ? 'bg-slate-50 font-semibold' : ''}`}>
      <td className="whitespace-nowrap px-3 py-1.5 text-[#1f6fc4]">{label}</td>
      {b === null ? (
        <td colSpan={cols.length - 1} className="px-3 py-1.5 text-slate-400">
          <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> loading…
        </td>
      ) : (
        <>
          {cell(b.aging.current)}
          {cell(b.aging.age_30)}
          {cell(b.aging.age_60, 'text-orange-600')}
          {cell(b.aging.age_90, 'text-orange-700')}
          {cell(b.aging.age_120, 'text-red-700')}
          {cell(balance, 'text-[#1f6fc4]')}
          {cell(b.estimated_insurance, 'text-blue-700')}
          {cell(b.estimated_patient, 'text-red-700')}
          {cell(b.recent_activity.today_charges)}
          {cell(b.recent_activity.today_payments, 'text-green-700')}
          {cell(b.recent_activity.last_insurance_payment?.amount ?? 0, 'text-blue-700')}
          <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
            {fmtDay(b.recent_activity.last_insurance_payment?.date)}
          </td>
          {cell(b.recent_activity.last_patient_payment?.amount ?? 0, 'text-green-700')}
          <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
            {fmtDay(b.recent_activity.last_patient_payment?.date)}
          </td>
        </>
      )}
    </tr>
  );

  const accountBalance = rows.reduce(
    (s, r) => s + (ledgerBalance.get(r.member.patient_id) ?? 0),
    0,
  );
  const anyLoaded = rows.some((r) => r.balances);
  const account: BalancesResponse | null = anyLoaded
    ? {
        account_balance: sum((b) => b.account_balance),
        patient_balance: sum((b) => b.patient_balance),
        insurance_balance: sum((b) => b.insurance_balance),
        estimated_insurance: sum((b) => b.estimated_insurance),
        estimated_patient: sum((b) => b.estimated_patient),
        aging: {
          current: sum((b) => b.aging.current),
          age_30: sum((b) => b.aging.age_30),
          age_60: sum((b) => b.aging.age_60),
          age_90: sum((b) => b.aging.age_90),
          age_120: sum((b) => b.aging.age_120),
        },
        recent_activity: {
          today_charges: sum((b) => b.recent_activity.today_charges),
          today_payments: sum((b) => b.recent_activity.today_payments),
          last_insurance_payment: mostRecent(rows, 'last_insurance_payment'),
          last_patient_payment: mostRecent(rows, 'last_patient_payment'),
        },
      }
    : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-white" style={{ background: HEADER_BG }}>
          <tr>
            {cols.map((c, i) => (
              <th
                key={c}
                className={`whitespace-nowrap px-3 py-2 font-bold uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-right'}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRow('Account Balance', account, accountBalance, true)}
          {rows.map((r) =>
            bodyRow(r.member.name, r.balances, ledgerBalance.get(r.member.patient_id) ?? 0, false),
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Latest payment of a kind across all account members. */
function mostRecent(
  rows: MemberBalance[],
  key: 'last_insurance_payment' | 'last_patient_payment',
): { amount: number; date: string } | null {
  let best: { amount: number; date: string } | null = null;
  for (const r of rows) {
    const p = r.balances?.recent_activity[key];
    if (p && (!best || p.date > best.date)) best = p;
  }
  return best;
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
