import { useState } from 'react';

interface SaveDrawModalProps {
  saving?: boolean;
  onSave: (note: string) => void;
  onClose: () => void;
}

const MAX = 1000;

/** "Save Draw Chart" dialog — a Progress Note for the freehand drawing. */
export default function SaveDrawModal({ saving, onSave, onClose }: SaveDrawModalProps) {
  const [note, setNote] = useState('Saved from Restorative charting');
  const remaining = MAX - note.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[640px] rounded border border-slate-400 bg-[#eef1f5] shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-b from-[#2f7fe0] to-[#1f5fb8] px-3 py-1.5 text-white">
          <span className="text-sm font-semibold">Save Draw Chart</span>
          <button onClick={onClose} aria-label="Close" className="flex h-5 w-5 items-center justify-center rounded-sm bg-rose-600 text-xs hover:bg-rose-700">✕</button>
        </div>

        <div className="p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Progress Notes</span>
            <span className="text-xs italic text-slate-500">Allowed <b>{MAX}</b> characters</span>
          </div>
          <textarea
            value={note}
            maxLength={MAX}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded border-2 border-slate-400 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="mt-1 text-right text-xs italic text-amber-700">Remaining <b>{remaining}</b> characters</div>
        </div>

        <div className="flex justify-center gap-2 border-t border-slate-300 bg-[#e3e7ec] p-2">
          <button onClick={() => onSave(note.trim())} disabled={saving} className="rounded bg-blue-600 px-6 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">SAVE</button>
          <button onClick={onClose} className="rounded border border-slate-400 bg-slate-200 px-6 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300">CANCEL</button>
        </div>
      </div>
    </div>
  );
}
