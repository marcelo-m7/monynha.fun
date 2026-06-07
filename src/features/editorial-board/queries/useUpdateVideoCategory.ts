import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateVideoCategory } from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';
import type { VideoWithCategory } from '@/entities/video/video.types';
import type { Category } from '@/entities/category/category.types';
import { useAuth } from '@/features/auth/useAuth';
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

interface UpdateVideoCategoryVariables {
  videoId: string;
  categoryId: string | null;
  category: Category | null;
}

interface UpdateVideoCategoryContext {
  previousVideos?: VideoWithCategory[];
}

export function useUpdateVideoCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation<unknown, Error, UpdateVideoCategoryVariables, UpdateVideoCategoryContext>({
    mutationFn: async ({ videoId, categoryId }) => updateVideoCategory(videoId, categoryId),
    onMutate: async ({ videoId, categoryId, category }) => {
      const queryKey = videoKeys.editable(user?.id ?? '');
      await queryClient.cancelQueries({ queryKey });

      const previousVideos = queryClient.getQueryData<VideoWithCategory[]>(queryKey);

      queryClient.setQueryData<VideoWithCategory[]>(queryKey, (current = []) =>
        current.map((video) =>
          video.id === videoId
            ? {
                ...video,
                category_id: categoryId,
                category,
              }
            : video,
        ),
      );

      return { previousVideos };
    },
    onError: (error, _variables, context) => {
      if (context?.previousVideos && user) {
        queryClient.setQueryData(videoKeys.editable(user.id), context.previousVideos);
      }
      notify.error(t('editorialBoard.notifications.updateError'), {
        description: error.message,
      });
    },
    onSuccess: () => {
      notify.success(t('editorialBoard.notifications.updateSuccess'));
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: videoKeys.editable(user.id) });
      }
    },
  });
}