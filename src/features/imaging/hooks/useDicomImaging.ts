import { useGetPatientImaging as useGetPatientImagingApi } from '@/api/generated/endpoints/imaging/imaging';
import type { DicomImagingFilters } from '../types';

/** Base React Query key segment for the DICOM tree (matches the generated key). */
export const DICOM_IMAGING_KEY = '/api/v1/patients';

/** Strip empty/blank filter values so the query key stays stable and we don't send `modality=`. */
const cleanFilters = (filters?: DicomImagingFilters): DicomImagingFilters | undefined => {
  if (!filters) return undefined;
  const out: DicomImagingFilters = {};
  if (filters.modality) out.modality = filters.modality;
  if (filters.tooth != null) out.tooth = filters.tooth;
  if (filters.date_from) out.date_from = filters.date_from;
  if (filters.date_to) out.date_to = filters.date_to;
  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * Load a patient's DICOM study tree (contract §3.1) via the generated Orval hook,
 * optionally filtered by modality / tooth / date range. Asset URLs carry a 24h
 * token, so we keep data fresh for 5 min and expose `refetch` for the "token
 * expired → refetch the tree" recovery path.
 */
export const useGetPatientImaging = (
  patientId: number,
  filters?: DicomImagingFilters,
) =>
  useGetPatientImagingApi(patientId, cleanFilters(filters), {
    query: {
      enabled: Number.isFinite(patientId) && patientId > 0,
      staleTime: 5 * 60 * 1000,
    },
  });
