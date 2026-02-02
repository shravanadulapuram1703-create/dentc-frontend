import { useMemo, useState } from 'react';
import PatientNoteRow from './PatientNoteRow';
import { PatientNote } from './PatientNotesListing';

interface Props {
  notes: PatientNote[];
  onView(id: string): void;
  onEdit(id: string): void;
  onDelete(id: string): void;
}

const ITEMS_PER_PAGE = 10;

export default function PatientNotesTable({
  notes,
  onView,
  onEdit,
  onDelete
}: Props) {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const totalPages = Math.ceil(notes.length / ITEMS_PER_PAGE);

  const visibleNotes = useMemo(() => {
    if (showAll) return notes;
    const start = (page - 1) * ITEMS_PER_PAGE;
    return notes.slice(start, start + ITEMS_PER_PAGE);
  }, [notes, page, showAll]);

  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 p-12 text-center">
        No patient notes found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-100 border-b-2">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Notes</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Created</th>
          </tr>
        </thead>
        <tbody>
          {visibleNotes.map(note => (
            <PatientNoteRow
              key={note.id}
              note={note}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>

      {!showAll && totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t-2 bg-slate-50">
          <span className="text-sm font-semibold text-slate-600">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium border-2 border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium border-2 border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium border-2 border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button 
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium border-2 border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Last
            </button>
            <button 
              onClick={() => setShowAll(true)}
              className="px-3 py-1.5 text-sm font-medium border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors ml-2"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {showAll && (
        <div className="p-4 border-t-2 flex justify-end bg-slate-50">
          <button 
            onClick={() => { setShowAll(false); setPage(1); }}
            className="px-4 py-2 text-sm font-medium border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Show Paginated
          </button>
        </div>
      )}
    </div>
  );
}