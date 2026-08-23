import { ChevronDown, Calendar, Layers, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { DicomImage, DicomStudyOut } from '../types';
import {
  flattenStudy,
  formatStudyDate,
  formatStudyTime,
  modalityLabel,
  studyTitle,
} from '../utils/dicomAssets';
import DicomInstanceThumbnail from './DicomInstanceThumbnail';

interface DicomStudyCardProps {
  study: DicomStudyOut;
  /** Controlled by the parent so Expand All / Collapse All can drive every card. */
  open: boolean;
  onToggle: (studyInstanceUid: string) => void;
  onOpen: (image: DicomImage) => void;
}

/**
 * One study (a visit/date) as a collapsible section: header with date,
 * description, modality + image-count chips and provenance badges, and a grid of
 * its instance thumbnails.
 */
export default function DicomStudyCard({ study, open, onToggle, onOpen }: DicomStudyCardProps) {
  const images = flattenStudy(study);
  const time = formatStudyTime(study.study_time);
  const imageCount = study.image_count ?? images.length;

  return (
    <section className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(study.study_instance_uid)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1E293B] truncate">{studyTitle(study)}</span>
            {(study.modalities ?? []).map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full bg-[#1F3A5F]/90 text-white text-[10px] font-bold"
              >
                {modalityLabel(m)}
              </span>
            ))}
            {study.identity_review_required && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#B45309] text-[10px] font-bold"
                title="Data quality: this study's patient identity needs review"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                Identity review
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-[#64748B]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatStudyDate(study.study_date)}
              {time ? ` · ${time}` : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {images.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No images in this study.</p>
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
          {(study.series ?? []).some((s) =>
            (s.instances ?? []).some((i) => i.has_original_attributes),
          ) && (
            <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-[#64748B]">
              <ShieldCheck className="w-3 h-3 text-[#2FB9A7]" />
              Some images in this study were re-identified from the legacy archive.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
