import { useQuery } from '@tanstack/react-query';
import { listEditableVideos } from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';
import type { VideoWithCategory } from '@/entities/video/video.types';
import { useAuth } from '@/features/auth/useAuth';

export function useEditableVideos() {
  const { user } = useAuth();

  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.editable(user?.id ?? ''),
    queryFn: async () => {
      if (!user) return [];
      return listEditableVideos(user.id);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}