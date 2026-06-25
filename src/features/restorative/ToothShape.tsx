import { useState } from 'react';
import type { Arch } from './toothLayout';
import type { ToothType } from './toothLayout';
import type { ToothGlyph } from './chartModel';
import { rgba } from './txPlanModel';
import { CrownMarks, RootMarks, WholeMarks, PatternDefs } from './chartGlyphs';
import { fillDefsFor, segmentFillUrl, isUnknownCode } from './glyphFills';

// Parametric inline vector tooth. Crown / junction / each root are grouped
// <g id> segments — individually clickable, hoverable, selectable, condition-tintable.
// Native orientation = crown at top; flipped vertically for the upper arch.

export type SegmentKey = string; // 'crown' | 'junction' | 'whole' | `root:<label>`

interface ToothShapeProps {
  uid: string;
  type: ToothType;
  arch: Arch;
  rootLabels: string[];
  /** Segment keys currently selected (blue). */
  selectedKeys: Set<SegmentKey>;
  /** Condition glyphs grouped by segment key. */
  segmentGlyphs: Map<SegmentKey, ToothGlyph[]>;
  /** Tooltip text per segment key. */
  tooltips: Map<SegmentKey, string>;
  missing: boolean;
  /** Active module colour (blue/green/red) for selection ring/fill. */
  selColor?: string;
  onSelect: (key: SegmentKey) => void;
  width?: number;
  height?: number;
}

const CROWN_PATHS: Record<ToothType, string> = {
  molar: 'M22,92 C19,62 21,30 30,26 C34,24 36,30 40,30 C44,30 46,25 50,25 C54,25 56,30 60,30 C64,30 66,24 70,26 C79,30 81,62 78,92 C64,98 36,98 22,92 Z',
  premolar: 'M27,92 C25,62 28,32 38,28 C43,26 45,31 50,31 C55,31 57,26 62,28 C72,32 75,62 73,92 C62,97 38,97 27,92 Z',
  canine: 'M30,92 C27,58 35,20 50,12 C65,20 73,58 70,92 C60,97 40,97 30,92 Z',
  incisor: 'M30,92 C28,62 30,36 33,27 L67,27 C70,36 72,62 70,92 C60,97 40,97 30,92 Z',
};

// One tapering root path centred at cx, from the cervical (topY≈96) to a tip.
function rootPath(cx: number, halfW: number, topY: number, tipY: number, tipDX = 0): string {
  const tx = cx + tipDX;
  return [
    `M ${cx - halfW},${topY}`,
    `C ${cx - halfW},${topY + (tipY - topY) * 0.55} ${tx - 3},${tipY - 8} ${tx},${tipY}`,
    `C ${tx + 3},${tipY - 8} ${cx + halfW},${topY + (tipY - topY) * 0.55} ${cx + halfW},${topY}`,
    'Z',
  ].join(' ');
}

function rootLayout(count: number): { cx: number; halfW: number; tipY: number; tipDX: number }[] {
  if (count >= 3) {
    return [
      { cx: 32, halfW: 8, tipY: 176, tipDX: -6 },
      { cx: 50, halfW: 8, tipY: 184, tipDX: 0 },
      { cx: 68, halfW: 8, tipY: 176, tipDX: 6 },
    ];
  }
  if (count === 2) {
    return [
      { cx: 38, halfW: 9, tipY: 182, tipDX: -4 },
      { cx: 62, halfW: 9, tipY: 182, tipDX: 4 },
    ];
  }
  return [{ cx: 50, halfW: 12, tipY: 186, tipDX: 0 }];
}

export default function ToothShape({
  uid, type, arch, rootLabels, selectedKeys, segmentGlyphs, tooltips, missing, selColor = '#2f7ff0', onSelect, width = 64, height = 128,
}: ToothShapeProps) {
  const [hover, setHover] = useState<SegmentKey | null>(null);
  const flip = arch === 'upper';
  const layout = rootLayout(rootLabels.length);
  const SEL_RING = selColor;
  const SEL_FILL = rgba(selColor, 0.28);
  const HOVER_FILL = rgba(selColor, 0.12);

  // A segment's fill is a *pattern/solid* only for area-filling procedures
  // (crown/bridge/restoration/denture/Class V); symbol-only codes keep the base
  // tooth fill and draw a mark on top.
  const fillFor = (key: SegmentKey, base: string): string => {
    const gs = segmentGlyphs.get(key);
    if (gs) {
      for (const g of gs) { const url = segmentFillUrl(uid, g.code, g.color); if (url) return url; }
      // Fallback: a charted code with no defined pattern/symbol fills solid in the module colour.
      for (const g of gs) if (isUnknownCode(g.code)) return g.color;
    }
    return base;
  };
  const fillPairs = fillDefsFor([...segmentGlyphs.values()].flat());

  const segProps = (key: SegmentKey) => ({
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelect(key); },
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => setHover((h) => (h === key ? null : h)),
    style: { cursor: 'pointer' as const },
  });
  const overlayStyle = (key: SegmentKey) =>
    selectedKeys.has(key) ? { fill: SEL_FILL, stroke: SEL_RING, strokeWidth: 2 }
    : hover === key ? { fill: HOVER_FILL, stroke: SEL_RING, strokeWidth: 1 }
    : { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 };

  return (
    <svg width={width} height={height} viewBox="0 0 100 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', opacity: missing ? 0.4 : 1, filter: missing ? 'grayscale(1)' : undefined }}>
      <defs>
        <linearGradient id={`${uid}-enamel`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#f1f5f8" /><stop offset="1" stopColor="#d6dde3" />
        </linearGradient>
        <linearGradient id={`${uid}-dentin`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#f6efdc" /><stop offset="1" stopColor="#dcc69b" />
        </linearGradient>
        <PatternDefs uid={uid} pairs={fillPairs} />
      </defs>

      <g id={`${uid}-tooth-whole`} transform={flip ? 'translate(0,200) scale(1,-1)' : undefined}>
        {/* Roots */}
        {layout.map((r, i) => {
          const label = rootLabels[i] ?? `${i + 1}`;
          const key = `root:${label}`;
          const d = rootPath(r.cx, r.halfW, 96, r.tipY, r.tipDX);
          return (
            <g key={key} id={`${uid}-root-${label}`} {...segProps(key)}>
              <title>{tooltips.get(key) || `Tooth root: ${label}`}</title>
              <path d={d} fill={fillFor(key, `url(#${uid}-dentin)`)} stroke="#a98a55" strokeWidth="1" />
              <RootMarks glyphs={segmentGlyphs.get(key)} cx={r.cx} tipY={r.tipY} />
              <path d={d} {...overlayStyle(key)} pointerEvents="none" />
            </g>
          );
        })}

        {/* Junction / CEJ band */}
        <g id={`${uid}-junction`} {...segProps('junction')}>
          <title>{tooltips.get('junction') || 'Cervical / neck (CEJ)'}</title>
          <path d="M24,86 C40,92 60,92 76,86 L76,98 C60,104 40,104 24,98 Z" fill={fillFor('junction', '#e7d9bf')} stroke="#c0a577" strokeWidth="0.8" />
          <path d="M24,86 C40,92 60,92 76,86 L76,98 C60,104 40,104 24,98 Z" {...overlayStyle('junction')} pointerEvents="none" />
        </g>

        {/* Crown */}
        <g id={`${uid}-crown`} {...segProps('crown')}>
          <title>{tooltips.get('crown') || 'Crown'}</title>
          <path d={CROWN_PATHS[type]} fill={fillFor('crown', `url(#${uid}-enamel)`)} stroke="#aeb6bf" strokeWidth="1" />
          <CrownMarks glyphs={segmentGlyphs.get('crown')} />
          <path d={CROWN_PATHS[type]} {...overlayStyle('crown')} pointerEvents="none" />
        </g>

        {/* Whole-tooth procedure marks (extraction X / missing outline / implant). */}
        <WholeMarks glyphs={segmentGlyphs.get('whole')} roots={layout} />
      </g>
    </svg>
  );
}

