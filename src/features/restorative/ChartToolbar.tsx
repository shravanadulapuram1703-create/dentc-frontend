import { NUMBERING_LABELS, type NumberingSystem } from './numbering';
import type { DentitionMode } from './dentition';

interface ChartToolbarProps {
  hasSelection: boolean;
  onClearSelection: () => void;
  onLastSelection: () => void;
  dentition: DentitionMode;
  onDentitionChange: (v: DentitionMode) => void;
  view: string;
  onViewChange: (v: string) => void;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  showXray: boolean;
  onToggleXray: () => void;
  canToothHistory: boolean;
  onToothHistory: () => void;
  // Phase-3 additions
  numberingSystem: NumberingSystem;
  onNumberingChange: (n: NumberingSystem) => void;
  wisdomVisible: boolean;
  onToggleWisdom: () => void;
  occlusalVisible: boolean;
  onToggleOcclusal: () => void;
  edentulous: boolean;
  onToggleEdentulous: () => void;
  onOpenTemplates: () => void;
  canNote: boolean;
  onOpenNote: () => void;
  // M06 additions
  lockSelectionTools: boolean; // Tx Plans tab disables Change Dentition + Last Selection (legacy)
  onOpenInsurance: () => void;
}

const btn =
  'flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const active = { background: '#dbeafe', borderColor: '#3b82f6', color: '#1d4ed8' } as const;

export default function ChartToolbar(props: ChartToolbarProps) {
  const {
    hasSelection, onClearSelection, onLastSelection, dentition, onDentitionChange,
    view, onViewChange, drawMode, onToggleDrawMode, showXray, onToggleXray,
    canToothHistory, onToothHistory, numberingSystem, onNumberingChange,
    wisdomVisible, onToggleWisdom, occlusalVisible, onToggleOcclusal,
    edentulous, onToggleEdentulous, onOpenTemplates, canNote, onOpenNote,
    lockSelectionTools, onOpenInsurance,
  } = props;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
      <button className={btn} onClick={onClearSelection} disabled={!hasSelection}>
        <Icon path="M6 6l8 8M14 6l-8 8" /> Clear Selection
      </button>
      <button className={btn} onClick={onLastSelection} disabled={lockSelectionTools} title={lockSelectionTools ? 'Unavailable on Tx Plans' : ''}>
        <Icon path="M4 10h12M4 10l4-4M4 10l4 4" /> Last Selection
      </button>
      <button className={btn} onClick={onOpenTemplates}>
        <Icon path="M3 4h6v6H3zM11 4h6v6h-6zM7 14h6v2H7z" /> Templates
      </button>
      <button className={btn} onClick={onOpenNote} disabled={!canNote}>
        <Icon path="M5 3h7l3 3v11H5zM12 3v4h4" /> Note
      </button>
      <button className={btn} onClick={onToggleDrawMode} style={drawMode ? active : undefined}>
        <Icon path="M4 14l8-8 2 2-8 8H4z" /> Draw Mode
      </button>

      <select value={view} onChange={(e) => onViewChange(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm">
        <option value="current">View Current Chart</option>
        <option value="pre-existing">View Pre-existing</option>
        <option value="completed">View Completed</option>
        <option value="tx-plan">View Treatment Plan</option>
      </select>

      <select value={dentition} disabled={lockSelectionTools} onChange={(e) => onDentitionChange(e.target.value as DentitionMode)} title={lockSelectionTools ? 'Unavailable on Tx Plans' : 'Change Dentition'} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm disabled:opacity-50">
        <option value="permanent">Permanent Dentition</option>
        <option value="primary">Primary (Pediatric)</option>
        <option value="mixed">Mixed Dentition</option>
      </select>

      <select
        value={numberingSystem}
        onChange={(e) => onNumberingChange(e.target.value as NumberingSystem)}
        title="Tooth numbering system"
        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm"
      >
        {(Object.keys(NUMBERING_LABELS) as NumberingSystem[]).map((n) => (
          <option key={n} value={n}>{NUMBERING_LABELS[n]}</option>
        ))}
      </select>

      <button className={btn} onClick={onToggleWisdom} style={!wisdomVisible ? active : undefined} title="Toggle wisdom teeth">
        <Icon path="M6 4c3 0 8 0 8 6 0 5-2 6-3 6s-1-3-2-3-1 3-2 3-3-1-3-6c0-3 2-6 2-6z" /> Wisdom
      </button>
      <button className={btn} onClick={onToggleOcclusal} style={!occlusalVisible ? active : undefined} title="Toggle surface selectors">
        <Icon path="M10 3a7 7 0 100 14 7 7 0 000-14zM10 7v6M7 10h6" /> Occlusal
      </button>
      <button className={btn} onClick={onToggleEdentulous} style={edentulous ? active : undefined} title="Mark arch edentulous (display)">
        <Icon path="M4 10h12" /> Edentulous
      </button>

      <button className={btn} onClick={onToothHistory} disabled={!canToothHistory}>
        <Icon path="M10 3a7 7 0 100 14 7 7 0 000-14zM10 6v4l3 2" /> Tooth History
      </button>
      <button className={btn} onClick={onToggleXray} style={showXray ? active : undefined}>
        <Icon path="M3 4h14v12H3zM3 8h14M7 4v12" /> Show X-Ray
      </button>
      <button className={btn} onClick={onOpenInsurance} title="View insurance benefits">
        <Icon path="M10 2l6 3v5c0 4-3 7-6 8-3-1-6-4-6-8V5z" /> Insurance
      </button>

      <div className="ml-auto flex items-center gap-2 rounded bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
        <Icon path="M10 3a7 7 0 100 14 7 7 0 000-14zM10 6v4l3 2" stroke="#fff" /> Timeline
      </div>
    </div>
  );
}

function Icon({ path, stroke = 'currentColor' }: { path: string; stroke?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
