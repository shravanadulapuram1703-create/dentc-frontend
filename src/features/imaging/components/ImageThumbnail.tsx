import { useState } from 'react';
import { ImageIcon, Trash2, Loader2, Tag } from 'lucide-react';
import type { GalleryImage } from '../types';
import { fileHref } from '../utils/imageFilters';
import { parseTeeth } from '../utils/toothCodes';

interface ImageThumbnailProps {
  image: GalleryImage;
  isDeleting: boolean;
  onOpen: (image: GalleryImage) => void;
  onAssociate: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
}

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Single gallery tile: lazy thumbnail, category + tooth badges, hover actions. */
export default function ImageThumbnail({
  image,
  isDeleting,
  onOpen,
  onAssociate,
  onDelete,
}: ImageThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const { document, detail } = image;
  const teeth = parseTeeth(detail?.teeth);

  return (
    <div className="group relative bg-[#F1F5F9] rounded-lg overflow-hidden border-2 border-[#E2E8F0] hover:border-[#3A6EA5] transition-colors">
      <button
        type="button"
        onClick={() => onOpen(image)}
        className="block w-full aspect-square"
        title="View image"
      >
        {imgError ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-[#CBD5E1]" />
          </span>
        ) : (
          <img
            src={fileHref(document.file_url)}
            alt={document.file_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </button>

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%]">
        {document.document_type && (
          <span className="px-2 py-0.5 rounded-full bg-[#1F3A5F]/90 text-white text-[10px] font-bold">
            {document.document_type}
          </span>
        )}
        {teeth.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#2FB9A7]/90 text-white text-[10px] font-bold inline-flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            {teeth.length === 1 ? `#${teeth[0]}` : `${teeth.length} teeth`}
          </span>
        )}
      </div>

      {/* Hover action bar */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onAssociate(image)}
          className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-[#3A6EA5] shadow-sm"
          title="Associate teeth"
        >
          <Tag className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(image)}
          disabled={isDeleting}
          className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-[#DC2626] shadow-sm disabled:opacity-50"
          title="Delete image"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Caption */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[11px] font-semibold text-white truncate">{document.file_name}</div>
        <div className="text-[10px] text-white/70">{fmtDate(document.created_at)}</div>
      </div>
    </div>
  );
}
