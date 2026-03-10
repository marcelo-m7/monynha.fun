import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Video, VideoCategory, VideoInsert, VideoWithCategory } from './video.types';
import type { AiEnrichment } from '@/entities/ai_enrichment/ai_enrichment.types';
import { extractYouTubeId } from '@/shared/lib/youtube';
import type { Json } from '@/integrations/supabase/types';

// Helper to extract the latest enrichment from an array
function getLatestEnrichment(enrichments: AiEnrichment[] | null | undefined): AiEnrichment | null {
  if (!enrichments || enrichments.length === 0) return null;
  // Enrichments should already be sorted by created_at DESC
  return enrichments[0];
}

type VideoWithRelations = Video & {
  category?: VideoCategory | null;
  ai_enrichments?: AiEnrichment[] | null;
};

type FeaturedVideoRpcRow = Video & {
  category?: Json | null;
};

function isVideoCategory(value: unknown): value is VideoCategory {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.color === 'string'
  );
}

export interface ListVideosParams {
  featured?: boolean;
  limit?: number;
  searchQuery?: string;
  categoryId?: string;
  language?: string;
  submittedBy?: string;
  includeEnrichment?: boolean;
}

export async function listVideos(params: ListVideosParams = {}) {
  const includeEnrichment = params.includeEnrichment !== false; // Default true
  
  let query = supabase
    .from('videos')
    .select(
      includeEnrichment
        ? `
          *,
          category:categories(id, name, slug, color),
          ai_enrichments!video_id(*)
        `
        : `
          *,
          category:categories(id, name, slug, color)
        `,
    )
    .order('created_at', { ascending: false });

  if (includeEnrichment) {
    // Order enrichments by created_at DESC to get latest first
    query = query.order('created_at', { foreignTable: 'ai_enrichments', ascending: false });
  }

  if (params.featured) {
    query = query.eq('is_featured', true);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.searchQuery) {
    const youtubeId = extractYouTubeId(params.searchQuery);
    if (youtubeId) {
      // If it looks like a YouTube ID or URL, search by ID, title, or channel
      query = query.or(`youtube_id.eq.${youtubeId},title.ilike.%${params.searchQuery}%,channel_name.ilike.%${params.searchQuery}%`);
    } else {
      query = query.or(`title.ilike.%${params.searchQuery}%,channel_name.ilike.%${params.searchQuery}%`);
    }
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
  
  // Process enrichments - extract only the latest one
  if (includeEnrichment && data) {
    const videos = data as VideoWithRelations[];
    return videos.map((video) => ({
      ...video,
      enrichment: getLatestEnrichment(video.ai_enrichments),
      ai_enrichments: undefined, // Remove the array
    })) as VideoWithCategory[];
  }
  
  return data as VideoWithCategory[];
}

export async function getVideoById(id: string) {
  // Check if the provided ID is a UUID or a YouTube ID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  let query = supabase
    .from('videos')
    .select(
      `
      *,
        category:categories(id, name, slug, color),
        ai_enrichments!video_id(*)
    `,
      )
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false });

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('youtube_id', id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  
    // Process enrichment - extract only the latest one
    if (data) {
      const video = data as VideoWithRelations;
      return {
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        ai_enrichments: undefined,
      } as VideoWithCategory;
    }
  
    return data as VideoWithCategory;
}

export async function listFeaturedVideos(limit = 4, offset = 0) {
  const { data, error } = await supabase.rpc('list_featured_videos', {
    p_limit: limit,
    p_offset: offset,
  });

  if (!error && data) {
    const rows = data as FeaturedVideoRpcRow[];
    return rows.map((row) => {
      // Parse the category JSON if it's a string or object
      let parsedCategory: VideoCategory | null = null;
      if (row.category) {
        if (typeof row.category === 'string') {
          try {
            const parsed = JSON.parse(row.category) as unknown;
            if (isVideoCategory(parsed)) {
              parsedCategory = parsed;
            }
          } catch {
            parsedCategory = null;
          }
        } else if (typeof row.category === 'object') {
          if (isVideoCategory(row.category)) {
            parsedCategory = row.category;
          }
        }
      }
      return {
        ...row,
        category: parsedCategory,
          enrichment: null, // RPC doesn't include enrichments yet
      };
    }) as unknown as VideoWithCategory[];
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('videos')
    .select(
      `
      *,
        category:categories(id, name, slug, color),
        ai_enrichments!video_id(*)
    `,
    )
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false })
    .order('view_count', { ascending: false })
    .limit(limit);

  if (fallbackError) throw fallbackError;
  
    // Process enrichments
    if (fallbackData) {
        const videos = fallbackData as VideoWithRelations[];
        return videos.map((video) => ({
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        ai_enrichments: undefined,
      })) as VideoWithCategory[];
    }
  
    return fallbackData as VideoWithCategory[];
}

export async function listRecentVideos(limit = 4) {
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
        category:categories(id, name, slug, color),
        ai_enrichments!video_id(*)
    `,
    )
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false })
    .eq('is_featured', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
    // Process enrichments
    if (data) {
        const videos = data as VideoWithRelations[];
        return videos.map((video) => ({
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        ai_enrichments: undefined,
      })) as VideoWithCategory[];
    }
  
    return data as VideoWithCategory[];
}

export async function listRelatedVideos(currentVideoId: string, categoryId: string | null, limit = 4) {
  if (!categoryId) return [] as VideoWithCategory[];
  const { data, error } = await supabase
    .from('videos')
    .select(
      `
      *,
        category:categories(id, name, slug, color),
        ai_enrichments!video_id(*)
    `,
    )
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false })
    .eq('category_id', categoryId)
    .neq('id', currentVideoId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
    // Process enrichments
    if (data) {
        const videos = data as VideoWithRelations[];
        return videos.map((video) => ({
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        ai_enrichments: undefined,
      })) as VideoWithCategory[];
    }
  
    return data as VideoWithCategory[];
}

export async function incrementVideoViewCount(videoId: string, sessionId?: string | null) {
  return supabase.rpc('increment_video_view_count', { p_video_id: videoId, p_session_id: sessionId ?? null });
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