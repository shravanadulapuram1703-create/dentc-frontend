import type { ChartMaterialRead } from '@/api/generated/model';

interface RctMaterialPickerProps {
  materials: ChartMaterialRead[];
  onPick: (opts: { materialId: number | null; rctfill: string | null }) => void;
  onClose: () => void;
}

// Root-canal filling material (legacy: Gutta-Percha / Other / Unknown).
const OPTIONS = [
  { label: 'Gutta-Percha', match: 'gutta', rctfill: null as string | null },
  { label: 'Other', match: null, rctfill: 'other' },
  { label: 'Unknown', match: null, rctfill: 'unknown' },
];

export default function RctMaterialPicker({ materials, onPick, onClose }: RctMaterialPickerProps) {
  const guttaId = materials.find((m) => /gutta/i.test(m.name))?.id ?? null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[300px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Root Canal — Filling Material</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="p-2">
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => onPick({ materialId: o.match === 'gutta' ? guttaId : null, rctfill: o.rctfill })}
              className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
