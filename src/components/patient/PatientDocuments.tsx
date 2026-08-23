import { useRef, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Trash2, Eye, Download, Loader2, AlertCircle } from 'lucide-react';
import {
  useListPatientDocuments,
  uploadPatientDocument,
  deletePatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import { openAsset, downloadAsset } from '@/services/documentAccess';
import type { PatientDocumentRead } from '@/api/generated/model';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  officeId?: string;
}
interface OutletContext {
  patient: PatientData;
}

const DOCUMENT_TYPES = [
  'Insurance Card',
  'Identification',
  'Consent Form',
  'Medical Record',
  'X-Ray / Radiograph',
  'Referral',
  'Lab Report',
  'Other',
];

const MAX_BYTES = 10 * 1024 * 1024;

const fmtSize = (bytes?: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};
const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

export default function PatientDocuments() {
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numericPatientId = Number(patientId);
  const validId = Number.isFinite(numericPatientId);
  const officeId = patient.officeId ? Number(patient.officeId) : undefined;

  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const docsQuery = useListPatientDocuments(
    { patient_id: numericPatientId, size: 200 },
    { query: { enabled: validId } },
  );
  const documents = (docsQuery.data?.items ?? []).filter((d) => !d.is_deleted);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/v1/patient-documents'] });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      alert('File must be 10 MB or smaller.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Choose a file to upload.');
      return;
    }
    if (!validId) {
      alert('Missing patient context. Please reopen the patient and try again.');
      return;
    }
    setUploading(true);
    try {
      await uploadPatientDocument({
        file,
        patient_id: numericPatientId,
        office_id: officeId ?? null,
        document_type: docType,
        description: description || null,
      });
      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      invalidate();
    } catch (err) {
      alert(errMsg(err) || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // `file_url` is either a signed bucket URL or an authenticated `/content`
  // proxy path — the public /uploads mount is gone (NOTE-DOC-3), so a bare
  // <a href> 401s. Both actions go through the authenticated fetch.
  const handleView = async (doc: PatientDocumentRead) => {
    try {
      await openAsset(doc.file_url);
    } catch {
      alert('Could not open the file. Please try again.');
    }
  };

  const handleDownload = async (doc: PatientDocumentRead) => {
    try {
      await downloadAsset(doc.file_url, doc.file_name);
    } catch {
      alert('Could not download the file. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deletePatientDocument(id);
      invalidate();
    } catch (err) {
      alert(errMsg(err) || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-lg">
              <FileText className="w-6 h-6 text-slate-700" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Patient Documents</h1>
              <p className="text-sm text-slate-600">{patient.name}</p>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Upload Document</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded text-sm"
                placeholder="e.g. Front + back of insurance card"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="text-sm"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <Upload className="w-4 h-4" strokeWidth={2} />
              )}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <span className="text-xs text-slate-500">Max 10 MB.</span>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-20">
                  Actions
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-48">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-28">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-36">
                  Uploaded
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {docsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" strokeWidth={2} />
                  </td>
                </tr>
              ) : docsQuery.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" strokeWidth={2} />
                    <button
                      onClick={() => docsQuery.refetch()}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-600">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" strokeWidth={2} />
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                          ) : (
                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{doc.file_name}</div>
                      {doc.description && (
                        <div className="text-xs text-slate-500">{doc.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{doc.document_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmtSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(doc.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
