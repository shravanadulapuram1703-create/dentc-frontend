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
