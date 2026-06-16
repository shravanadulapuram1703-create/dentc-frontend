import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  saveToothAssociation,
  type SaveToothAssociationInput,
} from '../services/imagingService';
import { IMAGE_DETAILS_KEY, IMAGE_GROUPS_KEY } from '../constants';
import { errMsg } from '../utils/errorMessage';

/** Persist tooth association + notes for one image. */
export const useToothAssociation = () => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (input: SaveToothAssociationInput): Promise<boolean> => {
      setIsSaving(true);
      try {
        await saveToothAssociation(input);
        queryClient.invalidateQueries({ queryKey: [IMAGE_DETAILS_KEY] });
        queryClient.invalidateQueries({ queryKey: [IMAGE_GROUPS_KEY] });
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
