// Step 1 of the Watch workflow: pick a directional arrow to place on the tooth.

interface WatchArrowMenuProps {
  tooth: string;
  onPick: (dir: string) => void;
  onClose: () => void;
}

const DIRS = [
  { dir: 'ne', label: 'North-East', glyph: '↗' },
  { dir: 'nw', label: 'North-West', glyph: '↖' },
  { dir: 'se', label: 'South-East', glyph: '↘' },
  { dir: 'sw', label: 'South-West', glyph: '↙' },
];

export default function WatchArrowMenu({ tooth, onPick, onClose }: WatchArrowMenuProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[230px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-3 py-2 text-white">
          <span className="text-sm font-semibold">Watch — Tooth #{tooth}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-400">Choose a directional arrow</div>
        <div className="pb-2">
          {DIRS.map((d) => (
            <button
              key={d.dir}
              onClick={() => onPick(d.dir)}
              className="flex w-full items-center gap-3 px-4 py-1.5 text-left text-sm text-slate-700 hover:bg-blue-50"
            >
              <span className="w-5 text-center text-lg font-bold text-rose-600">{d.glyph}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
