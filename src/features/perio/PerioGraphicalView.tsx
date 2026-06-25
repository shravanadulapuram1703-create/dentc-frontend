import { useLayoutEffect, useRef, useState } from 'react';
import { toothLabel, type NumberingSystem } from '@/features/restorative/numbering';
import { isPrimaryId } from '@/features/restorative/dentition';
import { toothAnatomy } from '@/features/restorative/toothAnatomy';
import ToothShape, { type SegmentKey } from '@/features/restorative/ToothShape';
import type { ToothGlyph } from '@/features/restorative/chartModel';
import {
  MEASURES, SITES_PER_SURFACE, numAt, boolAt, cellKey,
  type Cell, type MeasureType, type PerioDetailDraft,
} from './perioModel';

// Graphical view (legacy Denticon "Graphical" toggle): the same anatomical teeth
// the restorative chart draws (ToothShape) seated in a pink gingival band that
// covers the roots, with the periodontal exam drawn over them — gingival-margin
// line (FGM, red) and MGJ line (green) running through the pink, pocket depths as
// pink badges on the crowns, and bleeding/suppuration dots at the gum line.
// Per-site value strips flank the tooth numbers (facial + lingual per arch) and
// are EDITABLE — clicking a cell + the number pad stores exactly as Data Entry.
//
// Column width is measured from the container so the chart fills the available
// width (like the Data Entry grid) — no dead space before the entry rail.

const BAND_H = 150;     // band height
const GUM_FRAC = 0.52;  // pink gum/bone covers the root half of the tooth
const PXMM = 5;         // px per mm of probing depth
const STRIP_H = 17;     // editable value-strip row height
const ARCH_LABEL_W = 20;
const MIN_COL = 42;     // below this the chart scrolls instead of shrinking

// ToothShape is rendered read-only here (no selection / condition glyphs).
const EMPTY_KEYS: Set<SegmentKey> = new Set();
const EMPTY_GLYPHS: Map<SegmentKey, ToothGlyph[]> = new Map();
const EMPTY_TIPS: Map<SegmentKey, string> = new Map();
const NOOP = () => {};

interface Props {
  maxTeeth: string[];
  mandTeeth: string[];
  getDraft: (tooth: string) => PerioDetailDraft | undefined;
  numberingSystem: NumberingSystem;
  showLingual: boolean;
  showMgj?: boolean;
  active: Cell | null;
  activeMeasure: MeasureType;
  readOnly?: boolean;
  onCellClick: (cell: Cell) => void;
  onToggleBool: (cell: Cell) => void;
}

export default function PerioGraphicalView(props: Props) {
  const { maxTeeth, mandTeeth } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [col, setCol] = useState(78);

  // Size columns to fill the container width; re-measure on resize.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const n = Math.max(maxTeeth.length, mandTeeth.length, 1);
    const measure = () => setCol(Math.max(MIN_COL, (el.clientWidth - ARCH_LABEL_W) / n));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxTeeth.length, mandTeeth.length]);

  return (
    <div ref={ref} className="w-full space-y-4 p-2">
      <ArchBlock arch="Maxillary" teeth={maxTeeth} topOffset={0} bottomOffset={SITES_PER_SURFACE} col={col} {...props} />
      <ArchBlock arch="Mandibular" teeth={mandTeeth} topOffset={SITES_PER_SURFACE} bottomOffset={0} col={col} {...props} />
    </div>
  );
}

interface ArchProps extends Props {
  arch: string;
  teeth: string[];
  topOffset: number;
  bottomOffset: number;
  col: number;
}

function ArchBlock(props: ArchProps) {
  const { arch, teeth, topOffset, bottomOffset, numberingSystem, showLingual, col } = props;
  const topIsFacial = topOffset === 0;
  return (
    <div className="flex">
      <div className="flex shrink-0 items-center justify-center bg-[#1f4e79] text-white" style={{ width: ARCH_LABEL_W, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9, fontWeight: 600 }}>
        {arch}
      </div>
      <div>
        <GraphBand {...props} offset={topOffset} gumAtTop surfLabel={topIsFacial ? 'Facial' : 'Lingual'} />
        <ValueStrip {...props} offset={topOffset} />
        <ToothNumberRow teeth={teeth} numberingSystem={numberingSystem} col={col} />
        {showLingual && (
          <>
            <ValueStrip {...props} offset={bottomOffset} />
            <GraphBand {...props} offset={bottomOffset} gumAtTop={false} surfLabel={topIsFacial ? 'Lingual' : 'Facial'} />
          </>
        )}
      </div>
    </div>
  );
}

function ToothNumberRow({ teeth, numberingSystem, col }: { teeth: string[]; numberingSystem: NumberingSystem; col: number }) {
  return (
    <div className="flex">
      {teeth.map((t) => (
        <div key={t} className="flex items-center justify-center border border-slate-300 bg-[#1f4e79] py-0.5 text-[10px] font-semibold text-white" style={{ width: col }}>
          {isPrimaryId(t) ? t : toothLabel(Number(t), numberingSystem)}
        </div>
      ))}
    </div>
  );
}

// ---- Editable per-site value strip ----------------------------------------
// Shows the SELECTED measure's three site values per tooth for one surface, and
// routes clicks + the number pad through the same handlers as the grid, so data
// entered here persists identically.
function ValueStrip(props: ArchProps & { offset: number }) {
  const { teeth, offset, activeMeasure, active, getDraft, readOnly, col, onCellClick, onToggleBool } = props;
  const meta = MEASURES[activeMeasure];

  return (
    <div className="flex border-y border-slate-200 bg-slate-50">
      {teeth.map((tooth) => {
        const d = getDraft(tooth);
        if (meta.kind === 'mobility') {
          const cell: Cell = { tooth, measure: activeMeasure, site: offset };
          const isAct = !!active && cellKey(active) === cellKey(cell);
          return (
            <button key={tooth} type="button" disabled={readOnly} onClick={() => onCellClick(cell)}
              className="border-r border-slate-200 text-center text-[10px] disabled:cursor-default"
              style={{ width: col, height: STRIP_H, background: isAct ? '#dbeafe' : undefined, outline: isAct ? '2px solid #2563eb' : undefined }}>
              {numAt(d, activeMeasure, offset) ?? ''}
            </button>
          );
        }
        return (
          <div key={tooth} className="flex border-r border-slate-200" style={{ width: col }}>
            {[0, 1, 2].map((s) => {
              const site = offset + s;
              const cell: Cell = { tooth, measure: activeMeasure, site };
              const isAct = !!active && cellKey(active) === cellKey(cell);
              if (meta.kind === 'bool') {
                const on = boolAt(d, activeMeasure, site);
                const dot = activeMeasure === 'BLD' ? '#dc2626' : '#eab308';
                return (
                  <button key={s} type="button" disabled={readOnly} onClick={() => onToggleBool(cell)}
                    className="flex flex-1 items-center justify-center text-[10px] disabled:cursor-default"
                    style={{ height: STRIP_H, background: isAct ? '#dbeafe' : undefined }}>
                    {on ? <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
                  </button>
                );
              }
              const v = numAt(d, activeMeasure, site);
              const warn = activeMeasure === 'PD' && v != null && v >= 4;
              return (
                <button key={s} type="button" disabled={readOnly} onClick={() => onCellClick(cell)}
                  className="flex-1 text-center text-[10px] disabled:cursor-default"
                  style={{ height: STRIP_H, background: isAct ? '#dbeafe' : undefined, outline: isAct ? '2px solid #2563eb' : undefined, color: warn ? '#dc2626' : undefined, fontWeight: warn ? 700 : undefined }}>
                  {v ?? ''}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---- Graphical band (anatomical teeth + measurement overlay) ---------------
function GraphBand(props: ArchProps & { offset: number; gumAtTop: boolean; surfLabel: string }) {
  const { teeth, offset, gumAtTop, getDraft, showMgj = true, surfLabel, col } = props;
  const width = teeth.length * col;
  const toothW = col * 0.72;
  const siteDx = col * 0.2;
  const gumH = BAND_H * GUM_FRAC;
  const pinkEdge = gumAtTop ? gumH : BAND_H - gumH; // pink/crown boundary
  const apical = gumAtTop ? -1 : 1;                 // direction into the gum/root
  // FGM (gingival margin) + MGJ lines live INSIDE the pink; recession runs
  // apically. Pocket depths read as badges on the crowns, dots at the gum line.
  const marginBase = pinkEdge + apical * 7;
  const badgeY = pinkEdge - apical * 12;
  const siteX = (i: number, s: number) => i * col + col / 2 + (s - 1) * siteDx;
  const midX = (teeth.length / 2) * col;

  const fgmPts: string[] = [];
  const mgjPts: string[] = [];
  const dots: { x: number; y: number; c: string }[] = [];
  const badges: { x: number; v: number; warn: boolean }[] = [];

  teeth.forEach((tooth, i) => {
    const d = getDraft(tooth);
    for (let s = 0; s < SITES_PER_SURFACE; s++) {
      const site = offset + s;
      const x = siteX(i, s);
      const fgm = numAt(d, 'FGM', site) ?? 0;
      fgmPts.push(`${x},${marginBase + apical * fgm * PXMM}`);

      const mgj = numAt(d, 'MGJ', site);
      if (mgj != null) mgjPts.push(`${x},${marginBase + apical * mgj * PXMM}`);

      const pd = numAt(d, 'PD', site);
      if (pd != null) badges.push({ x, v: pd, warn: pd >= 4 });
      if (boolAt(d, 'BLD', site)) dots.push({ x: x - 3, y: pinkEdge, c: '#dc2626' });
      if (boolAt(d, 'SUP', site)) dots.push({ x: x + 3, y: pinkEdge, c: '#eab308' });
    }
  });

  return (
    <div className="relative" style={{ width, height: BAND_H }}>
      {/* Gingival band / alveolar bone — covers the root half of the teeth. */}
      <div className="absolute left-0 right-0" style={{ [gumAtTop ? 'top' : 'bottom']: 0, height: gumH, background: 'linear-gradient(#e7a0a0,#d98a8a)' }} />
      <div className="absolute left-1 text-[8px] font-semibold uppercase tracking-wide text-white/80" style={{ [gumAtTop ? 'top' : 'bottom']: 2 }}>{surfLabel}</div>

      {/* Anatomical teeth (reused from the restorative chart). */}
      <div className="absolute inset-0 flex">
        {teeth.map((tooth) => {
          const a = toothAnatomy(tooth);
          return (
            <div key={tooth} className="flex justify-center" style={{ width: col }}>
              <ToothShape
                uid={`pg-${tooth}-${gumAtTop ? 't' : 'b'}`}
                type={a.type}
                arch={gumAtTop ? 'upper' : 'lower'}
                rootLabels={a.rootLabels}
                selectedKeys={EMPTY_KEYS}
                segmentGlyphs={EMPTY_GLYPHS}
                tooltips={EMPTY_TIPS}
                missing={false}
                onSelect={NOOP}
                width={toothW}
                height={BAND_H}
              />
            </div>
          );
        })}
      </div>

      {/* Measurement overlay — FGM / MGJ lines run through the pink. */}
      <svg className="pointer-events-none absolute inset-0" width={width} height={BAND_H}>
        {/* green dental midline */}
        <line x1={midX} y1={0} x2={midX} y2={BAND_H} stroke="#16a34a" strokeWidth={2} />
        {showMgj && mgjPts.length > 1 && <polyline points={mgjPts.join(' ')} fill="none" stroke="#16a34a" strokeWidth={1.5} />}
        <polyline points={fgmPts.join(' ')} fill="none" stroke="#dc2626" strokeWidth={2} />
        {dots.map((dt, k) => <circle key={k} cx={dt.x} cy={dt.y} r={2.4} fill={dt.c} stroke="#fff" strokeWidth={0.5} />)}
        {badges.map((b, k) => (
          <g key={k}>
            <rect x={b.x - 7} y={badgeY - 6} width={14} height={12} rx={2} fill="#f9c6db" stroke={b.warn ? '#dc2626' : '#db2777'} strokeWidth={0.6} />
            <text x={b.x} y={badgeY + 3} fontSize={8} textAnchor="middle" fontWeight={700} fill={b.warn ? '#dc2626' : '#9d174d'}>{b.v}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
