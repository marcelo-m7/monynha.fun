import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteVideo,
  getVideoById,
  getVideoCount,
  listFeaturedVideos,
  listRecentVideos,
  listRelatedVideos,
  listVideoSemanticTags,
  listVideos,
  type SemanticTagStat,
  updateVideo,
} from '@/entities/video/video.api';
import { videoKeys } from '@/entities/video/video.keys';
import type { VideoListParams } from '@/entities/video/video.keys';
import type { Video, VideoUpdate, VideoWithCategory } from '@/entities/video/video.types';
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

interface UseVideosOptions extends VideoListParams {
  enabled?: boolean;
}

interface UseInfiniteVideosOptions extends Omit<VideoListParams, 'offset' | 'limit'> {
  enabled?: boolean;
  pageSize?: number;
}

export function useVideos(options: UseVideosOptions = {}) {
  const { enabled = true, ...params } = options;

  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.list(params),
    queryFn: () => listVideos(params),
    enabled,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useInfiniteVideos(options: UseInfiniteVideosOptions = {}) {
  const { enabled = true, pageSize = 24, ...params } = options;

  return useInfiniteQuery<
    VideoWithCategory[],
    Error,
    VideoWithCategory[],
    ReturnType<typeof videoKeys.infiniteList>,
    number
  >({
    queryKey: videoKeys.infiniteList({ ...params, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      listVideos({
        ...params,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    enabled,
    staleTime: 60_000,
    retry: 2,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
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
    staleTime: 60_000,
  });
}

export function useRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.related(currentVideoId, categoryId, limit),
    queryFn: () => listRelatedVideos(currentVideoId, categoryId, limit),
    enabled: !!categoryId,
    staleTime: 2 * 60_000,
  });
}

export function useFeaturedVideos(limit = 4, offset = 0, enabled = true) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.featured(limit, offset),
    queryFn: () => listFeaturedVideos(limit, offset),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useRecentVideos(limit = 4) {
  return useQuery<VideoWithCategory[], Error>({
    queryKey: videoKeys.recent(limit),
    queryFn: () => listRecentVideos(limit),
    staleTime: 60_000,
  });
}

export function useVideoCount() {
  return useQuery<number, Error>({
    queryKey: videoKeys.count(),
    queryFn: () => getVideoCount(),
  });
}

export function useVideoSemanticTags(limit = 200, enabled = true) {
  return useQuery<SemanticTagStat[], Error>({
    queryKey: videoKeys.semanticTags(limit),
    queryFn: () => listVideoSemanticTags(limit),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<Video, Error, VideoUpdate & { id: string }>({
    mutationFn: updateVideo,
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
      queryClient.invalidateQueries({ queryKey: videoKeys.detail(video.id) });
      notify.success(t('videoDetails.management.updateSuccess'));
    },
    onError: (error) => {
      notify.error(t('videoDetails.management.updateError'), { description: error.message });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, string>({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
      notify.success(t('videoDetails.management.deleteSuccess'));
    },
    onError: (error) => {
      notify.error(t('videoDetails.management.deleteError'), { description: error.message });
    },
  });
}
