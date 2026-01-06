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

export function useVideos(options?: { featured?: boolean; limit?: number; categorySlug?: string }) {
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
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Video[];
    }
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
