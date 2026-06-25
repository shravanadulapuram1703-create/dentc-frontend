import type { SurfaceKey, SurfaceDef } from './toothLayout';
import { PatternDefs } from './chartGlyphs';
import { surfaceFillUrl, surfaceFillDefs, segmentFill } from './glyphFills';

interface SurfaceSelectorProps {
  id: string;
  /** Mesial surface is on the tooth's right edge (toward the midline). */
  mesialOnRight: boolean;
  /** Posterior tooth → occlusal centre; anterior → incisal. */
  posterior: boolean;
  /** Surfaces currently selected for charting. */
  selected: Set<SurfaceKey>;
  /** Charted surface conditions (code + source colour) → drives the wedge pattern. */
  surfaceGlyphs?: Map<SurfaceKey, { code: string; color: string }>;
  onToggle: (id: string, surface: SurfaceKey) => void;
  /** Active module colour (blue/green/red) for the selected surfaces. */
  selColor?: string;
  size?: number;
}

/**
 * The occlusal "surface picker" beneath/above each tooth: a circle split into a
 * center region (Occlusal / Incisal) and four outer wedges (M / D / B-F / L).
 * Clicking a region toggles it for the active charting selection.
 */
export default function SurfaceSelector({
  id,
  mesialOnRight,
  posterior,
  selected,
  surfaceGlyphs,
  onToggle,
  selColor = '#2f7ff0',
  size = 30,
}: SurfaceSelectorProps) {
  const uid = `sg${id}`;
  const fillDefs = surfaceGlyphs ? surfaceFillDefs(surfaceGlyphs.values()) : [];
  const facial: SurfaceDef = posterior ? { key: 'B', label: 'Buccal' } : { key: 'F', label: 'Facial' };
  const mesial: SurfaceDef = { key: 'M', label: 'Mesial' };
  const distal: SurfaceDef = { key: 'D', label: 'Distal' };
  const ring = {
    top: facial,
    bottom: { key: 'L', label: 'Lingual' } as SurfaceDef,
    right: mesialOnRight ? mesial : distal,
    left: mesialOnRight ? distal : mesial,
  };
  const center: SurfaceDef = posterior ? { key: 'O', label: 'Occlusal' } : { key: 'I', label: 'Incisal' };

  const fill = (key: SurfaceKey) => {
    if (selected.has(key)) return selColor;
    const g = surfaceGlyphs?.get(key);
    if (g) return surfaceFillUrl(uid, g.code, g.color) ?? g.color;
    return '#ffffff';
  };
  // Light pattern fills (dots/hatch/hound) need dark labels; solid fills need white.
  const textFill = (key: SurfaceKey) => {
    if (selected.has(key)) return '#ffffff';
    const g = surfaceGlyphs?.get(key);
    if (!g) return '#9aa3ad';
    const kind = segmentFill(g.code);
    return kind && kind !== 'solid' ? '#1f2937' : '#ffffff';
  };

  // Geometry: outer circle r=15, inner circle r=6, wedges between.
  const wedges: { key: SurfaceKey; d: string; tx: number; ty: number }[] = [
    { key: ring.top.key, d: wedgePath(225, 315), tx: 15, ty: 6.5 },
    { key: ring.right.key, d: wedgePath(315, 45), tx: 23.5, ty: 16 },
    { key: ring.bottom.key, d: wedgePath(45, 135), tx: 15, ty: 26 },
    { key: ring.left.key, d: wedgePath(135, 225), tx: 6.5, ty: 16 },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {fillDefs.length > 0 && <defs><PatternDefs uid={uid} pairs={fillDefs} /></defs>}
      <circle cx="15" cy="15" r="14.3" fill="#ffffff" stroke="#c33b3b" strokeWidth="0.8" />
      {wedges.map((w) => (
        <g key={w.key} onClick={(e) => { e.stopPropagation(); onToggle(id, w.key); }} style={{ cursor: 'pointer' }}>
          <path d={w.d} fill={fill(w.key)} stroke="#d8a3a3" strokeWidth="0.6" />
          <text x={w.tx} y={w.ty} fontSize="5.5" textAnchor="middle" dominantBaseline="middle" fill={textFill(w.key)} pointerEvents="none">
            {w.key}
          </text>
        </g>
      ))}
      <g onClick={(e) => { e.stopPropagation(); onToggle(id, center.key); }} style={{ cursor: 'pointer' }}>
        <circle cx="15" cy="15" r="5.6" fill={fill(center.key)} stroke="#d8a3a3" strokeWidth="0.6" />
        <text x="15" y="15.3" fontSize="5.5" textAnchor="middle" dominantBaseline="middle" fill={textFill(center.key)} pointerEvents="none">
          {center.key}
        </text>
      </g>
    </svg>
  );
}

// Build an annular wedge between two angles (degrees, 0 = east, clockwise) from
// inner radius 6 to outer radius 14.3 around center (15,15).
function wedgePath(a0: number, a1: number): string {
  const r0 = 6;
  const r1 = 14.3;
  const cx = 15;
  const cy = 15;
  // normalize so a1 > a0
  let end = a1;
  if (end <= a0) end += 360;
  const large = end - a0 > 180 ? 1 : 0;
  const p = (ang: number, r: number): [number, number] => {
    const rad = (ang * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x0o, y0o] = p(a0, r1);
  const [x1o, y1o] = p(end, r1);
  const [x1i, y1i] = p(end, r0);
  const [x0i, y0i] = p(a0, r0);
  return [
    `M ${x0o.toFixed(2)} ${y0o.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
    `L ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)}`,
    'Z',
  ].join(' ');
}
