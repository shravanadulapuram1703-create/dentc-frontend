import { useMemo, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { ImageIcon, RefreshCw } from 'lucide-react';
import type { GalleryImage } from '../types';
import { useImagingGallery } from '../hooks/useImagingGallery';
import { useImageDelete } from '../hooks/useImageMutations';
import ImageGallery from './ImageGallery';
import UploadButton from './UploadButton';
import ScanButton from './ScanButton';
import CategoryFilter from './CategoryFilter';
import ImageViewer from './ImageViewer';
import ToothAssociationPanel from './ToothAssociationPanel';

interface PatientData {
  id: string;
  name: string;
  dob?: string;
  age?: number;
  officeId?: string;
}
interface OutletContext {
  patient: PatientData;
}

/** Patient Imaging workspace — route container at /patient/:patientId/imaging. */
export default function ImagingWorkspace() {
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  const numericPatientId = Number(patientId ?? patient.id);
  const validId = Number.isFinite(numericPatientId);
  const officeId = patient.officeId ? Number(patient.officeId) : undefined;

  const { images, isLoading, isError, refetch } = useImagingGallery(numericPatientId);
  const { remove, deletingId } = useImageDelete();

  const [category, setCategory] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<GalleryImage | null>(null);
  const [associatingImage, setAssociatingImage] = useState<GalleryImage | null>(null);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const img of images) {
      const key = img.document.document_type ?? 'Other';
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, [images]);

  const filtered = useMemo(
    () =>
      category === null
        ? images
        : images.filter((img) => img.document.document_type === category),
    [images, category],
  );

  const handleDelete = (image: GalleryImage) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    void remove(image.document.id, image.detail?.id ?? null);
  };

  if (!validId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC] text-sm text-[#64748B]">
        Missing patient context. Reopen the patient and try again.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#3A6EA5]/10 to-[#2FB9A7]/10 rounded-lg">
                <ImageIcon className="w-6 h-6 text-[#3A6EA5]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Patient Imaging</h1>
                <p className="text-sm text-[#64748B]">{patient.name}</p>
              </div>
            </div>
            <ScanButton
              patientId={numericPatientId}
              officeId={officeId}
              onCaptured={(doc) => {
                const img = images.find((i) => i.document.id === doc.id);
                if (img) setViewerImage(img);
              }}
            />
          </div>
        </div>

        {/* Upload */}
        <UploadButton patientId={numericPatientId} officeId={officeId} />

        {/* Gallery card */}
        <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CategoryFilter
              value={category}
              onChange={setCategory}
              counts={counts}
              total={images.length}
            />
            <button
              type="button"
              onClick={refetch}
              disabled={isLoading}
              className="p-2 rounded-md hover:bg-[#F1F5F9] transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <ImageGallery
            images={filtered}
            isLoading={isLoading}
            isError={isError}
            deletingId={deletingId}
            onRetry={refetch}
            onOpen={setViewerImage}
            onAssociate={setAssociatingImage}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {viewerImage && (
        <ImageViewer
          image={viewerImage}
          onClose={() => setViewerImage(null)}
          onAssociate={(img) => setAssociatingImage(img)}
        />
      )}

      {associatingImage && (
        <ToothAssociationPanel
          image={associatingImage}
          officeId={officeId}
          onClose={() => setAssociatingImage(null)}
        />
      )}
    </div>
  );
}
