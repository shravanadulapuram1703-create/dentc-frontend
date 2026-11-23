import { useState, useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useGetPatientImaging as useGetPatientImagingApi } from '@/api/generated/endpoints/imaging/imaging';
import type { DicomImagingFilters } from '../types';
import { updateDicomInstanceToothNumbers } from '../services/imagingService';
import { errMsg } from '../utils/errorMessage';

/**
 * True for any cached `GET /patients/{id}/imaging` query, any patient, any
 * filter variant. The generated hook's real key is
 * `[`/api/v1/patients/${patientId}/imaging`, ...(filters ? [filters] : [])]`
 * — the patient id is baked into the first element as one combined string,
 * not a separate array entry, so a plain string like '/api/v1/patients'
 * (what this used to export) never matches it via React Query's per-element
 * key comparison: invalidateQueries silently invalidated nothing, ever,
 * which is why captured/tagged images only ever showed up after a hard
 * page refresh (a fresh mount, not a cache invalidation). A predicate is
 * what actually lets one invalidation cover every filter variant without
 * needing to know which one a given screen is currently using.
 */
export const isPatientImagingQueryKey = (queryKey: QueryKey): boolean => {
  const first = queryKey[0];
  return typeof first === 'string' && /^\/api\/v1\/patients\/\d+\/imaging$/.test(first);
};

/** Invalidate every cached patient-imaging query (any patient, any filters). */
export const invalidatePatientImaging = (queryClient: ReturnType<typeof useQueryClient>): void => {
  queryClient.invalidateQueries({ predicate: (query) => isPatientImagingQueryKey(query.queryKey) });
};

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

/** Tag (or clear) the teeth associated with one scanned/captured image. */
export const useDicomToothAssociation = () => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (sopInstanceUid: string, toothNumbers: number[]): Promise<boolean> => {
      setIsSaving(true);
      try {
        await updateDicomInstanceToothNumbers(sopInstanceUid, toothNumbers);
        invalidatePatientImaging(queryClient);
        toast.success('Tooth association saved');
        return true;
      } catch (err) {
        toast.error('Could not save association', {
          description: errMsg(err) || 'Please try again.',
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [queryClient],
  );

  return { save, isSaving };
};
