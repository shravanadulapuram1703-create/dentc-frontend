import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  X,
  FileText,
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

// Format an ISO timestamp for the audit panel.
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

  const numericPatientId = Number(patientId);
  const numericNoteId = Number(noteId);
  const numericOfficeId = patient.officeId ? Number(patient.officeId) : undefined;
  const isExistingNote = (mode === 'edit' || mode === 'view') && Number.isFinite(numericNoteId);

  const [noteType, setNoteType] = useState<string>('Patient Notes');
  const [noteContent, setNoteContent] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('Show All');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load the existing note for edit/view and hydrate the form once it arrives.
  const noteQuery = useGetPatientNote(numericNoteId, {
    query: { enabled: isExistingNote },
  });

  useEffect(() => {
    const note = noteQuery.data;
    if (!note) return;
    setNoteType(note.note_type || 'Patient Notes');
    setNoteContent(note.notes ?? '');
  }, [noteQuery.data]);

  const createMutation = useCreatePatientNote();
  const updateMutation = useUpdatePatientNote();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Common note macros
  const noteMacros = [
    'Patient called to confirm appointment...',
    'Responsible Party contacted regarding...',
    'Payment plan discussed and approved...',
    'Insurance eligibility verified...',
    'Document received and scanned...',
    'Follow-up scheduled for...',
    'Financial policy explained to patient...',
    'Consent form signed and filed...'
  ];

  const documentTypes = [
    'Show All',
    'Anesthesia Record',
    'Consent Form (CF)',
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
    'Patient Registration Form'
  ];

  const handleInsertDateStamp = () => {
    const now = new Date();
    const dateStamp = `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] `;
    setNoteContent(noteContent + dateStamp);
  };

  const handleInsertMacro = (macro: string) => {
    setNoteContent(noteContent + (noteContent ? '\n\n' : '') + macro);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = () => {
    // In production, this would open scanner interface
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

  const handleCancel = () => {
    if ((noteContent.trim() || selectedFile) && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    navigate(`/patient/${patientId}/notes`);
  };

  const isReadOnly = mode === 'view';
  const isDocumentType = noteType === 'Document (Upload)' || noteType === 'Document (Scan)';

  if (isExistingNote && noteQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading note…</p>
        </div>
      </div>
    );
  }

  if (isExistingNote && noteQuery.isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="text-center bg-white rounded-lg shadow-md border-2 border-red-200 p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Note</h3>
          <p className="text-slate-600 mb-4">This note could not be loaded.</p>
          <button
            onClick={() => navigate(`/patient/${patientId}/notes`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <FileText className="w-6 h-6 text-amber-700" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {mode === 'add' && 'Add Patient Note'}
                  {mode === 'edit' && 'Edit Patient Note'}
                  {mode === 'view' && 'View Patient Note'}
                </h1>
                <p className="text-sm text-slate-600">
                  {mode === 'view' ? 'Read-only view' : 'Administrative notes & documents'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Patient Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Patient
              </div>
              <div className="font-semibold text-slate-900">{patient.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                DOB / Age
              </div>
              <div className="font-semibold text-slate-900">
                {patient.dob} ({patient.age}y)
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Date
              </div>
              <div className="font-semibold text-slate-900">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Note Form */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          {/* Note Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Note Type <span className="text-red-600">*</span>
            </label>
            <select
              value={noteType}
              onChange={(e) => {
                setNoteType(e.target.value);
                // Reset file when changing from/to document types
                if ((e.target.value.includes('Document') !== isDocumentType) && selectedFile) {
                  if (window.confirm('Changing note type will remove attached file. Continue?')) {
                    setSelectedFile(null);
                  } else {
                    return;
                  }
                }
              }}
              disabled={isReadOnly}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Note Type --</option>
              <option value="Patient Notes">Patient Notes</option>
              <option value="Responsible Party Notes">Responsible Party Notes</option>
              <option value="Financial Notes">Financial Notes</option>
              <option value="Appointment Notes">Appointment Notes</option>
              <option value="Document (Upload)">Document (Upload)</option>
              <option value="Document (Scan)">Document (Scan)</option>
            </select>
          </div>

          {/* Document storage is not yet backed by an endpoint (see
              patients_backend_devreport.md). The note text and type are saved;
              the file and document sub-type are not persisted yet. */}
          {isDocumentType && !isReadOnly && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" strokeWidth={2} />
              <p className="text-xs font-medium text-amber-800">
                Document storage is pending backend support. The note text and type will be saved,
                but the attached file and document sub-type are not persisted yet.
              </p>
            </div>
          )}

          {/* Document Type Dropdown (only for document types) */}
          {isDocumentType && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload (for Document Upload type) */}
          {noteType === 'Document (Upload)' && !isReadOnly && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Choose File <span className="text-slate-500 font-normal">(PDF, JPG, PNG - Max 10 MB)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Upload className="w-5 h-5" strokeWidth={2} />
                  Choose File
                </button>
                {selectedFile && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-lg flex-1">
                    <File className="w-5 h-5 text-green-700" strokeWidth={2} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-900">{selectedFile.name}</div>
                      <div className="text-xs text-green-700">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scanner Button (for Document Scan type) */}
          {noteType === 'Document (Scan)' && !isReadOnly && (
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Scan Document
              </label>
              <button
                onClick={handleScan}
                className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Scan className="w-5 h-5" strokeWidth={2} />
                Open Scanner
              </button>
              {selectedFile && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <File className="w-5 h-5 text-purple-700" strokeWidth={2} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-purple-900">Scanned document ready</div>
                    <div className="text-xs text-purple-700">{selectedFile.name}</div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Remove scanned document"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons (for non-document types) */}
          {!isDocumentType && !isReadOnly && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleInsertDateStamp}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
              >
                <Clock className="w-4 h-4" strokeWidth={2} />
                Insert Date Stamp
              </button>

              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold text-sm transition-colors">
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Add Notes Macro
                </button>

                {/* Macro Dropdown */}
                <div className="hidden group-hover:block absolute top-full left-0 mt-1 w-96 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide px-3 py-2">
                      Common Macros
                    </div>
                    {noteMacros.map((macro, index) => (
                      <button
                        key={index}
                        onClick={() => handleInsertMacro(macro)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                      >
                        {macro}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Text Area */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Notes <span className="text-red-600">*</span>
              {isDocumentType && (
                <span className="text-slate-600 font-normal text-xs ml-2">
                  (Explain why this document is being uploaded)
                </span>
              )}
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={isReadOnly}
              placeholder={
                isDocumentType
                  ? 'Enter explanation for this document...\n\nExamples:\n- "Eligibility verification PDF from Delta Dental"\n- "X-ray received from external provider"\n- "Signed consent form for crown procedure"'
                  : 'Enter administrative note here...\n\nExamples:\n- "Patient called to confirm appointment for next week"\n- "Payment plan discussed and approved"\n- "Insurance eligibility verified"'
              }
              rows={isDocumentType ? 8 : 12}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-slate-900 resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-600">
                {noteContent.length} characters
              </p>
              {!isReadOnly && !isDocumentType && (
                <p className="text-xs text-slate-600">
                  Use macros and date stamps to speed up documentation
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Information (View/Edit Mode) */}
        {(mode === 'view' || mode === 'edit') && (
          <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4 mb-6">
            <h3 className="text-sm font-bold text-blue-900 mb-3">Audit Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Created By
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {noteQuery.data?.created_by != null ? `User #${noteQuery.data.created_by}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Created Date
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {formatTimestamp(noteQuery.data?.created_at)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Last Modified By
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {noteQuery.data?.updated_by != null ? `User #${noteQuery.data.updated_by}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Last Modified Date
                </div>
                <div className="text-sm font-medium text-blue-900">
                  {formatTimestamp(noteQuery.data?.updated_at)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Patient ID
                </div>
                <div className="text-sm font-medium text-blue-900">{patientId}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || !noteType || !noteContent.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Save className="w-5 h-5" strokeWidth={2} />
              {isSaving ? 'Saving...' : 'Save Patient Note'}
            </button>
          )}
        </div>

        {/* Help Text */}
        {!isReadOnly && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-900 mb-2">Patient Notes Tips</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Use Patient Notes for administrative and non-clinical information</li>
              <li>• Upload supporting documents (PDFs, images) when applicable</li>
              <li>• Always include a description explaining the document or note</li>
              <li>• Financial notes should reference payment plans and agreements</li>
              <li>• Responsible Party notes track communication with guarantors</li>
              <li>• System notes are auto-generated and cannot be edited</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
