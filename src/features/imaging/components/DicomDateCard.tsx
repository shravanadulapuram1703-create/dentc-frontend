import { ChevronDown, Calendar, Layers, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { DicomImage } from '../types';
import { formatStudyDate, formatStudyTime, modalityLabel } from '../utils/dicomAssets';
import DicomInstanceThumbnail from './DicomInstanceThumbnail';

interface DicomDateCardProps {
  dateKey: string;
  images: DicomImage[];
  modalities: string[];
  identityReviewRequired: boolean;
  hasReidentifiedImages: boolean;
  latestTime: string | null;
  /** Controlled by the parent so Expand All / Collapse All can drive every card. */
  open: boolean;
  onToggle: (dateKey: string) => void;
  onOpen: (image: DicomImage) => void;
}

/**
 * One calendar day as a collapsible section: header with date, modality +
 * image-count chips and provenance badges, and a grid of that day's instance
 * thumbnails - merged across however many underlying "studies" the backend
 * happened to record that day (every non-DICOM capture mints its own study,
 * so grouping by date instead is what keeps a multi-shot visit from showing
 * as a wall of single-image sections with an identical generic title).
 */
export default function DicomDateCard({
  dateKey,
  images,
  modalities,
  identityReviewRequired,
  hasReidentifiedImages,
  latestTime,
  open,
  onToggle,
  onOpen,
}: DicomDateCardProps) {
  const time = formatStudyTime(latestTime);

  return (
    <section className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(dateKey)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1E293B] inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              {formatStudyDate(dateKey)}
            </span>
            {modalities.map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full bg-[#1F3A5F]/90 text-white text-[10px] font-bold"
              >
                {modalityLabel(m)}
              </span>
            ))}
            {identityReviewRequired && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#B45309] text-[10px] font-bold"
                title="Data quality: one or more images this day need identity review"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                Identity review
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-[#64748B]">
            {time && <span>{time}</span>}
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {images.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No images on this day.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((image) => (
                <DicomInstanceThumbnail
                  key={image.instance.sop_instance_uid}
                  image={image}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )}
          {hasReidentifiedImages && (
            <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-[#64748B]">
              <ShieldCheck className="w-3 h-3 text-[#2FB9A7]" />
              Some images this day were re-identified from the legacy archive.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
