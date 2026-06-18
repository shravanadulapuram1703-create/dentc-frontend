import { useState } from 'react';
import type { GridRow } from './types';

export interface ProgressNoteRow {
  id: string;
  date: string;
  note: string;
  tooth: string;
}

interface ToothHistoryPopupProps {
  teeth: string[];
  rows: GridRow[]; // already filtered to these teeth
  progressNotes: ProgressNoteRow[]; // already filtered to these teeth
  onClose: () => void;
}

type HistTab = 'all' | 'pre-existing' | 'ledger' | 'tx-plan' | 'progress';

const TABS: { key: HistTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pre-existing', label: 'Pre-Existing' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'tx-plan', label: 'TxPlan' },
  { key: 'progress', label: 'Progress Notes' },
];

const matchRow = (tab: HistTab, t: string): boolean => {
  if (tab === 'pre-existing') return t.startsWith('PRE');
  if (tab === 'ledger') return t.startsWith('COMP');
  if (tab === 'tx-plan') return t.startsWith('TX');
  return tab === 'all';
};

/** Per-tooth history: All / Pre-Existing / Ledger / TxPlan / Progress Notes. */
export default function ToothHistoryPopup({ teeth, rows, progressNotes, onClose }: ToothHistoryPopupProps) {
  const [tab, setTab] = useState<HistTab>('all');
  const visibleRows = tab === 'progress' ? [] : rows.filter((r) => matchRow(tab, r.type));
  const showProgress = tab === 'all' || tab === 'progress';
  const label = teeth.map((t) => `#${t}`).join(', ');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[600px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Tooth History — {label}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="flex border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 text-xs font-semibold"
              style={{ background: tab === t.key ? '#fff' : '#eef2f7', color: tab === t.key ? '#16406e' : '#64748b', borderBottom: tab === t.key ? '2px solid #2566a8' : '2px solid transparent' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {visibleRows.length === 0 && (!showProgress || progressNotes.length === 0) ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">No {tab === 'all' ? '' : TABS.find((t) => t.key === tab)?.label + ' '}history for {label}.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-3 py-1.5 text-left font-semibold">Type</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Date</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Code</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Description</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Th</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Surf</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 font-semibold text-slate-700">{r.type}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.date}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.code}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.description}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.tooth}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.surface}</td>
                  </tr>
                ))}
                {showProgress &&
                  progressNotes.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-semibold text-purple-700">NOTE</td>
                      <td className="px-3 py-1.5 text-slate-600">{p.date}</td>
                      <td className="px-3 py-1.5 text-slate-600">—</td>
                      <td className="px-3 py-1.5 text-slate-600">{p.note}</td>
                      <td className="px-3 py-1.5 text-slate-600">{p.tooth}</td>
                      <td className="px-3 py-1.5 text-slate-600">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
