import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bulkAddVideosToPlaylist,
  bulkRemoveVideosFromPlaylist,
  type BulkVideoActionResult,
} from '@/entities/video/video.api';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import { videoKeys } from '@/entities/video/video.keys';
import { useAuth } from '@/features/auth/useAuth';
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

interface BulkUpdateVideoPlaylistVariables {
  playlistId: string;
  videoIds: string[];
}

export function useBulkAddVideosToPlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation<BulkVideoActionResult, Error, BulkUpdateVideoPlaylistVariables>({
    mutationFn: async ({ playlistId, videoIds }) => bulkAddVideosToPlaylist(playlistId, videoIds),
    onSuccess: (result) => {
      if (result.failedCount === 0) {
        notify.success(
          t('editorialBoard.notifications.bulkPlaylistAddSuccess', {
            count: result.successCount,
            defaultValue: `Videos added to playlist: ${result.successCount}.`,
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
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
    },
  });
}

export function useBulkRemoveVideosFromPlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation<BulkVideoActionResult, Error, BulkUpdateVideoPlaylistVariables>({
    mutationFn: async ({ playlistId, videoIds }) => bulkRemoveVideosFromPlaylist(playlistId, videoIds),
    onSuccess: (result) => {
      if (result.failedCount === 0) {
        notify.success(
          t('editorialBoard.notifications.bulkPlaylistRemoveSuccess', {
            count: result.successCount,
            defaultValue: `Videos removed from playlist: ${result.successCount}.`,
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
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
    },
  });
}
