import { useMemo, useState } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import type { GalleryImage } from '../types';
import { useImagingGallery } from '../hooks/useImagingGallery';
import { useImageDelete } from '../hooks/useImageMutations';
import ImageGallery from './ImageGallery';
import UploadButton from './UploadButton';
import CategoryFilter from './CategoryFilter';
import ImageViewer from './ImageViewer';
import ToothAssociationPanel from './ToothAssociationPanel';
import DicomStudySection from './DicomStudySection';

interface ImagesTabProps {
  patientId: number;
  officeId?: number;
}

/** "Images" tab: manual upload + the backend-driven gallery, viewer, and tooth association. */
export default function ImagesTab({ patientId, officeId }: ImagesTabProps) {
  const { images, isLoading, isError, refetch } = useImagingGallery(patientId);
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

  return (
    <div className="space-y-5">
      {/* Scanned imaging (DICOM archive from cloud storage) */}
      <DicomStudySection patientId={patientId} />

      {/* Uploaded images (manual uploads + device captures) */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2FB9A7]/10 rounded-lg">
            <Upload className="w-5 h-5 text-[#2FB9A7]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">Uploaded Images</h2>
            <p className="text-xs text-[#64748B]">Manually uploaded files & device captures</p>
          </div>
        </div>

        <UploadButton patientId={patientId} officeId={officeId} />

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
