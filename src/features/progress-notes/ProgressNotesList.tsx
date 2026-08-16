// Progress Notes — legacy Denticon list (the "Progress Notes" tab landing).
//
// Grid columns mirror the legacy layout: Edit | DOS | 📎 | 🖊 | Th | Progress
// Notes (colour-coded) | Created/Modified. A filter bar (Show All / Signature /
// Hide Strike-Off + free-text), pagination (|< < pages > >| / Show All) and an
// "Add New Note" action complete the screen. Notes are never deleted — only
// struck off (shown dimmed when "Hide Strike-Off" is unchecked).

import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  FileText,
  Loader2,
  Paperclip,
  PenLine,
  Plus,
} from 'lucide-react';
import { useListProgressNotes } from '@/api/generated/endpoints/clinical/clinical';
import type { ProgressNoteRead } from '@/api/generated/model';
import { fmtCreatedAt, fmtDos, isLocked, isSigned, parseTeeth } from './progressNotesService';
import { useUserNames } from '@/services/userDirectory';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
}
interface OutletContext {
  patient: PatientData;
}

const PAGE_SIZE = 10;

export default function ProgressNotesList() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  const numericPatientId = Number(patientId);
  const validPatientId = Number.isFinite(numericPatientId);

  // Created/Modified shows a name, not a raw id (KAN-78). ProgressNoteRead
  // carries `*_by_name` companions, so the directory is only a fallback for
  // rows the backend left unresolved.
  const { resolve: resolveUser } = useUserNames();

  const [filterType, setFilterType] = useState('Show All (No Search Filter)');
  const [criteria, setCriteria] = useState('');
  const [signatureOnly, setSignatureOnly] = useState(false);
  const [hideStruckOff, setHideStruckOff] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const notesQuery = useListProgressNotes(
    { patient_id: numericPatientId, size: 200 },
    { query: { enabled: validPatientId } },
  );

  const notes: ProgressNoteRead[] = useMemo(() => {
    const items = (notesQuery.data?.items ?? []).filter((n) => !n.is_deleted);
    return items.slice().sort((a, b) =>
      (b.note_date ?? b.created_at ?? '').slice(0, 10).localeCompare(
        (a.note_date ?? a.created_at ?? '').slice(0, 10),
      ),
    );
  }, [notesQuery.data]);

  const filtered = useMemo(
    () =>
      notes.filter((n) => {
        if (signatureOnly && !isSigned(n)) return false;
        if (hideStruckOff && n.is_struck_off) return false;
        if (criteria.trim()) {
          const hay = `${n.notes ?? ''} ${n.tooth ?? ''}`.toLowerCase();
          if (!hay.includes(criteria.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [notes, signatureOnly, hideStruckOff, criteria],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = showAll ? filtered : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openEditor = (n: ProgressNoteRead) => {
    const mode = isLocked(n) ? 'view' : 'edit';
    navigate(`/patient/${patientId}/progress-notes/${mode}/${n.id}`);
  };

  if (!patient) {
    return (
      <div className="p-6">
        <div className="rounded-xl border-2 border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold text-red-600">Patient data not available</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-100" style={{ minHeight: 'calc(100vh - 300px)' }}>
      {/* Workspace header */}
      <div
        className="flex items-center justify-between px-5 py-2 text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(180deg,#2566a8,#16406e)' }}
      >
        <div className="flex items-center gap-3">
          <span>Progress Notes</span>
          <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patient.name}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/patient/${patientId}/progress-notes/new`)}
          className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add New Note
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-300 bg-white p-3">
          <div className="min-w-[14rem]">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
              Select Filter
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded border-2 border-slate-300 px-2 py-1.5 text-sm"
            >
              <option>Show All (No Search Filter)</option>
              <option>Date Range</option>
              <option>Category</option>
              <option>Provider</option>
              <option>Tooth Number</option>
            </select>
          </div>
          <div className="min-w-[14rem] flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
              Select Filtering Criteria
            </label>
            <input
              type="text"
              value={criteria}
              onChange={(e) => {
                setCriteria(e.target.value);
                setPage(1);
              }}
              placeholder="Search note text or tooth…"
              className="w-full rounded border-2 border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={signatureOnly}
              onChange={(e) => setSignatureOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Signature
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={hideStruckOff}
              onChange={(e) => setHideStruckOff(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Hide Strike-Off
          </label>
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
                <tr>
                  <th className="w-14 px-3 py-2.5 text-left text-xs font-bold uppercase">Edit</th>
                  <th className="w-28 px-3 py-2.5 text-left text-xs font-bold uppercase">DOS</th>
                  <th className="w-12 px-2 py-2.5 text-center">
                    <Paperclip className="mx-auto h-4 w-4" />
                  </th>
                  <th className="w-12 px-2 py-2.5 text-center">
                    <PenLine className="mx-auto h-4 w-4" />
                  </th>
                  <th className="w-24 px-3 py-2.5 text-left text-xs font-bold uppercase">Th</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase">Progress Notes</th>
                  <th className="w-56 px-3 py-2.5 text-left text-xs font-bold uppercase">Created / Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {notesQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : notesQuery.isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-600" />
                      <button
                        onClick={() => notesQuery.refetch()}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No Progress Notes Found</p>
                      <p className="text-sm text-slate-500">
                        {criteria || signatureOnly
                          ? 'Try adjusting your filters'
                          : 'Click "Add New Note" to create the first note'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((n) => {
                    const teeth = parseTeeth(n.tooth);
                    const signed = isSigned(n);
                    return (
                      <tr
                        key={n.id}
                        className={`align-top hover:bg-blue-50 ${n.is_struck_off ? 'opacity-50' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => openEditor(n)}
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                            title={isLocked(n) ? 'View (locked)' : 'Edit'}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{fmtDos(n.note_date)}</td>
                        <td className="px-2 py-2.5 text-center" />
                        <td className="px-2 py-2.5 text-center">
                          {signed && <PenLine className="mx-auto h-4 w-4 text-green-600" />}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {teeth.length ? (
                            <>
                              {teeth.join(', ')}
                              {n.surface && <span className="ml-1 text-blue-600">({n.surface})</span>}
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div
                            className={`max-w-2xl whitespace-pre-line text-[13px] ${
                              n.is_struck_off ? 'text-slate-400 line-through' : 'text-emerald-800'
                            }`}
                          >
                            {n.notes_html ? (
                              <span dangerouslySetInnerHTML={{ __html: n.notes_html }} />
                            ) : (
                              n.notes
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <div className="font-medium text-slate-700">{fmtCreatedAt(n.created_at)}</div>
                          {n.created_by != null && (
                            <div className="font-semibold text-blue-700">
                              {resolveUser(n.created_by, n.created_by_name)}
                            </div>
                          )}
                          {signed && (
                            <div className="mt-0.5 font-semibold text-green-700">
                              Signed
                              {n.signed_by != null
                                ? ` (${resolveUser(n.signed_by, n.signed_by_name)})`
                                : ''}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
              {showAll ? (
                <>
                  <span className="text-sm font-semibold text-[#1F3A5F]">
                    Showing all {filtered.length} notes
                  </span>
                  <button
                    onClick={() => {
                      setShowAll(false);
                      setPage(1);
                    }}
                    className="rounded border-2 border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Paginate
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <PagerBtn onClick={() => setPage(1)} disabled={safePage === 1}>
                      <ChevronsLeft className="h-4 w-4" />
                    </PagerBtn>
                    <PagerBtn onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </PagerBtn>
                    <span className="px-2 text-sm font-semibold text-[#1F3A5F]">
                      Page {safePage} of {totalPages}
                    </span>
                    <PagerBtn onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </PagerBtn>
                    <PagerBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>
                      <ChevronsRight className="h-4 w-4" />
                    </PagerBtn>
                  </div>
                  <button
                    onClick={() => setShowAll(true)}
                    className="rounded border-2 border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Show All
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border-2 border-slate-300 p-1.5 text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
