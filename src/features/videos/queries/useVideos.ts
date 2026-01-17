import { useQuery } from '@tanstack/react-query';
import {
  getVideoById,
  getVideoCount,
  listFeaturedVideos,
  listRecentVideos,
  listRelatedVideos,
  listVideos,
} from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';
import type { VideoListParams } from '@/entities/video/video.keys';
import type { VideoWithCategory } from '@/entities/video/video.types';

interface UseVideosOptions extends VideoListParams {
  enabled?: boolean;
}

export function useVideos(options: UseVideosOptions = {}) {
  const { enabled = true, ...params } = options;

  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.list(params),
    queryFn: () => listVideos(params),
    enabled,
  });
}

export function useVideoById(id: string | undefined) {
  return useQuery<VideoWithCategory | null, Error>({
    queryKey: id ? videoKeys.detail(id) : videoKeys.detail(''),
    queryFn: async () => {
      if (!id) return null;
      return getVideoById(id);
    },
    enabled: !!id,
  });
}

export function useRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.related(currentVideoId, categoryId, limit),
    queryFn: () => listRelatedVideos(currentVideoId, categoryId, limit),
    enabled: !!categoryId,
  });
}

export function useFeaturedVideos(limit = 4) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.featured(limit),
    queryFn: () => listFeaturedVideos(limit),
  });
}

export function useRecentVideos(limit = 4) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.recent(limit),
    queryFn: () => listRecentVideos(limit),
  });
}

export function useVideoCount() {
  return useQuery<number, Error>({
    queryKey: videoKeys.count(),
    queryFn: () => getVideoCount(),
  });
}
