import { useState } from 'react';
import { useListNoteMacros } from '@/api/generated/endpoints/procedures/procedures';

interface WatchEditorProps {
  tooth: string;
  onSave: (data: { dir: string; x: number; y: number; note: string }) => void;
  onClose: () => void;
}

const DIRS = [
  { dir: 'nw', label: '↖' }, { dir: 'n', label: '↑' }, { dir: 'ne', label: '↗' },
  { dir: 'w', label: '←' }, { dir: '', label: '•' }, { dir: 'e', label: '→' },
  { dir: 'sw', label: '↙' }, { dir: 's', label: '↓' }, { dir: 'se', label: '↘' },
];

/**
 * Legacy Watch workflow: pick a directional arrow, place it on the tooth box,
 * then add a note (optionally from a Macro). Anchor is a percent of the figure.
 */
export default function WatchEditor({ tooth, onSave, onClose }: WatchEditorProps) {
  const [dir, setDir] = useState('n');
  const [anchor, setAnchor] = useState({ x: 50, y: 35 });
  const [note, setNote] = useState('');
  const macros = useListNoteMacros({ size: 200 });

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({
      x: Math.round(((e.clientX - r.left) / r.width) * 100),
      y: Math.round(((e.clientY - r.top) / r.height) * 100),
    });
  };

  const insertMacro = (id: string) => {
    const m = macros.data?.items.find((x) => String(x.id) === id);
    if (m?.content) setNote((n) => (n ? `${n}\n${m.content}` : m.content));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[460px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Watch — Tooth #{tooth}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="flex gap-3 p-3">
          {/* Direction grid */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Direction</div>
            <div className="grid grid-cols-3 gap-1" style={{ width: 96 }}>
              {DIRS.map((d) => (
                <button
                  key={d.label}
                  disabled={!d.dir}
                  onClick={() => d.dir && setDir(d.dir)}
                  className="flex h-8 w-8 items-center justify-center rounded border text-base disabled:opacity-30"
                  style={dir === d.dir ? { background: '#dbeafe', borderColor: '#2f7ff0' } : { borderColor: '#cbd5e1' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {/* Placement box */}
            <div className="mb-1 mt-3 text-[11px] font-semibold uppercase text-slate-500">Place</div>
            <div onClick={place} className="relative cursor-crosshair rounded border border-slate-300 bg-slate-50" style={{ width: 96, height: 120 }} title="Click to position the arrow">
              <div style={{ position: 'absolute', left: `${anchor.x}%`, top: `${anchor.y}%`, transform: 'translate(-50%,-50%)', color: '#d23b3b', fontWeight: 700 }}>
                {DIRS.find((d) => d.dir === dir)?.label ?? '↑'}
              </div>
            </div>
          </div>

          {/* Notes + macro */}
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Watch Note</span>
              <select onChange={(e) => { insertMacro(e.target.value); e.currentTarget.selectedIndex = 0; }} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                <option value="">Insert Macro…</option>
                {(macros.data?.items ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={7}
              placeholder="Surfaces affected, reason to watch…"
              className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-2">
          <button onClick={onClose} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave({ dir, x: anchor.x, y: anchor.y, note: note.trim() })} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            Save Watch
          </button>
        </div>
      </div>
    </div>
  );
}
