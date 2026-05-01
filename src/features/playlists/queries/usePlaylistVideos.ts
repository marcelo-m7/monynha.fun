import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import type { PlaylistVideo } from '@/entities/playlist/playlist.types';
import { addVideoToPlaylist, listPlaylistVideos, removeVideoFromPlaylist, reorderPlaylistVideos } from '@/entities/playlist/playlist.api';

export function usePlaylistVideos(playlistId: string | undefined) {
  return useQuery<PlaylistVideo[], Error>({
    queryKey: playlistId ? playlistKeys.videos(playlistId) : playlistKeys.videos(''),
    queryFn: async () => {
      if (!playlistId) return [];
      return listPlaylistVideos(playlistId);
    },
    enabled: !!playlistId,
  });
}

export function useAddVideoToPlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation<PlaylistVideo, Error, { playlistId: string; videoId: string; notes?: string }>({
    mutationFn: async ({ playlistId, videoId, notes }) => {
      return addVideoToPlaylist({ playlistId, videoId, notes: notes ?? null, userId: user?.id ?? null });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.detail(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success(t('playlists.feedback.addVideoSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.addVideoError'), { description: error.message });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, { playlistId: string; videoId: string }>({
    mutationFn: async ({ playlistId, videoId }) => {
      return removeVideoFromPlaylist({ playlistId, videoId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.detail(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success(t('playlists.feedback.removeVideoSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.removeVideoError'), { description: error.message });
    },
  });
}

export function useReorderPlaylistVideos() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, { playlistId: string; orderedVideoIds: string[] }>({
    mutationFn: async ({ playlistId, orderedVideoIds }) => {
      return reorderPlaylistVideos({ playlistId, orderedVideoIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      toast.success(t('playlists.feedback.reorderSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.reorderError'), { description: error.message });
    },
  });
}
