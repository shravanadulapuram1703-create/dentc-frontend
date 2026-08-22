import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  X,
  Plus,
  Clock,
  Upload,
  Scan,
  File,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  useGetPatientNote,
  useCreatePatientNote,
  useUpdatePatientNote,
} from '@/api/generated/endpoints/patients/patients';
import type { PatientNoteCreate, PatientNoteUpdate } from '@/api/generated/model';
import { useUserNames } from '@/services/userDirectory';
import NoteMacroPickerModal from './NoteMacroPickerModal';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender?: string;
  officeId?: string;
}

interface OutletContext {
  patient: PatientData;
}

interface AddEditPatientNoteProps {
  mode?: 'add' | 'edit' | 'view';
}

// Format an ISO timestamp for the Modified On / audit fields.
function formatTimestamp(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export default function AddEditPatientNote({ mode = 'add' }: AddEditPatientNoteProps) {
  const navigate = useNavigate();
  const { patientId, noteId } = useParams();
  const { patient } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // "Modified By" shows a name, not a raw id (KAN-75). Declared with the other
  // hooks, above the loading/error early-returns further down.
  const { resolve: resolveUser } = useUserNames();

  const numericPatientId = Number(patientId);
  const numericNoteId = Number(noteId);
  const numericOfficeId = patient.officeId ? Number(patient.officeId) : undefined;
  const isExistingNote = (mode === 'edit' || mode === 'view') && Number.isFinite(numericNoteId);

  const [noteType, setNoteType] = useState<string>('Patient Notes');
  const [noteContent, setNoteContent] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('Consent Form (CF)');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileDetails, setShowFileDetails] = useState<boolean>(false);
  const [macroOpen, setMacroOpen] = useState<boolean>(false);

  // Load the existing note for edit/view and hydrate the form once it arrives.
  const noteQuery = useGetPatientNote(numericNoteId, {
    query: { enabled: isExistingNote },
  });

  // What the form looked like when it was last hydrated from the server. The
  // discard prompt compares against this rather than against "is there any text
  // at all", so opening a note and closing it without touching anything is
  // silent (KAN-83).
  const pristineRef = useRef({ noteType: 'Patient Notes', noteContent: '' });

  useEffect(() => {
    const note = noteQuery.data;
    if (!note) return;
    const hydratedType = note.note_type || 'Patient Notes';
    const hydratedContent = note.notes ?? '';
    setNoteType(hydratedType);
    setNoteContent(hydratedContent);
    pristineRef.current = { noteType: hydratedType, noteContent: hydratedContent };
  }, [noteQuery.data]);

  const createMutation = useCreatePatientNote();
  const updateMutation = useUpdatePatientNote();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const documentTypes = [
    'Consent Form (CF)',
    'Anesthesia Record',
    'Diagnostic Report',
    'Dental Models (DDA)',
    'Insurance Document',
    'Eligibility Verification',
    'X-Ray / Radiograph',
    'Treatment Plan',
    'Financial Agreement',
    'Medical History Form',
    'Prescription',
    'Referral Letter',
    'Lab Report',
    'Patient Registration Form',
  ];

  const handleInsertDateStamp = () => {
    const now = new Date();
    const dateStamp = `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] `;
    setNoteContent((prev) => prev + dateStamp);
  };

  // Macro text lands at the caret (falling back to the end of the note when the
  // textarea was never focused), so a macro can be dropped mid-sentence.
  const handleInsertMacro = (macro: string) => {
    const el = noteRef.current;
    setNoteContent((prev) => {
      const start = el?.selectionStart ?? prev.length;
      const end = el?.selectionEnd ?? prev.length;
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      const lead = before && !before.endsWith('\n') ? '\n\n' : '';
      const next = before + lead + macro + after;
      const caret = (before + lead + macro).length;
      // Put the caret after the inserted text once React has re-rendered.
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
      return next;
    });
    setMacroOpen(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MB');
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'image/gif',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];
      if (!allowedTypes.includes(file.type)) {
        alert('Only GIF, JPG, JPEG, PNG, and PDF files are allowed');
        return;
      }
      setSelectedFile(file);
      setShowFileDetails(true);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = () => {
    alert('Scanner interface would open here. This feature requires hardware integration.');
  };

  const handleSave = async () => {
    if (!noteType) {
      alert('Please select a note type.');
      return;
    }
    if (!noteContent.trim()) {
      alert('Please enter note content.');
      return;
    }
    if (!Number.isFinite(numericPatientId)) {
      alert('Missing patient context. Please reopen this patient and try again.');
      return;
    }

    const goBackToList = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/patient-notes'] });
      navigate(`/patient/${patientId}/notes`);
    };

    const onError = (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(detail || 'Failed to save the note. Please try again.');
    };

    if (mode === 'edit' && isExistingNote) {
      const body: PatientNoteUpdate = {
        note_type: noteType,
        notes: noteContent.trim(),
      };
      updateMutation.mutate(
        { itemId: numericNoteId, data: body },
        { onSuccess: goBackToList, onError },
      );
    } else {
      const body: PatientNoteCreate = {
        patient_id: numericPatientId,
        office_id: numericOfficeId,
        note_type: noteType,
        notes: noteContent.trim(),
        note_date: new Date().toISOString().slice(0, 10),
      };
      createMutation.mutate({ data: body }, { onSuccess: goBackToList, onError });
    }
  };

  const isReadOnly = mode === 'view';

  // Only a real edit counts as unsaved work. The guard used to fire whenever the
  // body was non-empty, so closing a note opened from the list always warned —
  // in view mode the content is hydrated from the server and can never have been
  // edited, and in edit mode simply opening a note tripped it too (KAN-83).
  const hasUnsavedChanges =
    !isReadOnly &&
    (noteContent !== pristineRef.current.noteContent ||
      noteType !== pristineRef.current.noteType ||
      selectedFile !== null);

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    navigate(`/patient/${patientId}/notes`);
  };
  const isDocumentType = noteType === 'Document (Upload)' || noteType === 'Document (Scan)';

  if (isExistingNote && noteQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC] min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3A6EA5] animate-spin mx-auto mb-4" />
          <p className="text-[#475569] font-medium">Loading note…</p>
        </div>
      </div>
    );
  }

  if (isExistingNote && noteQuery.isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC] min-h-[400px]">
        <div className="text-center bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Note</h3>
          <p className="text-[#475569] mb-4">This note could not be loaded.</p>
          <button
            onClick={() => navigate(`/patient/${patientId}/notes`)}
            className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#2f5a8c] transition-colors font-semibold"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  const modifiedBy = noteQuery.data?.updated_by ?? noteQuery.data?.created_by;
  const modifiedOn = noteQuery.data?.updated_at ?? noteQuery.data?.created_at;
  const primaryLabel = mode === 'edit' ? 'Update' : 'Save';

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] overflow-hidden">
          {/* Modified By / Modified On strip */}
          <div className="flex items-center justify-end gap-10 px-6 py-2.5 bg-[#F1F5F9] border-b border-[#E2E8F0] text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#475569]">Modified By:</span>
              <span className="text-[#1E293B]">{resolveUser(modifiedBy)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#475569]">Modified On:</span>
              <span className="text-[#1E293B]">{formatTimestamp(modifiedOn)}</span>
            </div>
          </div>

          {/* Note Type row */}
          <div className="grid grid-cols-[140px_1fr] border-b border-[#E2E8F0]">
            <div className="flex items-start px-4 py-4 bg-[#F7F9FC] border-r border-[#E2E8F0] font-semibold text-[#1E293B]">
              Note Type
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Type + document sub-type selectors */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={noteType}
                    onChange={(e) => {
                      const next = e.target.value;
                      const nextIsDoc = next.includes('Document');
                      if (nextIsDoc !== isDocumentType && selectedFile) {
                        if (!window.confirm('Changing note type will remove attached file. Continue?')) {
                          return;
                        }
                        setSelectedFile(null);
                      }
                      setNoteType(next);
                      // Picking a document type is the user asking to attach a
                      // file — open the picker instead of making them find the
                      // "Show File Details" toggle first.
                      if (nextIsDoc) setShowFileDetails(true);
                    }}
                    disabled={isReadOnly}
                    className="min-w-[200px] px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm font-medium text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all disabled:bg-[#F7F9FC] disabled:text-[#94A3B8] disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="Patient Notes">Patient Notes</option>
                    <option value="Responsible Party Notes">Responsible Party Notes</option>
                    <option value="Financial Notes">Financial Notes</option>
                    <option value="Appointment Notes">Appointment Notes</option>
                    <option value="Document (Upload)">Documents (Upload)</option>
                    <option value="Document (Scan)">Documents (Scan)</option>
                  </select>

                  {isDocumentType && (
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={isReadOnly}
                      className="min-w-[180px] px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm font-medium text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all disabled:bg-[#F7F9FC] disabled:text-[#94A3B8] disabled:cursor-not-allowed cursor-pointer"
                    >
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )}

                  {isDocumentType && !isReadOnly && (
                    <button
                      onClick={() => setShowFileDetails((v) => !v)}
                      className="text-sm font-semibold text-[#3A6EA5] hover:text-[#2f5a8c] hover:underline"
                    >
                      {showFileDetails ? 'Hide File Details' : 'Show File Details'}
                    </button>
                  )}
                </div>

                {/* Date stamp + macro actions */}
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInsertDateStamp}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                    >
                      <Clock className="w-4 h-4" strokeWidth={2} />
                      Insert Date Stamp
                    </button>

                    <button
                      onClick={() => setMacroOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                      Add Notes Macro
                    </button>
                  </div>
                )}
              </div>

              {/* File constraints hint + uploader (document types) */}
              {isDocumentType && (
                <>
                  <p className="mt-2 text-xs font-semibold text-[#DC2626]">
                    (Max File Size: 10 MB. Allowed File Extensions: .Gif, .Jpg, .Jpeg, .Png &amp; .Pdf)
                  </p>

                  {!isReadOnly && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-2.5">
                      <AlertCircle className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" strokeWidth={2} />
                      <p className="text-xs font-medium text-[#92400E]">
                        Document storage is pending backend support. The note text and type will be
                        saved, but the attached file and document sub-type are not persisted yet.
                      </p>
                    </div>
                  )}

                  {showFileDetails && !isReadOnly && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".gif,.jpg,.jpeg,.png,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {noteType === 'Document (Scan)' ? (
                        <button
                          onClick={handleScan}
                          className="flex items-center gap-2 px-4 py-2 bg-[#475569] hover:bg-[#334155] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                        >
                          <Scan className="w-4 h-4" strokeWidth={2} />
                          Open Scanner
                        </button>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-[#475569] hover:bg-[#334155] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                        >
                          <Upload className="w-4 h-4" strokeWidth={2} />
                          Choose File
                        </button>
                      )}

                      {selectedFile && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-[#2FB9A7]/10 border border-[#2FB9A7]/40 rounded-lg">
                          <File className="w-4 h-4 text-[#259688]" strokeWidth={2} />
                          <div>
                            <div className="text-sm font-semibold text-[#1E293B]">
                              {selectedFile.name}
                            </div>
                            <div className="text-xs text-[#475569]">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                          <button
                            onClick={handleRemoveFile}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notes row */}
          <div className="grid grid-cols-[140px_1fr]">
            <div className="flex items-start px-4 py-4 bg-[#F7F9FC] border-r border-[#E2E8F0] font-semibold text-[#1E293B]">
              Notes
            </div>
            <div className="px-4 py-4">
              <textarea
                ref={noteRef}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={isReadOnly}
                placeholder={
                  isDocumentType
                    ? 'Enter the file name or a description for this document...'
                    : 'Enter the note here...'
                }
                rows={18}
                className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all resize-y font-mono disabled:bg-[#F7F9FC] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#64748B]">{noteContent.length} characters</p>
            </div>
          </div>
        </div>

        {/* Footer action bar */}
        <div className="mt-4 flex items-center justify-end gap-3">
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || !noteType || !noteContent.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
              ) : (
                <Save className="w-5 h-5" strokeWidth={2} />
              )}
              {isSaving ? 'Saving…' : primaryLabel}
            </button>
          )}
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#475569] hover:bg-[#334155] text-white rounded-lg font-bold transition-all shadow-sm"
          >
            <X className="w-5 h-5" strokeWidth={2} />
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>

      {macroOpen && (
        <NoteMacroPickerModal
          onInsert={handleInsertMacro}
          onClose={() => setMacroOpen(false)}
        />
      )}
    </div>
  );
}
