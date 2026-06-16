import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PatientDocumentRead } from '@/api/generated/model';
import {
  uploadImage,
  deleteImage,
  type UploadImageInput,
} from '../services/imagingService';
import {
  PATIENT_DOCUMENTS_KEY,
  IMAGE_DETAILS_KEY,
  IMAGE_GROUPS_KEY,
} from '../constants';
import { errMsg } from '../utils/errorMessage';

/** Invalidate every query the imaging gallery reads from. */
const useInvalidateImaging = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [PATIENT_DOCUMENTS_KEY] });
    queryClient.invalidateQueries({ queryKey: [IMAGE_DETAILS_KEY] });
    queryClient.invalidateQueries({ queryKey: [IMAGE_GROUPS_KEY] });
  }, [queryClient]);
};

/**
 * Upload an image (manual file or a device-scan blob — both converge here).
 * Returns the stored document so callers can chain (e.g. open tooth panel).
 */
export const useImageUpload = () => {
  const invalidate = useInvalidateImaging();
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (input: UploadImageInput): Promise<PatientDocumentRead | null> => {
      setIsUploading(true);
      try {
        const doc = await uploadImage(input);
        invalidate();
        toast.success('Image uploaded', { description: doc.file_name });
        return doc;
      } catch (err) {
        toast.error('Upload failed', {
          description: errMsg(err) || 'Please try again.',
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [invalidate],
  );

  return { upload, isUploading };
};

/** Delete an image (binary + its metadata row). */
export const useImageDelete = () => {
  const invalidate = useInvalidateImaging();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const remove = useCallback(
    async (documentId: number, detailId?: number | null): Promise<boolean> => {
      setDeletingId(documentId);
      try {
        await deleteImage(documentId, detailId);
        invalidate();
        toast.success('Image deleted');
        return true;
      } catch (err) {
        toast.error('Delete failed', {
          description: errMsg(err) || 'Please try again.',
        });
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [invalidate],
  );

  return { remove, deletingId };
};
