import { useEffect, useMemo, useState } from 'react';
import type { ProcedureCodeRead, ProviderRead } from '@/api/generated/model';
import { useListCodeBundles, useListCodeBundleItems } from '@/api/generated/endpoints/procedures/procedures';
import { loadProcedureCodes } from '@/components/setup/insurance/procedureCodeService';
import { codeAllowedOnTooth, estimateInsurance } from './txPlanModel';

export interface AdaEntry {
  tooth: string;
  surface: string | null;
  procedure_code: string;
  description: string;
  fee: string;
  insurance_estimate: string;
  provider_id?: string;
}

interface AddAdaCodeModalProps {
  mode: 'completed' | 'tx-plans';
  teeth: string[];
  surface: string | null;
  providers: ProviderRead[];
  /** Pre-filter hint from the palette tool (e.g. "crown", "extraction"). */
  presetQuery?: string;
  presetLabel?: string;
  onAdd: (entry: AdaEntry) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Legacy "Add ADA Code" pop-out: search/category/explosion-code, anterior-posterior
 * enforcement, fee + insurance estimate, provider (Completed), Add Procedure with
 * auto-advance across the selected teeth.
 */
export default function AddAdaCodeModal({ mode, teeth, surface, providers, presetQuery, presetLabel, onAdd, onClose }: AddAdaCodeModalProps) {
  const [codeMap, setCodeMap] = useState<Map<string, ProcedureCodeRead>>(new Map());
  const [query, setQuery] = useState(presetQuery ?? '');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<ProcedureCodeRead | null>(null);
  const [fee, setFee] = useState('0');
  const [insEst, setInsEst] = useState('0');
  const [providerId, setProviderId] = useState(providers.find((p) => p.is_active)?.id ?? providers[0]?.id ?? '');
  const [idx, setIdx] = useState(0);
  const [bundleId, setBundleId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadProcedureCodes().then(setCodeMap).catch(() => {}); }, []);

  const currentTooth = teeth[idx] ?? teeth[0] ?? '';
  const all = useMemo(() => [...codeMap.values()], [codeMap]);
  const categories = useMemo(() => [...new Set(all.map((c) => c.category).filter(Boolean))].sort(), [all]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((c) => c.is_active !== false)
      .filter((c) => !category || c.category === category)
      .filter((c) => !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.legacy_code ?? '').toLowerCase().includes(q))
      .slice(0, 60);
  }, [all, query, category]);

  const bundles = useListCodeBundles({ size: 200 });
  const bundleItems = useListCodeBundleItems({ bundle_id: typeof bundleId === 'number' ? bundleId : undefined }, { query: { enabled: typeof bundleId === 'number' } });

  const pick = (c: ProcedureCodeRead) => {
    setSelected(c);
    const f = Number(c.default_fee) || 0;
    setFee(String(f));
    setInsEst(String(estimateInsurance(f, null)));
  };

  const advance = () => {
    if (idx + 1 < teeth.length) { setIdx(idx + 1); setSelected(null); }
    else onClose();
  };

  const addCurrent = async () => {
    if (!selected || !currentTooth) return;
    setBusy(true);
    try {
      await onAdd({
        tooth: currentTooth, surface, procedure_code: selected.code, description: selected.description,
        fee: String(Number(fee) || 0), insurance_estimate: String(Number(insEst) || 0),
        provider_id: mode === 'completed' ? providerId : undefined,
      });
      advance();
    } finally { setBusy(false); }
  };

  const runExplosion = async () => {
    const items = bundleItems.data?.items ?? [];
    if (!items.length || !currentTooth) return;
    setBusy(true);
    try {
      for (const it of items) {
        const meta = codeMap.get(it.procedure_code);
        await onAdd({
          tooth: it.tooth || currentTooth, surface, procedure_code: it.procedure_code,
          description: meta?.description ?? it.procedure_code,
          fee: String(Number(meta?.default_fee) || 0), insurance_estimate: '0',
          provider_id: mode === 'completed' ? providerId : undefined,
        });
      }
      onClose();
    } finally { setBusy(false); }
  };

  const allow = selected ? codeAllowedOnTooth(selected, currentTooth) : { allowed: true };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-[640px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">
            Add ADA Code {presetLabel ? `· ${presetLabel}` : ''} — Tooth #{currentTooth}
            {teeth.length > 1 && <span className="ml-2 text-xs font-normal opacity-80">({idx + 1} of {teeth.length})</span>}
            {surface && <span className="ml-2 text-xs font-normal opacity-80">Surf {surface}</span>}
          </span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>

        <div className="flex gap-2 border-b border-slate-200 p-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code / description / user code…" className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Explosion code row */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-semibold text-slate-500">Explosion Code:</span>
          <select value={bundleId} onChange={(e) => setBundleId(e.target.value ? Number(e.target.value) : '')} className="rounded border border-slate-300 px-2 py-1 text-xs">
            <option value="">— none —</option>
            {(bundles.data?.items ?? []).map((b) => <option key={b.id} value={b.id}>{b.display_code ? `${b.display_code} · ` : ''}{b.name}</option>)}
          </select>
          <button onClick={runExplosion} disabled={typeof bundleId !== 'number' || busy} className="rounded bg-slate-600 px-2 py-1 font-semibold text-white disabled:opacity-40">Go</button>
        </div>

        <div className="flex">
          <div className="max-h-[300px] flex-1 overflow-y-auto border-r border-slate-200">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">{codeMap.size ? 'No matching codes.' : 'Loading codes…'}</p>
            ) : (
              results.map((c) => {
                const ok = codeAllowedOnTooth(c, currentTooth).allowed;
                return (
                  <button key={c.code} disabled={!ok} onClick={() => pick(c)} title={ok ? '' : codeAllowedOnTooth(c, currentTooth).reason}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: selected?.code === c.code ? '#dbeafe' : undefined }}>
                    <span className="w-14 shrink-0 font-semibold text-slate-700">{c.code}</span>
                    <span className="flex-1 truncate text-slate-600">{c.description}</span>
                    <span className="shrink-0 text-slate-400">${Number(c.default_fee || 0).toFixed(0)}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail / confirm */}
          <div className="w-[240px] shrink-0 space-y-2 p-3">
            {selected ? (
              <>
                <div className="text-xs"><span className="font-semibold text-slate-700">{selected.code}</span><div className="text-slate-500">{selected.description}</div></div>
                {!allow.allowed && <div className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-600">{allow.reason}</div>}
                <label className="block text-xs"><span className="text-slate-500">Fee</span>
                  <input value={fee} onChange={(e) => setFee(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm" /></label>
                <label className="block text-xs"><span className="text-slate-500">Est. Insurance</span>
                  <input value={insEst} onChange={(e) => setInsEst(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm" /></label>
                {mode === 'completed' && (
                  <label className="block text-xs"><span className="text-slate-500">Provider</span>
                    <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                      {providers.map((p) => <option key={p.id} value={p.id}>{p.name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.id}</option>)}
                    </select></label>
                )}
                <button onClick={addCurrent} disabled={!allow.allowed || busy || (mode === 'completed' && !providerId)} className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  Add Procedure{teeth.length > 1 ? ' →' : ''}
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-400">Select a procedure code to chart on tooth #{currentTooth}.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
