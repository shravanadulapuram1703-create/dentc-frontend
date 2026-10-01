import { useState } from 'react';
import type { ProcedureCodeRead, ProviderRead } from '@/api/generated/model';
import { PROC_CATEGORIES, type ProcCategory } from './txModel';
import { codesInCategory, matchCodes, isExactMatch } from './treatmentPlanService';
import { providerOptionLabel } from '@/services/providerDirectory';

export interface EntryState {
  diag_date: string;
  tid: number;
  phase: number;
  order: number;
  provider_id: string;
}

interface ProcedureEntryPanelProps {
  entry: EntryState;
  onEntryChange: (patch: Partial<EntryState>) => void;
  providers: ProviderRead[];
  busy: boolean;
  onAdd: (code: ProcedureCodeRead) => void;
}

const fieldCls =
  'h-7 rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-[#3A6EA5] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/30';
const HEADER_BG = 'linear-gradient(180deg,#2a4a73,#1d3a5f)';
// The <label> is flex-col, so the caption (text + required star) is wrapped in
// one <span> to keep it on a single line above the field.
const labelCls = 'flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600';
const sectionTitle = 'mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1F3A5F]';
// Global CSS forces large padding (!important) on every <select>, clipping the
// selected text inside our compact h-7 selects. The `.tx-select` override (in
// globals.css @layer base) restores compact padding.
const selectCls = `${fieldCls} tx-select`;

export default function ProcedureEntryPanel({ entry, onEntryChange, providers, busy, onAdd }: ProcedureEntryPanelProps) {
  const [activeCat, setActiveCat] = useState<ProcCategory | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [results, setResults] = useState<ProcedureCodeRead[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [heading, setHeading] = useState('Procedures');
  const [loadingList, setLoadingList] = useState(false);

  const pickCategory = async (cat: ProcCategory) => {
    setActiveCat(cat);
    setHeading(`Procedures by ${cat.label}`);
    setSelectedCode(null);
    setLoadingList(true);
    try {
      setResults(await codesInCategory(cat));
    } finally {
      setLoadingList(false);
    }
  };

  const runCodeSearch = async () => {
    const q = codeInput.trim();
    if (!q) return;
    setLoadingList(true);
    setActiveCat(null);
    setHeading('Procedures by Code');
    try {
      const matches = await matchCodes(q);
      // Scenario 1: exact, unambiguous code → add immediately.
      if (isExactMatch(q, matches) && matches[0]) {
        onAdd(matches[0]);
        setCodeInput('');
        setResults([]);
        return;
      }
      // Scenario 2: multiple options → show pick list.
      setResults(matches);
      setSelectedCode(matches[0]?.code ?? null);
    } finally {
      setLoadingList(false);
    }
  };

  const runDescSearch = async () => {
    const q = descInput.trim();
    if (!q) return;
    setLoadingList(true);
    setActiveCat(null);
    setHeading('Procedures by Description');
    try {
      const matches = await matchCodes(q);
      setResults(matches);
      setSelectedCode(matches[0]?.code ?? null);
    } finally {
      setLoadingList(false);
    }
  };

  const addSelected = () => {
    const c = results.find((r) => r.code === selectedCode);
    if (c) onAdd(c);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: HEADER_BG }}>
        Add Procedure
      </div>
      {/* Entry fields row */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-[#F7F9FC] px-3 py-2">
        <label className={labelCls}>
          <span>
            Diagnosed Date <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            className={fieldCls}
            value={entry.diag_date}
            onChange={(e) => onEntryChange({ diag_date: e.target.value })}
          />
        </label>
        <label className={labelCls}>
          <span>
            Tx Plan ID <span className="text-red-500">*</span>
          </span>
          <input
            type="number"
            min={1}
            className={`${fieldCls} w-16`}
            value={entry.tid}
            onChange={(e) => onEntryChange({ tid: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label className={labelCls}>
          Phase ID
          <input
            type="number"
            min={1}
            className={`${fieldCls} w-16`}
            value={entry.phase}
            onChange={(e) => onEntryChange({ phase: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label className={labelCls}>
          Order ID
          <input
            type="number"
            min={1}
            className={`${fieldCls} w-16`}
            value={entry.order}
            onChange={(e) => onEntryChange({ order: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label className={labelCls}>
          Provider
          <select
            className={`${selectCls} w-48`}
            value={entry.provider_id}
            onChange={(e) => onEntryChange({ provider_id: e.target.value })}
          >
            <option value="">— Select provider —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-[auto_1fr_1.4fr] gap-3 p-3">
        {/* Category buttons */}
        <div>
          <div className={sectionTitle}>Add Proc By Category</div>
          <div className="grid grid-cols-2 gap-1">
            {PROC_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => pickCategory(cat)}
                className={`rounded-md border px-2 py-1 text-left text-[11px] font-medium shadow-sm transition-colors ${
                  activeCat?.key === cat.key
                    ? 'border-[#3A6EA5] bg-[#3A6EA5] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-[#3A6EA5] hover:bg-[#EFF6FE] hover:text-[#1F3A5F]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add by code / description */}
        <div>
          <div className={sectionTitle}>Add Proc By</div>
          <div className="flex flex-col gap-2">
            <label className={labelCls}>
              Code
              <input
                className={fieldCls}
                value={codeInput}
                placeholder="e.g. D2391"
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runCodeSearch();
                  }
                }}
              />
            </label>
            <label className={labelCls}>
              Description
              <input
                className={fieldCls}
                value={descInput}
                placeholder="Search by description"
                onChange={(e) => setDescInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runDescSearch();
                  }
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => void runCodeSearch()}
              className="h-7 rounded-md bg-[#3A6EA5] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1F3A5F]"
            >
              Find
            </button>
          </div>
        </div>

        {/* Procedures list */}
        <div className="flex flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#1F3A5F]">{heading}</span>
            <button
              type="button"
              disabled={!selectedCode || busy}
              onClick={addSelected}
              className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Procedure
            </button>
          </div>
          <div className="h-44 overflow-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0">
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[11px] font-bold uppercase tracking-wide" style={{ width: '70px' }}>
                    Code
                  </th>
                  <th className="border-b border-slate-300 px-2 py-1 text-left text-[11px] font-bold uppercase tracking-wide">Description</th>
                  <th className="border-b border-slate-300 px-2 py-1 text-right text-[11px] font-bold uppercase tracking-wide" style={{ width: '74px' }}>
                    Fee
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-slate-400">
                      Pick a category or search a code to list procedures.
                    </td>
                  </tr>
                ) : (
                  results.map((c) => (
                    <tr
                      key={c.code}
                      onClick={() => setSelectedCode(c.code)}
                      onDoubleClick={() => onAdd(c)}
                      className={`cursor-pointer border-b border-slate-100 ${
                        selectedCode === c.code ? 'bg-[#EFF6FE]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-2 py-1 font-mono text-slate-700">{c.code}</td>
                      <td className="px-2 py-1 text-slate-700">{c.description}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-600">
                        {Number(c.default_fee ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
