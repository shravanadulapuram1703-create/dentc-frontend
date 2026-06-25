import type { ChartTab, PaletteItem } from './types';

interface ConditionPaletteProps {
  tab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
  onApply: (item: PaletteItem) => void;
  disabled: boolean;
  /** Currently-selected tooth area (gates per-area button activation). */
  selectionArea: import('./types').ToothArea | null;
  /** True when a full arch (all upper or all lower teeth) is selected. */
  isArchSelection: boolean;
}

// Catalogs per the reference palettes. On Completed / Tx Plans every tool opens
// the ADA-code pop-out (the label seeds the code search).
// `areas` gates which selected tooth-area activates each tool (per the legend +
// the CEJ/junction mapping: Decay, Defective, Class V, Conditions).
// Corrected per-area activation:
//   Whole  → Bridge / Denture / Missing / Impacted / Erupted / Watch / Conditions
//   Surface→ Decay / Defective / Restoration / Missing / Conditions
//   Crown  → Decay / Defective / Crown / Bridge / Missing / Conditions
//   Class V(junction) → Decay / Defective / Class V / Conditions
//   Roots  → Infection / Defective / Root Canal / Conditions
const PRE_EXISTING: PaletteItem[] = [
  { id: 'decay', label: 'Decay', condition_code: 'DECAY', chart_as: 'pre-existing', areas: ['surface', 'crown', 'junction'] },
  { id: 'defective', label: 'Defective', condition_code: 'DEFECTIVE', chart_as: 'pre-existing', areas: ['surface', 'crown', 'junction', 'root'] },
  { id: 'restoration', label: 'Restoration', condition_code: 'RESTORATION', chart_as: 'pre-existing', areas: ['surface'] },
  { id: 'crown', label: 'Crown', condition_code: 'CROWN', chart_as: 'pre-existing', areas: ['crown'] },
  { id: 'class-v', label: 'Class V', condition_code: 'CLASS_V', chart_as: 'pre-existing', areas: ['junction'] },
  { id: 'infection', label: 'Infection', condition_code: 'INFECTION', chart_as: 'pre-existing', areas: ['root'] },
  { id: 'root-canal', label: 'Root Canal', condition_code: 'RCT', chart_as: 'pre-existing', areas: ['root'] },
  { id: 'bridge', label: 'Bridge', condition_code: 'BRIDGE', chart_as: 'pre-existing', areas: ['whole', 'crown'] },
  { id: 'denture', label: 'Denture', condition_code: 'DENTURE', chart_as: 'pre-existing', areas: ['whole'], requiresArch: true },
  { id: 'missing', label: 'Missing', condition_code: 'MISSING', chart_as: 'pre-existing', areas: ['whole', 'surface', 'crown'] },
  { id: 'impacted', label: 'Impacted', condition_code: 'IMPACTED', chart_as: 'pre-existing', areas: ['whole'] },
  { id: 'erupted', label: 'Erupted', condition_code: 'ERUPTED', chart_as: 'pre-existing', areas: ['whole'] },
  { id: 'watch', label: 'Watch', condition_code: 'WATCH', chart_as: 'pre-existing', areas: ['whole'] },
  { id: 'conditions', label: 'Conditions', action: 'open-conditions', areas: ['whole', 'surface', 'crown', 'junction', 'root'] },
  { id: 'legend', label: 'Legend', action: 'open-legend' },
];

// Completed / Tx Plans tools. Each button is gated by the selected tooth-area
// (and, for Denture, a full-arch selection) per the charting rules:
//   Surface              → Restoration / Extraction (removal)
//   Crown                → Crown / Bridge
//   Roots                → Root Canal
//   Class V (junction)   → Class V        (Tx Plans: + Select Explosion Code)
//   Whole / entire tooth → Bridge / Extraction / Implant / Ortho
//   Full arch (▲/▼)      → Bridge / Extraction / Denture / Ortho  (whole + arch)
// (Tx Plans also exposes "Select Explosion Code", which is always active.)
const GTP_TOOLS = (prefix: string): PaletteItem[] => [
  { id: `${prefix}-restoration`, label: 'Restoration', condition_code: 'RESTORATION', areas: ['surface'] },
  { id: `${prefix}-crown`, label: 'Crown', condition_code: 'CROWN', areas: ['crown'] },
  { id: `${prefix}-root-canal`, label: 'Root Canal', condition_code: 'RCT', areas: ['root'] },
  { id: `${prefix}-class-v`, label: 'Class V', condition_code: 'CLASS_V', areas: ['junction'] },
  { id: `${prefix}-bridge`, label: 'Bridge', condition_code: 'BRIDGE', areas: ['whole', 'crown'] },
  { id: `${prefix}-implant`, label: 'Implant', condition_code: 'IMPLANT', areas: ['whole'] },
  { id: `${prefix}-ext`, label: 'Extraction', condition_code: 'EXTRACTION', areas: ['surface', 'whole'] },
  { id: `${prefix}-denture`, label: 'Denture', condition_code: 'DENTURE', areas: ['whole'], requiresArch: true },
  { id: `${prefix}-ortho`, label: 'Ortho', condition_code: 'ORTHO', areas: ['whole'] },
];

const COMPLETED: PaletteItem[] = GTP_TOOLS('c');
const TX_PLANS: PaletteItem[] = [
  ...GTP_TOOLS('tp'),
  { id: 'tp-explosion', label: 'Select Explosion Code', action: 'open-explosion' },
];

const CATALOGS: Record<ChartTab, PaletteItem[]> = {
  'pre-existing': PRE_EXISTING,
  completed: COMPLETED,
  'tx-plans': TX_PLANS,
};

const TABS: { key: ChartTab; label: string }[] = [
  { key: 'pre-existing', label: 'Pre-existing' },
  { key: 'completed', label: 'Completed' },
  { key: 'tx-plans', label: 'TxPlans' },
];

// Consistent colour coding: blue = pre-existing, green = completed, red = tx-plan.
const PANEL: Record<ChartTab, { bg: string; text: string }> = {
  'pre-existing': { bg: '#1e40c8', text: '#1d4ed8' },
  completed: { bg: '#157a3a', text: '#15803d' },
  'tx-plans': { bg: '#b91c1c', text: '#b91c1c' },
};

export default function ConditionPalette({ tab, onTabChange, onApply, disabled, selectionArea, isArchSelection }: ConditionPaletteProps) {
  const items = CATALOGS[tab];
  const panel = PANEL[tab];
  const twoCol = tab === 'pre-existing';

  return (
    <div className="flex h-full flex-col" style={{ background: panel.bg }}>
      {/* Tabs */}
      <div className="flex bg-slate-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className="flex-1 py-2 text-xs font-semibold"
            style={{
              background: tab === t.key ? '#ffffff' : 'transparent',
              color: tab === t.key ? PANEL[t.key].text : '#64748b',
              borderBottom: tab === t.key ? `2px solid ${PANEL[t.key].text}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool grid */}
      <div className={`grid flex-1 ${twoCol ? 'grid-cols-2' : 'grid-cols-1'} content-start gap-2 p-3`}>
        {items.map((item) => {
          const isLegend = item.action === 'open-legend';
          const isExplosion = item.action === 'open-explosion';
          // Active when the selected area matches the tool's `areas` (or it has none),
          // and — for arch-only tools (Denture) — when a full arch is selected.
          const areaOk = !item.areas || (selectionArea != null && item.areas.includes(selectionArea));
          const archOk = !item.requiresArch || isArchSelection;
          const btnDisabled = isLegend ? false : isExplosion ? false : disabled || !areaOk || !archOk;
          return (
            <button
              key={item.id}
              onClick={() => onApply(item)}
              disabled={btnDisabled}
              title={isLegend ? item.label : disabled ? 'Select a tooth area first' : item.requiresArch && !isArchSelection ? 'Select a full arch (▲/▼) first' : !areaOk ? `Not available for the selected ${selectionArea} area` : `Apply ${item.label}`}
              className="flex items-center gap-2 rounded bg-white px-3 py-2.5 text-xs font-semibold shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: isExplosion ? panel.text : '#475569' }}
            >
              <ToolIcon />
              <span className="truncate" style={{ color: isExplosion ? panel.text : '#475569' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Monochrome tooth glyph stand-in for the legacy raster icons.
function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 3c2 0 2 1 4 1s2-1 4-1c1.5 0 2 1.5 2 4 0 3-1 5-2 5s-1-3-2-3-1 4-2 4-1-4-2-4-1 3-2 3-2-2-2-5c0-2.5.5-4 2-4z" fill="#94a3b8" />
    </svg>
  );
}
