// Two-step whole-tooth sub-option popover (legacy: Missing → Permanent/Unerupted,
// Impacted → Permanent, Erupted → Deciduous/Supernumerary).

export interface SubOption {
  label: string;
  /** region `sub=` qualifier; null = the default/permanent variant. */
  sub: string | null;
}

interface WholeToothMenuProps {
  title: string;
  options: SubOption[];
  onPick: (sub: string | null) => void;
  onClose: () => void;
}

export default function WholeToothMenu({ title, options, onPick, onClose }: WholeToothMenuProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[300px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">{title}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="p-2">
          {options.map((o) => (
            <button
              key={o.label}
              onClick={() => onPick(o.sub)}
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
