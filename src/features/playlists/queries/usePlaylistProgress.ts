import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import type { PlaylistProgress } from '@/entities/playlist/playlist.types';
import { listPlaylistProgress, markVideoWatched } from '@/entities/playlist/playlist.api';

export function usePlaylistProgress(playlistId: string | undefined) {
  const { user } = useAuth();

  return useQuery<PlaylistProgress[], Error>({
    queryKey: playlistId ? playlistKeys.progress(playlistId, user?.id) : playlistKeys.progress('', user?.id),
    queryFn: async () => {
      if (!playlistId || !user?.id) return [];
      return listPlaylistProgress(playlistId, user.id);
    },
    enabled: !!playlistId && !!user?.id,
  });
}

export function useMarkVideoWatched() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<PlaylistProgress, Error, { playlistId: string; videoId: string; watched: boolean; lastPositionSeconds?: number }>({
    mutationFn: async ({ playlistId, videoId, watched, lastPositionSeconds = 0 }) => {
      if (!user?.id) throw new Error('Must be logged in to track progress');
      return markVideoWatched({
        playlistId,
        userId: user.id,
        videoId,
        watched,
        lastPositionSeconds,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.progress(variables.playlistId, user?.id) });
      toast.success(variables.watched ? 'Video marked as watched!' : 'Video marked as unwatched!');
    },
    onError: (error) => {
      toast.error('Failed to update video progress', { description: error.message });
    },
  });
}
