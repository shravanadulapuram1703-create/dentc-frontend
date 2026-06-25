import { useState } from 'react';
import type { PerioExamRead } from '@/api/generated/model';

// Exam Details (legacy "Exam Details" pop-up): created-on, date of service, the
// 1000-char exam note, and "Void this Exam". Save persists the date + notes.

interface DetailsProps {
  exam: PerioExamRead;
  saving?: boolean;
  onSave: (patch: { exam_date: string; notes: string }) => void;
  onVoid: () => void;
  onClose: () => void;
}

const MAX = 1000;

export function ExamDetailsModal({ exam, saving, onSave, onVoid, onClose }: DetailsProps) {
  const [examDate, setExamDate] = useState(exam.exam_date.slice(0, 10));
  const [notes, setNotes] = useState(exam.notes ?? '');

  return (
    <Backdrop onClose={onClose}>
      <div className="w-[460px] rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700">Exam Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </header>
        <div className="space-y-3 p-4 text-xs">
          <label className="block">
            <span className="mb-1 block text-slate-500">Created On</span>
            <input value={exam.created_at.slice(0, 10)} disabled className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-slate-500">Date Of Service</span>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" />
          </label>
          <label className="block">
            <span className="mb-1 block text-slate-500">Notes</span>
            <textarea
              value={notes}
              maxLength={MAX}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Next exam due in 6 months…"
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
            <span className="mt-0.5 block text-right text-[10px] text-slate-400">Characters: {String(notes.length).padStart(4, '0')}/{MAX}</span>
          </label>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
          <button
            onClick={onVoid}
            disabled={exam.is_voided}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {exam.is_voided ? 'Voided' : 'Void this Exam'}
          </button>
          <div className="flex gap-2">
            <button onClick={() => onSave({ exam_date: examDate, notes })} disabled={saving} className="rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
            <button onClick={onClose} className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close</button>
          </div>
        </footer>
      </div>
    </Backdrop>
  );
}

// "New Exam Today" — carry the previous chart's values forward, or start blank.
export function NewExamPrompt({ hasPrevious, onChoose, onClose }: { hasPrevious: boolean; onChoose: (carry: boolean) => void; onClose: () => void }) {
  return (
    <Backdrop onClose={onClose}>
      <div className="w-[420px] rounded-lg bg-white p-5 shadow-2xl">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">New Exam Today</h2>
        <p className="mb-4 text-xs text-slate-600">
          {hasPrevious
            ? 'Carry forward the data from the previous chart? Click Yes to copy the last exam’s values, or No to start with a blank chart.'
            : 'Start a new periodontal exam for today with a blank chart?'}
        </p>
        <div className="flex justify-end gap-2">
          {hasPrevious && <button onClick={() => onChoose(true)} className="rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Yes</button>}
          <button onClick={() => onChoose(false)} className="rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">{hasPrevious ? 'No' : 'Create'}</button>
          <button onClick={onClose} className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
