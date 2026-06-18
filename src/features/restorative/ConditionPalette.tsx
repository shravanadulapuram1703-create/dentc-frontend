import type { ChartTab, PaletteItem } from './types';

interface ConditionPaletteProps {
  tab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
  onApply: (item: PaletteItem) => void;
  disabled: boolean;
}

// Tool catalogs per tab. Codes are the legacy restorative condition codes the
// backend stores in ChartCondition.condition_code / chart_as.
const PRE_EXISTING: PaletteItem[] = [
  { id: 'infection', label: 'Infection', condition_code: 'INFECTION', chart_as: 'pre-existing' },
  { id: 'defective', label: 'Defective', condition_code: 'DEFECTIVE', chart_as: 'pre-existing' },
  { id: 'root-canal', label: 'Root Canal', condition_code: 'RCT', chart_as: 'pre-existing' },
  { id: 'bridge', label: 'Bridge', condition_code: 'BRIDGE', chart_as: 'pre-existing' },
  { id: 'implant', label: 'Implant', condition_code: 'IMPLANT', chart_as: 'pre-existing' },
  { id: 'denture', label: 'Denture', condition_code: 'DENTURE', chart_as: 'pre-existing' },
  { id: 'missing', label: 'Missing', condition_code: 'MISSING', chart_as: 'pre-existing' },
  { id: 'impacted', label: 'Impacted', condition_code: 'IMPACTED', chart_as: 'pre-existing' },
  { id: 'erupted', label: 'Erupted', condition_code: 'ERUPTED', chart_as: 'pre-existing' },
  { id: 'watch', label: 'Watch', condition_code: 'WATCH', chart_as: 'pre-existing' },
  { id: 'conditions', label: 'Conditions', action: 'open-conditions' },
  { id: 'legend', label: 'Legend', action: 'open-legend' },
];

// Completed / Tx Plans: on these tabs every tool opens the ADA-code pop-out
// (the label seeds the code search). "ADA Codes" opens it unfiltered.
const GTP_TOOLS = (prefix: string): PaletteItem[] => [
  { id: `${prefix}-restoration`, label: 'Restoration', condition_code: 'RESTORATION' },
  { id: `${prefix}-crown`, label: 'Crown', condition_code: 'CROWN' },
  { id: `${prefix}-bridge`, label: 'Bridge', condition_code: 'BRIDGE' },
  { id: `${prefix}-rct`, label: 'Root Canal', condition_code: 'RCT' },
  { id: `${prefix}-ext`, label: 'Extraction', condition_code: 'EXTRACTION' },
  { id: `${prefix}-implant`, label: 'Implant', condition_code: 'IMPLANT' },
  { id: `${prefix}-post`, label: 'Implant Post', condition_code: 'IMPLANT_POST' },
  { id: `${prefix}-abutment`, label: 'Custom Abutment', condition_code: 'ABUTMENT' },
  { id: `${prefix}-impcrown`, label: 'Implant Crown', condition_code: 'IMPLANT_CROWN' },
  { id: `${prefix}-sealant`, label: 'Sealant', condition_code: 'SEALANT' },
  { id: `${prefix}-ada`, label: 'ADA Codes', condition_code: 'ADA' },
  { id: `${prefix}-legend`, label: 'Legend', action: 'open-legend' },
];

const COMPLETED: PaletteItem[] = GTP_TOOLS('c');
const TX_PLANS: PaletteItem[] = GTP_TOOLS('tp');

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

export default function ConditionPalette({ tab, onTabChange, onApply, disabled }: ConditionPaletteProps) {
  const items = CATALOGS[tab];

  return (
    <div className="flex h-full flex-col" style={{ background: 'linear-gradient(180deg,#1f5fa8,#15406f)' }}>
      {/* Tabs */}
      <div className="flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className="flex-1 py-2 text-xs font-semibold"
            style={{
              background: tab === t.key ? '#ffffff' : 'transparent',
              color: tab === t.key ? '#15406f' : '#cfe0f2',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool grid */}
      <div className="grid flex-1 grid-cols-2 content-start gap-2 p-3">
        {items.map((item) => {
          const isAction = !!item.action;
          return (
            <button
              key={item.id}
              onClick={() => onApply(item)}
              disabled={disabled && !isAction}
              title={isAction ? item.label : disabled ? 'Select a tooth surface first' : `Apply ${item.label}`}
              className="flex items-center gap-2 rounded px-2 py-2.5 text-xs font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: isAction ? '#0f2f55' : 'linear-gradient(180deg,#eef4fb,#cfe0f2)',
                color: isAction ? '#ffffff' : '#13395f',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <ToolIcon action={!!item.action} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Small monochrome glyph per tool — stand-ins for the legacy raster icons.
function ToolIcon({ action }: { action: boolean }) {
  const color = action ? '#9ec3ec' : '#1f5fa8';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="2" width="10" height="12" rx="2" fill={color} opacity="0.85" />
      <path d="M6 5h4M6 8h4M6 11h2" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
