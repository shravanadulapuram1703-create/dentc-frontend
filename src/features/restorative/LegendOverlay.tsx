import { useState } from 'react';

interface LegendOverlayProps {
  onClose: () => void;
}

type LegendTab = 'procedures' | 'conditions' | 'materials';

const PROCEDURES = [
  { label: 'Crown', glyph: <rect x="6" y="6" width="20" height="20" rx="4" fill="#fff" stroke="#2f7ff0" strokeWidth="2" /> },
  { label: 'Bridge', glyph: <g stroke="#2f7ff0" strokeWidth="2" fill="none"><rect x="3" y="8" width="9" height="16" rx="2" /><rect x="20" y="8" width="9" height="16" rx="2" /><line x1="12" y1="16" x2="20" y2="16" /></g> },
  { label: 'Class V', glyph: <path d="M6 22 a10 6 0 0 0 20 0" fill="none" stroke="#2f7ff0" strokeWidth="2" /> },
  { label: 'Implant', glyph: <g stroke="#2f7ff0" strokeWidth="2"><line x1="16" y1="6" x2="16" y2="26" /><line x1="11" y1="13" x2="21" y2="13" /><line x1="11" y1="19" x2="21" y2="19" /></g> },
  { label: 'Root Canal', glyph: <line x1="16" y1="5" x2="16" y2="27" stroke="#d23b3b" strokeWidth="3" /> },
  { label: 'Extraction', glyph: <g stroke="#d23b3b" strokeWidth="3"><line x1="7" y1="7" x2="25" y2="25" /><line x1="25" y1="7" x2="7" y2="25" /></g> },
];

const CONDITIONS = [
  { label: 'Decay', glyph: <circle cx="16" cy="16" r="9" fill="#111" /> },
  { label: 'Abscess', glyph: <circle cx="16" cy="16" r="8" fill="none" stroke="#d23b3b" strokeWidth="3" /> },
  { label: 'Root Tip', glyph: <circle cx="16" cy="16" r="6" fill="#d23b3b" /> },
  { label: 'Crack / Chip', glyph: <polyline points="9,7 17,16 11,21 22,28" fill="none" stroke="#111" strokeWidth="2" /> },
  { label: 'Abrasion / Lesion', glyph: <ellipse cx="16" cy="16" rx="11" ry="5" fill="#e879a6" opacity="0.7" /> },
  { label: 'Drift / Tipped', glyph: <g stroke="#2f7ff0" strokeWidth="3" fill="none" strokeLinecap="round"><line x1="6" y1="16" x2="26" y2="16" /><polyline points="19,9 26,16 19,23" /></g> },
  { label: 'Watch', glyph: <g stroke="#d23b3b" strokeWidth="3" fill="none" strokeLinecap="round"><polyline points="9,11 16,20 23,11" /><line x1="16" y1="20" x2="16" y2="7" /></g> },
  { label: 'Missing', glyph: <g stroke="#7a7a7a" strokeWidth="2" fill="none" strokeDasharray="3 2"><rect x="6" y="6" width="20" height="20" rx="4" /></g> },
];

const MATERIALS = [
  { label: 'Amalgam', pattern: 'repeating-linear-gradient(45deg,#64748b 0 2px,transparent 2px 5px)' },
  { label: 'Composite', pattern: 'repeating-linear-gradient(90deg,#64748b 0 2px,transparent 2px 5px)' },
  { label: 'Ceramic Crown', pattern: 'repeating-linear-gradient(45deg,#64748b 0 2px,transparent 2px 5px),repeating-linear-gradient(-45deg,#64748b 0 2px,transparent 2px 5px)' },
  { label: 'Gold', pattern: 'radial-gradient(#cda434 1.5px,transparent 1.6px)' },
];

const TABS: { key: LegendTab; label: string }[] = [
  { key: 'procedures', label: 'Procedures' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'materials', label: 'Materials' },
];

/** Movable, closable legend overlay (Procedures / Conditions / Materials). */
export default function LegendOverlay({ onClose }: LegendOverlayProps) {
  const [tab, setTab] = useState<LegendTab>('procedures');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => setDrag({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
  const onMouseMove = (e: React.MouseEvent) => {
    if (drag) setPos({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  };
  const stopDrag = () => setDrag(null);

  return (
    <div className="fixed inset-0 z-40" onMouseMove={onMouseMove} onMouseUp={stopDrag}>
      <div className="absolute inset-0 bg-black/10" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/3 w-[420px] -translate-x-1/2 rounded-lg border border-slate-300 bg-white shadow-2xl"
        style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
      >
        <div
          className="flex cursor-move items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-3 py-2 text-white"
          onMouseDown={onMouseDown}
        >
          <span className="text-sm font-semibold">✥ Chart Legend</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">
            ✕
          </button>
        </div>
        <div className="flex border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 text-xs font-semibold"
              style={{
                background: tab === t.key ? '#fff' : '#eef2f7',
                color: tab === t.key ? '#16406e' : '#64748b',
                borderBottom: tab === t.key ? '2px solid #2566a8' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {tab === 'materials'
            ? MATERIALS.map((m) => (
                <div key={m.label} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs">
                  <span className="h-7 w-7 rounded border border-slate-300" style={{ background: m.pattern, backgroundColor: '#fff' }} />
                  {m.label}
                </div>
              ))
            : (tab === 'procedures' ? PROCEDURES : CONDITIONS).map((it) => (
                <div key={it.label} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs">
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    {it.glyph}
                  </svg>
                  {it.label}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
