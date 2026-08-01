import { useState } from 'react';
import { Loader2, ImageOff, Hourglass } from 'lucide-react';
import type { DicomImage } from '../types';
import { resolveAssetUrl } from '../utils/dicomAssets';

interface DicomInstanceThumbnailProps {
  image: DicomImage;
  onOpen: (image: DicomImage) => void;
}

/**
 * One DICOM instance tile. Renders `thumbnail_url` when present; otherwise a
 * status placeholder driven by `assets.status` (pending = still generating,
 * failed = no preview). Always clickable — the viewer handles the pending/failed
 * detail and still offers the DICOM download.
 */
export default function DicomInstanceThumbnail({ image, onOpen }: DicomInstanceThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const { instance } = image;
  const thumb = resolveAssetUrl(instance.assets.thumbnail_url);
  const showImage = Boolean(thumb) && !imgError;
  const teeth = instance.tooth_numbers ?? [];

  return (
    <button
      type="button"
      onClick={() => onOpen(image)}
      className="group relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-[#E2E8F0] hover:border-[#3A6EA5] transition-colors"
      title={`View image #${instance.instance_number ?? instance.id}`}
    >
      {showImage ? (
        <img
          src={thumb}
          alt={`DICOM instance ${instance.instance_number ?? instance.id}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0F172A] text-white/60">
          {instance.assets.status === 'failed' ? (
            <>
              <ImageOff className="w-8 h-8 text-white/40" />
              <span className="text-[10px] font-semibold">Preview unavailable</span>
            </>
          ) : (
            <>
              <Hourglass className="w-7 h-7 text-white/40" />
              <span className="text-[10px] font-semibold">Preparing…</span>
            </>
          )}
        </span>
      )}

      {/* Pending shimmer over an existing thumbnail (web JPEG not ready yet). */}
      {showImage && instance.assets.status === 'pending' && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-bold">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Preparing
        </span>
      )}

      {/* Tooth badge */}
      {teeth.length > 0 && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-[#2FB9A7]/90 text-white text-[9px] font-bold">
          {teeth.length === 1 ? `#${teeth[0]}` : `${teeth.length} teeth`}
        </span>
      )}

      {/* Instance number caption */}
      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-left text-[10px] font-semibold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
        #{instance.instance_number ?? instance.id}
        {instance.rows && instance.columns ? ` · ${instance.columns}×${instance.rows}` : ''}
      </span>
    </button>
  );
}
