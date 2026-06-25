// Tooth Number/s picker — the legacy "V" popup next to the Tooth# field.
//
// Universal numbering: permanent upper 1–16, permanent lower 32–17, primary
// upper A–J, primary lower T–K, with an optional supernumerary band (51–66 /
// 81–82 upper, 67–82 mapping kept simple). Multi-select; Save returns the chosen
// teeth in operator order, Cancel discards.

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  PERMANENT_UPPER,
  PERMANENT_LOWER,
  PRIMARY_UPPER,
  PRIMARY_LOWER,
} from '@/features/restorative/dentition';

// Supernumerary teeth: legacy uses 51–82 (permanent) shown UR→UL / UL→UR.
const SUPER_UPPER = ['51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66'];
const SUPER_LOWER = ['82', '81', '80', '79', '78', '77', '76', '75', '74', '73', '72', '71', '70', '69', '68', '67'];

interface ToothNumberPickerProps {
  initial: string[];
  onSave: (teeth: string[]) => void;
  onCancel: () => void;
}

export default function ToothNumberPicker({ initial, onSave, onCancel }: ToothNumberPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [showSupernumerary, setShowSupernumerary] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const Tooth = ({ id }: { id: string }) => {
    const on = selected.has(id);
    return (
      <button
        type="button"
        onClick={() => toggle(id)}
        className={`h-8 min-w-[2.25rem] rounded border text-xs font-semibold transition-colors ${
          on
            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
        }`}
      >
        {id}
      </button>
    );
  };

  const Row = ({ ids }: { ids: string[] }) => (
    <div className="flex flex-wrap justify-center gap-1">
      {ids.map((id) => (
        <Tooth key={id} id={id} />
      ))}
    </div>
  );

  // Order selected back into a stable operator order for the Tooth# field.
  const ORDER = [...PERMANENT_UPPER, ...PRIMARY_UPPER, ...PRIMARY_LOWER, ...PERMANENT_LOWER, ...SUPER_UPPER, ...SUPER_LOWER];
  const handleSave = () => {
    const ordered = ORDER.filter((id) => selected.has(id));
    // Keep any free-typed ids not in the canonical set, appended.
    const extras = [...selected].filter((id) => !ORDER.includes(id));
    onSave([...ordered, ...extras]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5 text-white">
          <h3 className="text-sm font-bold uppercase tracking-wide">Tooth Number/s</h3>
          <button type="button" onClick={onCancel} className="rounded p-1 hover:bg-white/15">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Permanent · Upper
          </div>
          <Row ids={PERMANENT_UPPER} />
          {showSupernumerary && <Row ids={SUPER_UPPER} />}

          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Primary
          </div>
          <Row ids={PRIMARY_UPPER} />
          <Row ids={PRIMARY_LOWER} />

          {showSupernumerary && <Row ids={SUPER_LOWER} />}
          <Row ids={PERMANENT_LOWER} />
          <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Permanent · Lower
          </div>

          <label className="flex items-center justify-end gap-2 pt-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showSupernumerary}
              onChange={(e) => setShowSupernumerary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show Supernumerary Teeth
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} /> Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              <X className="h-4 w-4" strokeWidth={2.5} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
