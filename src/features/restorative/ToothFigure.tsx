import { useMemo, useRef } from 'react';
import type { Arch } from './toothLayout';
import type { ToothArea } from './types';
import type { ToothGlyph } from './chartModel';
import { lookupCondition } from './conditionTaxonomy';
import ToothShape, { type SegmentKey } from './ToothShape';

interface ToothFigureProps {
  id: string;
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  arch: Arch;
  rootLabels: string[];
  /** This tooth's selected area (null if not selected; 'surface' handled elsewhere). */
  selectedArea: ToothArea | null;
  /** Root labels selected (when selectedArea === 'root'; supports multi-select). */
  selectedRoots?: string[];
  glyphs: ToothGlyph[];
  missing: boolean;
  hasNote?: boolean;
  /** Active module colour (blue/green/red) for selection highlights. */
  selColor?: string;
  onSelectSegment: (id: string, area: ToothArea, root?: string) => void;
  /** Active Watch placement on this tooth: a draggable arrow at (x,y) % of the figure. */
  watchPlacement?: { dir: string; x: number; y: number; onMove: (x: number, y: number) => void } | null;
  /** Click a saved Watch arrow → edit/delete its notes. */
  onWatchClick?: (id: string, glyph: ToothGlyph) => void;
  width?: number;
  height?: number;
}

const DIR_ROT: Record<string, number> = { ne: 45, se: 135, sw: 225, nw: 315, n: 0, e: 90, s: 180, w: 270 };

/**
 * A single tooth rendered as a segmented inline vector (crown / junction / each
 * root individually clickable). Maps the tooth's condition glyphs and selection
 * state onto per-segment props for ToothShape.
 */
export default function ToothFigure({
  id, type, arch, rootLabels, selectedArea, selectedRoots, glyphs, missing, hasNote = false, selColor, onSelectSegment, watchPlacement, onWatchClick, width = 76, height = 138,
}: ToothFigureProps) {
  const rootKeys = useMemo(() => rootLabels.map((l) => `root:${l}`), [rootLabels]);
  const boxRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onArrowMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !watchPlacement || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    watchPlacement.onMove(Math.round(x), Math.round(y));
  };

  // Saved Watch arrows render as positioned overlays (at their stored x/y), not
  // as a generic segment glyph.
  const watchGlyphs = useMemo(() => glyphs.filter((g) => g.code === 'WATCH' && g.watch), [glyphs]);

  // Group the remaining condition glyphs by the segment they render on.
  const segmentGlyphs = useMemo(() => {
    const m = new Map<SegmentKey, ToothGlyph[]>();
    const add = (key: SegmentKey, g: ToothGlyph) => { const a = m.get(key) ?? []; a.push(g); m.set(key, a); };
    // Procedures that span the whole tooth (extraction X / missing outline /
    // implant hardware) render in a dedicated 'whole' bucket; other whole-area
    // marks (ortho, eruption, drift) draw on the crown.
    const isWholeSpan = (code: string) => /(EXTRACT|REMOVAL|AVULSION|MISSING|IMPLANT|CONGEN|LOOSE|RETAINED_ROOT)/.test(code.toUpperCase());
    for (const g of glyphs) {
      if (g.code === 'WATCH' && g.watch) continue;
      if (g.area === 'surface') continue;
      if (g.area === 'whole') add(isWholeSpan(g.code) ? 'whole' : 'crown', g);
      else if (g.area === 'crown') add('crown', g);
      else if (g.area === 'junction') add('junction', g);
      else if (g.area === 'root') {
        if (g.root) add(`root:${g.root}`, g);
        else for (const k of rootKeys) add(k, g); // all roots
      }
    }
    return m;
  }, [glyphs, rootKeys]);

  // Which segments render as selected.
  const selectedKeys = useMemo(() => {
    const s = new Set<SegmentKey>();
    if (selectedArea === 'whole') { s.add('crown'); s.add('junction'); rootKeys.forEach((k) => s.add(k)); }
    else if (selectedArea === 'crown') s.add('crown');
    else if (selectedArea === 'junction') s.add('junction');
    else if (selectedArea === 'root') {
      if (selectedRoots && selectedRoots.length) selectedRoots.forEach((r) => s.add(`root:${r}`));
      else rootKeys.forEach((k) => s.add(k));
    }
    return s;
  }, [selectedArea, selectedRoots, rootKeys]);

  const tooltips = useMemo(() => {
    const m = new Map<SegmentKey, string>();
    for (const [key, gs] of segmentGlyphs) {
      m.set(key, gs.map((g) => lookupCondition(g.code)?.label ?? g.code).join(', '));
    }
    return m;
  }, [segmentGlyphs]);

  const onSelect = (key: SegmentKey) => {
    if (key === 'crown') onSelectSegment(id, 'crown');
    else if (key === 'junction') onSelectSegment(id, 'junction');
    else if (key.startsWith('root:')) onSelectSegment(id, 'root', key.slice(5));
    else onSelectSegment(id, 'whole');
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', width, height }}>
      <ToothShape
        uid={`t${id}`}
        type={type}
        arch={arch}
        rootLabels={rootLabels}
        selectedKeys={selectedKeys}
        segmentGlyphs={segmentGlyphs}
        tooltips={tooltips}
        missing={missing}
        selColor={selColor}
        onSelect={onSelect}
        width={width}
        height={height}
      />
      {hasNote && (
        <div title="Tooth has a note" style={{ position: 'absolute', top: 2, right: 2, width: 13, height: 13, borderRadius: 3, background: '#f59e0b', color: '#fff', fontSize: 9, lineHeight: '13px', textAlign: 'center', fontWeight: 700 }}>
          ✎
        </div>
      )}

      {/* Saved Watch arrows at their stored position — click to edit/delete. */}
      {watchGlyphs.map((g, i) => (
        <div
          key={`watch-${i}`}
          role="button"
          title="Edit watch notes"
          onClick={(e) => { if (onWatchClick && !watchPlacement) { e.stopPropagation(); onWatchClick(id, g); } }}
          style={{ position: 'absolute', left: `${g.watch!.x}%`, top: `${g.watch!.y}%`, transform: 'translate(-50%,-50%)', pointerEvents: watchPlacement ? 'none' : 'auto', cursor: 'pointer', zIndex: 5 }}
        >
          <WatchArrow size={30} dir={g.watch!.dir} color={g.color} />
        </div>
      ))}

      {watchPlacement && (
        <div
          role="button"
          title="Drag the Watch arrow into position"
          onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* no-op */ } draggingRef.current = true; }}
          onPointerMove={onArrowMove}
          onPointerUp={(e) => { try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* no-op */ } draggingRef.current = false; }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', left: `${watchPlacement.x}%`, top: `${watchPlacement.y}%`, transform: 'translate(-50%,-50%)', cursor: 'move', zIndex: 6, touchAction: 'none' }}
        >
          <WatchArrow size={32} dir={watchPlacement.dir} color={selColor} />
        </div>
      )}
    </div>
  );
}

function WatchArrow({ size, dir, color = '#dc2626' }: { size: number; dir: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${DIR_ROT[dir] ?? 0}deg)`, filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.45))' }}>
      <g stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="21" x2="12" y2="4" />
        <polyline points="5,11 12,4 19,11" />
      </g>
    </svg>
  );
}
