import type { ChartMaterialRead } from '@/api/generated/model';

interface MaterialPickerProps {
  conditionLabel: string;
  materials: ChartMaterialRead[];
  onPick: (materialId: number | null) => void;
  onClose: () => void;
}

/** Choose a chart_material when applying a material-aware condition (crown/filling/bridge). */
export default function MaterialPicker({ conditionLabel, materials, onPick, onClose }: MaterialPickerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[360px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Material — {conditionLabel}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2">
          {materials.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">
              No materials configured. Apply without a material, or seed Charting → Materials.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {materials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onPick(m.id)}
                  className="flex items-center gap-3 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded border border-slate-300"
                    style={{ background: m.color ?? '#e2e8f0' }}
                  />
                  <span className="flex-1">{m.name}</span>
                  {m.pattern && <span className="text-[10px] uppercase text-slate-400">{m.pattern}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-2">
          <button onClick={() => onPick(null)} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Apply without material
          </button>
        </div>
      </div>
    </div>
  );
}
