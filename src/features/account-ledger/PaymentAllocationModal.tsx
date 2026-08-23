// Legacy "PAYMENT ALLOCATION DETAIL" popup — opened from the Amount column of
// any non-claim ledger row. It answers "what is this amount made up of?":
//
//   charge      -> the payments/adjustments allocated against this procedure
//   payment     -> the procedures this payment was applied to
//   adjustment  -> the procedures this adjustment was applied to
//
// The counterpart transaction is resolved against the ledger feed already in
// memory, so each line renders with the same patient / office / provider /
// description text the ledger shows.

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  getProcedureAllocationsSummary,
  listPaymentAllocations,
} from '@/api/generated/endpoints/billing/billing';
import { dollars, HEADER_BG, num, fmtDate, type LedgerRow } from './accountLedgerModel';

interface Props {
  /** The clicked ledger row (charge | payment | adjustment). */
  row: LedgerRow;
  /** The whole ledger feed, used to resolve each allocation's counterpart row. */
  allRows: LedgerRow[];
  onClose: () => void;
}


/** Credits render in the legacy parenthesised form: ($72.00). */
const signed = (n: number): string => (n < 0 ? `(${dollars(Math.abs(n))})` : dollars(n));

/** One line in the allocation grid. */
interface AllocLine {
  key: string;
  tran_date: string;
  patient: string;
  office: string;
  surface: string;
  description: string;
  provider: string;
  amount: number;
}

export default function PaymentAllocationModal({ row, allRows, onClose }: Props) {
  const [lines, setLines] = useState<AllocLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(true);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // id -> ledger row, so an allocation can borrow the counterpart's display text.
  const bySource = useMemo(() => {
    const m = new Map<string, LedgerRow>();
    for (const r of allRows) m.set(r.source_id, r);
    return m;
  }, [allRows]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    /** Build a grid line from an allocation and the row it points at. */
    const line = (
      key: string,
      counterpartId: string | null | undefined,
      allocDate: string | null | undefined,
      amount: number,
      fallbackDesc: string,
    ): AllocLine => {
      const c = counterpartId ? bySource.get(counterpartId) : undefined;
      return {
        key,
        tran_date: fmtDate(allocDate) || c?.date || '',
        patient: c?.patient ?? row.patient,
        office: c?.office ?? row.office,
        surface: c?.surface ?? '-',
        description: c?.description ?? fallbackDesc,
        provider: c?.provider ?? '-',
        amount,
      };
    };

    const load = async (): Promise<AllocLine[]> => {
      if (row.kind === 'charge') {
        // What has been applied TO this procedure: payments then adjustments.
        const s = await getProcedureAllocationsSummary(row.source_id);
        const pays = (s.allocations ?? []).map((a) =>
          line(
            `alloc-${a.id}`,
            a.payment_id ?? (a.adjustment_id != null ? String(a.adjustment_id) : null),
            a.alloc_date,
            -Math.abs(num(a.amount)),
            'Payment',
          ),
        );
        const adjs = (s.adjustments ?? []).map((a) =>
          line(`adj-${a.id}`, String(a.id), a.adjustment_date, -Math.abs(num(a.amount)), a.notes || 'Adjustment'),
        );
        return [...pays, ...adjs];
      }
      // What this payment/adjustment was applied to: the procedures.
      // `adjustment_id` is a numeric filter while a ledger source_id is a string
      // ("ADJ-123"), so pull the digits out of it.
      const key =
        row.kind === 'payment'
          ? { payment_id: row.source_id }
          : { adjustment_id: Number(row.source_id.replace(/\D/g, '')) };
      if ('adjustment_id' in key && !Number.isFinite(key.adjustment_id)) return [];
      const res = await listPaymentAllocations({ ...key, size: 200 });
      return (res.items ?? []).map((a) =>
        line(`alloc-${a.id}`, a.procedure_id, a.alloc_date, -Math.abs(num(a.amount)), 'Unapplied'),
      );
    };

    load()
      .then((l) => alive && setLines(l))
      .catch((err) => {
        if (!alive) return;
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(detail || 'Could not load the allocation detail.');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [row, bySource]);

  const allocated = lines.reduce((s, l) => s + l.amount, 0);
  const total = Math.abs(row.amount);
  // Computed here rather than read from the feed: `remaining_amount` on the
  // allocations summary reports 0 even for a wholly unallocated charge (AL-15).
  const outstanding = Math.round((total - Math.abs(allocated)) * 100) / 100;

  const cols = ['Tran Date', 'Patient Name', 'Office', 'Surf', 'Description', 'Provider', 'Amount'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Allocation Detail"
      onClick={onClose}
    >
      <div
        className="my-6 flex w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: HEADER_BG }}>
          <div className="text-sm font-semibold uppercase tracking-wide">Payment Allocation Detail</div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* The transaction this popup is about */}
        <div className="p-4 pb-2">
          <table className="w-full overflow-hidden rounded border border-slate-200 text-[12px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[14%] bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">Date</td>
                <td className="w-[26%] px-2 py-1.5 font-mono">{row.date}</td>
                <td className="w-[14%] bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">Code</td>
                <td className="px-2 py-1.5 font-mono font-semibold text-[#1f6fc4]">{row.code}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">Total Amount</td>
                <td className="px-2 py-1.5 font-mono">{dollars(total)}</td>
                <td className="bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">Description</td>
                <td className="px-2 py-1.5">{row.detail || row.description}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Allocation lines */}
        <div className="px-4">
          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full text-xs">
              <thead className="text-white" style={{ background: HEADER_BG }}>
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c}
                      className={`whitespace-nowrap px-2 py-2 font-bold uppercase tracking-wide ${
                        c === 'Amount' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={cols.length} className="px-2 py-10 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length} className="px-2 py-10 text-center text-slate-400">
                      Nothing has been allocated against this transaction yet.
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.key} className="bg-orange-50/40 text-orange-700 hover:bg-orange-50">
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{l.tran_date}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{l.patient}</td>
                      <td className="px-2 py-1.5">{l.office}</td>
                      <td className="px-2 py-1.5">{l.surface}</td>
                      <td className="px-2 py-1.5">{l.description}</td>
                      <td className="px-2 py-1.5">{l.provider}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{signed(l.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Allocated total + what is still open on the transaction */}
          <div
            className="flex items-center justify-end px-3 py-1.5 text-[12px] font-bold text-white"
            style={{ background: HEADER_BG }}
          >
            {signed(allocated)}
          </div>
          <div className="py-1.5 text-right text-[12px] font-semibold text-slate-700">
            Outstanding Amount:{' '}
            <span className={outstanding > 0 ? 'text-red-700' : 'text-emerald-700'}>{dollars(outstanding)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
