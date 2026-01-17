import { supabase } from '@/integrations/supabase/client';
import type { Video, VideoFilters } from '../types/Video';
import type { VideoRepository } from './VideoRepository';

const baseSelect = `
  *,
  category:categories(id, name, slug, color)
`;

export const supabaseVideoRepository: VideoRepository = {
  async listVideos(filters?: VideoFilters): Promise<Video[]> {
    let query = supabase
      .from('videos')
      .select(baseSelect)
      .order('created_at', { ascending: false });

    if (filters?.featured) {
      query = query.eq('is_featured', true);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.searchQuery) {
      query = query.or(
        `title.ilike.%${filters.searchQuery}%,channel_name.ilike.%${filters.searchQuery}%`
      );
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    if (filters?.submittedBy) {
      query = query.eq('submitted_by', filters.submittedBy);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Video[];
  },
  async getVideoById(id: string): Promise<Video | null> {
    const { data, error } = await supabase
      .from('videos')
      .select(baseSelect)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Video;
  },
  async listRelatedVideos(
    currentVideoId: string,
    categoryId: string,
    limit: number
  ): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(baseSelect)
      .eq('category_id', categoryId)
      .neq('id', currentVideoId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Video[];
  },
  async listFeaturedVideos(limit: number): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(baseSelect)
      .eq('is_featured', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Video[];
  },
  async listPopularVideos(limit: number): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(baseSelect)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Video[];
  },
  async listRecentVideos(limit: number): Promise<Video[]> {
    const { data, error } = await supabase
      .from('videos')
      .select(baseSelect)
      .eq('is_featured', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Video[];
  },
};
