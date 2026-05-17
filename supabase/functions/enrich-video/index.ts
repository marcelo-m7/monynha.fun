import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createOpenAIClient, type VideoEnrichmentParams, type VideoEnrichmentResult } from '../_shared/openai-client.ts'
import {
  assignPlaylist,
  PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION,
  type PlaylistAssignmentPlaylist,
  type PlaylistAssignmentResult,
} from '../_shared/playlist-assignment.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type PlaylistRow = PlaylistAssignmentPlaylist;

type VideoProcessingVideo = {
  youtube_id: string;
  title: string | null;
  description: string | null;
  channel_name: string | null;
  language: string | null;
  category_id: string | null;
};

type AssignmentWithError = PlaylistAssignmentResult & {
  providerError: string | null;
};

class HttpError extends Error {
  status: number;
  code: string;
  stage: string;
  recoverable: boolean;

  constructor(message: string, status: number, options: { code?: string; stage?: string; recoverable?: boolean } = {}) {
    super(message);
    this.status = status;
    this.code = options.code ?? 'HTTP_ERROR';
    this.stage = options.stage ?? 'request';
    this.recoverable = options.recoverable ?? false;
  }
}

function createRequestId() {
  return crypto.randomUUID();
}

function logProcessing(requestId: string, stage: string, message: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ source: 'enrich-video', requestId, stage, message, ...details }));
}

function logProcessingError(requestId: string, stage: string, message: string, details: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ source: 'enrich-video', requestId, stage, message, ...details }));
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function isRecoverableExternalError(error: unknown) {
  if (error instanceof HttpError) return error.recoverable;
  if (!(error instanceof Error)) return true;
  return /timeout|aborted|rate limit|429|500|502|503|504|network|fetch/i.test(error.message);
}

function toProcessingErrorPayload(error: unknown, requestId: string, fallbackStage = 'processing') {
  if (error instanceof HttpError) {
    return {
      code: error.code,
      message: error.message,
      stage: error.stage,
      recoverable: error.recoverable,
      requestId,
    };
  }

  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  const recoverable = isRecoverableExternalError(error);
  return {
    code: recoverable ? 'EXTERNAL_PROCESSING_ERROR' : 'PROCESSING_ERROR',
    message,
    stage: fallbackStage,
    recoverable,
    requestId,
  };
}

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length >= 2 ? normalized.slice(0, 12) : null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function processingMetadata(requestId: string, stage: string) {
  return {
    processing: {
      requestId,
      stage,
      updatedAt: new Date().toISOString(),
    },
  };
}

async function updateSubmissionStatus(
  supabaseServiceRole: ReturnType<typeof createClient>,
  submissionId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabaseServiceRole
    .from('video_submissions')
    .update(values)
    .eq('id', submissionId);

  if (error) throw new Error(`Failed to update submission status: ${error.message}`);
}

async function updateSubmissionStatusWithMetadataPatch(
  supabaseServiceRole: ReturnType<typeof createClient>,
  submissionId: string,
  values: Record<string, unknown>,
  metadataPatch: Record<string, unknown>,
) {
  const { data: current, error: currentError } = await supabaseServiceRole
    .from('video_submissions')
    .select('metadata')
    .eq('id', submissionId)
    .single();

  if (currentError) throw new Error(`Failed to load submission metadata: ${currentError.message}`);

  const currentMetadata = current?.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
    ? current.metadata as Record<string, unknown>
    : {};

  await updateSubmissionStatus(supabaseServiceRole, submissionId, {
    ...values,
    metadata: {
      ...currentMetadata,
      ...metadataPatch,
    },
  });
}

async function safeUpdateSubmissionStatusWithMetadataPatch(
  supabaseServiceRole: ReturnType<typeof createClient> | null,
  submissionId: string | null,
  values: Record<string, unknown>,
  metadataPatch: Record<string, unknown>,
) {
  if (!supabaseServiceRole || !submissionId) return;

  try {
    await updateSubmissionStatusWithMetadataPatch(supabaseServiceRole, submissionId, values, metadataPatch);
  } catch (statusError) {
    console.error(`[enrich-video] ${statusError instanceof Error ? statusError.message : 'Unknown submission status update error'}`);
  }
}

async function updateSubmissionStage(
  supabaseServiceRole: ReturnType<typeof createClient>,
  submissionId: string,
  requestId: string,
  stage: string,
) {
  await updateSubmissionStatusWithMetadataPatch(
    supabaseServiceRole,
    submissionId,
    {},
    processingMetadata(requestId, stage),
  );
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

  if (existingError) throw new Error(`Failed to check existing playlist assignment: ${existingError.message}`);
  if (existing) return;

  const { data: lastPositionRows, error: positionError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  if (positionError) throw new Error(`Failed to calculate playlist position: ${positionError.message}`);

  const nextPosition = lastPositionRows && lastPositionRows.length > 0
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

  if (insertError) throw new Error(`Failed to add video to playlist: ${insertError.message}`);
}

async function loadCategories(
  supabaseServiceRole: ReturnType<typeof createClient>,
  requestId: string,
): Promise<CategoryRow[]> {
  const { data, error } = await supabaseServiceRole
    .from('categories')
    .select('id, name, slug');

  if (error) {
    logProcessingError(requestId, 'context_load', 'Failed to load categories; continuing without category context', {
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as CategoryRow[];
}

async function loadAssignmentPlaylists(
  supabaseServiceRole: ReturnType<typeof createClient>,
  language: string,
): Promise<PlaylistRow[]> {
  const { data: playlistsByLanguage, error: playlistFetchError } = await supabaseServiceRole
    .rpc('list_education_playlists_for_assignment', {
      p_language: language,
      p_limit: 160,
    });

  if (playlistFetchError) throw new Error(`Failed to load playlists: ${playlistFetchError.message}`);

  let playlistsData = Array.isArray(playlistsByLanguage) ? playlistsByLanguage : [];
  if (playlistsData.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabaseServiceRole
      .rpc('list_education_playlists_for_assignment', {
        p_language: null,
        p_limit: 160,
      });

    if (fallbackError) throw new Error(`Failed to load fallback playlists: ${fallbackError.message}`);
    playlistsData = Array.isArray(fallbackData) ? fallbackData : [];
  }

  return (playlistsData ?? []) as PlaylistRow[];
}

function isUnclassifiedCategory(categoryRows: CategoryRow[], categoryId: string | null | undefined) {
  if (!categoryId) return true;
  const category = categoryRows.find((row) => row.id === categoryId);
  const slug = normalizeText(category?.slug);
  return slug === 'nao-classificados' || slug === 'unclassified' || slug === 'uncategorized';
}

async function maybeAssignCategory(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  categoryRows: CategoryRow[];
  enrichment: VideoEnrichmentResult;
  videoId: string;
  currentVideoCategoryId: string | null;
}) {
  const suggestedCategoryId = params.enrichment.suggested_category_id;
  const hasValidSuggestion = !!suggestedCategoryId && params.categoryRows.some((category) => category.id === suggestedCategoryId);
  const shouldAssign =
    hasValidSuggestion &&
    params.enrichment.classification_confidence >= 0.55 &&
    isUnclassifiedCategory(params.categoryRows, params.currentVideoCategoryId);

  if (!shouldAssign || !suggestedCategoryId) {
    return null;
  }

  const { error } = await params.supabaseServiceRole
    .from('videos')
    .update({ category_id: suggestedCategoryId })
    .eq('id', params.videoId);

  if (error) throw new Error(`Failed to assign category: ${error.message}`);
  return suggestedCategoryId;
}

function createDefaultAssignment(reason: string, providerError: string | null = null): AssignmentWithError {
  return {
    algorithmVersion: PLAYLIST_ASSIGNMENT_ALGORITHM_VERSION,
    assignedPlaylistId: null,
    score: 0,
    reliability: 'low',
    reason,
    topCandidates: [],
    rejectedPlaylistId: null,
    providerConfidence: null,
    decisionSource: 'none',
    signals: {
      math: 0,
      design: 0,
      programming: 0,
      business: 0,
      language: 0,
      science: 0,
      humanities: 0,
    },
    providerError,
  };
}

async function runPlaylistAssignment(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  requestId: string;
  videoId: string;
  userId: string;
  video: VideoProcessingVideo;
  enrichment: VideoEnrichmentResult;
  playlistRows: PlaylistRow[];
  playlistLoadError: string | null;
}): Promise<AssignmentWithError> {
  if (params.playlistLoadError) {
    return createDefaultAssignment('Playlist assignment skipped because playlist candidates could not be loaded.', params.playlistLoadError);
  }

  if (params.playlistRows.length === 0) {
    return createDefaultAssignment('No educational playlist candidates were available for this language.');
  }

  const assignment = assignPlaylist({
    playlists: params.playlistRows,
    analysis: {
      title: params.video.title,
      description: params.video.description,
      semanticTags: params.enrichment.semantic_tags,
      summaryDescription: params.enrichment.summary_description,
      shortSummary: params.enrichment.short_summary,
      language: params.enrichment.language,
      suggestedPlaylistId: params.enrichment.suggested_playlist_id,
      suggestedPlaylistQuery: params.enrichment.suggested_playlist_query,
      classificationConfidence: params.enrichment.classification_confidence,
    },
  });

  const result: AssignmentWithError = {
    ...assignment,
    providerError: null,
  };

  if (!assignment.assignedPlaylistId) {
    return result;
  }

  try {
    await assignVideoToPlaylist(
      params.supabaseServiceRole,
      assignment.assignedPlaylistId,
      params.videoId,
      params.userId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown playlist insert error';
    logProcessingError(params.requestId, 'assignment', 'Playlist assignment insert failed; enrichment will still complete', {
      videoId: params.videoId,
      playlistId: assignment.assignedPlaylistId,
      error: message,
    });

    return {
      ...result,
      assignedPlaylistId: null,
      score: 0,
      reliability: 'low',
      reason: 'Playlist match was found but could not be saved. The video enrichment still completed.',
      providerError: message,
    };
  }

  return result;
}

async function runVideoProcessingTask(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  requestId: string;
  submissionId: string | null;
  videoId: string;
  userId: string;
  video: VideoProcessingVideo;
}) {
  const { supabaseServiceRole, requestId, submissionId, videoId, userId, video } = params;
  let currentStage = 'background_start';

  try {
    currentStage = 'context_load';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const effectiveLanguage = video.language && video.language !== 'und' ? video.language : 'pt';
    const categoryRows = await loadCategories(supabaseServiceRole, requestId);

    let playlistRows: PlaylistRow[] = [];
    let playlistLoadError: string | null = null;
    try {
      playlistRows = await loadAssignmentPlaylists(supabaseServiceRole, effectiveLanguage);
    } catch (error) {
      playlistLoadError = error instanceof Error ? error.message : 'Unknown playlist loading error';
      logProcessingError(requestId, currentStage, 'Failed to load playlist candidates; enrichment will continue', {
        videoId,
        error: playlistLoadError,
      });
    }

    currentStage = 'enrichment';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const openaiClient = createOpenAIClient();
    logProcessing(requestId, currentStage, 'Starting OpenAI video enrichment', {
      videoId,
      model: openaiClient.modelName,
      playlistCandidateCount: playlistRows.length,
    });

    const enrichmentParams: VideoEnrichmentParams = {
      title: video.title || '',
      description: video.description || '',
      language: effectiveLanguage,
      channelName: video.channel_name,
      categories: categoryRows,
      playlists: playlistRows.slice(0, 60),
    };
    const enrichment = await openaiClient.enrichVideo(enrichmentParams);
    const detectedLanguage = normalizeLanguage(enrichment.language) ?? normalizeLanguage(effectiveLanguage) ?? 'pt';

    if (submissionId) {
      await updateSubmissionStatusWithMetadataPatch(
        supabaseServiceRole,
        submissionId,
        {},
        {
          ...processingMetadata(requestId, currentStage),
          analysis: {
            provider: 'openai',
            model: openaiClient.modelName,
            status: 'completed',
            summary: enrichment.summary_description || enrichment.short_summary,
            language: detectedLanguage,
            confidence: enrichment.classification_confidence,
            semanticTags: enrichment.semantic_tags,
            optimizedTitle: enrichment.optimized_title,
          },
        },
      );
    }

    currentStage = 'assignment';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    let assignedCategoryId: string | null = null;
    try {
      assignedCategoryId = await maybeAssignCategory({
        supabaseServiceRole,
        categoryRows,
        enrichment,
        videoId,
        currentVideoCategoryId: video.category_id ?? null,
      });
    } catch (error) {
      logProcessingError(requestId, currentStage, 'Category assignment failed; enrichment will continue', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown category assignment error',
      });
    }

    const assignment = await runPlaylistAssignment({
      supabaseServiceRole,
      requestId,
      videoId,
      userId,
      video,
      enrichment,
      playlistRows,
      playlistLoadError,
    });

    currentStage = 'storage';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const { data, error } = await supabaseServiceRole
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        optimized_title: enrichment.optimized_title,
        summary_description: enrichment.summary_description,
        semantic_tags: enrichment.semantic_tags,
        suggested_category_id: assignedCategoryId,
        language: detectedLanguage,
        cultural_relevance: enrichment.cultural_relevance,
        short_summary: enrichment.short_summary,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save AI enrichment: ${error.message}`);

    if (detectedLanguage && detectedLanguage !== 'und') {
      const { error: updateLanguageError } = await supabaseServiceRole
        .from('videos')
        .update({ language: detectedLanguage })
        .eq('id', videoId);

      if (updateLanguageError) throw new Error(`Failed to update detected language: ${updateLanguageError.message}`);
    }

    if (submissionId) {
      await updateSubmissionStatus(supabaseServiceRole, submissionId, {
        status: 'success',
        error_message: null,
        recoverable: false,
        completed_at: new Date().toISOString(),
        metadata: {
          processing: {
            requestId,
            stage: 'success',
            updatedAt: new Date().toISOString(),
          },
          enrichmentId: data.id,
          detectedLanguage,
          analysis: {
            provider: 'openai',
            model: openaiClient.modelName,
            status: 'completed',
            summary: enrichment.summary_description || enrichment.short_summary,
            language: detectedLanguage,
            confidence: enrichment.classification_confidence,
            semanticTags: enrichment.semantic_tags,
            optimizedTitle: enrichment.optimized_title,
          },
          enrichment: {
            provider: 'openai',
            model: openaiClient.modelName,
            optimizedTitle: enrichment.optimized_title,
            summaryDescription: enrichment.summary_description,
            shortSummary: enrichment.short_summary,
            semanticTags: enrichment.semantic_tags,
            classificationConfidence: enrichment.classification_confidence,
            suggestedCategoryId: enrichment.suggested_category_id,
            suggestedCategory: enrichment.suggested_category,
            suggestedPlaylistId: enrichment.suggested_playlist_id,
            suggestedPlaylistQuery: enrichment.suggested_playlist_query,
            culturalRelevance: enrichment.cultural_relevance,
          },
          assignment: {
            fallbackUsed: assignment.reliability === 'low',
            reliability: assignment.reliability,
            reason: assignment.reason,
            assignedCategoryId,
            assignedPlaylistId: assignment.assignedPlaylistId,
            algorithmVersion: assignment.algorithmVersion,
            score: assignment.score,
            provider: 'openai',
            providerConfidence: assignment.providerConfidence,
            decisionSource: assignment.decisionSource,
            providerError: assignment.providerError,
            signals: assignment.signals,
            topCandidates: assignment.topCandidates,
            rejectedPlaylistId: assignment.rejectedPlaylistId,
            rejectedAiPlaylistId: assignment.rejectedPlaylistId,
          },
        },
      });
    }

    logProcessing(requestId, 'success', 'Video processing completed', {
      videoId,
      submissionId: submissionId ?? 'none',
      enrichmentId: data.id,
      provider: 'openai',
      assignedCategoryId,
      assignedPlaylistId: assignment.assignedPlaylistId,
      decisionSource: assignment.decisionSource,
    });
  } catch (error) {
    const errorPayload = toProcessingErrorPayload(error, requestId, currentStage);
    logProcessingError(requestId, errorPayload.stage, 'Background video processing failed', {
      code: errorPayload.code,
      error: errorPayload.message,
      recoverable: errorPayload.recoverable,
      submissionId: submissionId ?? 'none',
    });

    await safeUpdateSubmissionStatusWithMetadataPatch(
      supabaseServiceRole,
      submissionId,
      {
        status: errorPayload.recoverable ? 'recoverable_error' : 'failed',
        error_message: errorPayload.message,
        recoverable: errorPayload.recoverable,
        completed_at: new Date().toISOString(),
      },
      {
        ...processingMetadata(requestId, errorPayload.stage),
        error: errorPayload,
      },
    );
  }
}

serve(async (req) => {
  const requestId = createRequestId();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requiredEnv = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
  };
  const missingEnv = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingEnv.length > 0) {
    const errorPayload = {
      error: {
        code: 'MISSING_ENVIRONMENT',
        message: `Missing required environment variables: ${missingEnv.join(', ')}`,
        stage: 'environment',
        recoverable: false,
        requestId,
      },
    };
    logProcessingError(requestId, 'environment', errorPayload.error.message);
    return new Response(JSON.stringify(errorPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    const errorPayload = {
      error: {
        code: 'UNAUTHORIZED_NO_AUTH_HEADER',
        message: 'Missing authorization header',
        stage: 'authentication',
        recoverable: false,
        requestId,
      },
    };
    logProcessingError(requestId, 'authentication', errorPayload.error.message);
    return new Response(JSON.stringify(errorPayload), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    requiredEnv.SUPABASE_URL ?? '',
    requiredEnv.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    const errorPayload = {
      error: {
        code: 'UNAUTHORIZED_INVALID_TOKEN',
        message: 'Invalid or expired authorization token',
        stage: 'authentication',
        recoverable: false,
        requestId,
      },
    };
    logProcessingError(requestId, 'authentication', errorPayload.error.message, {
      authError: userError?.message,
    });
    return new Response(JSON.stringify(errorPayload), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let submissionId: string | null = null;
  let submissionBelongsToUser = false;
  let supabaseServiceRole: ReturnType<typeof createClient> | null = null;
  let currentStage = 'request';

  try {
    currentStage = 'payload_validation';
    const requestBody = await req.json().catch(() => {
      throw new HttpError('Request body must be valid JSON', 400, {
        code: 'INVALID_JSON',
        stage: currentStage,
      });
    });

    const videoId = typeof requestBody?.videoId === 'string' ? requestBody.videoId.trim() : '';
    const youtubeUrl = typeof requestBody?.youtubeUrl === 'string' ? requestBody.youtubeUrl.trim() : '';
    const requestedSubmissionId = typeof requestBody?.submissionId === 'string' ? requestBody.submissionId.trim() : '';
    submissionId = requestedSubmissionId || null;

    if (!videoId || !youtubeUrl) {
      throw new HttpError('videoId and youtubeUrl are required', 400, {
        code: 'INVALID_PAYLOAD',
        stage: currentStage,
      });
    }

    const requestYoutubeId = extractYouTubeId(youtubeUrl);
    if (!requestYoutubeId) {
      throw new HttpError('youtubeUrl must be a valid YouTube video URL', 400, {
        code: 'INVALID_YOUTUBE_URL',
        stage: currentStage,
      });
    }

    logProcessing(requestId, currentStage, 'Received processing request', {
      videoId,
      youtubeId: requestYoutubeId,
      submissionId: submissionId ?? 'none',
      userId: user.id,
    });

    supabaseServiceRole = createClient(
      requiredEnv.SUPABASE_URL ?? '',
      requiredEnv.SUPABASE_SERVICE_ROLE_KEY ?? '',
    );

    currentStage = 'submission_validation';
    if (submissionId) {
      const { data: submission, error: submissionError } = await supabaseServiceRole
        .from('video_submissions')
        .select('id, user_id, youtube_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        throw new HttpError(`Submission not found: ${submissionError?.message || 'Unknown error'}`, 404, {
          code: 'SUBMISSION_NOT_FOUND',
          stage: currentStage,
        });
      }

      if (submission.user_id !== user.id) {
        throw new HttpError('Submission does not belong to the authenticated user', 403, {
          code: 'SUBMISSION_FORBIDDEN',
          stage: currentStage,
        });
      }

      if (submission.youtube_id && submission.youtube_id !== requestYoutubeId) {
        throw new HttpError('Submission YouTube ID does not match request URL', 400, {
          code: 'YOUTUBE_ID_MISMATCH',
          stage: currentStage,
        });
      }

      submissionBelongsToUser = true;

      await updateSubmissionStatus(supabaseServiceRole, submissionId, {
        video_id: videoId,
        status: 'processing',
        error_message: null,
        recoverable: false,
        processing_started_at: new Date().toISOString(),
        completed_at: null,
        metadata: processingMetadata(requestId, currentStage),
      });
    }

    currentStage = 'video_load';
    const { data: video, error: videoError } = await supabaseServiceRole
      .from('videos')
      .select('youtube_id, title, description, channel_name, language, category_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new HttpError(`Video not found: ${videoError?.message || 'Unknown error'}`, 404, {
        code: 'VIDEO_NOT_FOUND',
        stage: currentStage,
      });
    }

    if (video.youtube_id !== requestYoutubeId) {
      throw new HttpError('Request YouTube URL does not match the stored video', 400, {
        code: 'VIDEO_YOUTUBE_ID_MISMATCH',
        stage: currentStage,
      });
    }

    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    if (typeof EdgeRuntime === 'undefined' || typeof EdgeRuntime.waitUntil !== 'function') {
      throw new HttpError('Edge background processing is unavailable', 500, {
        code: 'BACKGROUND_RUNTIME_UNAVAILABLE',
        stage: currentStage,
        recoverable: true,
      });
    }

    currentStage = 'queued';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    EdgeRuntime.waitUntil(runVideoProcessingTask({
      supabaseServiceRole,
      requestId,
      submissionId,
      videoId,
      userId: user.id,
      video: video as VideoProcessingVideo,
    }));

    logProcessing(requestId, currentStage, 'Video processing accepted for background execution', {
      videoId,
      submissionId: submissionId ?? 'none',
      userId: user.id,
    });

    return new Response(JSON.stringify({
      message: 'Video processing started',
      requestId,
      submissionId,
      status: 'processing',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    });
  } catch (error) {
    const errorPayload = toProcessingErrorPayload(error, requestId, currentStage);
    const status = error instanceof HttpError ? error.status : errorPayload.recoverable ? 503 : 500;

    logProcessingError(requestId, errorPayload.stage, 'Video processing failed', {
      code: errorPayload.code,
      error: errorPayload.message,
      recoverable: errorPayload.recoverable,
      submissionId: submissionId ?? 'none',
    });

    if (submissionBelongsToUser) {
      await safeUpdateSubmissionStatusWithMetadataPatch(
        supabaseServiceRole,
        submissionId,
        {
          status: errorPayload.recoverable ? 'recoverable_error' : 'failed',
          error_message: errorPayload.message,
          recoverable: errorPayload.recoverable,
          completed_at: new Date().toISOString(),
        },
        {
          ...processingMetadata(requestId, errorPayload.stage),
          error: errorPayload,
        },
      );
    }

    return new Response(JSON.stringify({ error: errorPayload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});
