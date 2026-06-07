import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  Video,
  VideoAssignedPlaylist,
  VideoCategory,
  VideoInsert,
  VideoUpdate,
  VideoWithCategory,
} from './video.types';
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
  playlist_videos?: Array<{
    playlist?: VideoAssignedPlaylist | null;
  }> | null;
};

type FeaturedVideoRpcRow = Video & {
  category?: Json | null;
};

type VideoExhibitionRow = Video & {
  category_name?: string | null;
  category_slug?: string | null;
  category_color?: string | null;
  enrichment_optimized_title?: string | null;
  enrichment_short_summary?: string | null;
  enrichment_summary_description?: string | null;
  enrichment_cultural_relevance?: string | null;
  enrichment_semantic_tags?: string[] | null;
  enrichment_language?: string | null;
  transcript_summary?: string | null;
  transcript_language?: string | null;
  transcript_status?: string | null;
};

function mapExhibitionRowToVideoWithCategory(row: VideoExhibitionRow, includeEnrichment = true): VideoWithCategory {
  const category =
    row.category_name && row.category_slug && row.category_color
      ? {
          id: row.category_id ?? '',
          name: row.category_name,
          slug: row.category_slug,
          color: row.category_color,
          icon: 'folder',
          created_at: row.created_at,
        }
      : null;

  const enrichment = includeEnrichment
    ? {
        id: `${row.id}-latest`,
        video_id: row.id,
        optimized_title: row.enrichment_optimized_title ?? null,
        short_summary: row.enrichment_short_summary ?? null,
        summary_description: row.enrichment_summary_description ?? null,
        cultural_relevance: row.enrichment_cultural_relevance ?? null,
        semantic_tags: row.enrichment_semantic_tags ?? null,
        language: row.enrichment_language ?? null,
        suggested_category_id: row.category_id ?? null,
        created_at: row.updated_at,
        reprocessed_at: null,
      }
    : null;

  return {
    ...row,
    category,
    enrichment,
    transcriptSummary: row.transcript_summary ?? null,
    transcriptLanguage: row.transcript_language ?? null,
    transcriptStatus: row.transcript_status ?? null,
  };
}

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
  offset?: number;
  searchQuery?: string;
  filterMode?: 'all' | 'any';
  categoryIds?: string[];
  categoryId?: string;
  languages?: string[];
  language?: string;
  sortBy?: 'recent' | 'mostViewed' | 'mostFavorited';
  semanticTags?: string[];
  semanticTag?: string;
  submittedBy?: string;
  includeEnrichment?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function getVideoLookupColumn(value: string): 'id' | 'youtube_id' | 'slug' {
  if (UUID_REGEX.test(value)) return 'id';
  if (YOUTUBE_ID_REGEX.test(value)) return 'youtube_id';
  return 'slug';
}

export async function listVideos(params: ListVideosParams = {}) {
  const includeEnrichment = params.includeEnrichment !== false; // Default true
  const sortBy = params.sortBy ?? 'recent';
  const filterMode = params.filterMode ?? 'all';
  const limit = params.limit ?? 24;
  const offset = params.offset ?? 0;
  const categoryIds = [
    ...new Set([
      ...(params.categoryIds ?? []).filter(Boolean),
      ...(params.categoryId ? [params.categoryId] : []),
    ]),
  ];
  const normalizedLanguageValues = [
    ...(params.languages ?? []),
    ...(params.language ? [params.language] : []),
  ].flatMap((language) => {
    if (!language) return [];

    // The UI exposes "other", while stored rows use ISO-like "und" for undefined language.
    if (language === 'other') return ['und', 'other'];

    return [language];
  });

  const languages = [
    ...new Set([
      ...normalizedLanguageValues,
    ]),
  ];
  const semanticTags = [
    ...new Set([
      ...(params.semanticTags ?? []).filter(Boolean),
      ...(params.semanticTag ? [params.semanticTag] : []),
    ]),
  ];
  
  let query = supabase
    .from('v_video_exhibition')
    .select('*');

  if (sortBy === 'mostViewed') {
    query = query.order('view_count', { ascending: false, nullsFirst: false });
  } else if (sortBy === 'mostFavorited') {
    query = query.order('favorites_count', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  if (params.featured) {
    query = query.eq('is_featured', true);
  }

  query = query.range(offset, offset + limit - 1);

  if (params.searchQuery) {
    const youtubeId = extractYouTubeId(params.searchQuery);
    if (youtubeId) {
      // If it looks like a YouTube ID or URL, search by ID, title, or channel
      query = query.or(`youtube_id.eq.${youtubeId},title.ilike.%${params.searchQuery}%,channel_name.ilike.%${params.searchQuery}%`);
    } else {
      query = query.or(`title.ilike.%${params.searchQuery}%,channel_name.ilike.%${params.searchQuery}%`);
    }
  }

  if (filterMode === 'any') {
    const orConditions: string[] = [];

    if (categoryIds.length > 0) {
      orConditions.push(`category_id.in.(${categoryIds.join(',')})`);
    }

    if (languages.length > 0) {
      orConditions.push(`language.in.(${languages.join(',')})`);
    }

    if (semanticTags.length > 0) {
      const formattedTags = semanticTags.map((tag) => `"${tag.replace(/"/g, '')}"`).join(',');
      orConditions.push(`enrichment_semantic_tags.ov.{${formattedTags}}`);
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
  } else {
    if (categoryIds.length > 0) {
      query = query.in('category_id', categoryIds);
    }

    if (languages.length > 0) {
      query = query.in('language', languages);
    }

    if (semanticTags.length > 0) {
      query = query.overlaps('enrichment_semantic_tags', semanticTags);
    }
  }

  if (params.submittedBy) {
    query = query.eq('submitted_by', params.submittedBy);
  }

  const { data, error } = await query;

  if (error) throw error;

  return ((data as VideoExhibitionRow[] | null) || []).map((row) =>
    mapExhibitionRowToVideoWithCategory(row, includeEnrichment),
  );
}

export async function getVideoById(id: string) {
  const lookupColumn = getVideoLookupColumn(id);

  const selectVideo = () =>
    supabase
      .from('videos')
      .select(
        `
        *,
          category:categories(id, name, slug, color),
          ai_enrichments!video_id(*),
          playlist_videos!playlist_videos_video_id_fkey(
            playlist:playlists(id, name, slug, is_ordered, course_code, unit_code)
          )
      `,
      )
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false });

  let resolvedLookupColumn = lookupColumn;
  let { data, error } = await selectVideo().eq(lookupColumn, id).maybeSingle();

  if (!error && !data && lookupColumn !== 'slug') {
    const fallback = await selectVideo().eq('slug', id).maybeSingle();
    data = fallback.data;
    error = fallback.error;
    resolvedLookupColumn = 'slug';
  }

  if (error) throw error;
  
    // Process enrichment - extract only the latest one
    if (data) {
      const video = data as VideoWithRelations;
      const { data: exhibitionRow } = await supabase
        .from('v_video_exhibition')
        .select('id, transcript_summary, transcript_language, transcript_status')
        .eq(resolvedLookupColumn, id)
        .maybeSingle();
      const transcriptData = exhibitionRow as Pick<
        VideoExhibitionRow,
        'transcript_summary' | 'transcript_language' | 'transcript_status'
      > | null;
      return {
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        assignedPlaylists: (video.playlist_videos ?? [])
          .map((entry) => entry.playlist)
          .filter((playlist): playlist is VideoAssignedPlaylist => !!playlist),
        transcriptSummary: transcriptData?.transcript_summary ?? null,
        transcriptLanguage: transcriptData?.transcript_language ?? null,
        transcriptStatus: transcriptData?.transcript_status ?? null,
        ai_enrichments: undefined,
        playlist_videos: undefined,
      } as unknown as VideoWithCategory;
    }
  
    return data as unknown as VideoWithCategory;
}

export async function listFeaturedVideos(limit = 4, offset = 0) {
  const { data, error } = await supabase.rpc('list_featured_videos', {
    p_limit: limit,
    p_offset: offset,
  });

  if (!error && data) {
    const rpcRows = data as FeaturedVideoRpcRow[];
    const featuredIds = rpcRows.map((row) => row.id);
    const { data: enrichedRows, error: enrichedError } = await supabase
      .from('v_video_exhibition')
      .select('*')
      .in('id', featuredIds);

    if (!enrichedError && enrichedRows) {
      const enrichedById = new Map(
        (enrichedRows as VideoExhibitionRow[]).map((row) => [row.id, mapExhibitionRowToVideoWithCategory(row)]),
      );
      return featuredIds
        .map((id) => enrichedById.get(id))
        .filter((row): row is VideoWithCategory => !!row);
    }

    return rpcRows.map((row) => {
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
        enrichment: null,
      };
    }) as unknown as VideoWithCategory[];
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('v_video_exhibition')
    .select('*')
    .order('view_count', { ascending: false })
    .range(offset, offset + limit - 1)
    .limit(limit);

  if (fallbackError) throw fallbackError;

  return ((fallbackData as VideoExhibitionRow[] | null) || []).map((row) =>
    mapExhibitionRowToVideoWithCategory(row),
  );
}

export async function listRecentVideos(limit = 4) {
  const { data, error } = await supabase
    .from('v_video_exhibition')
    .select('*')
    .eq('is_featured', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data as VideoExhibitionRow[] | null) || []).map((row) =>
    mapExhibitionRowToVideoWithCategory(row),
  );
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
      })) as unknown as VideoWithCategory[];
    }
  
    return data as unknown as VideoWithCategory[];
}

  export async function listEditableVideos(submittedBy: string) {
    const { data, error } = await supabase
      .from('videos')
      .select(
        `
        *,
          category:categories(id, name, slug, icon, color, created_at),
          ai_enrichments!video_id(*),
          playlist_videos!playlist_videos_video_id_fkey(
            playlist:playlists(id, name, slug, is_ordered, course_code, unit_code)
          )
      `,
      )
      .eq('submitted_by', submittedBy)
      .order('created_at', { ascending: false })
      .order('created_at', { foreignTable: 'ai_enrichments', ascending: false });

    if (error) throw error;

    if (data) {
      const videos = data as VideoWithRelations[];
      return videos.map((video) => ({
        ...video,
        enrichment: getLatestEnrichment(video.ai_enrichments),
        assignedPlaylists: (video.playlist_videos ?? [])
          .map((entry) => entry.playlist)
          .filter((playlist): playlist is VideoAssignedPlaylist => !!playlist),
        ai_enrichments: undefined,
        playlist_videos: undefined,
      })) as unknown as VideoWithCategory[];
    }

    return [] as VideoWithCategory[];
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

export async function updateVideo(payload: VideoUpdate & { id: string }) {
  const { id, ...updates } = payload;
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Video;
}

export async function updateVideoCategory(videoId: string, categoryId: string | null) {
  const { data, error } = await supabase
    .from('videos')
    .update({ category_id: categoryId })
    .eq('id', videoId)
    .select()
    .single();

  if (error) throw error;
  return data as Video;
}

export interface BulkVideoActionFailure {
  code?: string | null;
  message: string;
  videoId: string;
}

export interface BulkVideoActionResult {
  failedCount: number;
  failures: BulkVideoActionFailure[];
  requested: number;
  succeededVideoIds: string[];
  successCount: number;
}

function toBulkActionError(error: unknown): { code?: string | null; message: string } {
  if (error && typeof error === 'object') {
    const maybeError = error as { code?: string | null; message?: string };
    return {
      code: maybeError.code ?? null,
      message: maybeError.message ?? 'Unknown error',
    };
  }

  return {
    message: 'Unknown error',
  };
}

function buildBulkActionResult(
  videoIds: string[],
  results: Array<PromiseSettledResult<unknown>>,
): BulkVideoActionResult {
  const failures: BulkVideoActionFailure[] = [];
  const succeededVideoIds: string[] = [];

  results.forEach((result, index) => {
    const videoId = videoIds[index];
    if (result.status === 'fulfilled') {
      succeededVideoIds.push(videoId);
      return;
    }

    const normalizedError = toBulkActionError(result.reason);
    failures.push({
      videoId,
      code: normalizedError.code,
      message: normalizedError.message,
    });
  });

  return {
    requested: videoIds.length,
    succeededVideoIds,
    successCount: succeededVideoIds.length,
    failures,
    failedCount: failures.length,
  };
}

export async function bulkUpdateVideoCategory(videoIds: string[], categoryId: string | null): Promise<BulkVideoActionResult> {
  if (videoIds.length === 0) {
    return {
      requested: 0,
      succeededVideoIds: [],
      successCount: 0,
      failures: [],
      failedCount: 0,
    };
  }

  const results = await Promise.allSettled(videoIds.map((videoId) => updateVideoCategory(videoId, categoryId)));
  return buildBulkActionResult(videoIds, results);
}

async function addVideoToPlaylist(playlistId: string, videoId: string) {
  const { error } = await supabase.from('playlist_videos').upsert(
    {
      playlist_id: playlistId,
      video_id: videoId,
    },
    {
      onConflict: 'playlist_id,video_id',
    },
  );

  if (error) throw error;
}

async function removeVideoFromPlaylist(playlistId: string, videoId: string) {
  const { error } = await supabase
    .from('playlist_videos')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId);

  if (error) throw error;
}

export async function bulkAddVideosToPlaylist(playlistId: string, videoIds: string[]): Promise<BulkVideoActionResult> {
  if (videoIds.length === 0) {
    return {
      requested: 0,
      succeededVideoIds: [],
      successCount: 0,
      failures: [],
      failedCount: 0,
    };
  }

  const results = await Promise.allSettled(videoIds.map((videoId) => addVideoToPlaylist(playlistId, videoId)));
  return buildBulkActionResult(videoIds, results);
}

export async function bulkRemoveVideosFromPlaylist(playlistId: string, videoIds: string[]): Promise<BulkVideoActionResult> {
  if (videoIds.length === 0) {
    return {
      requested: 0,
      succeededVideoIds: [],
      successCount: 0,
      failures: [],
      failedCount: 0,
    };
  }

  const results = await Promise.allSettled(videoIds.map((videoId) => removeVideoFromPlaylist(playlistId, videoId)));
  return buildBulkActionResult(videoIds, results);
}

export async function deleteVideo(videoId: string) {
  const { error } = await supabase.from('videos').delete().eq('id', videoId);
  if (error) throw error;
}

export async function findVideoByYoutubeId(youtubeId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('id, slug')
    .eq('youtube_id', youtubeId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; slug: string } | null;
}

export async function getVideoCount() {
  const { count, error } = await supabase.from('videos').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}
