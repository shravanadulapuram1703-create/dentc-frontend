import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import type { PatientDocumentRead } from '@/api/generated/model';
import { useImageUpload } from '../hooks/useImageMutations';
import {
  IMAGING_CATEGORIES,
  DEFAULT_CATEGORY,
  FILE_ACCEPT_ATTR,
  MAX_UPLOAD_BYTES,
  ACCEPTED_EXTENSIONS,
} from '../constants';

interface UploadButtonProps {
  patientId: number;
  officeId?: number | null;
  onUploaded?: (doc: PatientDocumentRead) => void;
}

const isAcceptedFile = (file: File): boolean => {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) : false;
};

/** Inline upload form: file picker + category + optional description. */
export default function UploadButton({ patientId, officeId, onUploaded }: UploadButtonProps) {
  const { upload, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setDescription('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) return;
    if (!isAcceptedFile(f)) {
      setError('Unsupported file type. Use JPG, PNG, TIFF, or WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError('File must be 10 MB or smaller.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    const doc = await upload({
      file,
      patient_id: patientId,
      office_id: officeId,
      category,
      description: description || null,
    });
    if (doc) {
      reset();
      onUploaded?.(doc);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-[#475569] mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:border-[#3A6EA5] outline-none"
          >
            {IMAGING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-[#475569] mb-1">
            Description <span className="font-normal text-[#94A3B8]">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Pre-op periapical"
            className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:border-[#3A6EA5] outline-none"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-[#475569] mb-1">File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT_ATTR}
            onChange={handleFileChange}
            className="text-sm w-full"
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-[#DC2626] mt-2">{error}</p>}
      <p className="text-xs text-[#94A3B8] mt-2">JPG, PNG, TIFF, or WebP · max 10 MB.</p>
    </div>
  );
}
