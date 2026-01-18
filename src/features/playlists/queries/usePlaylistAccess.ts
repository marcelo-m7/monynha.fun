import { useQuery } from '@tanstack/react-query';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import { checkPlaylistAccess } from '@/entities/playlist/playlist.api';
import { useAuth } from '@/features/auth/useAuth';

export function usePlaylistAccess(playlistId: string | undefined) {
  const { user, loading: authLoading } = useAuth();

  return useQuery<boolean, Error>({
    queryKey: playlistId ? playlistKeys.detail(playlistId).concat(['access', user?.id ?? 'anonymous']) : [],
    queryFn: async () => {
      if (!playlistId) return false;
      return checkPlaylistAccess(playlistId, user?.id);
    },
    enabled: !!playlistId && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
}