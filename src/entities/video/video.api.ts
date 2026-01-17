import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Video, VideoInsert, VideoWithCategory } from './video.types';

export interface ListVideosParams {
  featured?: boolean;
  limit?: number;
  searchQuery?: string;
  categoryId?: string;
  language?: string;
  submittedBy?: string;
}

export async function listVideos(params: ListVideosParams = {}) {
  let query = supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .order('created_at', { ascending: false });

  if (params.featured) {
    query = query.eq('is_featured', true);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.searchQuery) {
    query = query.or(`title.ilike.%${params.searchQuery}%,channel_name.ilike.%${params.searchQuery}%`);
  }

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  if (params.language) {
    query = query.eq('language', params.language);
  }

  if (params.submittedBy) {
    query = query.eq('submitted_by', params.submittedBy);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as VideoWithCategory[];
}

export async function getVideoById(id: string) {
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as VideoWithCategory;
}

export async function listFeaturedVideos(limit = 4) {
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .eq('is_featured', true)
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (data && data.length > 0) return data as VideoWithCategory[];

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .order('view_count', { ascending: false })
    .limit(limit);

  if (fallbackError) throw fallbackError;
  return fallbackData as VideoWithCategory[];
}

export async function listRecentVideos(limit = 4) {
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .eq('is_featured', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as VideoWithCategory[];
}

export async function listRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  if (!categoryId) return [] as VideoWithCategory[];
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
      category:categories(id, name, slug, color)
    `,
    )
    .eq('category_id', categoryId)
    .neq('id', currentVideoId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as VideoWithCategory[];
}

export async function incrementVideoViewCount(videoId: string) {
  return supabase.rpc('increment_video_view_count', { p_video_id: videoId });
}

export async function markTopVideosAsFeatured(limit = 4) {
  return supabase.rpc('mark_top_videos_as_featured', { p_limit: limit });
}

export async function createVideo(payload: VideoInsert) {
  const { data, error } = await supabase
    .from('videos')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Video;
}

export async function findVideoByYoutubeId(youtubeId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('id')
    .eq('youtube_id', youtubeId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string } | null;
}

export async function getVideoCount() {
  const { count, error } = await supabase.from('videos').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}
