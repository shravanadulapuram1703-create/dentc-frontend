import { useMemo, useState } from 'react';
import type { ProcedureCodeRead, ProviderRead, TreatmentPlanItemRead } from '@/api/generated/model';
import { money2 } from './procedurePricing';
import { providerOptionLabel } from '@/services/providerDirectory';

export interface PostOutcome {
  posted: number;
  failed: { code: string; error: string }[];
}

interface PostToLedgerDialogProps {
  planLabel: string;
  items: TreatmentPlanItemRead[];
  providers: ProviderRead[];
  defaultProviderId: string;
  codeMap: Map<string, ProcedureCodeRead>;
  defaultDate: string;
  /** Post one planned procedure to the ledger (creates the charge, marks the item). */
  postOne: (item: TreatmentPlanItemRead, provider_id: string, tranDate: string) => Promise<void>;
  onDone: (outcome: PostOutcome) => void;
  onOpenLedger: () => void;
  onClose: () => void;
}

type RowState = 'pending' | 'posting' | 'done' | 'error';

const providerLabel = (p: ProviderRead) => providerOptionLabel(p);

/**
 * Legacy "Post to Ledger" from the Treatment Plan: the user ticks which planned
 * procedures become charges on the ledger. Only ticked rows are posted; the rest
 * stay on the Tx Plan untouched. Each row needs a treating provider (ledger
 * constraint) — it defaults to the item's provider, else the toolbar's preferred
 * provider, and can be changed per row.
 */
export default function PostToLedgerDialog({ planLabel, items, providers, defaultProviderId, codeMap, defaultDate, postOne, onDone, onOpenLedger, onClose }: PostToLedgerDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));
  const [provider, setProvider] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.provider_id || i.diagnosed_by || defaultProviderId || ''])),
  );
  const [tranDate, setTranDate] = useState(defaultDate);
  const [state, setState] = useState<Record<string, RowState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<PostOutcome | null>(null);

  const num = (v: string | number | null | undefined) => { const n = parseFloat(String(v ?? '')); return Number.isFinite(n) ? n : 0; };
  const patOf = (it: TreatmentPlanItemRead) => Math.max(0, num(it.fee) - num(it.insurance_estimate));

  const selectedItems = useMemo(() => items.filter((i) => checked.has(i.id)), [items, checked]);
  const totals = useMemo(() => selectedItems.reduce(
    (acc, it) => ({ fee: acc.fee + num(it.fee), ins: acc.ins + num(it.insurance_estimate), pat: acc.pat + patOf(it) }),
    { fee: 0, ins: 0, pat: 0 },
  ), [selectedItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const missingProvider = selectedItems.filter((i) => !provider[i.id]);
  const allChecked = items.length > 0 && checked.size === items.length;

  const toggle = (id: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(items.map((i) => i.id)));

  const run = async () => {
    if (!selectedItems.length || missingProvider.length || !tranDate) return;
    setBusy(true);
    const outcome: PostOutcome = { posted: 0, failed: [] };
    for (const it of selectedItems) {
      setState((s) => ({ ...s, [it.id]: 'posting' }));
      try {
        await postOne(it, provider[it.id]!, tranDate);
        outcome.posted += 1;
        setState((s) => ({ ...s, [it.id]: 'done' }));
      } catch (err) {
        const detail = (err as { response?: { data?: { detail?: string; error?: { message?: string } } }; message?: string });
        const msg = detail?.response?.data?.detail || detail?.response?.data?.error?.message || detail?.message || 'Failed';
        outcome.failed.push({ code: it.procedure_code, error: String(msg) });
        setErrors((e) => ({ ...e, [it.id]: String(msg) }));
        setState((s) => ({ ...s, [it.id]: 'error' }));
      }
    }
    setBusy(false);
    setFinished(outcome);
    onDone(outcome);
  };

  const inputCls = 'rounded border border-slate-300 bg-white px-2 py-1 text-xs';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-start justify-center overflow-y-auto px-3 py-3" style={{ top: 'var(--app-nav-height, 0px)' }}>
      <div className="fixed inset-0 bg-black/25" onClick={busy ? undefined : onClose} />
      <div className="relative flex w-[960px] max-w-full flex-col rounded-lg border border-slate-300 bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - var(--app-nav-height, 0px) - 24px)' }}>
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Post to Ledger — {planLabel}</span>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="rounded px-1.5 hover:bg-white/15 disabled:opacity-40">✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-[#e8f0f8] px-4 py-2 text-xs text-slate-700">
          <label className="flex items-center gap-1">Tran. Dt.
            <input type="date" value={tranDate} onChange={(e) => setTranDate(e.target.value)} disabled={busy || !!finished} className={inputCls} />
          </label>
          <span className="text-slate-500">Tick the procedures to charge to the ledger. Unticked procedures stay on the treatment plan.</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 text-left text-[11px] text-slate-700">
              <tr>
                <th className="w-8 border-b border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={busy || !!finished} aria-label="Select all" /></th>
                <th className="w-20 border-b border-slate-300 px-2 py-1">Code</th>
                <th className="border-b border-slate-300 px-2 py-1">Description</th>
                <th className="w-12 border-b border-slate-300 px-2 py-1 text-center">Th</th>
                <th className="w-16 border-b border-slate-300 px-2 py-1 text-center">Surf</th>
                <th className="w-44 border-b border-slate-300 px-2 py-1">Provider</th>
                <th className="w-20 border-b border-slate-300 px-2 py-1 text-right">Fee</th>
                <th className="w-20 border-b border-slate-300 px-2 py-1 text-right">Est. Ins.</th>
                <th className="w-20 border-b border-slate-300 px-2 py-1 text-right">Pat. Est.</th>
                <th className="w-24 border-b border-slate-300 px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">No planned procedures to post on this treatment plan.</td></tr>
              ) : items.map((it) => {
                const st = state[it.id] ?? 'pending';
                const on = checked.has(it.id);
                return (
                  <tr key={it.id} className={on ? 'bg-blue-50/40' : ''}>
                    <td className="border-b border-slate-100 px-2 py-1 text-center">
                      <input type="checkbox" checked={on} onChange={() => toggle(it.id)} disabled={busy || !!finished} aria-label={`Post ${it.procedure_code}`} />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 font-semibold text-slate-700">{it.procedure_code}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-slate-600">{it.description || codeMap.get(it.procedure_code)?.description || ''}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-center">{it.tooth ?? ''}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-center">{it.surface ?? ''}</td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      <select value={provider[it.id] ?? ''} onChange={(e) => setProvider((p) => ({ ...p, [it.id]: e.target.value }))} disabled={busy || !!finished}
                        className={`w-full rounded border px-1 py-0.5 text-xs ${on && !provider[it.id] ? 'border-rose-400' : 'border-slate-300'}`}>
                        <option value="">-- Provider --</option>
                        {providers.map((p) => <option key={p.id} value={p.id}>{providerLabel(p)}</option>)}
                      </select>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 text-right">{money2(it.fee)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-right">{money2(it.insurance_estimate)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-right font-semibold">{money2(patOf(it))}</td>
                    <td className="border-b border-slate-100 px-2 py-1" title={errors[it.id]}>
                      {st === 'posting' && <span className="text-blue-600">Posting…</span>}
                      {st === 'done' && <span className="text-emerald-600">Posted</span>}
                      {st === 'error' && <span className="text-rose-600">Failed</span>}
                      {st === 'pending' && <span className="text-slate-400">{(it.status || 'planned').replace(/_/g, ' ')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <tr>
                  <td colSpan={6} className="border-t border-slate-300 px-2 py-1">{selectedItems.length} of {items.length} selected</td>
                  <td className="border-t border-slate-300 px-2 py-1 text-right">{money2(totals.fee)}</td>
                  <td className="border-t border-slate-300 px-2 py-1 text-right">{money2(totals.ins)}</td>
                  <td className="border-t border-slate-300 px-2 py-1 text-right">{money2(totals.pat)}</td>
                  <td className="border-t border-slate-300" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
          {finished ? (
            <span className={finished.failed.length ? 'text-rose-600' : 'text-emerald-700'}>
              Posted {finished.posted} procedure{finished.posted === 1 ? '' : 's'} to the ledger{finished.failed.length ? `; ${finished.failed.length} failed` : ''}.
            </span>
          ) : missingProvider.length > 0 ? (
            <span className="text-rose-600">Select a provider on every ticked procedure.</span>
          ) : (
            <span className="text-slate-500">Charges are dated {tranDate || '—'} and priced as shown.</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {finished ? (
              <>
                <button onClick={onOpenLedger} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">Open Ledger</button>
                <button onClick={onClose} className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Close</button>
              </>
            ) : (
              <>
                <button onClick={onClose} disabled={busy} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button onClick={run} disabled={busy || !selectedItems.length || missingProvider.length > 0 || !tranDate}
                  className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? 'Posting…' : `Post ${selectedItems.length} Selected`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
