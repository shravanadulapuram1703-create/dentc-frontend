import type { Arch } from './toothLayout';
import { CERVICAL_FRACTION } from './toothAssets';
import type { ToothArea } from './types';
import type { ToothGlyph } from './chartModel';

interface ToothFigureProps {
  id: string;
  assetSrc: string;
  arch: Arch;
  /** Which zone of THIS tooth is currently selected (if any). */
  selectedArea: ToothArea | null;
  glyphs: ToothGlyph[];
  /** Whole-tooth missing → fade the figure. */
  missing: boolean;
  hasNote?: boolean;
  /** Hover summary (legacy hover-to-reveal). */
  summary?: string;
  onSelectZone: (id: string, area: ToothArea) => void;
  width?: number;
  height?: number;
}

const SEL = 'rgba(47,127,240,0.30)';
const SEL_RING = '#2f7ff0';

/**
 * A single tooth rendered from the anatomical asset, with the four legacy click
 * zones (whole-tooth / crown / root + the separate surface selector) and
 * condition graphic overlays.
 */
export default function ToothFigure({
  id,
  assetSrc,
  arch,
  selectedArea,
  glyphs,
  missing,
  hasNote = false,
  summary,
  onSelectZone,
  width = 50,
  height = 100,
}: ToothFigureProps) {
  const flip = arch === 'upper';
  const crownPct = CERVICAL_FRACTION * 100;
  const crownStyle = flip ? { bottom: 4, height: `${crownPct}%` } : { top: 4, height: `${crownPct}%` };
  const rootStyle = flip ? { top: 4, height: `${100 - crownPct}%` } : { bottom: 4, height: `${100 - crownPct}%` };
  const wholeSelected = selectedArea === 'whole';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectZone(id, 'whole')}
      title={summary || `Tooth ${id} — click for whole-tooth`}
      style={{
        position: 'relative',
        width,
        height,
        cursor: 'pointer',
        borderRadius: 6,
        outline: wholeSelected ? `2px solid ${SEL_RING}` : '2px solid transparent',
        background: wholeSelected ? SEL : 'transparent',
        opacity: missing ? 0.4 : 1,
        filter: missing ? 'grayscale(1)' : undefined,
      }}
    >
      <img
        src={assetSrc}
        alt={`Tooth ${id}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', transform: flip ? 'scaleY(-1)' : undefined }}
      />

      <Zone label={`Tooth ${id} crown`} selected={selectedArea === 'crown'} style={crownStyle} onClick={(e) => { e.stopPropagation(); onSelectZone(id, 'crown'); }} />
      <Zone label={`Tooth ${id} root`} selected={selectedArea === 'root'} style={rootStyle} onClick={(e) => { e.stopPropagation(); onSelectZone(id, 'root'); }} />

      {glyphs.length > 0 && (
        <svg viewBox="0 0 100 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: flip ? 'scaleY(-1)' : undefined }}>
          {glyphs.map((g, i) => (
            <ConditionGlyph key={`${g.code}-${i}`} glyph={g} flip={flip} />
          ))}
        </svg>
      )}

      {hasNote && (
        <div title="Tooth has a note" style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 3, background: '#f59e0b', color: '#fff', fontSize: 9, lineHeight: '12px', textAlign: 'center', fontWeight: 700 }}>
          ✎
        </div>
      )}
    </div>
  );
}

function Zone({ label, selected, style, onClick }: { label: string; selected: boolean; style: React.CSSProperties; onClick: (e: React.MouseEvent) => void; }) {
  return (
    <div
      role="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ position: 'absolute', left: 4, right: 4, borderRadius: 5, cursor: 'pointer', background: selected ? SEL : 'transparent', outline: selected ? `2px solid ${SEL_RING}` : 'none', ...style }}
    />
  );
}

const CROWN = { x: 50, y: 56 };
const ROOT = { x: 50, y: 158 };

function ConditionGlyph({ glyph, flip }: { glyph: ToothGlyph; flip: boolean }) {
  const { area, code, color, drawable, pattern, sub, watch } = glyph;
  if (!drawable && !watch) return null;
  const at = area === 'root' ? ROOT : area === 'whole' ? { x: 50, y: 96 } : CROWN;
  const c = code.toUpperCase();

  // Watch — directional arrow at the stored anchor (saved = red).
  if (c === 'WATCH' && watch) {
    const px = (watch.x / 100) * 100;
    const py = (watch.y / 100) * 200;
    const ang = DIR_ANGLE[watch.dir] ?? 0;
    return (
      <g transform={`translate(${px} ${py}) rotate(${flip ? -ang : ang})`}>
        <g stroke="#d23b3b" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="0" y1="16" x2="0" y2="-16" />
          <polyline points="-9,-7 0,-16 9,-7" />
        </g>
      </g>
    );
  }

  // Crown / bridge units — material-coloured cap over the crown.
  if (/(CROWN|THREE_QUARTER|BRIDGE_PILLAR|BRIDGE_PONTIC)/.test(c)) {
    const isPontic = c.includes('PONTIC');
    return (
      <g>
        <path d="M24 84 C24 50 28 30 50 30 C72 30 76 50 76 84 C64 90 36 90 24 84 Z" fill={color} opacity={isPontic ? 0.55 : 0.8} stroke={isPontic ? '#9a7b1f' : '#7a6212'} strokeWidth="2" strokeDasharray={c.includes('NEEDED') || c.includes('REPLACE') ? '5 3' : undefined} />
        {pattern && <path d="M30 50 H70 M30 62 H70 M30 74 H70" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />}
      </g>
    );
  }
  if (c === 'FILLING') {
    return <rect x={38} y={48} width={24} height={22} rx={4} fill={color} opacity="0.85" stroke="#1f2937" strokeWidth="1" />;
  }
  if (/(DECAY|CARIES)/.test(c)) {
    return <circle cx={at.x} cy={at.y} r="11" fill="#111" opacity="0.85" />;
  }
  if (c.includes('ABSCESS')) {
    return <circle cx={ROOT.x} cy={172} r="9" fill="none" stroke={color} strokeWidth="3" />;
  }
  if (/(RCT|ROOT.?CANAL|INFECTION)/.test(c)) {
    return <line x1={ROOT.x} y1={96} x2={ROOT.x} y2={178} stroke={color} strokeWidth="4" strokeLinecap="round" />;
  }
  if (c.includes('APICO')) {
    return (
      <g stroke={color} strokeWidth="2.5">
        <line x1={40} y1={170} x2={60} y2={170} />
        <line x1={50} y1={160} x2={50} y2={180} />
      </g>
    );
  }
  if (c.includes('ROOT_TIP') || c === 'ROOTTIP') {
    return <circle cx={ROOT.x} cy={176} r="6" fill={color} />;
  }
  // Missing (+ unerupted = dashed outline only; supernumerary handled in Arch).
  if (c.includes('MISSING')) {
    const unerupted = sub === 'unerupted';
    return (
      <g stroke="#7a7a7a" strokeWidth="2.5" fill="none" strokeDasharray="4 3">
        <rect x={26} y={28} width={48} height={56} rx={10} />
        {!unerupted && (
          <>
            <line x1={30} y1={32} x2={70} y2={80} strokeDasharray="0" />
            <line x1={70} y1={32} x2={30} y2={80} strokeDasharray="0" />
          </>
        )}
      </g>
    );
  }
  if (/(CRACK|CHIP|FRACTURE)/.test(c)) {
    return <polyline points="42,30 52,48 44,58 56,78" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />;
  }
  if (/(ABRASION|EROSION|LESION)/.test(c)) {
    return <ellipse cx={50} cy={82} rx={20} ry={7} fill={color} opacity="0.6" />;
  }
  if (/(DRIFT|TIP|IMPACT|ERUPT)/.test(c)) {
    const left = c.includes('MESIAL') || c.includes('FACIAL');
    const dir = left ? -1 : 1;
    return (
      <g stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1={50 - dir * 18} y1={56} x2={50 + dir * 18} y2={56} />
        <polyline points={`${50 + dir * 8},46 ${50 + dir * 18},56 ${50 + dir * 8},66`} />
      </g>
    );
  }
  if (/(SPLINT|BRIDGE|SPACER|DENTURE)/.test(c)) {
    return <rect x={20} y={86} width={60} height={8} rx={3} fill={color} opacity="0.8" />;
  }
  if (c.includes('BRACE')) {
    return (
      <g fill="none" stroke={color} strokeWidth="3">
        <rect x={40} y={48} width={20} height={14} rx={2} />
        <line x1={26} y1={55} x2={74} y2={55} />
      </g>
    );
  }
  if (c.includes('IMPLANT')) {
    return (
      <g stroke={color} strokeWidth="3">
        <line x1={50} y1={96} x2={50} y2={176} />
        <line x1={40} y1={120} x2={60} y2={120} />
        <line x1={40} y1={140} x2={60} y2={140} />
        <line x1={40} y1={160} x2={60} y2={160} />
      </g>
    );
  }
  return <circle cx={at.x} cy={at.y} r="8" fill={color} opacity="0.85" />;
}

const DIR_ANGLE: Record<string, number> = {
  n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315,
};
