import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUpdateVideoCategory, type BulkVideoActionResult } from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';
import { useAuth } from '@/features/auth/useAuth';
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

interface BulkUpdateVideoCategoryVariables {
  categoryId: string | null;
  videoIds: string[];
}

export function useBulkUpdateVideoCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation<BulkVideoActionResult, Error, BulkUpdateVideoCategoryVariables>({
    mutationFn: async ({ videoIds, categoryId }) => bulkUpdateVideoCategory(videoIds, categoryId),
    onSuccess: (result) => {
      if (result.failedCount === 0) {
        notify.success(
          t('editorialBoard.notifications.bulkCategorySuccess', {
            count: result.successCount,
            defaultValue: `Category updated for ${result.successCount} videos.`,
          }),
        );
      } else {
        notify.warning(t('editorialBoard.notifications.bulkPartialTitle', { defaultValue: 'Partial update' }), {
          description: t('editorialBoard.notifications.bulkPartialDescription', {
            success: result.successCount,
            requested: result.requested,
            defaultValue: `Updated ${result.successCount} of ${result.requested} videos.`,
          }),
        });
      }
    },
    onError: (error) => {
      notify.error(t('editorialBoard.notifications.updateError'), {
        description: error.message,
      });
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: videoKeys.editable(user.id) });
      }
    },
  });
}
