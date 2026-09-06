import { useEffect, useMemo, useState } from 'react';
import type { ProcedureCodeRead, ProviderRead } from '@/api/generated/model';
import { useListCodeBundles, useListCodeBundleItems } from '@/api/generated/endpoints/procedures/procedures';
import { loadProcedureCodes } from '@/components/setup/insurance/procedureCodeService';
import { codeAllowedOnTooth, classifyTooth } from './txPlanModel';
import type { FeeScheduleContext } from '@/services/feeScheduleResolver';
import type { CoverageContext } from '@/services/coverageResolver';
import { priceProcedure, money2, type PricedProcedure } from './procedurePricing';

// AMB / "A" codes = alternative-maximum-benefit downgrade codes (end in 'A').
const isAmbCode = (c: { code: string; legacy_code?: string | null }) =>
  /A$/.test(c.code) || /A$/.test(c.legacy_code ?? '');

/** Case/space-insensitive key so "DIAGNOSTIC" and "Diagnostic" fold into one category. */
const catKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Legacy "Add Proc By Category" button order (ADA CDT service groups). Each entry lists
 * the backend `category` value(s) it covers; any backend category not listed here is
 * appended after these so nothing in the catalog is unreachable.
 */
const LEGACY_CATEGORIES: { label: string; matches: string[] }[] = [
  { label: 'Diagnostic', matches: ['Diagnostic'] },
  { label: 'Preventive', matches: ['Preventive'] },
  { label: 'Restorative', matches: ['Restorative'] },
  { label: 'Endodontics', matches: ['Endodontics'] },
  { label: 'Periodontics', matches: ['Periodontics'] },
  { label: 'Prosth, remov', matches: ['Prosth, Remov', 'Prosthodontics (Removable)', 'Prosthodontics, Removable'] },
  { label: 'Maxillo Prosth', matches: ['Maxillo Prosth', 'Maxillofacial Prosthetics'] },
  { label: 'Implant Serv', matches: ['Implant Serv', 'Implant Services'] },
  { label: 'Prosth, fixed', matches: ['Prosth, Fixed', 'Prosthodontics (Fixed)', 'Prosthodontics, Fixed'] },
  { label: 'Oral Surgery', matches: ['Oral Surgery', 'Oral & Maxillofacial Surgery'] },
  { label: 'Orthodontics', matches: ['Orthodontics'] },
  { label: 'Adjunct Serv', matches: ['Adjunct Serv', 'Adjunctive Services', 'Adjunctive General Services'] },
  { label: 'Other', matches: ['Other'] },
  { label: 'All Medical', matches: ['Medical', 'All Medical'] },
];

/** Palette tool → category button it should land on (full list under that category). */
const PRESET_CATEGORY: Record<string, string> = {
  restoration: 'Restorative',
  crown: 'Restorative',
  'root canal': 'Endodontics',
  'class v': 'Restorative',
  bridge: 'Prosth, fixed',
  implant: 'Implant Serv',
  extraction: 'Oral Surgery',
  denture: 'Prosth, remov',
  ortho: 'Orthodontics',
};

interface CategoryButton { label: string; keys: Set<string>; count: number }

export interface AdaEntry {
  tooth: string;
  surface: string | null;
  procedure_code: string;
  description: string;
  fee: string;
  insurance_estimate: string;
  patient_estimate: string;
  coverage_pct: number;
  ucr_fee: number | null;
  fee_schedule_id: number | null;
  provider_id?: string;
}

interface AddAdaCodeModalProps {
  mode: 'completed' | 'tx-plans';
  teeth: string[];
  surface: string | null;
  providers: ProviderRead[];
  /** Preferred provider chosen in the toolbar — seeds the provider dropdown. */
  defaultProviderId?: string;
  /** Pre-filter hint from the palette tool (e.g. "crown", "extraction"). */
  presetQuery?: string;
  presetLabel?: string;
  /** Fee schedules in force for this patient/office/provider (Setup → Insurance → Fee Schedules). */
  feeCtx: FeeScheduleContext;
  /** Coverage rules of the patient's primary plan. */
  coverageCtx: CoverageContext;
  /** Date the fee schedule is evaluated on (Tran. Dt. / Prop. Dt.). */
  serviceDate: string;
  onAdd: (entry: AdaEntry) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Legacy "Add ADA Codes" pop-out: Add Proc By Category (CDT service-group buttons) OR by
 * Code / User Code / Description OR by Explosion Code; "Procedures for <Category>" grid
 * (Code · User Code · Description) listing every code in the group; anterior-posterior
 * enforcement, fee + insurance estimate, provider (Completed), Add Procedure with
 * auto-advance across the selected teeth.
 */
export default function AddAdaCodeModal({ mode, teeth, surface, providers, defaultProviderId, presetQuery, presetLabel, feeCtx, coverageCtx, serviceDate, onAdd, onClose }: AddAdaCodeModalProps) {
  const [codeMap, setCodeMap] = useState<Map<string, ProcedureCodeRead>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(() => {
    const hint = catKey(presetQuery || presetLabel || '');
    return PRESET_CATEGORY[hint] ?? '';
  });
  const [codeQ, setCodeQ] = useState('');
  const [userCodeQ, setUserCodeQ] = useState('');
  const [descQ, setDescQ] = useState('');
  const [selected, setSelected] = useState<ProcedureCodeRead | null>(null);
  const [fee, setFee] = useState('0');
  const [insEst, setInsEst] = useState('0');
  const [quote, setQuote] = useState<PricedProcedure | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [providerId, setProviderId] = useState(defaultProviderId || providers.find((p) => p.is_active)?.id || providers[0]?.id || '');
  const [idx, setIdx] = useState(0);
  const [bundleId, setBundleId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadProcedureCodes().then(setCodeMap).catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load procedure codes'));
  }, []);

  const currentTooth = teeth[idx] ?? teeth[0] ?? '';
  const anterior = currentTooth ? classifyTooth(currentTooth) === 'anterior' : false;
  const all = useMemo(() => [...codeMap.values()], [codeMap]);

  // Category buttons: legacy order first, then any backend category not covered.
  const categoryButtons = useMemo<CategoryButton[]>(() => {
    const counts = new Map<string, number>();
    for (const c of all) if (c.category) counts.set(catKey(c.category), (counts.get(catKey(c.category)) ?? 0) + 1);
    const covered = new Set<string>();
    const buttons: CategoryButton[] = LEGACY_CATEGORIES.map((lc) => {
      const keys = new Set(lc.matches.map(catKey));
      let count = 0;
      for (const k of keys) { count += counts.get(k) ?? 0; covered.add(k); }
      return { label: lc.label, keys, count };
    });
    const extras = [...counts.keys()].filter((k) => !covered.has(k)).sort();
    for (const k of extras) {
      const label = all.find((c) => catKey(c.category) === k)?.category ?? k;
      buttons.push({ label, keys: new Set([k]), count: counts.get(k) ?? 0 });
    }
    return buttons;
  }, [all]);

  const activeButton = categoryButtons.find((b) => b.label === category) ?? null;
  const hasTextFilter = Boolean(codeQ.trim() || userCodeQ.trim() || descQ.trim());

  const results = useMemo(() => {
    const cq = codeQ.trim().toLowerCase();
    const uq = userCodeQ.trim().toLowerCase();
    const dq = descQ.trim().toLowerCase();
    return all
      .filter((c) => c.is_active !== false)
      // Anterior teeth are not subject to downgrades — no A / AMB codes.
      .filter((c) => !(anterior && isAmbCode(c)))
      .filter((c) => !activeButton || activeButton.keys.has(catKey(c.category ?? '')))
      .filter((c) => !cq || c.code.toLowerCase().includes(cq))
      .filter((c) => !uq || (c.legacy_code ?? '').toLowerCase().includes(uq))
      .filter((c) => !dq || c.description.toLowerCase().includes(dq))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [all, codeQ, userCodeQ, descQ, activeButton, anterior]);

  const bundles = useListCodeBundles({ size: 200 });
  const bundleItems = useListCodeBundleItems({ bundle_id: typeof bundleId === 'number' ? bundleId : undefined }, { query: { enabled: typeof bundleId === 'number' } });

  // Legacy semantics: "by Category" OR "by Code / User Code / Description" — picking one
  // clears the other so the grid title always says what it is listing.
  const chooseCategory = (label: string) => {
    setCategory(label);
    setCodeQ(''); setUserCodeQ(''); setDescQ('');
    setSelected(null);
  };
  const typeFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (v.trim()) setCategory('');
    setSelected(null);
  };

  const pick = (c: ProcedureCodeRead) => {
    setSelected(c);
    // Show the code default instantly, then replace with the schedule/coverage quote.
    const f = Number(c.default_fee) || 0;
    setFee(money2(f));
    setInsEst('0.00');
    setQuote(null);
  };

  // Price the highlighted code from the fee schedule + plan coverage so the
  // Fee / Est. Ins / Patient portion are visible before it is charted.
  useEffect(() => {
    if (!selected) { setQuote(null); return; }
    let alive = true;
    setQuoting(true);
    priceProcedure(feeCtx, coverageCtx, selected.code, { default_fee: selected.default_fee, on_date: serviceDate })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        setFee(money2(q.fee));
        setInsEst(money2(q.insurance_estimate));
      })
      .catch(() => alive && setQuote(null))
      .finally(() => alive && setQuoting(false));
    return () => { alive = false; };
  }, [selected, feeCtx, coverageCtx, serviceDate]);

  const feeNum = Number(fee) || 0;
  const insNum = Math.min(feeNum, Math.max(0, Number(insEst) || 0));
  const patNum = Math.round((feeNum - insNum) * 100) / 100;

  const advance = () => {
    if (idx + 1 < teeth.length) { setIdx(idx + 1); setSelected(null); }
    else onClose();
  };

  const allow = selected ? codeAllowedOnTooth(selected, currentTooth) : { allowed: true };
  const canAdd = Boolean(selected) && allow.allowed && !busy && !(mode === 'completed' && !providerId);

  const addCurrent = async () => {
    if (!selected || !currentTooth || !canAdd) return;
    setBusy(true);
    try {
      await onAdd({
        tooth: currentTooth, surface, procedure_code: selected.code, description: selected.description,
        fee: money2(feeNum), insurance_estimate: money2(insNum), patient_estimate: money2(patNum),
        coverage_pct: quote?.coverage_pct ?? 0, ucr_fee: quote?.ucr_fee ?? null, fee_schedule_id: quote?.fee_schedule_id ?? null,
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
        // Every exploded code is priced individually from the schedule + coverage.
        const q = await priceProcedure(feeCtx, coverageCtx, it.procedure_code, { default_fee: meta?.default_fee, on_date: serviceDate });
        await onAdd({
          tooth: it.tooth || currentTooth, surface, procedure_code: it.procedure_code,
          description: meta?.description ?? it.procedure_code,
          fee: money2(q.fee), insurance_estimate: money2(q.insurance_estimate), patient_estimate: money2(q.patient_estimate),
          coverage_pct: q.coverage_pct, ucr_fee: q.ucr_fee, fee_schedule_id: q.fee_schedule_id,
          provider_id: mode === 'completed' ? providerId : undefined,
        });
      }
      onClose();
    } finally { setBusy(false); }
  };

  const gridTitle = activeButton
    ? activeButton.label
    : hasTextFilter ? 'matching search' : 'All Categories';

  const inputCls = 'mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    // The global nav is `fixed` at z-50 and ~150px tall; the overlay starts below it so
    // the title bar / category buttons are never hidden underneath, and the dialog is
    // capped to the remaining viewport height with its own scrolling body.
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-start justify-center overflow-y-auto px-3 py-3" style={{ top: 'var(--app-nav-height, 0px)' }}>
      <div className="fixed inset-0 bg-black/25" onClick={onClose} />
      <div className="relative flex w-[940px] max-w-full flex-col rounded-lg border border-slate-300 bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - var(--app-nav-height, 0px) - 24px)' }}>
        {/* Title bar */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">
            Add ADA Codes {presetLabel ? `· ${presetLabel}` : ''} — Tooth #{currentTooth}
            {teeth.length > 1 && <span className="ml-2 text-xs font-normal opacity-80">({idx + 1} of {teeth.length})</span>}
            {surface && <span className="ml-2 text-xs font-normal opacity-80">Surf {surface}</span>}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={addCurrent} disabled={!canAdd}
              className="rounded border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40">
              Add Procedure{teeth.length > 1 ? ' →' : ''}
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[230px_200px_1fr] gap-3 overflow-y-auto p-3">
          {/* Add Proc By Category */}
          <div className="min-h-0">
            <div className="mb-1 text-xs font-bold text-slate-700">Add Proc By Category</div>
            <div className="grid grid-cols-2 gap-1">
              {categoryButtons.map((b) => {
                const active = category === b.label;
                return (
                  <button key={b.label} onClick={() => chooseCategory(b.label)} title={`${b.count} code${b.count === 1 ? '' : 's'}`}
                    className={`truncate rounded border px-1.5 py-1 text-[11px] font-medium ${active ? 'border-blue-700 bg-blue-600 text-white' : 'border-sky-300 bg-sky-100 text-slate-800 hover:bg-sky-200'}`}>
                    {b.label}
                  </button>
                );
              })}
              <button onClick={() => chooseCategory('')} title="Every active procedure code"
                className={`col-span-2 truncate rounded border px-1.5 py-1 text-[11px] font-medium ${!category && !hasTextFilter ? 'border-blue-700 bg-blue-600 text-white' : 'border-sky-300 bg-sky-100 text-slate-800 hover:bg-sky-200'}`}>
                All Categories
              </button>
            </div>
            {codeMap.size > 0 && (
              <div className="mt-2 text-[10px] text-slate-400">{all.filter((c) => c.is_active !== false).length} active codes in catalog</div>
            )}
          </div>

          {/* Add Proc By */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700">Add Proc By</div>
            <label className="block text-[11px] text-slate-600">Code
              <input value={codeQ} onChange={(e) => typeFilter(setCodeQ)(e.target.value)} className={inputCls} placeholder="D2740" /></label>
            <div className="text-center text-[10px] text-slate-400">or</div>
            <label className="block text-[11px] text-slate-600">User Code
              <input value={userCodeQ} onChange={(e) => typeFilter(setUserCodeQ)(e.target.value)} className={inputCls} /></label>
            <div className="text-center text-[10px] text-slate-400">or</div>
            <label className="block text-[11px] text-slate-600">Description
              <input value={descQ} onChange={(e) => typeFilter(setDescQ)(e.target.value)} className={inputCls} placeholder="crown, extraction…" /></label>
            <div className="text-center text-[10px] text-slate-400">or</div>
            <label className="block text-[11px] text-slate-600">Explosion Codes
              <div className="mt-0.5 flex gap-1">
                <select value={bundleId} onChange={(e) => setBundleId(e.target.value ? Number(e.target.value) : '')} className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-1 text-xs">
                  <option value="">*Select Exp. Code*</option>
                  {(bundles.data?.items ?? []).map((b) => <option key={b.id} value={b.id}>{b.display_code ? `${b.display_code} · ` : ''}{b.name}</option>)}
                </select>
                <button onClick={runExplosion} disabled={typeof bundleId !== 'number' || busy} className="rounded bg-slate-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">Go</button>
              </div>
            </label>
          </div>

          {/* Procedures for <Category> */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-1 text-xs font-bold text-slate-700">
              Procedures for <span className="italic underline">{gridTitle}</span>
              <span className="ml-2 text-[10px] font-normal text-slate-400">{results.length} code{results.length === 1 ? '' : 's'}</span>
            </div>
            <div className="h-[380px] max-h-[calc(100vh-var(--app-nav-height,0px)-190px)] min-h-[200px] overflow-y-auto rounded border border-slate-300">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-left text-[11px] text-slate-700">
                  <tr>
                    <th className="w-20 border-b border-slate-300 px-2 py-1">Code</th>
                    <th className="w-20 border-b border-slate-300 px-2 py-1">User Code</th>
                    <th className="border-b border-slate-300 px-2 py-1">Description</th>
                    <th className="w-14 border-b border-slate-300 px-2 py-1 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">
                      {loadError ? `Could not load procedure codes: ${loadError}` : codeMap.size ? 'No matching codes.' : 'Loading codes…'}
                    </td></tr>
                  ) : results.map((c) => {
                    const check = codeAllowedOnTooth(c, currentTooth);
                    const isSel = selected?.code === c.code;
                    return (
                      <tr key={c.code} onClick={() => check.allowed && pick(c)}
                        title={check.allowed ? '' : check.reason}
                        className={`${check.allowed ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed opacity-40'} ${isSel ? 'bg-blue-100' : ''}`}>
                        <td className="border-b border-slate-100 px-2 py-1 font-semibold text-slate-700">
                          {c.code}
                          {isAmbCode(c) && <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700" title="Alternative Maximum Benefit (downgrade) code">AMB</span>}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-1 text-slate-500">{c.legacy_code ?? ''}</td>
                        <td className="border-b border-slate-100 px-2 py-1 text-slate-600">{c.description}</td>
                        <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-400">${Number(c.default_fee || 0).toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail / confirm */}
        <div className="flex items-end gap-3 border-t border-slate-200 bg-slate-50 px-3 py-2">
          {selected ? (
            <>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-semibold text-slate-700">{selected.code}</span>
                <div className="truncate text-slate-500">{selected.description}</div>
                <div className="mt-0.5 truncate text-[10px] text-slate-400" title={quote ? `${quote.fee_reason} | ${quote.coverage_reason}` : undefined}>
                  {quoting ? 'Pricing from fee schedule…' : quote ? `${quote.fee_source === 'fee_schedule' ? quote.fee_schedule_name : 'Code default fee'} · ${quote.coverage_reason}` : ''}
                </div>
                {quote?.fee_conflict && <div className="mt-0.5 truncate text-[10px] text-amber-600" title={quote.fee_conflict}>Setup conflict: {quote.fee_conflict}</div>}
                {!allow.allowed && <div className="mt-1 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-600">{allow.reason}</div>}
              </div>
              <label className="block w-24 text-xs"><span className="text-slate-500">Fee</span>
                <input value={fee} onChange={(e) => setFee(e.target.value)} disabled={quoting} title={quote?.fee_reason}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-100" /></label>
              <label className="block w-28 text-xs"><span className="text-slate-500">Est. Ins.{quote && quote.coverage_pct > 0 ? ` (${quote.coverage_pct}%)` : ''}</span>
                <input value={insEst} onChange={(e) => setInsEst(e.target.value)} disabled={quoting} title={quote?.coverage_reason}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-100" /></label>
              <div className="w-24 text-xs"><span className="text-slate-500">Patient Portion</span>
                <div className="mt-0.5 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-right text-sm font-semibold text-slate-700">{money2(patNum)}</div></div>
              {mode === 'completed' && (
                <label className="block w-48 text-xs"><span className="text-slate-500">Provider</span>
                  <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.id}</option>)}
                  </select></label>
              )}
              <button onClick={addCurrent} disabled={!canAdd} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                Add Procedure{teeth.length > 1 ? ' →' : ''}
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-400">Pick a category or search, then select a procedure code to chart on tooth #{currentTooth}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
