// Patient profile photo (PO-10). The image is an ordinary patient-documents row
// (document_type `PH` = "Patient Photo") and `patients.photo_document_id` points
// at it. There is no dedicated photo endpoint yet (PHOTO-BE-1), so saving is two
// calls: upload the document, then PATCH the patient to link it.

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  updatePatient,
  uploadPatientDocument,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientRead } from "@/api/generated/model";
import { fetchAssetBlob } from "@/services/documentAccess";

/** `key1` of the "Patient Photo" row in the `document_type` definitions group. */
export const PATIENT_PHOTO_DOCUMENT_TYPE = "PH";

/** Stored photos are square JPEGs of this edge length — plenty for a header avatar and print. */
export const PATIENT_PHOTO_SIZE = 640;

export function patientPhotoContentUrl(photo_document_id: number): string {
  return `/api/v1/patient-documents/${photo_document_id}/content`;
}

/** Query key for the photo bytes — shared so the header and Overview fetch once. */
export function patientPhotoQueryKey(photo_document_id: number | null | undefined) {
  return ["/api/v1/patient-documents", photo_document_id ?? null, "content"] as const;
}

/**
 * Object URL for a patient's photo, or "" when there is none / it failed.
 * The blob is cached in react-query; each caller owns (and revokes) its own
 * object URL.
 */
export function usePatientPhotoUrl(photo_document_id: number | null | undefined): {
  src: string;
  loading: boolean;
} {
  const query = useQuery({
    queryKey: patientPhotoQueryKey(photo_document_id),
    queryFn: () => fetchAssetBlob(patientPhotoContentUrl(photo_document_id as number)),
    enabled: photo_document_id != null,
    staleTime: Infinity,
    retry: 1,
  });

  const [src, setSrc] = useState("");
  const blob = photo_document_id != null ? query.data : undefined;
  useEffect(() => {
    if (!blob) {
      setSrc("");
      return;
    }
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return { src, loading: query.isLoading && photo_document_id != null };
}

/**
 * Center-crops an image to a square and re-encodes it as a JPEG. Phone/tablet
 * photos are 3-12 MB; the stored avatar should be ~100 KB.
 */
export async function toSquareJpeg(
  source: Blob | HTMLVideoElement,
  size = PATIENT_PHOTO_SIZE,
): Promise<Blob> {
  let drawable: CanvasImageSource;
  let width: number;
  let height: number;
  let cleanup = () => {};

  if (source instanceof HTMLVideoElement) {
    drawable = source;
    width = source.videoWidth;
    height = source.videoHeight;
  } else {
    // <img> honours EXIF orientation when drawn to a canvas in current
    // browsers, so portrait iPad shots come out upright.
    const url = URL.createObjectURL(source);
    cleanup = () => URL.revokeObjectURL(url);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      cleanup();
      throw new Error("That file couldn't be read as an image.");
    }
    drawable = img;
    width = img.naturalWidth;
    height = img.naturalHeight;
  }

  try {
    if (!width || !height) throw new Error("The camera hasn't produced a frame yet.");
    const edge = Math.min(width, height);
    const out = Math.min(size, edge);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing isn't available in this browser.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(drawable, (width - edge) / 2, (height - edge) / 2, edge, edge, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't encode the photo."))),
        "image/jpeg",
        0.9,
      ),
    );
  } finally {
    cleanup();
  }
}

/** Upload the photo as a patient document and link it to the patient. */
export async function savePatientPhoto({
  patient_id,
  office_id,
  image,
}: {
  patient_id: number;
  office_id: number | null;
  image: Blob;
}): Promise<PatientRead> {
  const file = new File([image], `patient-photo-${patient_id}.jpg`, { type: "image/jpeg" });
  const doc = await uploadPatientDocument({
    file,
    patient_id,
    office_id,
    document_type: PATIENT_PHOTO_DOCUMENT_TYPE,
    description: "Patient photo",
  });
  return updatePatient(patient_id, { photo_document_id: doc.id });
}

/**
 * Unlink the photo. The document row is kept (it stays in Documents as a
 * "Patient Photo") — deleting history is the user's call, not a side effect.
 */
export function removePatientPhoto(patient_id: number): Promise<PatientRead> {
  return updatePatient(patient_id, { photo_document_id: null });
}
