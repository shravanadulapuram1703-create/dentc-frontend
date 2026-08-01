import { useState } from 'react';
import { STATUS_ORDER, STATUS_LABEL, type TxStatus } from './txModel';
import { DISCLOSURES, type ReportOptions } from './txReport';

interface TxPlanReportModalProps {
  availableTids: number[];
  defaultTid: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (opts: ReportOptions, mode: 'preview' | 'save') => void;
}

const field = 'h-7 rounded border border-slate-300 px-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
// Global CSS forces large !important padding on <select>, clipping the selected
// text in our compact h-7 selects. The `.tx-select` override (globals.css @layer
// base) restores compact padding.
const selectField = `${field} tx-select`;

export default function TxPlanReportModal({ availableTids, defaultTid, busy, onClose, onSubmit }: TxPlanReportModalProps) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [singleTid, setSingleTid] = useState<number>(defaultTid);
  const [multiTids, setMultiTids] = useState<Set<number>>(new Set(availableTids));
  const [phase, setPhase] = useState('');
  const [disclosure, setDisclosure] = useState('Treatment Plan Disclosure');
  // Default on so the common report includes every procedure; unchecking hides
  // procedures with no UCR/fee (see filterReportRows).
  const [includeWithoutUcr, setIncludeWithoutUcr] = useState(true);
  const [printAccountName, setPrintAccountName] = useState(true);
  const [printRespPartyAddress, setPrintRespPartyAddress] = useState(true);
  const [statuses, setStatuses] = useState<Set<TxStatus>>(new Set<TxStatus>(['diagnosed', 'accepted']));
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const toggleStatus = (s: TxStatus) =>
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const toggleMultiTid = (t: number) =>
    setMultiTids((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const build = (): ReportOptions => ({
    tids: mode === 'single' ? [singleTid] : [...multiTids],
    phase: phase.trim() ? Number(phase) : null,
    statuses,
    includeCompleted,
    disclosure,
    includeWithoutUcr,
    printAccountName,
    printRespPartyAddress,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Treatment Plan Report</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-auto px-4 py-3 text-xs">
          {/* Single / Multiple */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1 font-semibold text-slate-700">
              <input type="radio" checked={mode === 'single'} onChange={() => setMode('single')} /> Single
            </label>
            <label className="flex items-center gap-1 font-semibold text-slate-700">
              <input type="radio" checked={mode === 'multiple'} onChange={() => setMode('multiple')} /> Multiple
            </label>
          </div>

          {mode === 'single' ? (
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-0.5 font-semibold text-slate-600">
                Tx Plan ID <span className="text-red-500">*</span>
                <select className={`${selectField} w-24`} value={singleTid} onChange={(e) => setSingleTid(Number(e.target.value))}>
                  {availableTids.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 font-semibold text-slate-600">
                Phase ID
                <input className={`${field} w-24`} placeholder="all" value={phase} onChange={(e) => setPhase(e.target.value)} />
              </label>
            </div>
          ) : (
            <div>
              <div className="mb-1 font-semibold text-slate-600">Tx Plan IDs</div>
              <div className="flex flex-wrap gap-3">
                {availableTids.map((t) => (
                  <label key={t} className="flex items-center gap-1 text-slate-700">
                    <input type="checkbox" checked={multiTids.has(t)} onChange={() => toggleMultiTid(t)} /> {t}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Disclosure */}
          <label className="flex flex-col gap-0.5 font-semibold text-slate-600">
            Included Disclosure
            <select className={`${selectField} w-64`} value={disclosure} onChange={(e) => setDisclosure(e.target.value)}>
              {Object.keys(DISCLOSURES).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 text-slate-700">
              <input type="checkbox" checked={includeWithoutUcr} onChange={(e) => setIncludeWithoutUcr(e.target.checked)} /> Include without UCR
            </label>
            <label className="flex items-center gap-1 text-slate-700">
              <input type="checkbox" checked={printAccountName} onChange={(e) => setPrintAccountName(e.target.checked)} /> Print Account Name
            </label>
            <label className="flex items-center gap-1 text-slate-700">
              <input type="checkbox" checked={printRespPartyAddress} onChange={(e) => setPrintRespPartyAddress(e.target.checked)} /> Print Resp. Party Address
            </label>
          </div>

          {/* Include statuses */}
          <div>
            <div className="mb-1 font-semibold text-slate-600">Include Statuses</div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_ORDER.map((s) => (
                <label key={s} className="flex items-center gap-1 text-slate-700">
                  <input type="checkbox" checked={statuses.has(s)} onChange={() => toggleStatus(s)} /> {STATUS_LABEL[s]}
                </label>
              ))}
              <label className="flex items-center gap-1 text-slate-700">
                <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} /> Include completed
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button onClick={onClose} className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => onSubmit(build(), 'save')}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Save PDF to Notes
          </button>
          <button
            disabled={busy}
            onClick={() => onSubmit(build(), 'preview')}
            className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
          >
            Print / Preview
          </button>
        </div>
      </div>
    </div>
  );
}
