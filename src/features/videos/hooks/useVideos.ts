import { useQuery } from '@tanstack/react-query';
import type { VideoFilters } from '../types/Video';
import { supabaseVideoRepository } from '../infrastructure/SupabaseVideoRepository';
import { fetchVideos } from '../useCases/fetchVideos';
import { fetchVideoById } from '../useCases/fetchVideoById';
import { fetchRelatedVideos } from '../useCases/fetchRelatedVideos';
import { fetchFeaturedVideos } from '../useCases/fetchFeaturedVideos';
import { fetchRecentVideos } from '../useCases/fetchRecentVideos';

export function useVideos(options?: VideoFilters) {
  return useQuery({
    queryKey: ['videos', options],
    queryFn: () => fetchVideos(supabaseVideoRepository, options),
    enabled: options?.enabled ?? true,
  });
}

export function useVideoById(id: string | undefined) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      if (!id) return null;
      return fetchVideoById(supabaseVideoRepository, id);
    },
    enabled: !!id,
  });
}

export function useRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  return useQuery({
    queryKey: ['relatedVideos', currentVideoId, categoryId, limit],
    queryFn: () => fetchRelatedVideos(supabaseVideoRepository, currentVideoId, categoryId, limit),
    enabled: !!categoryId,
  });
}

export function useFeaturedVideos(limit = 4) {
  return useQuery({
    queryKey: ['videos', 'featured', limit],
    queryFn: () => fetchFeaturedVideos(supabaseVideoRepository, limit),
  });
}

export function useRecentVideos(limit = 4) {
  return useQuery({
    queryKey: ['videos', 'recent', limit],
    queryFn: () => fetchRecentVideos(supabaseVideoRepository, limit),
  });
}
