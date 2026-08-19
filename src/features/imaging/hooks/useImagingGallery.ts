import { useMemo } from 'react';
import { useListPatientDocuments } from '@/api/generated/endpoints/patients/patients';
import {
  useListImageGroups,
  useListImageDetails,
} from '@/api/generated/endpoints/imaging/imaging';
import type { ImageDetailRead } from '@/api/generated/model';
import type { GalleryImage } from '../types';
import {
  IMAGING_GROUP_NAME,
  LIST_SIZE,
} from '../constants';
import { isImageDocument } from '../utils/imageFilters';

interface UseImagingGalleryResult {
  images: GalleryImage[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Read-side composition for the gallery. Binary documents drive the list; the
 * per-patient imaging group + its detail rows supply tooth/notes metadata,
 * joined to each document by `tile_id === String(document.id)`.
 */
export const useImagingGallery = (patientId: number): UseImagingGalleryResult => {
  const validId = Number.isFinite(patientId);

  const docsQuery = useListPatientDocuments(
    { patient_id: patientId, size: LIST_SIZE },
    { query: { enabled: validId } },
  );

  const groupsQuery = useListImageGroups(
    { patient_id: patientId, size: LIST_SIZE },
    { query: { enabled: validId } },
  );

  const group = useMemo(() => {
    const groups = (groupsQuery.data?.items ?? []).filter((g) => !g.is_deleted);
    if (groups.length === 0) return undefined;
    return groups.find((g) => g.name === IMAGING_GROUP_NAME) ?? groups[0];
  }, [groupsQuery.data]);

  const detailsQuery = useListImageDetails(
    { image_group_id: group?.id ?? 0, size: LIST_SIZE },
    { query: { enabled: validId && group?.id != null } },
  );

  const images = useMemo<GalleryImage[]>(() => {
    const documents = (docsQuery.data?.items ?? [])
      .filter((d) => !d.is_deleted)
      .filter(isImageDocument);

    const details = (detailsQuery.data?.items ?? []).filter((d) => !d.is_deleted);
    const detailByTileId = new Map<string, ImageDetailRead>();
    for (const detail of details) {
      if (detail.tile_id) detailByTileId.set(detail.tile_id, detail);
    }

    return documents
      .map((document) => ({
        document,
        detail: detailByTileId.get(String(document.id)),
      }))
      .sort(
        (a, b) =>
          new Date(b.document.created_at).getTime() -
          new Date(a.document.created_at).getTime(),
      );
  }, [docsQuery.data, detailsQuery.data]);

  const refetch = () => {
    docsQuery.refetch();
    groupsQuery.refetch();
    if (group?.id != null) detailsQuery.refetch();
  };

  return {
    images,
    isLoading: docsQuery.isLoading || groupsQuery.isLoading,
    isError: docsQuery.isError,
    refetch,
  };
};
