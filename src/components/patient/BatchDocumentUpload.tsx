import { useState, useRef } from 'react';
import { Upload, X, File, Check, AlertCircle, Loader } from 'lucide-react';

interface FileWithMetadata {
  id: string;
  file: File;
  documentType: string;
  description: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  progress?: number;
}

interface BatchDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (uploadedFiles: FileWithMetadata[]) => void;
  patientId: string;
  patientName: string;
}

const DOCUMENT_TYPES = [
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
  'Patient Registration Form',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

export default function BatchDocumentUpload({
  isOpen,
  onClose,
  onUploadComplete,
  patientId,
  patientName,
}: BatchDocumentUploadProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10 MB (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only PDF, JPG, PNG, and GIF are allowed';
    }
    return null;
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithMetadata[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      const error = validateFile(file);
      
      newFiles.push({
        id: generateId(),
        file,
        documentType: 'Show All',
        description: '',
        status: error ? 'error' : 'pending',
        errorMessage: error || undefined,
      });
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpdateFile = (fileId: string, updates: Partial<FileWithMetadata>) => {
    setFiles(prev =>
      prev.map(f => (f.id === fileId ? { ...f, ...updates } : f))
    );
  };

  const handleUploadAll = async () => {
    const validFiles = files.filter(f => f.status !== 'error');
    
    if (validFiles.length === 0) {
      alert('No valid files to upload');
      return;
    }

    // Check if all files have document types and descriptions
    const missingInfo = validFiles.some(f => !f.documentType || f.documentType === 'Show All' || !f.description.trim());
    
    if (missingInfo) {
      alert('Please provide document type and description for all files');
      return;
    }

    setIsUploading(true);

    // Simulate upload process for each file
    for (const file of validFiles) {
      handleUpdateFile(file.id, { status: 'uploading', progress: 0 });

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        handleUpdateFile(file.id, { progress });
      }

      // Simulate upload completion
      await new Promise(resolve => setTimeout(resolve, 200));
      handleUpdateFile(file.id, { status: 'success', progress: 100 });
    }

    setIsUploading(false);

    // Wait a moment to show success, then close
    setTimeout(() => {
      onUploadComplete(files.filter(f => f.status === 'success'));
      handleClose();
    }, 1000);
  };

  const handleClose = () => {
    if (isUploading) {
      if (!window.confirm('Upload in progress. Are you sure you want to cancel?')) {
        return;
      }
    }
    setFiles([]);
    setIsUploading(false);
    onClose();
  };

  const getFileIcon = (status: FileWithMetadata['status']) => {
    switch (status) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" strokeWidth={2} />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" strokeWidth={2} />;
      case 'uploading':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" strokeWidth={2} />;
      default:
        return <File className="w-5 h-5 text-slate-600" strokeWidth={2} />;
    }
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-200 bg-slate-50">
          <div>
            <h2 className="font-bold text-slate-900 text-xl">Batch Document Upload</h2>
            <p className="text-sm text-slate-600">
              Upload multiple documents for <span className="font-semibold">{patientName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            title="Close"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Drop Zone */}
        {files.length === 0 && (
          <div className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                Drag & Drop Files Here
              </h3>
              <p className="text-slate-600 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Choose Files
              </button>
              <p className="text-sm text-slate-500 mt-4">
                Supports PDF, JPG, PNG, GIF • Max 10 MB per file
              </p>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <>
            <div className="flex-1 overflow-auto p-6">
              {/* Status Summary */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-700">
                  Total: <span className="text-slate-900">{files.length}</span>
                </div>
                {pendingCount > 0 && (
                  <div className="text-sm font-semibold text-slate-700">
                    Pending: <span className="text-slate-900">{pendingCount}</span>
                  </div>
                )}
                {successCount > 0 && (
                  <div className="text-sm font-semibold text-green-700">
                    Success: <span className="text-green-900">{successCount}</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="text-sm font-semibold text-red-700">
                    Errors: <span className="text-red-900">{errorCount}</span>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  Add More
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Files */}
              <div className="space-y-3">
                {files.map(fileData => (
                  <div
                    key={fileData.id}
                    className={`border-2 rounded-lg p-4 ${
                      fileData.status === 'error'
                        ? 'border-red-200 bg-red-50'
                        : fileData.status === 'success'
                        ? 'border-green-200 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="mt-1">{getFileIcon(fileData.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {fileData.file.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB • {fileData.file.type}
                        </div>
                        {fileData.errorMessage && (
                          <div className="text-sm text-red-600 font-medium mt-1">
                            {fileData.errorMessage}
                          </div>
                        )}
                        {fileData.status === 'uploading' && fileData.progress !== undefined && (
                          <div className="mt-2">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${fileData.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{fileData.progress}%</div>
                          </div>
                        )}
                      </div>
                      {!isUploading && fileData.status !== 'success' && (
                        <button
                          onClick={() => handleRemoveFile(fileData.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="w-5 h-5" strokeWidth={2} />
                        </button>
                      )}
                    </div>

                    {fileData.status !== 'error' && fileData.status !== 'success' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Document Type *
                          </label>
                          <select
                            value={fileData.documentType}
                            onChange={e =>
                              handleUpdateFile(fileData.id, { documentType: e.target.value })
                            }
                            disabled={isUploading}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          >
                            {DOCUMENT_TYPES.map(type => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={fileData.description}
                            onChange={e =>
                              handleUpdateFile(fileData.id, { description: e.target.value })
                            }
                            disabled={isUploading}
                            placeholder="Brief description..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t-2 border-slate-200 bg-slate-50">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Cancel' : 'Close'}
              </button>
              <button
                onClick={handleUploadAll}
                disabled={isUploading || files.filter(f => f.status === 'pending').length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" strokeWidth={2} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" strokeWidth={2} />
                    Upload All ({pendingCount})
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
