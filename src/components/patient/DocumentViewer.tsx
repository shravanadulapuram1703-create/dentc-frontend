import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, Image as ImageIcon, Maximize2 } from 'lucide-react';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType: 'pdf' | 'image';
  noteId?: string;
  uploadedBy?: string;
  uploadedDate?: string;
}

export default function DocumentViewer({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType,
  noteId,
  uploadedBy,
  uploadedDate,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    // In production, this would trigger a secure download
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    // Open print dialog for the document
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border-2 border-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {documentType === 'pdf' ? (
                <FileText className="w-5 h-5 text-blue-700" strokeWidth={2} />
              ) : (
                <ImageIcon className="w-5 h-5 text-blue-700" strokeWidth={2} />
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{documentName}</h2>
              {(uploadedBy || uploadedDate) && (
                <p className="text-sm text-slate-600">
                  {uploadedDate && `Uploaded: ${uploadedDate}`}
                  {uploadedBy && uploadedDate && ' • '}
                  {uploadedBy && `By: ${uploadedBy}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toolbar */}
            {documentType === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" strokeWidth={2} />
                </button>
                <span className="text-sm font-semibold text-slate-700 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" strokeWidth={2} />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="w-5 h-5" strokeWidth={2} />
                </button>
                <div className="w-px h-6 bg-slate-300 mx-2" />
              </>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
            >
              <Download className="w-4 h-4" strokeWidth={2} />
              Download
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div className="flex items-center justify-center min-h-full">
            {documentType === 'pdf' ? (
              <iframe
                src={documentUrl}
                className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg border-2 border-slate-300"
                title={documentName}
              />
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-slate-300 inline-block">
                <img
                  src={documentUrl}
                  alt={documentName}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    transition: 'transform 0.3s ease',
                    maxWidth: '100%',
                    maxHeight: '70vh',
                  }}
                  className="block"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        {noteId && (
          <div className="px-6 py-3 border-t-2 border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Note ID: <span className="font-semibold text-slate-900">{noteId}</span>
              </span>
              <span className="text-slate-600">
                Type: <span className="font-semibold text-slate-900">{documentType.toUpperCase()}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
