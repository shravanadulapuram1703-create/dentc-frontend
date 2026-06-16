import type { PatientDocumentRead } from '@/api/generated/model';
import { env } from '@/shared/config/env';
import {
  ACCEPTED_EXTENSIONS,
  IMAGE_CONTENT_PREFIX,
  IMAGING_CATEGORIES,
} from '../constants';

const IMAGING_CATEGORY_SET = new Set<string>(IMAGING_CATEGORIES);

/**
 * Whether a patient document should appear in the imaging gallery.
 * Primary signal is the content type (`image/*`); falls back to the imaging
 * category set and finally a file-extension check when content_type is missing.
 */
export const isImageDocument = (doc: PatientDocumentRead): boolean => {
  const ct = doc.content_type?.toLowerCase() ?? '';
  if (ct.startsWith(IMAGE_CONTENT_PREFIX)) return true;
  if (doc.document_type && IMAGING_CATEGORY_SET.has(doc.document_type)) return true;
  const ext = doc.file_name?.split('.').pop()?.toLowerCase();
  return ext ? (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) : false;
};

/**
 * Resolve a stored document's URL to an absolute href. Backend returns relative
 * `/uploads/...` paths served from the API origin (same rule as Patient Documents).
 */
export const fileHref = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `${env.apiBaseUrl}${url}`;
