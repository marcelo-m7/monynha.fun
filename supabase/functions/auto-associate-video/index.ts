import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts';
import { checkEdgeRateLimit } from '../_shared/rate-limit.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import {
  buildAutoAssociationDecision,
  loadAssociationCategories,
  loadAssociationPlaylists,
  persistAutoAssociation,
} from '../_shared/association.ts';

const AUTO_ASSOCIATION_RATE_LIMIT_WINDOWS = [
  { windowSeconds: 60, maxRequests: 8 },
  { windowSeconds: 24 * 60 * 60, maxRequests: 80 },
];

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', { requestId });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse(req, 500, 'MISSING_SUPABASE_ENV', 'Missing Supabase environment variables', { requestId });
  }

  const { user, error: authError } = await getAuthenticatedUser(req, supabaseUrl, anonKey);
  if (!user) {
    if (authError) console.warn(`[auto-associate-video] ${requestId} auth failed: ${authError}`);
    return errorResponse(req, 401, 'UNAUTHORIZED', 'Invalid or expired authorization token', { requestId });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const rateLimit = await checkEdgeRateLimit(supabase, {
      functionName: 'auto-associate-video',
      userId: user.id,
      windows: AUTO_ASSOCIATION_RATE_LIMIT_WINDOWS,
    });

    if (!rateLimit.allowed) {
      return errorResponse(req, 429, 'RATE_LIMITED', 'Too many auto-association requests. Try again later.', {
        requestId,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }
  } catch (error) {
    console.error(`[auto-associate-video] ${requestId} rate-limit check failed: ${error instanceof Error ? error.message : 'unknown'}`);
    return errorResponse(req, 500, 'RATE_LIMIT_CHECK_FAILED', 'Could not start auto-association', { requestId });
  }

  let body: { videoId?: unknown; persist?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, 400, 'INVALID_JSON', 'Invalid JSON body', { requestId });
  }

  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  if (!videoId) {
    return errorResponse(req, 400, 'INVALID_PAYLOAD', 'videoId is required', { requestId });
  }

  const shouldPersist = body.persist !== false;

  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, title, description, channel_name, category_id, language')
    .eq('id', videoId)
    .single();

  if (videoError || !video) {
    return errorResponse(req, 404, 'VIDEO_NOT_FOUND', 'Video not found', { requestId });
  }

  const { data: enrichmentRows, error: enrichmentError } = await supabase
    .from('ai_enrichments')
    .select('optimized_title, summary_description, short_summary, semantic_tags, language, suggested_category_id, suggested_playlist_id, suggested_playlist_query, classification_confidence, created_at')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (enrichmentError) {
    console.warn(`[auto-associate-video] ${requestId} enrichment lookup failed, using video-only fallback: ${enrichmentError.message}`);
  }

  const enrichment = (enrichmentRows ?? [])[0] as {
    optimized_title?: string | null;
    summary_description?: string | null;
    short_summary?: string | null;
    semantic_tags?: string[] | null;
    language?: string | null;
    suggested_category_id?: string | null;
    suggested_playlist_id?: string | null;
    suggested_playlist_query?: string | null;
    classification_confidence?: number | null;
  } | undefined;

  const categories = await loadAssociationCategories(supabase);
  const playlists = await loadAssociationPlaylists(
    supabase,
    video.language ?? enrichment?.language ?? 'pt',
    enrichment?.summary_description ?? enrichment?.short_summary ?? video.description ?? video.title,
  );

  const decision = buildAutoAssociationDecision({
    videoId,
    categories,
    playlists,
    analysis: {
      title: enrichment?.optimized_title ?? video.title,
      description: video.description,
      channelName: video.channel_name,
      semanticTags: enrichment?.semantic_tags ?? [],
      summaryDescription: enrichment?.summary_description ?? null,
      shortSummary: enrichment?.short_summary ?? null,
      language: enrichment?.language ?? video.language ?? 'pt',
      suggestedPlaylistId: enrichment?.suggested_playlist_id ?? null,
      suggestedPlaylistQuery: enrichment?.suggested_playlist_query ?? null,
      classificationConfidence: enrichment?.classification_confidence ?? null,
      currentCategoryId: video.category_id ?? null,
    },
  });

  const persisted = shouldPersist
    ? await persistAutoAssociation({
        supabaseServiceRole: supabase,
        videoId,
        userId: user.id,
        decision,
        currentCategoryId: video.category_id ?? null,
      })
    : null;

  return jsonResponse(req, {
    message: 'Auto association evaluated successfully',
    requestId,
    data: {
      ...decision,
      persisted,
    },
  });
});
