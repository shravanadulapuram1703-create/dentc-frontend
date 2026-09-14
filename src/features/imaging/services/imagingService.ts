import {
  uploadPatientDocument,
  deletePatientDocument,
} from '@/api/generated/endpoints/patients/patients';
import {
  listImageGroups,
  createImageGroup,
  listImageDetails,
  createImageDetail,
  updateImageDetail,
  deleteImageDetail,
} from '@/api/generated/endpoints/imaging/imaging';
import type {
  PatientDocumentRead,
  ImageGroupRead,
  ImageDetailRead,
  DicomInstanceOut,
} from '@/api/generated/model';
import { customInstance } from '@/api/mutator/axiosInstance';
import {
  IMAGING_GROUP_NAME,
  IMAGING_GROUP_TYPE,
  IMAGING_GROUP_SOURCE,
  LIST_SIZE,
} from '../constants';
import { formatTeeth } from '../utils/toothCodes';

/**
 * Imperative imaging API wrapper around the generated Orval client (no raw axios).
 * Read-side composition lives in `useImagingGallery`; this module owns the
 * mutations and the per-patient image-group bookkeeping that ties tooth metadata
 * (`image-details`) to the stored binary (`patient-documents`).
 */

export interface UploadImageInput {
  file: File;
  patient_id: number;
  office_id?: number | null;
  category?: string | null;
  description?: string | null;
}

/** Upload image bytes through the backend's binary store. Returns the stored document. */
export const uploadImage = ({
  file,
  patient_id,
  office_id,
  category,
  description,
}: UploadImageInput): Promise<PatientDocumentRead> =>
  uploadPatientDocument({
    file,
    patient_id,
    office_id: office_id ?? null,
    document_type: category ?? null,
    description: description ?? null,
  });

export interface UploadCaptureInput {
  file: File;
  patient_id: number;
  modality?: string | null;
  description?: string | null;
}

/**
 * Upload a freshly captured image/DICOM file to the patient's DICOM archive
 * ("Scanned Imaging" — DicomStudy/Series/Instance), not the patient-documents
 * store `uploadImage` above writes to. Hand-written against the real route
 * (`POST /{patient_id}/imaging/captures`, operation_id
 * create_patient_imaging_capture) rather than going through Orval: that route
 * already exists on the backend, but the checked-in generated client hasn't
 * been synced against the current schema for it, and a full `npm run api:sync`
 * right now touches 700+ unrelated files across the app (separate, pre-existing
 * drift). Mirrors uploadPatientDocument's own generated shape exactly — same
 * customInstance call, same multipart building — so it's a drop-in replacement
 * once a real client sync happens.
 */
export const uploadCapture = ({
  file,
  patient_id,
  modality,
  description,
}: UploadCaptureInput): Promise<DicomInstanceOut> => {
  const formData = new FormData();
  formData.append('file', file);
  if (modality != null) formData.append('modality', modality);
  if (description != null) formData.append('description', description);

  return customInstance<DicomInstanceOut>({
    url: `/api/v1/patients/${patient_id}/imaging/captures`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
};

/**
 * Tag (or clear) the teeth associated with one scanned/captured DICOM
 * instance. Same hand-written-against-the-real-route situation as
 * `uploadCapture` above — `PATCH /dicom-instances/{sop}/tooth-numbers` is a
 * new backend endpoint not yet in the generated client.
 */
export const updateDicomInstanceToothNumbers = (
  sopInstanceUid: string,
  toothNumbers: number[],
): Promise<DicomInstanceOut> =>
  customInstance<DicomInstanceOut>({
    url: `/api/v1/dicom-instances/${sopInstanceUid}/tooth-numbers`,
    method: 'PATCH',
    data: { tooth_numbers: toothNumbers },
  });

/**
 * Delete an image: remove the stored binary and, if present, its metadata row.
 * The detail delete is best-effort — an orphaned binary delete still succeeds.
 */
export const deleteImage = async (
  documentId: number,
  detailId?: number | null,
): Promise<void> => {
  await deletePatientDocument(documentId);
  if (detailId != null) {
    try {
      await deleteImageDetail(detailId);
    } catch {
      // Metadata row already gone or unreachable — the binary is the source of
      // truth for the gallery, so don't fail the whole delete on this.
    }
  }
};

/**
 * Find the patient's single imaging metadata group, creating it on first use.
 * `image-details` is not patient-scoped, so this group is the only patient-level
 * handle the imaging API exposes.
 */
export const ensureImagingGroup = async (
  patientId: number,
  officeId?: number | null,
): Promise<ImageGroupRead> => {
  const existing = await findImagingGroup(patientId);
  if (existing) return existing;
  return createImageGroup({
    patient_id: patientId,
    office_id: officeId ?? null,
    name: IMAGING_GROUP_NAME,
    group_type: IMAGING_GROUP_TYPE,
    source: IMAGING_GROUP_SOURCE,
  });
};

/** Locate the imaging group for a patient (the named one wins if several exist). */
export const findImagingGroup = async (
  patientId: number,
): Promise<ImageGroupRead | null> => {
  const res = await listImageGroups({ patient_id: patientId, size: LIST_SIZE });
  const groups = (res.items ?? []).filter((g) => !g.is_deleted);
  if (groups.length === 0) return null;
  return groups.find((g) => g.name === IMAGING_GROUP_NAME) ?? groups[0] ?? null;
};

/** Fetch the metadata rows under an image group. */
export const fetchGroupDetails = async (
  groupId: number,
): Promise<ImageDetailRead[]> => {
  const res = await listImageDetails({ image_group_id: groupId, size: LIST_SIZE });
  return (res.items ?? []).filter((d) => !d.is_deleted);
};

export interface SaveToothAssociationInput {
  document: PatientDocumentRead;
  detail?: ImageDetailRead;
  teeth: string[];
  notes?: string | null;
  office_id?: number | null;
}

/**
 * Persist tooth association + notes for an image. Updates the existing metadata
 * row when present, otherwise lazily creates the patient's imaging group and a
 * new row joined to the document by `tile_id = String(document.id)`.
 */
export const saveToothAssociation = async ({
  document,
  detail,
  teeth,
  notes,
  office_id,
}: SaveToothAssociationInput): Promise<ImageDetailRead> => {
  const teethStr = formatTeeth(teeth);
  if (detail) {
    return updateImageDetail(detail.id, {
      teeth: teethStr || null,
      notes: notes ?? null,
    });
  }
  const group = await ensureImagingGroup(document.patient_id, office_id ?? document.office_id);
  return createImageDetail({
    image_group_id: group.id,
    tile_id: String(document.id),
    filename: document.file_name,
    file_size: document.file_size ?? null,
    teeth: teethStr || null,
    notes: notes ?? null,
    office_id: office_id ?? document.office_id ?? null,
  });
};
