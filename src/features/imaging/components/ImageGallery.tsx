import { ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import type { GalleryImage } from '../types';
import ImageThumbnail from './ImageThumbnail';

interface ImageGalleryProps {
  images: GalleryImage[];
  isLoading: boolean;
  isError: boolean;
  deletingId: number | null;
  onRetry: () => void;
  onOpen: (image: GalleryImage) => void;
  onAssociate: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

/** Responsive thumbnail grid with loading / error / empty states. */
export default function ImageGallery({
  images,
  isLoading,
  isError,
  deletingId,
  onRetry,
  onOpen,
  onAssociate,
  onDelete,
}: ImageGalleryProps) {
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#64748B]">Loading images…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#475569] mb-2">Could not load images.</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-[#3A6EA5] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-[#F1F5F9] rounded-full mb-3">
          <ImageIcon className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <p className="text-sm font-semibold text-[#64748B]">No images yet</p>
        <p className="text-xs text-[#94A3B8] mt-1">
          Upload an image or capture one from a connected device to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {images.map((image) => (
        <ImageThumbnail
          key={image.document.id}
          image={image}
          isDeleting={deletingId === image.document.id}
          onOpen={onOpen}
          onAssociate={onAssociate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
