import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createOpenAIClient, type VideoEnrichmentParams } from '../_shared/openai-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type PlaylistRow = {
  id: string;
  name: string;
  description: string | null;
  language: string;
  is_public: boolean;
};

type EnrichmentPayload = {
  optimized_title: string;
  summary_description: string;
  semantic_tags: string[];
  suggested_category_id: string | null;
  suggested_category: string | null;
  suggested_playlist_query: string | null;
  classification_confidence: number;
  language: string;
  cultural_relevance: string;
  short_summary: string;
};

type EnhancedAssignmentResult = {
  suggestedCategoryId: string | null;
  assignedCategoryId: string | null;
  assignedPlaylistId: string | null;
  reliability: 'high' | 'low';
  reason: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function tokenOverlapScore(left: string | null | undefined, right: string | null | undefined): number {
  const leftTokens = new Set(tokenize(left));
  if (leftTokens.size === 0) return 0;

  let score = 0;
  for (const token of tokenize(right)) {
    if (leftTokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

function resolveSuggestedCategoryId(
  categories: CategoryRow[],
  enrichment: EnrichmentPayload,
): { categoryId: string | null; score: number } {
  const suggested = normalizeText(enrichment.suggested_category);
  const tagsText = enrichment.semantic_tags.join(' ');

  let bestMatch: { categoryId: string | null; score: number } = {
    categoryId: null,
    score: 0,
  };

  for (const category of categories) {
    const categorySlug = normalizeText(category.slug);
    const categoryName = normalizeText(category.name);

    let score = 0;

    if (suggested && (suggested === categorySlug || suggested === categoryName)) {
      score += 6;
    }

    if (suggested && (suggested.includes(categorySlug) || suggested.includes(categoryName))) {
      score += 3;
    }

    score += Math.min(3, tokenOverlapScore(`${category.slug} ${category.name}`, tagsText));

    if (score > bestMatch.score) {
      bestMatch = { categoryId: category.id, score };
    }
  }

  return bestMatch;
}

function pickPlaylistCandidate(
  playlists: PlaylistRow[],
  enrichment: EnrichmentPayload,
  category: CategoryRow | null,
  videoLanguage: string,
): { playlistId: string | null; score: number } {
  let bestMatch: { playlistId: string | null; score: number } = {
    playlistId: null,
    score: 0,
  };

  const tagsText = enrichment.semantic_tags.join(' ');

  for (const playlist of playlists) {
    let score = 0;
    const playlistText = `${playlist.name} ${playlist.description ?? ''}`;

    score += Math.min(4, tokenOverlapScore(enrichment.suggested_playlist_query, playlistText));
    score += Math.min(2, tokenOverlapScore(enrichment.suggested_category, playlistText));
    score += Math.min(3, tokenOverlapScore(tagsText, playlistText));

    if (category) {
      score += Math.min(2, tokenOverlapScore(`${category.slug} ${category.name}`, playlistText));
    }

    if (normalizeText(playlist.language) === normalizeText(videoLanguage)) {
      score += 1;
    }

    if (score > bestMatch.score) {
      bestMatch = { playlistId: playlist.id, score };
    }
  }

  return bestMatch;
}

async function assignVideoToPlaylist(
  supabaseServiceRole: ReturnType<typeof createClient>,
  playlistId: string,
  videoId: string,
  addedBy: string,
) {
  const { data: existing, error: existingError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing playlist assignment: ${existingError.message}`);
  }

  if (existing) {
    return;
  }

  const { data: lastPositionRows, error: positionError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  if (positionError) {
    throw new Error(`Failed to calculate playlist position: ${positionError.message}`);
  }

  const nextPosition =
    lastPositionRows && lastPositionRows.length > 0
      ? Number(lastPositionRows[0].position ?? 0) + 1
      : 0;

  const { error: insertError } = await supabaseServiceRole
    .from('playlist_videos')
    .insert({
      playlist_id: playlistId,
      video_id: videoId,
      position: nextPosition,
      added_by: addedBy,
      notes: null,
    });

  if (insertError) {
    throw new Error(`Failed to add video to playlist: ${insertError.message}`);
  }
}

async function runEnhancedAssignments(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  enrichment: EnrichmentPayload;
  videoId: string;
  currentVideoCategoryId: string | null;
  videoLanguage: string;
  userId: string;
}): Promise<EnhancedAssignmentResult> {
  const {
    supabaseServiceRole,
    enrichment,
    videoId,
    currentVideoCategoryId,
    videoLanguage,
    userId,
  } = params;

  const { data: categories, error: categoryError } = await supabaseServiceRole
    .from('categories')
    .select('id, name, slug');

  if (categoryError) {
    throw new Error(`Failed to load categories: ${categoryError.message}`);
  }

  const categoryRows = (categories ?? []) as CategoryRow[];
  const suggested = resolveSuggestedCategoryId(categoryRows, enrichment);
  const categoryConfidence = enrichment.classification_confidence;
  const hasReliableCategory = suggested.score >= 4 && categoryConfidence >= 0.45;

  let assignedCategoryId: string | null = null;
  if (hasReliableCategory && suggested.categoryId) {
    const unclassifiedCategoryId =
      categoryRows.find((category) => normalizeText(category.slug) === 'nao-classificados')?.id ?? null;

    const shouldUpdateCategory =
      currentVideoCategoryId === null || currentVideoCategoryId === unclassifiedCategoryId;

    if (shouldUpdateCategory) {
      const { error: updateCategoryError } = await supabaseServiceRole
        .from('videos')
        .update({ category_id: suggested.categoryId })
        .eq('id', videoId);

      if (updateCategoryError) {
        throw new Error(`Failed to assign category: ${updateCategoryError.message}`);
      }
    }

    assignedCategoryId = suggested.categoryId;
  }

  const effectiveLanguage = videoLanguage || enrichment.language || 'pt';
  let playlistsQuery = supabaseServiceRole
    .from('playlists')
    .select('id, name, description, language, is_public')
    .eq('is_public', true)
    .limit(60);

  if (effectiveLanguage) {
    playlistsQuery = playlistsQuery.eq('language', effectiveLanguage);
  }

  const { data: playlistsByLanguage, error: playlistError } = await playlistsQuery;
  if (playlistError) {
    throw new Error(`Failed to load playlists: ${playlistError.message}`);
  }

  let playlistRows = (playlistsByLanguage ?? []) as PlaylistRow[];
  if (playlistRows.length === 0) {
    const { data: fallbackPlaylists, error: fallbackPlaylistError } = await supabaseServiceRole
      .from('playlists')
      .select('id, name, description, language, is_public')
      .eq('is_public', true)
      .limit(60);

    if (fallbackPlaylistError) {
      throw new Error(`Failed to load fallback playlists: ${fallbackPlaylistError.message}`);
    }

    playlistRows = (fallbackPlaylists ?? []) as PlaylistRow[];
  }

  const categoryRow = categoryRows.find((category) => category.id === assignedCategoryId) ?? null;
  const playlistCandidate = pickPlaylistCandidate(
    playlistRows,
    enrichment,
    categoryRow,
    effectiveLanguage,
  );

  const hasReliablePlaylist =
    playlistCandidate.score >= 5 && enrichment.classification_confidence >= 0.55;

  let assignedPlaylistId: string | null = null;
  if (hasReliablePlaylist && playlistCandidate.playlistId) {
    await assignVideoToPlaylist(
      supabaseServiceRole,
      playlistCandidate.playlistId,
      videoId,
      userId,
    );
    assignedPlaylistId = playlistCandidate.playlistId;
  }

  const reliable = hasReliableCategory || hasReliablePlaylist;
  const reason = reliable
    ? 'Enhanced assignment applied'
    : 'Enhanced suggestions below reliability threshold';

  return {
    suggestedCategoryId: suggested.categoryId,
    assignedCategoryId,
    assignedPlaylistId,
    reliability: reliable ? 'high' : 'low',
    reason,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Manual authentication handling (since verify_jwt is false)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.error("[enrich-video] Unauthorized: No Authorization header provided.")
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  const token = authHeader.replace('Bearer ', '')
  // Client for user authentication (uses ANON_KEY and user's JWT)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("[enrich-video] User authentication failed:", userError?.message)
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  try {
    const { videoId, youtubeUrl } = await req.json()
    if (!videoId || !youtubeUrl) {
      return new Response(JSON.stringify({ error: 'videoId and youtubeUrl are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`[enrich-video] Received request for videoId: ${videoId}, youtubeUrl: ${youtubeUrl} by user: ${user.id}`)

    // Create a separate client for service role operations (bypasses RLS)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the video data from database
    const { data: video, error: videoError } = await supabaseServiceRole
      .from('videos')
      .select('title, description, language, category_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error("[enrich-video] Video not found:", videoError?.message);
      throw new Error(`Video not found: ${videoError?.message || 'Unknown error'}`);
    }

    // Call OpenAI for enrichment
    let enrichment: EnrichmentPayload;
    try {
      const openaiClient = createOpenAIClient();
      const enrichmentParams: VideoEnrichmentParams = {
        title: video.title || '',
        description: video.description || '',
        language: video.language || 'pt',
      };
      enrichment = await openaiClient.enrichVideo(enrichmentParams) as EnrichmentPayload;
      console.log(`[enrich-video] Successfully enriched video ${videoId} with OpenAI`);
    } catch (openaiError) {
      const errorMsg = openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error';
      console.error("[enrich-video] OpenAI enrichment failed:", errorMsg);
      
      // If OpenAI fails, we can either:
      // 1. Return error (fail the request)
      // 2. Create a fallback enrichment with null/default values
      // For now, we'll fail to ensure data quality
      throw new Error(`AI enrichment failed: ${errorMsg}`);
    }

    let enhancedAssignment = {
      fallbackUsed: false,
      reliability: 'low',
      reason: 'Enhanced assignment not evaluated',
      suggestedCategoryId: null as string | null,
      assignedCategoryId: null as string | null,
      assignedPlaylistId: null as string | null,
    };

    try {
      const assignment = await runEnhancedAssignments({
        supabaseServiceRole,
        enrichment,
        videoId,
        currentVideoCategoryId: video.category_id ?? null,
        videoLanguage: video.language || 'pt',
        userId: user.id,
      });

      enhancedAssignment = {
        fallbackUsed: assignment.reliability === 'low',
        reliability: assignment.reliability,
        reason: assignment.reason,
        suggestedCategoryId: assignment.reliability === 'high'
          ? assignment.suggestedCategoryId
          : null,
        assignedCategoryId: assignment.assignedCategoryId,
        assignedPlaylistId: assignment.assignedPlaylistId,
      };
    } catch (assignmentError) {
      const assignmentErrorMessage = assignmentError instanceof Error
        ? assignmentError.message
        : 'Unknown enhanced assignment error';

      console.error(`[enrich-video] Enhanced workflow failed, using legacy fallback: ${assignmentErrorMessage}`);

      enhancedAssignment = {
        fallbackUsed: true,
        reliability: 'low',
        reason: `Fallback to legacy enrichment: ${assignmentErrorMessage}`,
        suggestedCategoryId: null,
        assignedCategoryId: null,
        assignedPlaylistId: null,
      };
    }

    const { data, error } = await supabaseServiceRole
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        optimized_title: enrichment.optimized_title,
        summary_description: enrichment.summary_description,
        semantic_tags: enrichment.semantic_tags,
        suggested_category_id: enhancedAssignment.suggestedCategoryId,
        language: enrichment.language,
        cultural_relevance: enrichment.cultural_relevance,
        short_summary: enrichment.short_summary,
      })
      .select()
      .single();

    if (error) {
      console.error("[enrich-video] Error inserting AI enrichment:", error.message);
      throw new Error(`Failed to save AI enrichment: ${error.message}`);
    }

    console.log(`[enrich-video] AI enrichment processed and saved for videoId: ${videoId}`);

    return new Response(JSON.stringify({
      message: 'AI enrichment initiated and saved successfully',
      data,
      assignment: {
        fallback_used: enhancedAssignment.fallbackUsed,
        reliability: enhancedAssignment.reliability,
        reason: enhancedAssignment.reason,
        assigned_category_id: enhancedAssignment.assignedCategoryId,
        assigned_playlist_id: enhancedAssignment.assignedPlaylistId,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[enrich-video] Error processing request: ${errorMessage}`)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})