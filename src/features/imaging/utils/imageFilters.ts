import type { PatientDocumentRead } from '@/api/generated/model';
import { env } from '@/shared/config/env';
import {
  IMAGING_CATEGORIES,
  LEGACY_SHARED_IMAGING_CATEGORIES,
} from '../constants';

const IMAGING_CATEGORY_SET = new Set<string>(IMAGING_CATEGORIES);
const LEGACY_SHARED_SET = new Set<string>(LEGACY_SHARED_IMAGING_CATEGORIES);

/**
 * Whether a patient document belongs in the Imaging gallery.
 *
 * `patient-documents` is one shared store for every screen, so "is it an
 * image?" (content type / extension) is NOT the test — that pulled insurance
 * cards, photo IDs, note attachments, patient photos and restorative drawings
 * into X-rays (IMG-DOC-1). Ownership is decided by the Imaging-only
 * `document_type` values; legacy generic ones need an Imaging `image-details`
 * row (`tile_id = String(document.id)`) as proof. Replace with a server-side
 * owner filter once the backend adds one (IMG-DOC-2).
 */
export const isImagingDocument = (
  doc: PatientDocumentRead,
  hasImagingDetail: boolean,
): boolean => {
  const type = doc.document_type ?? '';
  if (IMAGING_CATEGORY_SET.has(type)) return true;
  return hasImagingDetail && LEGACY_SHARED_SET.has(type);
};

/** The gallery chip a document files under — legacy generic types fold into "Other Image". */
export const imagingCategoryOf = (doc: PatientDocumentRead): string => {
  const type = doc.document_type ?? '';
  return IMAGING_CATEGORY_SET.has(type) ? type : 'Other Image';
};

/**
 * Resolve a stored document's URL to an absolute href. Backend returns relative
 * `/uploads/...` paths served from the API origin (same rule as Patient Documents).
 */
export const fileHref = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `${env.apiBaseUrl}${url}`;
