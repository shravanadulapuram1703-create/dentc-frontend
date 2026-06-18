import { useState } from 'react';

interface ToothNotePopupProps {
  tooth: number | string;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

/** Per-tooth free-text note (REST-4: persisted as a NOTE condition row for now). */
export default function ToothNotePopup({ tooth, initialNote, onSave, onClose }: ToothNotePopupProps) {
  const [note, setNote] = useState(initialNote);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[420px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Tooth Note — #{tooth}</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            autoFocus
            placeholder={`Clinical note for tooth #${tooth}…`}
            className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-2">
          <button onClick={onClose} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(note.trim())}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
