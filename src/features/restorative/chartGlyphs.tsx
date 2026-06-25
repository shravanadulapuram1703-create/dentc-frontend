import type { ToothGlyph } from './chartModel';
import { norm, hex, type FillKind } from './glyphFills';

// SVG render components shared by the chart (ToothShape), the surface wheel
// (SurfaceSelector) and the legend (legendCatalog). Pure fill logic lives in
// ./glyphFills; the legend data lives in ./legendCatalog.
//
// Colour is by SOURCE (blue = pre-existing, green = completed, red = tx-plan);
// the pattern/symbol is by procedure type (cross-hatch bridge, houndstooth gold
// crown, polka-dot restoration, root-canal lines, implant hardware, …).

/** SVG <pattern> definitions for the cross-hatch / houndstooth / polka-dot fills. */
export function PatternDefs({ uid, pairs }: { uid: string; pairs: { kind: FillKind; color: string }[] }) {
  return (
    <>
      {pairs.map(({ kind, color }) => {
        const id = `${uid}-${kind}-${hex(color)}`;
        if (kind === 'hatch') {
          // Diagonal cross-hatch lattice (bridge): X's tile into a diamond mesh.
          return (
            <pattern key={id} id={id} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={color} opacity="0.1" />
              <path d="M0,0 L8,8 M8,0 L0,8" stroke={color} strokeWidth="1.4" />
            </pattern>
          );
        }
        if (kind === 'hound') {
          // Authentic houndstooth (dogtooth): a 2×2 checker with diagonal barbs.
          // Foreground = two squares + two triangles; tiles into the broken-check weave.
          return (
            <pattern key={id} id={id} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={color} opacity="0.1" />
              <path d="M0,0 H4 V4 H0 Z M4,4 H8 V8 H4 Z M4,0 L8,4 L8,0 Z M0,4 L4,8 L0,8 Z" fill={color} opacity="0.85" />
            </pattern>
          );
        }
        if (kind === 'vert') {
          return (
            <pattern key={id} id={id} width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={color} opacity="0.1" />
              <line x1="3" y1="0" x2="3" y2="6" stroke={color} strokeWidth="2.4" />
            </pattern>
          );
        }
        if (kind === 'horiz') {
          return (
            <pattern key={id} id={id} width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={color} opacity="0.1" />
              <line x1="0" y1="3" x2="6" y2="3" stroke={color} strokeWidth="2.4" />
            </pattern>
          );
        }
        if (kind === 'diag') {
          // Single-direction diagonal stripes (tile edges align into parallel lines).
          return (
            <pattern key={id} id={id} width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill={color} opacity="0.1" />
              <path d="M0,7 L7,0 M-1,1 L1,-1 M6,8 L8,6" stroke={color} strokeWidth="2" />
            </pattern>
          );
        }
        if (kind === 'checker') {
          return (
            <pattern key={id} id={id} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={color} opacity="0.1" />
              <path d="M0,0 H4 V4 H0 Z M4,4 H8 V8 H4 Z" fill={color} opacity="0.8" />
            </pattern>
          );
        }
        // dots — polka-dot (composite / restoration filling)
        return (
          <pattern key={id} id={id} width="7" height="7" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill={color} opacity="0.1" />
            <circle cx="3.5" cy="3.5" r="1.8" fill={color} opacity="0.85" />
          </pattern>
        );
      })}
    </>
  );
}

// ---- Symbol marks (drawn on top of the tooth fills) -----------------------
// Geometry is in the ToothShape viewBox (0 0 100 200): crown ≈ y25–92, centre
// (50,58); junction ≈ y86–104; roots top ≈96; whole tooth spans the full box.

/** Crown-area symbol marks (decay, fracture, abrasion, eruption, ortho, …). */
export function CrownMarks({ glyphs }: { glyphs?: ToothGlyph[] }) {
  if (!glyphs?.length) return null;
  return (
    <>
      {glyphs.map((g, i) => {
        const c = norm(g.code);
        const col = g.color;
        // Lettered markers (legacy circled glyphs).
        if (/HYPOPLASIA/.test(c)) return <Letter key={i} ch="H" color={col} />;
        if (/GEMINATION/.test(c)) return <Letter key={i} ch="G" color={col} />;
        if (/FUSED|FUSION/.test(c)) return <Letter key={i} ch="F" color={col} />;
        // Decay family (pre-eruptive / recurrent before generic decay).
        if (/PRE_ERUPTIVE/.test(c)) return <ellipse key={i} cx={50} cy={58} rx={15} ry={10} fill={col} opacity="0.8" />;
        if (/RECURRENT_DECAY/.test(c)) return <g key={i}><circle cx={50} cy={58} r="11" fill={col} opacity="0.9" /><circle cx={50} cy={58} r="11" fill="none" stroke={col} strokeWidth="1.5" strokeDasharray="3 2" /></g>;
        if (/INCIPIENT_DECAY/.test(c)) return <circle key={i} cx={50} cy={58} r="6" fill={col} />;
        if (/DECAY|CARIES/.test(c)) return <circle key={i} cx={50} cy={58} r="11" fill={col} opacity="0.9" />;
        // Surface defects.
        if (/(CHIP|CRACK|FRACTURE|BROKEN)/.test(c)) return <polyline key={i} points="44,30 52,50 44,60 56,82" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />;
        if (/(ABRASION|EROSION|BRUXISM)/.test(c)) return <ellipse key={i} cx={50} cy={84} rx={18} ry={6} fill={col} opacity="0.6" />;
        if (/LESION/.test(c)) return <ellipse key={i} cx={50} cy={60} rx={16} ry={9} fill={col} opacity="0.55" />;
        if (/FLUOROSIS/.test(c)) return <g key={i} fill={col}><circle cx={42} cy={48} r="2.5" /><circle cx={55} cy={44} r="2.5" /><circle cx={48} cy={62} r="2.5" /><circle cx={60} cy={60} r="2.5" /><circle cx={40} cy={70} r="2.5" /></g>;
        if (/DEMINERAL/.test(c)) return <g key={i} fill="none" stroke={col} strokeWidth="2"><circle cx={44} cy={54} r="6" /><circle cx={59} cy={66} r="4" /></g>;
        if (/HYPOCALC/.test(c)) return <circle key={i} cx={50} cy={52} r="7" fill={col} opacity="0.7" />;
        if (/DISCOLOR/.test(c)) return <rect key={i} x={32} y={36} width={36} height={44} rx={8} fill={col} opacity="0.4" />;
        if (/STAIN/.test(c)) return <path key={i} d="M36,52 Q50,44 64,52 Q58,70 50,70 Q42,70 36,52 Z" fill={col} opacity="0.6" />;
        if (/CONCUSSION/.test(c)) return <circle key={i} cx={50} cy={58} r="10" fill={col} opacity="0.5" />;
        if (/TRAUMA/.test(c)) return <g key={i} fill="none" stroke={col} strokeWidth="2"><path d="M30,58 Q50,44 70,58 Q50,72 30,58 Z" /><circle cx={50} cy={58} r="3.5" fill={col} /></g>;
        if (/PINS/.test(c)) return <g key={i} stroke={col} strokeWidth="3" strokeLinecap="round"><line x1={42} y1={48} x2={42} y2={72} /><line x1={58} y1={48} x2={58} y2={72} /></g>;
        // Eruption / position.
        if (/PARTIALLY_ERUPT/.test(c)) return <polyline key={i} points="34,72 42,52 50,66 58,52 66,72" fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
        if (/ANKYLOSIS/.test(c)) return <path key={i} d="M44,80 V54 H36 L50,34 L64,54 H56 V80 Z" fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" />;
        if (/ECTOPIC/.test(c)) return <g key={i} stroke={col} strokeWidth="3" fill="none" strokeLinecap="round"><polyline points="58,40 44,52 58,64" /><polyline points="66,54 52,66 66,78" /></g>;
        if (/ROTATED/.test(c)) return <RotArrow key={i} color={col} cw={/DISTAL/.test(c)} />;
        if (/PERICORONITIS/.test(c)) return <rect key={i} x={28} y={30} width={44} height={40} rx={14} fill="none" stroke={col} strokeWidth="3" />;
        if (/OPEN_MARGIN_MESIAL/.test(c)) return <path key={i} d="M64,48 L76,58 L64,68 Z" fill="none" stroke={col} strokeWidth="2.5" />;
        if (/OPEN_MARGIN_DISTAL/.test(c)) return <path key={i} d="M36,48 L24,58 L36,68 Z" fill="none" stroke={col} strokeWidth="2.5" />;
        if (/(ORTHO|BRACES|SPLINT|SPACER)/.test(c)) return <g key={i} stroke={col} strokeWidth="2.5" fill="none"><rect x={42} y={50} width={16} height={14} rx={2} /><line x1={30} y1={57} x2={70} y2={57} /></g>;
        if (/(INTRUSION|SUPER_ERUPT)/.test(c)) return <Arrow key={i} dir="down" color={col} />;
        if (/(DRIFT_DISTAL|IMPACTED_DISTAL)/.test(c)) return <ArrowH key={i} dir="r" color={col} />;
        if (/(DRIFT_MESIAL|IMPACTED_MESIAL)/.test(c)) return <ArrowH key={i} dir="l" color={col} />;
        if (/(SUB_ERUPT|ERUPTED|IMPACT|DRIFT|TIPPED)/.test(c)) return <Arrow key={i} dir="up" color={col} />;
        return null;
      })}
    </>
  );
}

/** Root-area symbol marks (root canal, gutta-percha, abscess, infection, …). */
export function RootMarks({ glyphs, cx, tipY }: { glyphs?: ToothGlyph[]; cx: number; tipY: number }) {
  if (!glyphs?.length) return null;
  return (
    <>
      {glyphs.map((g, i) => {
        const c = norm(g.code);
        if (/GUTTA/.test(c)) return <line key={i} x1={cx} y1={100} x2={cx} y2={tipY - 4} stroke={g.color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 3" />;
        if (/(RCT|ROOT_CANAL|ENDO)/.test(c)) return <line key={i} x1={cx} y1={100} x2={cx} y2={tipY - 4} stroke={g.color} strokeWidth="3.5" strokeLinecap="round" />;
        if (/INFECTION/.test(c)) return <g key={i}><line x1={cx} y1={100} x2={cx} y2={tipY - 6} stroke={g.color} strokeWidth="3.5" strokeLinecap="round" /><circle cx={cx} cy={tipY - 2} r="6" fill="none" stroke={g.color} strokeWidth="2.5" /></g>;
        if (/PARL/.test(c)) return <circle key={i} cx={cx} cy={tipY - 2} r="7" fill={g.color} />;
        if (/(ABSCESS|PERIAPICAL)/.test(c)) return <circle key={i} cx={cx} cy={tipY - 2} r="7" fill="none" stroke={g.color} strokeWidth="3" />;
        if (/FISTULA/.test(c)) return <ellipse key={i} cx={cx} cy={tipY + 2} rx="7" ry="4" fill={g.color} />;
        if (/APICO/.test(c)) return <line key={i} x1={cx - 8} y1={tipY - 6} x2={cx + 8} y2={tipY - 6} stroke={g.color} strokeWidth="3" />;
        if (/RESORPTION_INTERNAL/.test(c)) return <path key={i} d={`M${cx - 8},135 Q${cx},126 ${cx + 8},135 Q${cx},144 ${cx - 8},135 Z`} fill={g.color} opacity="0.85" />;
        if (/RESORPTION/.test(c)) return <path key={i} d={`M${cx - 8},135 Q${cx},126 ${cx + 8},135 Q${cx},144 ${cx - 8},135 Z`} fill="none" stroke={g.color} strokeWidth="2" />;
        if (/(ROOT_FRACTURE|FRACTURE)/.test(c)) return <polyline key={i} points={`${cx},104 ${cx - 5},120 ${cx + 4},134 ${cx - 3},150`} fill="none" stroke="#111" strokeWidth="2.5" />;
        if (/(ROOT_TIP|TIP)/.test(c)) return <circle key={i} cx={cx} cy={tipY - 6} r="5" fill={g.color} />;
        if (/PULP_STONE/.test(c)) return <circle key={i} cx={cx} cy={130} r="3.5" fill={g.color} />;
        if (/PIN/.test(c)) return <line key={i} x1={cx} y1={104} x2={cx} y2={tipY - 20} stroke={g.color} strokeWidth="2.5" strokeDasharray="4 2" />;
        return null;
      })}
    </>
  );
}

/** Whole-tooth symbol marks (extraction, missing, implant hardware). */
export function WholeMarks({ glyphs, roots }: { glyphs?: ToothGlyph[]; roots: { cx: number; tipY: number }[] }) {
  if (!glyphs?.length) return null;
  const mid = roots.length ? roots[Math.floor(roots.length / 2)]! : { cx: 50, tipY: 186 };
  return (
    <>
      {glyphs.map((g, i) => {
        const c = norm(g.code);
        if (/(EXTRACT|REMOVAL|AVULSION)/.test(c)) return <g key={i} stroke={g.color} strokeWidth="4" strokeLinecap="round"><line x1={26} y1={32} x2={74} y2={180} /><line x1={74} y1={32} x2={26} y2={180} /></g>;
        if (/CONGEN/.test(c)) return <rect key={i} x={18} y={22} width={64} height={166} rx={26} fill="none" stroke={g.color} strokeWidth="3" />;
        if (/LOOSE/.test(c)) return <g key={i} stroke={g.color} strokeWidth="3.5" strokeLinecap="round"><line x1={16} y1={30} x2={16} y2={182} /><line x1={84} y1={30} x2={84} y2={182} /></g>;
        if (/RETAINED_ROOT/.test(c)) return <g key={i} stroke={g.color} strokeWidth="2.5" fill="none" strokeDasharray="4 3"><path d="M22,92 C19,40 30,26 50,26 C70,26 81,40 78,92 C60,98 40,98 22,92 Z" /></g>;
        if (/MISSING/.test(c)) return <g key={i} stroke={g.color} strokeWidth="2.5" fill="none" strokeDasharray="4 3"><path d="M22,92 C19,40 30,26 50,26 C70,26 81,40 78,92 C60,98 40,98 22,92 Z" /></g>;
        if (/IMPLANT/.test(c)) return <Implant key={i} cx={mid.cx} color={g.color} />;
        return null;
      })}
    </>
  );
}

function Implant({ cx, color }: { cx: number; color: string }) {
  // Threaded post: a tapering screw body with horizontal thread rungs (root zone).
  const rungs = [118, 130, 142, 154, 166];
  return (
    <g stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round">
      <path d={`M${cx - 9},108 L${cx + 9},108 L${cx + 4},176 L${cx - 4},176 Z`} />
      {rungs.map((y, i) => { const t = (y - 108) / 70; const w = 9 - 5 * t; return <line key={i} x1={cx - w} y1={y} x2={cx + w} y2={y} />; })}
    </g>
  );
}

function Arrow({ dir, color }: { dir: 'up' | 'down'; color: string }) {
  return dir === 'up'
    ? <g stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"><line x1={50} y1={72} x2={50} y2={40} /><polyline points="42,48 50,38 58,48" /></g>
    : <g stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"><line x1={50} y1={40} x2={50} y2={72} /><polyline points="42,64 50,74 58,64" /></g>;
}

function ArrowH({ dir, color }: { dir: 'l' | 'r'; color: string }) {
  return dir === 'r'
    ? <g stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"><line x1={34} y1={58} x2={66} y2={58} /><polyline points="58,49 68,58 58,67" /></g>
    : <g stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"><line x1={66} y1={58} x2={34} y2={58} /><polyline points="42,49 32,58 42,67" /></g>;
}

function Letter({ ch, color }: { ch: string; color: string }) {
  return <g><circle cx={50} cy={58} r="15" fill="none" stroke={color} strokeWidth="2.5" /><text x={50} y={66} fontSize="22" fontWeight="700" textAnchor="middle" fill={color}>{ch}</text></g>;
}

function RotArrow({ color, cw }: { color: string; cw: boolean }) {
  return cw
    ? <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M36,44 A16 16 0 1 1 34,60" /><polyline points="36,36 36,46 46,46" /></g>
    : <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M64,44 A16 16 0 1 0 66,60" /><polyline points="64,36 64,46 54,46" /></g>;
}
