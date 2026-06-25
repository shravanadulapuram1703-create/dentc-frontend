import { useState } from 'react';
import { PatternDefs } from './chartGlyphs';
import { LEGEND_PROCEDURES, LEGEND_CONDITIONS, LEGEND_MATERIALS } from './legendCatalog';
import type { FillKind } from './glyphFills';

interface LegendOverlayProps {
  onClose: () => void;
}

type LegendTab = 'procedures' | 'conditions' | 'materials';

// Legend samples render in a representative colour; on the chart the same shape is
// recoloured by module (blue = pre-existing, green = completed, red = tx-plan).
const SAMPLE_COLOR = '#1d4ed8';

const SOURCE_KEY = [
  { label: 'Pre-existing', color: '#1d4ed8' },
  { label: 'Completed', color: '#15803d' },
  { label: 'TxPlans', color: '#dc2626' },
];

const TABS: { key: LegendTab; label: string }[] = [
  { key: 'procedures', label: 'Procedures' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'materials', label: 'Materials' },
];

function SampleSwatch({ id, kind, render }: { id: string; kind?: FillKind; render: (uid: string, color: string) => React.ReactNode }) {
  // For pattern-filled procedures, emit the matching <pattern> def and hand the
  // pattern's id to the renderer (which fills via url(#id)).
  const patternId = kind && kind !== 'solid' ? `${id}-${kind}-${SAMPLE_COLOR.replace('#', '')}` : null;
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      {kind && kind !== 'solid' && (
        <defs><PatternDefs uid={id} pairs={[{ kind, color: SAMPLE_COLOR }]} /></defs>
      )}
      {render(patternId ?? id, SAMPLE_COLOR)}
    </svg>
  );
}

/** Movable, closable legend overlay — renders the same glyphs the chart draws. */
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
        className="absolute left-1/2 top-1/4 w-[460px] -translate-x-1/2 rounded-lg border border-slate-300 bg-white shadow-2xl"
        style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
      >
        <div
          className="flex cursor-move items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-3 py-2 text-white"
          onMouseDown={onMouseDown}
        >
          <span className="text-sm font-semibold">✥ Chart Legend</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>

        {/* Colour key: the shape tells you the procedure; the colour tells you the module. */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
          <span className="font-semibold">Colour =</span>
          {SOURCE_KEY.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />{s.label}
            </span>
          ))}
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

        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-auto p-3">
          {(tab === 'procedures' ? LEGEND_PROCEDURES : tab === 'conditions' ? LEGEND_CONDITIONS : LEGEND_MATERIALS).map((it, i) => (
            <div key={it.label} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs">
              <SampleSwatch id={`lg-${tab}-${i}`} kind={(it as { kind?: FillKind }).kind} render={it.sample} />
              {it.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
