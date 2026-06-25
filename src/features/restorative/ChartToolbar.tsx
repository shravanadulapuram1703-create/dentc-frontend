import { useState } from 'react';
import { DENTITION_BANDS, type DentitionMode } from './dentition';

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
  /** Tx Plans tab disables Change Dentition + Last Selection (legacy). */
  lockSelectionTools: boolean;
  onOpenAda: () => void;
  /** Timeline date filter (YYYY-MM-DD); empty = no filter. */
  timelineFrom: string;
  timelineTo: string;
  onTimelineChange: (from: string, to: string) => void;
}

const btn =
  'flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const active = { background: '#dbeafe', borderColor: '#3b82f6', color: '#1d4ed8' } as const;

export default function ChartToolbar(props: ChartToolbarProps) {
  const {
    hasSelection, onClearSelection, onLastSelection, dentition, onDentitionChange,
    view, onViewChange, drawMode, onToggleDrawMode, showXray, onToggleXray,
    canToothHistory, onToothHistory, lockSelectionTools, onOpenAda,
    timelineFrom, timelineTo, onTimelineChange,
  } = props;
  const [timelineOpen, setTimelineOpen] = useState(false);
  const timelineActive = !!(timelineFrom || timelineTo);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
      <button className={btn} onClick={onClearSelection} disabled={!hasSelection}>
        <Icon path="M6 6l8 8M14 6l-8 8" /> Clear Selection
      </button>
      <button className={btn} onClick={onLastSelection} disabled={lockSelectionTools} title={lockSelectionTools ? 'Unavailable on Tx Plans' : ''}>
        <Icon path="M4 10h12M4 10l4-4M4 10l4 4" /> Last Selection
      </button>
      <button className={btn} onClick={onOpenAda} disabled={!hasSelection} title="Add ADA / procedure code">
        <Icon path="M7 5l-4 5 4 5M13 5l4 5-4 5" /> ADA Codes
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
        {DENTITION_BANDS.map((b) => (
          <option key={b.id} value={b.id}>{b.label}</option>
        ))}
      </select>

      <button className={btn} onClick={onToothHistory} disabled={!canToothHistory}>
        <Icon path="M10 3a7 7 0 100 14 7 7 0 000-14zM10 6v4l3 2" /> Tooth History
      </button>
      <button className={btn} onClick={onToggleXray} style={showXray ? active : undefined}>
        <Icon path="M3 4h14v12H3zM3 8h14M7 4v12" /> Show X-Ray
      </button>

      <div className="relative ml-auto">
        <button
          onClick={() => setTimelineOpen((v) => !v)}
          title="Filter charting by a date range"
          className="flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          style={{ background: timelineActive ? '#0f766e' : '#0d9488' }}
        >
          <Icon path="M10 3a7 7 0 100 14 7 7 0 000-14zM10 6v4l3 2" stroke="#fff" />
          Timeline{timelineActive ? ' •' : ''}
        </button>
        {timelineOpen && (
          <div className="absolute right-0 z-30 mt-1 w-64 rounded border border-slate-300 bg-white p-3 text-xs text-slate-700 shadow-xl">
            <div className="mb-2 font-semibold text-slate-600">Show charting between</div>
            <label className="mb-2 flex items-center justify-between gap-2">From
              <input type="date" value={timelineFrom} max={timelineTo || undefined} onChange={(e) => onTimelineChange(e.target.value, timelineTo)} className="rounded border border-slate-300 px-2 py-1" />
            </label>
            <label className="flex items-center justify-between gap-2">To
              <input type="date" value={timelineTo} min={timelineFrom || undefined} onChange={(e) => onTimelineChange(timelineFrom, e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
            </label>
            <div className="mt-3 flex justify-between">
              <button onClick={() => onTimelineChange('', '')} disabled={!timelineActive} className="rounded border border-slate-300 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40">Clear</button>
              <button onClick={() => setTimelineOpen(false)} className="rounded bg-teal-600 px-3 py-1 font-semibold text-white hover:bg-teal-700">Done</button>
            </div>
          </div>
        )}
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
