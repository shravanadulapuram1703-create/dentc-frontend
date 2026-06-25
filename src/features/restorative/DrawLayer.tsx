import { useRef, useState } from 'react';

// A freehand stroke in a normalized 0–1000 viewBox (re-renders at any width).
export interface Stroke {
  color: string;
  width: number;
  pts: [number, number][];
}

interface DrawLayerProps {
  onSave: (strokes: Stroke[], box: { w: number; h: number }) => void;
  onCancel: () => void;
}

const PENS = [
  { color: '#1f2937', label: 'Black' },
  { color: '#16a34a', label: 'Green' },
  { color: '#dc2626', label: 'Red' },
  { color: '#2563eb', label: 'Blue' },
];
const THICKS = [2, 4, 7];

/** Free-draw overlay over the chart with a pen/thickness/undo/redo/save toolbar. */
export default function DrawLayer({ onSave, onCancel }: DrawLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [color, setColor] = useState(PENS[0]!.color);
  const [width, setWidth] = useState<number>(THICKS[1]!);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  // The in-progress stroke lives in a ref so pointermove appends synchronously
  // (no stale-closure / re-render race); a counter forces redraws.
  const activeRef = useRef<Stroke | null>(null);
  const [, force] = useState(0);
  const redraw = () => force((n) => n + 1);

  const toPt = (e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 1000, ((e.clientY - r.top) / r.height) * 1000];
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    activeRef.current = { color, width, pts: [toPt(e)] };
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!activeRef.current) return;
    activeRef.current.pts.push(toPt(e));
    redraw();
  };
  const up = () => {
    const a = activeRef.current;
    if (a && a.pts.length > 1) { setStrokes((s) => [...s, a]); setRedo([]); }
    activeRef.current = null;
    redraw();
  };

  const undo = () => setStrokes((s) => { if (!s.length) return s; const last = s[s.length - 1]!; setRedo((r) => [...r, last]); return s.slice(0, -1); });
  const doRedo = () => setRedo((r) => { if (!r.length) return r; const last = r[r.length - 1]!; setStrokes((s) => [...s, last]); return r.slice(0, -1); });

  const poly = (st: Stroke) => st.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  return (
    <div className="absolute inset-0 z-30">
      {/* Toolbar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-4 border-b border-slate-300 bg-slate-100/95 px-3 py-1.5 text-xs">
        <fieldset className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1">
          <legend className="px-1 text-[10px] text-slate-500">Select Pen</legend>
          {PENS.map((p) => (
            <button key={p.color} title={p.label} onClick={() => setColor(p.color)} className="flex h-5 w-5 items-center justify-center rounded-full border"
              style={{ borderColor: color === p.color ? p.color : '#cbd5e1', boxShadow: color === p.color ? `0 0 0 2px ${p.color}55` : undefined }}>
              <span style={{ width: 12, height: 3, background: p.color, borderRadius: 2 }} />
            </button>
          ))}
        </fieldset>
        <fieldset className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1">
          <legend className="px-1 text-[10px] text-slate-500">Select Thickness</legend>
          {THICKS.map((t) => (
            <button key={t} onClick={() => setWidth(t)} className="flex h-5 w-7 items-center justify-center rounded border"
              style={{ borderColor: width === t ? '#2563eb' : '#cbd5e1', background: width === t ? '#dbeafe' : '#fff' }}>
              <span style={{ width: 18, height: t, background: '#1f2937', borderRadius: 2 }} />
            </button>
          ))}
        </fieldset>
        <fieldset className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1">
          <legend className="px-1 text-[10px] text-slate-500">Edit</legend>
          <button onClick={undo} disabled={!strokes.length} className="rounded border border-slate-300 bg-white px-2 py-0.5 disabled:opacity-40">↶ Undo</button>
          <button onClick={doRedo} disabled={!redo.length} className="rounded border border-slate-300 bg-white px-2 py-0.5 disabled:opacity-40">↷ Redo</button>
        </fieldset>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { const r = svgRef.current?.getBoundingClientRect(); onSave(strokes, { w: r?.width ?? 1000, h: r?.height ?? 300 }); }} disabled={!strokes.length} className="rounded bg-blue-600 px-4 py-1 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">SAVE</button>
          <button onClick={onCancel} className="rounded border border-slate-400 bg-white px-4 py-1 font-medium text-slate-700 hover:bg-slate-50">CANCEL</button>
        </div>
      </div>

      {/* Drawing surface */}
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{ cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {[...strokes, ...(activeRef.current ? [activeRef.current] : [])].map((st, i) => (
          <polyline key={i} points={poly(st)} fill="none" stroke={st.color} strokeWidth={st.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}
