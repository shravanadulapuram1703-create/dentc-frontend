import { env } from '@/shared/config/env';
import type { DicomImage, DicomStudyOut, PatientImagingResponse } from '../types';

/**
 * Resolve a self-authorising asset URL from the tree (`/api/v1/dicom-instances/
 * …?token=…`) to an absolute href. The backend serves relative paths from the
 * API origin; `env.apiBaseUrl` has no `/api/v1` suffix so this simply prefixes
 * the origin. Absolute (signed GCS) URLs pass through untouched.
 */
export const resolveAssetUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `${env.apiBaseUrl}${url}`;
};

/** Human labels for the modality codes the archive uses (contract §3.1). */
export const MODALITY_LABELS: Record<string, string> = {
  IO: 'Intra-oral',
  PX: 'Panoramic',
  XC: 'Photo / Imported',
};

export const modalityLabel = (code: string | null | undefined): string =>
  code ? (MODALITY_LABELS[code] ?? code) : 'Image';

/** Format a study's `YYYY-MM-DD` date without tripping the UTC off-by-one. */
export const formatStudyDate = (date: string | null | undefined): string => {
  if (!date) return 'Undated';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Format a DICOM `study_time` (HHMMSS) as `HH:MM`. */
export const formatStudyTime = (time: string | null | undefined): string | null => {
  if (!time) return null;
  const m = /^(\d{2})(\d{2})/.exec(time);
  return m ? `${m[1]}:${m[2]}` : null;
};

/** A stable, human title for a study section. */
export const studyTitle = (study: DicomStudyOut): string =>
  study.description?.trim() ||
  (study.modalities && study.modalities.length > 0
    ? study.modalities.map(modalityLabel).join(', ')
    : 'Study');

/** Flatten one study's series/instances into gallery images (ordered by the tree). */
export const flattenStudy = (study: DicomStudyOut): DicomImage[] =>
  (study.series ?? []).flatMap((series) =>
    (series.instances ?? []).map((instance) => ({ instance, series, study })),
  );

/** Flatten the whole tree into gallery images (studies stay newest-first). */
export const flattenImaging = (data: PatientImagingResponse | undefined): DicomImage[] =>
  (data?.studies ?? []).flatMap(flattenStudy);

/** One calendar day's worth of images, merged across whatever underlying
 * "studies" they came from (properties combined across all of them). */
export interface DateGroup {
  /** Raw `study_date` ("YYYY-MM-DD"), or "undated" when a study has none. */
  dateKey: string;
  images: DicomImage[];
  modalities: string[];
  identityReviewRequired: boolean;
  hasReidentifiedImages: boolean;
  latestTime: string | null;
}

/**
 * Group flattened images by calendar day rather than by underlying study.
 * Every non-DICOM capture (a camera photo, no real DICOM StudyInstanceUID to
 * reuse) mints its own synthetic study server-side, so without this a day
 * with 10 captures shows as 10 separate single-image sections with the same
 * generic title instead of one section for that visit. Order follows
 * `images`' own order (studies arrive newest-first, so this stays
 * newest-first too as long as same-day studies are adjacent in the tree,
 * which the backend's date-ordered study list guarantees).
 */
export const groupImagesByDate = (images: DicomImage[]): DateGroup[] => {
  const map = new Map<string, DateGroup>();
  for (const image of images) {
    const key = image.study.study_date || 'undated';
    let group = map.get(key);
    if (!group) {
      group = {
        dateKey: key,
        images: [],
        modalities: [],
        identityReviewRequired: false,
        hasReidentifiedImages: false,
        latestTime: null,
      };
      map.set(key, group);
    }
    group.images.push(image);
    for (const m of image.study.modalities ?? []) {
      if (!group.modalities.includes(m)) group.modalities.push(m);
    }
    if (image.study.identity_review_required) group.identityReviewRequired = true;
    if (image.instance.has_original_attributes) group.hasReidentifiedImages = true;
    const t = image.study.study_time;
    if (t && (!group.latestTime || t > group.latestTime)) group.latestTime = t;
  }
  return Array.from(map.values());
};
