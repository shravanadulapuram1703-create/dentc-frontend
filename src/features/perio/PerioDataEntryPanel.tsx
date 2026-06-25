import { useState } from 'react';
import type { PerioChartTemplateRead } from '@/api/generated/model';
import { ENTRY_MEASURES, MEASURES, type MeasureType } from './perioModel';
import type { PerioPrefs } from './perioService';

// The right-hand rail: Data Entry ⇄ Graphical toggle, template picker, the
// measurement-type buttons (PD / FGM / MGJ / Bld / Sup / Fur / Mob), a
// measure-specific entry pad, Set Defaults, and the prev/next nav arrows. The
// pad changes per the selected measure (legacy: PD/MGJ 0–15, FGM signed,
// Furcation classes, Mobility grades, Bld/Sup present-or-none).

interface Props {
  prefs: PerioPrefs;
  templates: PerioChartTemplateRead[];
  active: MeasureType;
  readOnly?: boolean;
  onMeasure: (m: MeasureType) => void;
  onTemplate: (name: string) => void;
  /** Set the active cell to an exact value (number), boolean (Bld/Sup), or null (Reset). */
  onSetValue: (value: number | boolean | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleGraphical: () => void;
  onPrefChange: (patch: Partial<PerioPrefs>) => void;
  onSetDefaults: () => void;
}

export default function PerioDataEntryPanel(props: Props) {
  const { prefs, templates, active, readOnly, onMeasure, onTemplate, onSetValue, onPrev, onNext, onToggleGraphical, onPrefChange, onSetDefaults } = props;

  return (
    <div className="flex h-full flex-col gap-3 border-l border-slate-200 bg-[#eef3f8] p-3 text-xs">
      {/* Data Entry / Graphical toggle */}
      <div className="flex overflow-hidden rounded-full border border-slate-300 bg-white">
        <button
          onClick={() => prefs.graphical && onToggleGraphical()}
          className="flex-1 px-3 py-1.5 font-semibold"
          style={{ background: prefs.graphical ? '#fff' : '#2563eb', color: prefs.graphical ? '#334155' : '#fff' }}
        >
          Data Entry
        </button>
        <button
          onClick={() => !prefs.graphical && onToggleGraphical()}
          className="flex-1 px-3 py-1.5 font-semibold"
          style={{ background: prefs.graphical ? '#2563eb' : '#fff', color: prefs.graphical ? '#fff' : '#334155' }}
        >
          Graphical
        </button>
      </div>

      {/* Template */}
      <label className="block">
        <span className="mb-1 block text-center font-semibold text-slate-600">Template</span>
        <select
          value={prefs.template_name ?? ''}
          onChange={(e) => onTemplate(e.target.value)}
          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5"
        >
          {templates.length === 0 && <option value="">Universal Perio Chart</option>}
          {templates.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      </label>

      {/* Active measurement (PD is the big primary button) */}
      <button
        onClick={() => onMeasure('PD')}
        className="rounded-md border py-2 text-center font-semibold"
        style={{ borderColor: '#d97706', background: active === 'PD' ? '#f59e0b' : '#fde68a', color: '#78350f' }}
      >
        PD — Pocket Depth
      </button>

      <div className="grid grid-cols-2 gap-2">
        {ENTRY_MEASURES.filter((m) => m !== 'PD').map((m) => (
          <MeasureButton key={m} measure={m} active={active === m} onClick={() => onMeasure(m)} />
        ))}
      </div>

      {/* Probing-order navigation */}
      <div className="flex gap-2">
        <button onClick={onPrev} title="Previous site" className="flex flex-1 items-center justify-center rounded-full bg-[#2563eb] py-1.5 text-white hover:bg-blue-700">‹</button>
        <button onClick={onNext} title="Next site" className="flex flex-1 items-center justify-center rounded-full bg-[#2563eb] py-1.5 text-white hover:bg-blue-700">›</button>
      </div>

      {/* Measure-specific entry pad — sets the active cell, then auto-advances. */}
      <MeasurePad measure={active} disabled={readOnly} onSet={onSetValue} />

      {/* Set Defaults (visible bands / auto-advance / thresholds) */}
      <details className="rounded border border-slate-300 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-center font-semibold text-slate-600">Set Defaults</summary>
        <div className="space-y-2 px-3 pb-3 pt-1">
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.show_mgj} onChange={(e) => onPrefChange({ show_mgj: e.target.checked })} /> Show MGJ</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.show_lingual} onChange={(e) => onPrefChange({ show_lingual: e.target.checked })} /> Show Lingual</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.auto_advance} onChange={(e) => onPrefChange({ auto_advance: e.target.checked })} /> Auto-advance</label>
          <label className="flex items-center justify-between gap-2">PD warn ≥
            <input type="number" min={1} max={15} value={prefs.pd_warning_level} onChange={(e) => onPrefChange({ pd_warning_level: Number(e.target.value) || 1 })} className="w-14 rounded border border-slate-300 px-1 py-0.5" />
          </label>
          <button onClick={onSetDefaults} className="w-full rounded bg-slate-100 py-1.5 font-medium text-slate-600 hover:bg-slate-200">Apply Template Defaults</button>
        </div>
      </details>
    </div>
  );
}

// Measure-specific entry pad (mirrors the legacy per-tool keypads).
function MeasurePad({ measure, disabled, onSet }: { measure: MeasureType; disabled?: boolean; onSet: (v: number | boolean | null) => void }) {
  const [bigPd, setBigPd] = useState(16);

  const Key = ({ label, value, tone = 'num', full }: { label: string; value: number | boolean | null; tone?: 'num' | 'reset' | 'class'; full?: boolean }) => (
    <button
      disabled={disabled}
      onClick={() => onSet(value)}
      className={`rounded border py-2 text-center font-semibold disabled:opacity-40 ${full ? 'w-full' : ''} ${
        tone === 'reset' ? 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
        : tone === 'class' ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-blue-50'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  );

  if (measure === 'BLD' || measure === 'SUP') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Key label="Present" value={true} tone="class" />
        <Key label="None" value={false} tone="reset" />
      </div>
    );
  }

  if (measure === 'MOB') {
    return (
      <div className="space-y-1.5">
        <Key label="Reset" value={null} tone="reset" full />
        <Key label="0" value={0} full />
        <div className="grid grid-cols-2 gap-1.5">
          {[0.5, 1, 1.5, 2, 2.5, 3].map((v) => <Key key={v} label={String(v)} value={v} />)}
        </div>
      </div>
    );
  }

  if (measure === 'FUR') {
    return (
      <div className="space-y-1.5">
        <Key label="Reset" value={null} tone="reset" full />
        {[1, 2, 3, 4].map((v) => <Key key={v} label={`Class ${v}`} value={v} tone="class" full />)}
      </div>
    );
  }

  if (measure === 'FGM') {
    // "+N" = margin coronal to the CEJ (stored negative); plain "N" = recession
    // (stored positive); CAL = PD + FGM. Legacy layout: +5..+1, 0, then 1..8.
    const rows: [string, number][][] = [
      [['+5', -5], ['+4', -4], ['+3', -3]],
      [['+2', -2], ['+1', -1], ['0', 0]],
      [['1', 1], ['2', 2], ['3', 3]],
      [['4', 4], ['5', 5], ['6', 6]],
      [['7', 7], ['8', 8]],
    ];
    return (
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 gap-1.5">
            {row.map(([label, value]) => <Key key={label} label={label} value={value} />)}
          </div>
        ))}
      </div>
    );
  }

  // PD and MGJ: 0–15. PD also offers a 16+ dropdown for deep pockets.
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 16 }, (_, n) => <Key key={n} label={String(n)} value={n} />)}
      </div>
      {measure === 'PD' && (
        <div className="flex gap-1.5">
          <select value={bigPd} disabled={disabled} onChange={(e) => setBigPd(Number(e.target.value))} className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5">
            {Array.from({ length: 15 }, (_, i) => 16 + i).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button disabled={disabled} onClick={() => onSet(bigPd)} className="rounded border border-slate-300 bg-slate-100 px-4 py-1.5 font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-40">Set</button>
        </div>
      )}
    </div>
  );
}

function MeasureButton({ measure, active, onClick }: { measure: MeasureType; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-md border py-2 font-semibold"
      style={{ borderColor: active ? '#2563eb' : '#cbd5e1', background: active ? '#dbeafe' : '#fff', color: '#334155' }}
    >
      <MeasureIcon measure={measure} />
      {MEASURES[measure].label.length > 5 ? labelShort(measure) : MEASURES[measure].label}
    </button>
  );
}

function labelShort(m: MeasureType): string {
  return { BLD: 'Bld', SUP: 'Sup', FUR: 'Fur', MOB: 'Mob', FGM: 'FGM', MGJ: 'MGJ' }[m as 'BLD'] ?? MEASURES[m].label;
}

function MeasureIcon({ measure }: { measure: MeasureType }) {
  switch (measure) {
    case 'FGM':
      return <span className="inline-block h-0.5 w-3 rounded" style={{ background: '#dc2626' }} />;
    case 'MGJ':
      return <span className="inline-block h-0.5 w-3 rounded" style={{ background: '#16a34a' }} />;
    case 'BLD':
      return <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#dc2626' }} />;
    case 'SUP':
      return <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#eab308' }} />;
    case 'FUR':
      return <span className="inline-block h-2 w-2 rotate-45 border" style={{ borderColor: '#475569' }} />;
    case 'MOB':
      return <span className="rounded bg-pink-200 px-1 text-[8px] font-bold text-pink-700">25</span>;
    default:
      return null;
  }
}
