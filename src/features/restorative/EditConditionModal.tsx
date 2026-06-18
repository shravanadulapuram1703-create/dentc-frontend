import { useState } from 'react';

export interface EditableCondition {
  id: number;
  description: string;
  notes: string;
  activity_date: string; // YYYY-MM-DD
  is_inactive: boolean;
}

interface EditConditionModalProps {
  condition: EditableCondition;
  saving: boolean;
  onSave: (patch: { notes: string; activity_date: string; is_inactive: boolean }) => void;
  onClose: () => void;
}

/** Edit box (legacy double-click): Additional Notes, service date, Inactive checkbox. */
export default function EditConditionModal({ condition, saving, onSave, onClose }: EditConditionModalProps) {
  const [notes, setNotes] = useState(condition.notes);
  const [date, setDate] = useState(condition.activity_date);
  const [inactive, setInactive] = useState(condition.is_inactive);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[420px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Edit — {condition.description || 'Charted Item'}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="space-y-3 p-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Additional Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Date of Service</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} />
            <span className="text-sm text-slate-700">Mark as Inactive <span className="text-xs text-slate-400">(retains history; removed from the chart)</span></span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-2">
          <button onClick={onClose} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave({ notes, activity_date: date, is_inactive: inactive })} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
