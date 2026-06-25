/**
 * Imaging categories stored on `patient_document.document_type`. Configurable
 * here — adding a value makes it selectable on upload and as a gallery filter.
 */
export const IMAGING_CATEGORIES = [
  'X-Ray',
  'Bitewing',
  'Panoramic',
  'Periapical',
  'Intraoral Photo',
  'Treatment Photo',
  'Document',
  'Other',
] as const;

export type ImagingCategory = (typeof IMAGING_CATEGORIES)[number];

export const DEFAULT_CATEGORY: ImagingCategory = 'X-Ray';

/** A document counts as an "image" for the gallery when its content type starts with this. */
export const IMAGE_CONTENT_PREFIX = 'image/';

/** Mirror of the 10 MB cap used by Patient Documents. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Accepted image MIME types (DICOM intentionally deferred to a later phase). */
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
] as const;

/** Extension fallback for files whose content_type is missing or generic. */
export const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp'] as const;

/** `accept` attribute for the file picker. */
export const FILE_ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(',');

/** Name of the single per-patient image group that holds imaging metadata rows. */
export const IMAGING_GROUP_NAME = 'Patient Imaging';

/** `image_group.group_type` / `source` markers for groups this feature creates. */
export const IMAGING_GROUP_TYPE = 'imaging';
export const IMAGING_GROUP_SOURCE = 'dentc-frontend';

/** Backend list endpoints cap `size` at 200. */
export const LIST_SIZE = 200;

// ---------------------------------------------------------------------------
// Device-scan / imaging-agent
// ---------------------------------------------------------------------------

/** Acquisition modalities offered in the capture tab (sent as `scan_type`). */
export const SCAN_TYPES = [
  { value: 'periapical', label: 'Periapical' },
  { value: 'bitewing', label: 'Bitewing' },
  { value: 'panoramic', label: 'Panoramic' },
  { value: 'cephalometric', label: 'Cephalometric' },
  { value: 'cbct', label: 'CBCT (3D)' },
] as const;

export const DEFAULT_SCAN_TYPE = SCAN_TYPES[0].value;

/** Product name of the local agent, shown in the setup/status UI. */
export const AGENT_NAME = 'DentC Imaging Agent';

// React Query cache keys (match the generated query keys these endpoints use).
export const PATIENT_DOCUMENTS_KEY = '/api/v1/patient-documents';
export const IMAGE_GROUPS_KEY = '/api/v1/image-groups';
export const IMAGE_DETAILS_KEY = '/api/v1/image-details';
