import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

  return useMutation<PlaylistVideo, Error, { playlistId: string; videoId: string; notes?: string }>({
    mutationFn: async ({ playlistId, videoId, notes }) => {
      return addVideoToPlaylist({ playlistId, videoId, notes: notes ?? null, userId: user?.id ?? null });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.detail(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Video added to playlist!');
    },
    onError: (error) => {
      toast.error('Failed to add video to playlist', { description: error.message });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; videoId: string }>({
    mutationFn: async ({ playlistId, videoId }) => {
      return removeVideoFromPlaylist({ playlistId, videoId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.detail(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Video removed from playlist!');
    },
    onError: (error) => {
      toast.error('Failed to remove video from playlist', { description: error.message });
    },
  });
}

export function useReorderPlaylistVideos() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; orderedVideoIds: string[] }>({
    mutationFn: async ({ playlistId, orderedVideoIds }) => {
      return reorderPlaylistVideos({ playlistId, orderedVideoIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.videos(variables.playlistId) });
      toast.success('Playlist reordered successfully!');
    },
    onError: (error) => {
      toast.error('Failed to reorder playlist', { description: error.message });
    },
  });
}
