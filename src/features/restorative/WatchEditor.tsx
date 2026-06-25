import { useState } from 'react';
import { useListNoteMacros } from '@/api/generated/endpoints/procedures/procedures';

interface WatchEditorProps {
  tooth: string;
  initialNote?: string;
  onSave: (note: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

// Fallback macro rows when no note-macros are configured (matches the legacy
// surface-position macros: Buccal / Crown / Distal / Facial / Lingual …).
const FALLBACK_MACROS = ['Buccal', 'Crown', 'Distal', 'Facial', 'Lingual', 'Mesial', 'Occlusal', 'Incisal'].map((m) => ({
  id: `fb-${m}`,
  name: m,
  content: m,
}));

/** Step 2 of the Watch workflow: the "Add Watch Notes" dialog (arrow already placed). */
export default function WatchEditor({ tooth, initialNote = '', onSave, onDelete, onClose }: WatchEditorProps) {
  const [note, setNote] = useState(initialNote);
  const macrosQuery = useListNoteMacros({ size: 200 });
  const macros = (macrosQuery.data?.items ?? []).length ? macrosQuery.data!.items : FALLBACK_MACROS;

  const addMacro = (text: string) => setNote((n) => (n ? `${n}, ${text}` : text));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[460px] rounded border border-slate-400 bg-[#eef1f5] shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-b from-[#2f7fe0] to-[#1f5fb8] px-3 py-1.5 text-white">
          <span className="text-sm font-semibold">Add Watch Notes — Tooth #{tooth}</span>
          <button onClick={onClose} aria-label="Close" className="flex h-5 w-5 items-center justify-center rounded-sm bg-rose-600 text-xs hover:bg-rose-700">✕</button>
        </div>

        <div className="p-3">
          <div className="mb-1 text-xs font-semibold text-slate-700">Watch Notes</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded border-2 border-slate-400 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Surfaces affected / reason to watch…"
          />

          <div className="mb-1 mt-3 text-xs font-semibold text-slate-700">Watch Notes</div>
          <div className="max-h-[180px] overflow-y-auto rounded border border-slate-400 bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr style={{ background: 'linear-gradient(180deg,#e7eaef,#cfd6df)' }}>
                  <th className="border-b border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-600">Macro</th>
                  <th className="border-b border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {macros.map((m) => (
                  <tr key={m.id} onClick={() => addMacro(m.content || m.name)} className="cursor-pointer hover:bg-blue-50">
                    <td className="border-b border-slate-100 px-3 py-1 text-rose-700">{m.name}</td>
                    <td className="border-b border-slate-100 px-3 py-1 text-slate-700">{m.content || m.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center gap-2 border-t border-slate-300 bg-[#e3e7ec] p-2">
          <button onClick={() => onSave(note.trim())} className="rounded border border-slate-400 bg-white px-5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Save</button>
          <button onClick={() => onDelete?.()} disabled={!onDelete} className="rounded border border-slate-400 bg-white px-5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Delete</button>
          <button onClick={onClose} className="rounded border border-slate-400 bg-white px-5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}
