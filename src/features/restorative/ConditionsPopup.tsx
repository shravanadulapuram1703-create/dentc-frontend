import { conditionsForArea, type ConditionDef } from './conditionCatalog';
import type { ActiveSelection, ToothArea } from './types';

interface ConditionsPopupProps {
  selection: ActiveSelection;
  onApply: (def: ConditionDef) => void;
  onClose: () => void;
}

const AREA_LABEL: Record<ToothArea, string> = {
  whole: 'Whole Tooth',
  crown: 'Crown',
  root: 'Root',
  surface: 'Surface',
};

export default function ConditionsPopup({ selection, onApply, onClose }: ConditionsPopupProps) {
  const items = conditionsForArea(selection.area);
  const teeth = selection.teeth.map((t) => `#${t}`).join(', ');
  const surf = selection.area === 'surface' && selection.surfaces.size
    ? ` · ${[...selection.surfaces].join('')}`
    : '';

  return (
    <div
      className="absolute right-2 top-2 z-30 w-72 rounded-lg border border-slate-300 bg-white shadow-2xl"
      role="dialog"
      aria-label="Conditions"
    >
      <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-3 py-2 text-white">
        <div className="text-xs font-semibold">
          {AREA_LABEL[selection.area]} Conditions
          <div className="text-[10px] font-normal opacity-80">
            {teeth}
            {surf}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded px-1.5 text-white/90 hover:bg-white/15">
          ✕
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto py-1">
        {items.map((def) => (
          <button
            key={def.code + def.label}
            onClick={() => onApply(def)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50"
          >
            <span>{def.label}</span>
            {!def.drawable && <span className="text-[9px] uppercase text-slate-400">notation</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
