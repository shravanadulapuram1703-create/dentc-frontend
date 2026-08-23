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
  File as FileIcon,
  AlertCircle,
  Download,
  Eye,
  Paperclip,
  Loader2,
} from 'lucide-react';
import {
  useGetPatientNote,
  useCreatePatientNote,
  useUpdatePatientNote,
  getPatientDocument,
  deletePatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import { useUserNames } from '@/services/userDirectory';
import { openAsset, downloadAsset } from '@/services/documentAccess';
import {
  documentErrorMessage,
  formatFileSize,
  uploadNoteDocument,
  useDocumentLimits,
  useDocumentTypeOptions,
  validateDocumentFile,
  type NoteDocument,
  type PatientNoteCreateWithDocument,
  type PatientNoteUpdateWithDocument,
  type PatientNoteWithDocument,
} from '@/features/patient-notes/noteDocumentsService';
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

  // Upload rules and the document sub-type vocabulary both come from the
  // backend (NOTE-DOC-4/5) with a local fallback, so nothing is hardcoded here.
  const limits = useDocumentLimits();
  const documentTypeOptions = useDocumentTypeOptions();

  const numericPatientId = Number(patientId);
  const numericNoteId = Number(noteId);
  const numericOfficeId = patient.officeId ? Number(patient.officeId) : undefined;
  const isExistingNote = (mode === 'edit' || mode === 'view') && Number.isFinite(numericNoteId);

  const [noteType, setNoteType] = useState<string>('Patient Notes');
  const [noteContent, setNoteContent] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('CF');
  const [documentDescription, setDocumentDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<NoteDocument | null>(null);
  const [removeExisting, setRemoveExisting] = useState<boolean>(false);
  const [showFileDetails, setShowFileDetails] = useState<boolean>(false);
  const [macroOpen, setMacroOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  // Load the existing note for edit/view and hydrate the form once it arrives.
  const noteQuery = useGetPatientNote(numericNoteId, {
    query: { enabled: isExistingNote },
  });
  const loadedNote = noteQuery.data as PatientNoteWithDocument | undefined;

  // What the form looked like when it was last hydrated from the server. The
  // discard prompt compares against this rather than against "is there any text
  // at all", so opening a note and closing it without touching anything is
  // silent (KAN-83).
  const pristineRef = useRef({ noteType: 'Patient Notes', noteContent: '' });

  useEffect(() => {
    const note = loadedNote;
    if (!note) return;
    const hydratedType = note.note_type || 'Patient Notes';
    const hydratedContent = note.notes ?? '';
    setNoteType(hydratedType);
    setNoteContent(hydratedContent);
    pristineRef.current = { noteType: hydratedType, noteContent: hydratedContent };
  }, [loadedNote]);

  // Hydrate the attached file. The backend embeds a `document` block on the read
  // so a list of notes doesn't fan out into one GET per file (NOTE-DOC-1); the
  // `document_id`-only path covers a server that returns the id without it.
  useEffect(() => {
    const note = loadedNote;
    if (!note) return;
    if (note.document && note.document.id != null) {
      setAttachedDoc(note.document as NoteDocument);
      if (note.document.document_type) setDocumentType(note.document.document_type);
      if (note.document.description) setDocumentDescription(note.document.description);
      return;
    }
    if (note.document_id == null) {
      setAttachedDoc(null);
      return;
    }
    let cancelled = false;
    getPatientDocument(note.document_id)
      .then((doc) => {
        if (cancelled) return;
        setAttachedDoc(doc);
        if (doc.document_type) setDocumentType(doc.document_type);
        if (doc.description) setDocumentDescription(doc.description);
      })
      .catch(() => {
        // The row is gone (or this build has no such document) — the note still
        // opens; the attachment area just shows nothing.
        if (!cancelled) setAttachedDoc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loadedNote]);

  const createMutation = useCreatePatientNote();
  const updateMutation = useUpdatePatientNote();
  const isSaving = busy || createMutation.isPending || updateMutation.isPending;

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
    if (!file) return;
    const problem = validateDocumentFile(file, limits);
    if (problem) {
      setFormError(problem);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFormError(null);
    setSelectedFile(file);
    setRemoveExisting(false);
    // The note body doubles as the document's caption in the legacy screen, so
    // seed an empty note with the file name rather than making the user retype it.
    setNoteContent((prev) => (prev.trim() ? prev : file.name));
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Detaching also deletes the file: a note-context document exists for this
  // note, and the backend never cascades a note delete onto it (NOTE-DOC-1).
  const handleRemoveAttachment = () => {
    if (
      !window.confirm(
        'Remove this file from the note? It will also be deleted from Patient Documents when you save.',
      )
    ) {
      return;
    }
    setRemoveExisting(true);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = () => {
    alert(
      'Scanner capture requires the local imaging agent. Scan to a file, then choose it here with "Choose File".',
    );
  };

  const handleViewAttachment = async (doc: NoteDocument) => {
    try {
      await openAsset(doc.file_url);
    } catch (err) {
      setFormError(documentErrorMessage(err, 'Could not open the file.'));
    }
  };

  const handleDownloadAttachment = async (doc: NoteDocument) => {
    try {
      await downloadAsset(doc.file_url, doc.file_name);
    } catch (err) {
      setFormError(documentErrorMessage(err, 'Could not download the file.'));
    }
  };

  const isDocumentType = noteType === 'Document (Upload)' || noteType === 'Document (Scan)';
  const visibleAttachment = removeExisting ? null : attachedDoc;

  const handleSave = async () => {
    setFormError(null);
    if (!noteType) {
      setFormError('Please select a note type.');
      return;
    }
    if (!noteContent.trim()) {
      setFormError('Please enter note content.');
      return;
    }
    if (!Number.isFinite(numericPatientId)) {
      setFormError('Missing patient context. Please reopen this patient and try again.');
      return;
    }
    // A brand-new document note without a file is the bug this screen exists to
    // fix — don't let it save as an empty shell. Existing notes can still be
    // edited text-only (some predate document support).
    if (mode === 'add' && isDocumentType && !selectedFile) {
      setFormError('Choose a file to attach to this document note.');
      return;
    }

    setBusy(true);

    // `documentId` is what the note will point at; `staleDocId` is a file this
    // note used to own and no longer does, deleted after the note is saved.
    let documentId: number | null = attachedDoc?.id ?? null;
    let staleDocId: number | null = null;

    try {
      if (isDocumentType && selectedFile) {
        const uploaded = await uploadNoteDocument({
          file: selectedFile,
          patient_id: numericPatientId,
          office_id: numericOfficeId ?? null,
          document_type: documentType,
          description: documentDescription.trim() || noteContent.trim().slice(0, 255) || null,
        });
        documentId = uploaded.id;
        if (attachedDoc) staleDocId = attachedDoc.id;
      } else if (attachedDoc && (removeExisting || !isDocumentType)) {
        // Either detached explicitly, or the note was switched to a non-document
        // type — the link is cleared and the file goes with it.
        documentId = null;
        staleDocId = attachedDoc.id;
      }
    } catch (err) {
      setBusy(false);
      setFormError(documentErrorMessage(err, 'The file could not be uploaded. Please try again.'));
      return;
    }

    try {
      let saved: PatientNoteWithDocument;
      if (mode === 'edit' && isExistingNote) {
        const body: PatientNoteUpdateWithDocument = {
          note_type: noteType,
          notes: noteContent.trim(),
          document_id: documentId,
        };
        saved = (await updateMutation.mutateAsync({
          itemId: numericNoteId,
          data: body,
        })) as PatientNoteWithDocument;
      } else {
        const body: PatientNoteCreateWithDocument = {
          patient_id: numericPatientId,
          office_id: numericOfficeId,
          note_type: noteType,
          notes: noteContent.trim(),
          note_date: new Date().toISOString().slice(0, 10),
          document_id: documentId,
        };
        saved = (await createMutation.mutateAsync({ data: body })) as PatientNoteWithDocument;
      }

      if (staleDocId != null) {
        // Best effort: a failure here leaves an orphan the user can still find
        // and delete on the Documents tab. It must not fail the save.
        try {
          await deletePatientDocument(staleDocId);
        } catch {
          /* ignore */
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/v1/patient-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/patient-documents'] });

      // A server that predates NOTE-DOC-1 ignores `document_id` silently. Say so
      // rather than letting the file vanish from the note with no explanation —
      // it is still on the Documents tab.
      if (documentId != null && saved && saved.document_id == null) {
        window.alert(
          'The file was uploaded and is available on the patient\'s Documents tab, but this ' +
            'server build does not yet store the note-to-document link, so it will not show ' +
            'on the note itself.',
        );
      }

      navigate(`/patient/${patientId}/notes`);
    } catch (err) {
      setFormError(documentErrorMessage(err, 'Failed to save the note. Please try again.'));
    } finally {
      setBusy(false);
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
      selectedFile !== null ||
      removeExisting);

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    navigate(`/patient/${patientId}/notes`);
  };

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

  const modifiedBy = loadedNote?.updated_by ?? loadedNote?.created_by;
  const modifiedByName = loadedNote?.updated_by_name ?? loadedNote?.created_by_name;
  const modifiedOn = loadedNote?.updated_at ?? loadedNote?.created_at;
  const primaryLabel = mode === 'edit' ? 'Update' : 'Save';
  const acceptAttr = limits.allowed_extensions.join(',');
  const extensionHint = limits.allowed_extensions.join(', ');

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] overflow-hidden">
          {/* Modified By / Modified On strip */}
          <div className="flex items-center justify-end gap-10 px-6 py-2.5 bg-[#F1F5F9] border-b border-[#E2E8F0] text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#475569]">Modified By:</span>
              <span className="text-[#1E293B]">{resolveUser(modifiedBy, modifiedByName)}</span>
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
                      if (!nextIsDoc && isDocumentType && (selectedFile || visibleAttachment)) {
                        if (
                          !window.confirm('Changing note type will remove the attached file. Continue?')
                        ) {
                          return;
                        }
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }
                      setNoteType(next);
                      setFormError(null);
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
                      title="Document type"
                      className="min-w-[180px] px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm font-medium text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all disabled:bg-[#F7F9FC] disabled:text-[#94A3B8] disabled:cursor-not-allowed cursor-pointer"
                    >
                      {documentTypeOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label} ({opt.code})
                        </option>
                      ))}
                    </select>
                  )}

                  {isDocumentType && (
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

              {/* File constraints hint (limits come from the backend) */}
              {isDocumentType && (
                <p className="mt-2 text-xs font-semibold text-[#DC2626]">
                  (Max File Size: {limits.max_megabytes} MB. Allowed File Extensions:{' '}
                  {extensionHint})
                </p>
              )}
            </div>
          </div>

          {/* Upload File row — always visible for a document note, so the file
              picker is never hidden behind a toggle. */}
          {isDocumentType && (
            <div className="grid grid-cols-[140px_1fr] border-b border-[#E2E8F0]">
              <div className="flex items-start px-4 py-4 bg-[#F7F9FC] border-r border-[#E2E8F0] font-semibold text-[#1E293B]">
                Upload File
              </div>
              <div className="px-4 py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3">
                  {!isReadOnly && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#475569] hover:bg-[#334155] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                      >
                        <Upload className="w-4 h-4" strokeWidth={2} />
                        {selectedFile || visibleAttachment ? 'Choose Another File' : 'Choose File'}
                      </button>

                      {noteType === 'Document (Scan)' && (
                        <button
                          onClick={handleScan}
                          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F1F5F9] text-[#475569] border-2 border-[#E2E8F0] rounded-lg font-semibold text-sm transition-colors"
                        >
                          <Scan className="w-4 h-4" strokeWidth={2} />
                          Open Scanner
                        </button>
                      )}
                    </>
                  )}

                  {/* Newly picked file, not uploaded until Save */}
                  {selectedFile && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-[#2FB9A7]/10 border border-[#2FB9A7]/40 rounded-lg">
                      <FileIcon className="w-4 h-4 text-[#259688]" strokeWidth={2} />
                      <div>
                        <div className="text-sm font-semibold text-[#1E293B]">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-[#475569]">
                          {formatFileSize(selectedFile.size)} · uploads when you save
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

                  {/* File already stored on this note */}
                  {!selectedFile && visibleAttachment && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-[#3A6EA5]/5 border border-[#3A6EA5]/30 rounded-lg">
                      <Paperclip className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />
                      <div>
                        <div className="text-sm font-semibold text-[#1E293B]">
                          {visibleAttachment.file_name}
                        </div>
                        <div className="text-xs text-[#475569]">
                          {formatFileSize(visibleAttachment.file_size)}
                          {visibleAttachment.content_type ? ` · ${visibleAttachment.content_type}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAttachment(visibleAttachment)}
                        className="p-1.5 text-[#3A6EA5] hover:bg-[#3A6EA5]/10 rounded-lg transition-colors"
                        title="View file"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDownloadAttachment(visibleAttachment)}
                        className="p-1.5 text-[#3A6EA5] hover:bg-[#3A6EA5]/10 rounded-lg transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" strokeWidth={2} />
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={handleRemoveAttachment}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove file from this note"
                        >
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}

                  {!selectedFile && !visibleAttachment && (
                    <span className="text-sm text-[#64748B]">
                      {isReadOnly ? 'No file attached to this note.' : 'No file chosen.'}
                    </span>
                  )}

                  {removeExisting && attachedDoc && (
                    <button
                      onClick={() => setRemoveExisting(false)}
                      className="text-sm font-semibold text-[#3A6EA5] hover:underline"
                    >
                      Undo remove
                    </button>
                  )}
                </div>

                {/* Optional metadata, behind the legacy "Show File Details" toggle */}
                {showFileDetails && (
                  <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] p-3">
                    <label className="block text-xs font-bold text-[#475569] mb-1">
                      File Description <span className="font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="e.g. Signed consent, front and back"
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all disabled:bg-[#F1F5F9]"
                    />
                    {visibleAttachment && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#475569] sm:grid-cols-3">
                        <div>
                          <dt className="font-bold">Stored in</dt>
                          <dd>{visibleAttachment.storage_backend || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold">Uploaded</dt>
                          <dd>{formatTimestamp(visibleAttachment.created_at)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold">Document ID</dt>
                          <dd>{visibleAttachment.id}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
                rows={isDocumentType ? 12 : 18}
                className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all resize-y font-mono disabled:bg-[#F7F9FC] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#64748B]">{noteContent.length} characters</p>
            </div>
          </div>
        </div>

        {formError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border-2 border-red-200 bg-red-50 p-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" strokeWidth={2} />
            <p className="text-sm font-medium text-red-700">{formError}</p>
          </div>
        )}

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
              {isSaving ? (selectedFile ? 'Uploading…' : 'Saving…') : primaryLabel}
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
