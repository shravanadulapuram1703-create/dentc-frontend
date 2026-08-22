// PRINT PRESCRIPTION dialog (legacy Denticon M11).
//
// Mirrors the legacy pop-up exactly: the pre-printed-stock toggle, the three
// scope choices, the drug-count toggle, and the slip width — then PRINT/PREVIEW
// opens the rendered script.
//
// A scope whose set is empty (nothing highlighted, nothing checked) is disabled
// rather than allowed through to an empty print job, and the dialog opens on the
// first scope that can actually produce a slip.

import { useEffect, useState } from 'react';
import { DEFAULT_RX_PRINT_OPTIONS, type RxPrintOptions, type RxPrintSize } from './rxPrint';

export type RxPrintScope = 'highlighted' | 'checked' | 'today';

export interface RxPrintRequest extends RxPrintOptions {
  scope: RxPrintScope;
}

interface Props {
  /** How many prescriptions each scope would print — drives enablement. */
  counts: Record<RxPrintScope, number>;
  onPrint: (request: RxPrintRequest) => void;
  onClose: () => void;
}

const SCOPES: Array<{ id: RxPrintScope; label: string }> = [
  { id: 'highlighted', label: 'Print Only highlighted item' },
  { id: 'checked', label: 'Print Only checked item(s)' },
  { id: 'today', label: 'Print All Prescriptions for today' },
];

export default function RxPrintDialog({ counts, onPrint, onClose }: Props) {
  const firstUsable = SCOPES.find((s) => counts[s.id] > 0)?.id ?? 'highlighted';
  const [scope, setScope] = useState<RxPrintScope>(firstUsable);
  const [opts, setOpts] = useState<RxPrintOptions>(DEFAULT_RX_PRINT_OPTIONS);

  // Esc closes, matching every other dialog in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const count = counts[scope];
  const set = (patch: Partial<RxPrintOptions>) => setOpts((o) => ({ ...o, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className="w-[520px] max-w-full overflow-hidden rounded-md bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Print Prescription"
      >
        <header className="flex items-center justify-between bg-[#1f7ac4] px-4 py-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Print Prescription</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">✕</button>
        </header>

        <div className="space-y-0 p-4 text-sm">
          <div className="divide-y divide-slate-200 rounded border border-slate-200">
            <label className="flex items-center gap-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked={opts.prePrintedForm}
                onChange={(e) => set({ prePrintedForm: e.target.checked })}
              />
              <span>Pre-Printed Prescription Form</span>
            </label>

            <div className="bg-slate-50/60">
              {SCOPES.map((s) => {
                const disabled = counts[s.id] === 0;
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-2 ${disabled ? 'text-slate-400' : ''}`}
                    title={disabled ? 'Nothing to print for this option' : undefined}
                  >
                    <input
                      type="radio"
                      name="rx-print-scope"
                      checked={scope === s.id}
                      disabled={disabled}
                      onChange={() => setScope(s.id)}
                    />
                    <span>{s.label}</span>
                    {counts[s.id] > 0 && (
                      <span className="ml-auto text-xs text-slate-400">
                        {counts[s.id]} Rx
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <label className="flex items-center gap-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked={opts.showDrugCount}
                onChange={(e) => set({ showDrugCount: e.target.checked })}
              />
              <span>Print number of drugs prescribed.</span>
            </label>

            <div className="flex items-center gap-6 px-3 py-2.5">
              <span>Select Size</span>
              {(['wide', 'thin'] as RxPrintSize[]).map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rx-print-size"
                    checked={opts.size === s}
                    onChange={() => set({ size: s })}
                  />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={() => onPrint({ ...opts, scope })}
            disabled={count === 0}
            className="rounded bg-[#1f7ac4] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#186098] disabled:opacity-40"
          >
            Print/Preview
          </button>
          <button
            onClick={onClose}
            className="rounded bg-slate-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
