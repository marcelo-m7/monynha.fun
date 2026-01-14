import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Video {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  channel_name: string;
  duration_seconds: number | null;
  thumbnail_url: string;
  language: string;
  category_id: string | null;
  submitted_by: string | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
}

export function useVideos(options?: { 
  featured?: boolean; 
  limit?: number; 
  categorySlug?: string; 
  searchQuery?: string; 
  categoryId?: string; 
  language?: string;
  submittedBy?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['videos', options],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select(`
          *,
          category:categories(id, name, slug, color)
        `)
        .order('created_at', { ascending: false });
      
      if (options?.featured) {
        query = query.eq('is_featured', true);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.searchQuery) {
        query = query.or(
          `title.ilike.%${options.searchQuery}%,channel_name.ilike.%${options.searchQuery}%`
        );
      }

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.language) {
        query = query.eq('language', options.language);
      }

      if (options?.submittedBy) {
        query = query.eq('submitted_by', options.submittedBy);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Video[];
    },
    enabled: options?.enabled ?? true,
  });
}

export function useVideoById(id: string | undefined) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          category:categories(id, name, slug, color)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Video;
    },
    enabled: !!id,
  });
}

export function useRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  return useQuery({
    queryKey: ['relatedVideos', currentVideoId, categoryId, limit],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          category:categories(id, name, slug, color)
        `)
        .eq('category_id', categoryId)
        .neq('id', currentVideoId) // Exclude the current video
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Video[];
    },
    enabled: !!categoryId,
  });
}

export function useFeaturedVideos(limit = 4) {
  return useVideos({ featured: true, limit });
}

export function useRecentVideos(limit = 4) {
  return useQuery({
    queryKey: ['videos', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          category:categories(id, name, slug, color)
        `)
        .eq('is_featured', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Video[];
    }
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
