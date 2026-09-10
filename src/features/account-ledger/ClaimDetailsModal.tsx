// Legacy "CLAIM DETAILS" popup — opened from a claim row's Description in the
// ledger. Distinct from the full-page Primary Dental Insurance Claim screen
// (`components/patient/ClaimDetail.tsx`, which the claim row's Date opens):
// this is the compact read-only summary plus the transactions the claim covers.

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getClaimDetail, setClaimStatus } from '@/api/generated/endpoints/billing/billing';
import type { ClaimDetailResponse } from '@/api/generated/model';
import { dollars, HEADER_BG, num, fmtDate, type LedgerRow } from './accountLedgerModel';
import LedgerGrid from './LedgerGrid';

interface Props {
  /** The clicked claim row — `source_id` is the claim id. */
  row: LedgerRow;
  /** The whole ledger feed, so the associated transactions render identically. */
  allRows: LedgerRow[];
  userLabel: (id: number | null | undefined) => string;
  onClose: () => void;
  /** Called after Unclose so the ledger can refresh. */
  onChanged: () => void;
}



const stamp = (v: string | null | undefined): string => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-US');
};

/** One label/value pair inside a header block. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-200 last:border-0">
      <td className="w-[46%] bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">{label}</td>
      <td className="px-2 py-1.5 text-[12px] text-slate-800">{value}</td>
    </tr>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200">
      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: HEADER_BG }}>
        {title}
      </div>
      <table className="w-full"><tbody>{children}</tbody></table>
    </div>
  );
}

export default function ClaimDetailsModal({ row, allRows, userLabel, onClose, onChanged }: Props) {
  const [data, setData] = useState<ClaimDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useBodyScrollLock(true);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getClaimDetail(row.source_id)
      .then((d) => alive && setData(d))
      .catch((err) => {
        if (!alive) return;
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(detail || 'Could not load this claim.');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [row.source_id]);

  const claim = data?.claim;

  /**
   * The transactions this claim covers, taken from the ledger feed so they
   * render exactly as they do on the ledger itself: the claim's procedures, the
   * claim row, and any payment allocated to it.
   */
  const associated = useMemo<LedgerRow[]>(() => {
    if (!data) return [row];
    const procIds = new Set((data.procedures ?? []).map((p) => p.id));
    const payIds = new Set(
      (data.payments ?? []).map((a) => a.payment_id).filter((v): v is string => Boolean(v)),
    );
    return allRows
      .filter(
        (r) =>
          (r.kind === 'charge' && procIds.has(r.source_id)) ||
          (r.kind === 'payment' && payIds.has(r.source_id)) ||
          r.key === row.key,
      )
      .sort((a, b) => a.iso.localeCompare(b.iso) || a.key.localeCompare(b.key));
  }, [data, allRows, row]);

  // Legacy claim-amount block. Total UCR is summed from the claim's procedures;
  // the rest come straight off the claim record.
  const totalUcr = useMemo(
    () => (data?.procedures ?? []).reduce((s, p) => s + num(p.ucr_fee), 0),
    [data],
  );
  const totalBilled = num(claim?.total_billed);
  const estIns = num(claim?.est_insurance);
  const insPaid = num(claim?.total_paid);
  const variance = Math.round((estIns - insPaid) * 100) / 100;

  // Insurance-payment identifiers live on the coverage rows, not the claim.
  const cov = (data?.coverage ?? [])[0];

  const closed = (claim?.status || '').toLowerCase() === 'closed' || Boolean(claim?.close_date);

  const handleUnclose = async () => {
    if (!window.confirm('Reopen this claim?')) return;
    setBusy(true);
    setError(null);
    try {
      // The backend derives close_date from the status transition, so moving off
      // "closed" is what reopens it (same call the full claim screen uses).
      await setClaimStatus(row.source_id, { status: 'submitted' });
      onChanged();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Could not reopen this claim.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Claim Details"
      onClick={onClose}
    >
      <div
        className="my-6 flex w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: HEADER_BG }}>
          <div className="text-sm font-semibold uppercase tracking-wide">Claim Details</div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading claim…
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="grid gap-3 p-4 lg:grid-cols-4 md:grid-cols-2">
              <Block title="Claim Info">
                <Row label="Claim ID" value={claim?.claim_number || claim?.id?.slice(0, 8) || '-'} />
                <Row label="Billing Order" value={claim?.claim_type || '-'} />
                <Row label="Claim DOS Date" value={fmtDate(claim?.date_of_service_from) || '-'} />
                <Row label="Claim Created By" value={userLabel(claim?.created_by) || '-'} />
                <Row label="Claim Created On" value={stamp(claim?.created_at)} />
              </Block>

              <Block title="Claim Status">
                <Row label="Claim Sent Date" value={stamp(claim?.submitted_date)} />
                <Row
                  label="Claim Status"
                  value={<span className="font-semibold">{closed ? 'Claim Is Closed' : claim?.status || '-'}</span>}
                />
                <Row label="Claim Sent Type" value={claim?.billing_order || '-'} />
                <Row label="Claim Close Date" value={stamp(claim?.close_date)} />
                <Row label="Claim Closed By" value={closed ? userLabel(claim?.created_by) || '-' : '-'} />
              </Block>

              <Block title="Claim Amount">
                <Row label="A. Total UCR" value={<span className="font-mono">{dollars(totalUcr)}</span>} />
                <Row label="B. Total Billed" value={<span className="font-mono">{dollars(totalBilled)}</span>} />
                <Row label="C. Est Ins Portion" value={<span className="font-mono">{dollars(estIns)}</span>} />
                <Row label="D. Total Ins. Paid" value={<span className="font-mono">{dollars(insPaid)}</span>} />
                <Row
                  label="E. Variance(C-D)"
                  value={
                    <span className={`font-mono ${variance < 0 ? 'text-red-700' : 'text-slate-800'}`}>
                      {variance < 0 ? `(${dollars(Math.abs(variance))})` : dollars(variance)}
                    </span>
                  }
                />
              </Block>

              <Block title="Insurance Payment">
                <Row label="Check #" value={cov?.check_number || '-'} />
                <Row label="Bank #" value={cov?.bank_number || '-'} />
                <Row label="EOB #" value={cov?.eob_number || '-'} />
              </Block>
            </div>

            <div className="px-4 pb-4">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#1f6fc4]">
                Transactions Associated With This Claim
              </div>
              <LedgerGrid rows={associated} emptyLabel="No transactions on this claim." />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
              {closed && (
                <button
                  onClick={handleUnclose}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-md bg-[#1f6fc4] px-3 py-1.5 text-[11px] font-bold uppercase text-white shadow-sm hover:bg-[#175aa8] disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Unclose Claim
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
