import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createOpenAIClient, type VideoEnrichmentParams } from '../_shared/openai-client.ts'
import { createGeminiClient, type GeminiError } from '../_shared/gemini-client.ts'
import { assignPlaylist, type PlaylistAssignmentResult } from '../_shared/playlist-assignment.ts'

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
  is_ordered: boolean;
  course_code: string | null;
  unit_code: string | null;
};

type EnrichmentPayload = {
  optimized_title: string;
  summary_description: string;
  semantic_tags: string[];
  suggested_category_id: string | null;
  suggested_category: string | null;
  suggested_playlist_id: string | null;
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
  playlistAssignment: PlaylistAssignmentResult;
  reliability: 'high' | 'low';
  reason: string;
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

type ProcessingErrorPayload = {
  code: string;
  message: string;
  stage: string;
  recoverable: boolean;
  requestId: string;
};

type TranscriptProcessingResult = {
  id: string | null;
  provider: 'gemini';
  providerModel: string;
  status: 'completed' | 'unavailable' | 'failed';
  language: string | null;
  summary: string | null;
  confidence: number;
  errorMessage: string | null;
};

function createRequestId() {
  return crypto.randomUUID();
}

function logProcessing(requestId: string, stage: string, message: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    source: 'enrich-video',
    requestId,
    stage,
    message,
    ...details,
  }));
}

function logProcessingError(requestId: string, stage: string, message: string, details: Record<string, unknown> = {}) {
  console.error(JSON.stringify({
    source: 'enrich-video',
    requestId,
    stage,
    message,
    ...details,
  }));
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function isRecoverableExternalError(error: unknown) {
  if (!(error instanceof Error)) return true;
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('network') ||
    message.includes('fetch')
  );
}

function toProcessingErrorPayload(error: unknown, requestId: string, fallbackStage = 'processing'): ProcessingErrorPayload {
  if (error instanceof HttpError) {
    return {
      code: error.code,
      message: error.message,
      stage: error.stage,
      recoverable: error.recoverable,
      requestId,
    };
  }

  const maybeGeminiError = error as Partial<GeminiError>;
  if (maybeGeminiError.code && error instanceof Error) {
    return {
      code: maybeGeminiError.code,
      message: error.message,
      stage: fallbackStage,
      recoverable: maybeGeminiError.recoverable ?? isRecoverableExternalError(error),
      requestId,
    };
  }

  if (error instanceof Error) {
    const recoverable = isRecoverableExternalError(error);
    return {
      code: recoverable ? 'EXTERNAL_PROCESSING_ERROR' : 'PROCESSING_ERROR',
      message: error.message,
      stage: fallbackStage,
      recoverable,
      requestId,
    };
  }

  return {
    code: 'UNKNOWN_PROCESSING_ERROR',
    message: 'Unknown error occurred',
    stage: fallbackStage,
    recoverable: true,
    requestId,
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length >= 2 ? normalized : null;
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

async function updateSubmissionStatus(
  supabaseServiceRole: ReturnType<typeof createClient>,
  submissionId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabaseServiceRole
    .from('video_submissions')
    .update(values)
    .eq('id', submissionId);

  if (error) {
    throw new Error(`Failed to update submission status: ${error.message}`);
  }
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

  if (currentError) {
    throw new Error(`Failed to load submission metadata: ${currentError.message}`);
  }

  const currentMetadata =
    current?.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
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
  if (!supabaseServiceRole || !submissionId) {
    return;
  }

  try {
    await updateSubmissionStatusWithMetadataPatch(supabaseServiceRole, submissionId, values, metadataPatch);
  } catch (statusError) {
    const statusErrorMessage = statusError instanceof Error
      ? statusError.message
      : 'Unknown submission status update error';
    console.error(`[enrich-video] ${statusErrorMessage}`);
  }
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

async function insertTranscriptRecord(
  supabaseServiceRole: ReturnType<typeof createClient>,
  params: {
    videoId: string;
    providerModel: string;
    status: 'completed' | 'unavailable' | 'failed';
    language: string | null;
    transcriptText: string | null;
    summary: string | null;
    confidence: number;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await supabaseServiceRole
    .from('video_transcripts')
    .insert({
      video_id: params.videoId,
      provider: 'gemini',
      provider_model: params.providerModel,
      language: params.language,
      transcript_text: params.transcriptText,
      summary: params.summary,
      confidence: params.confidence,
      status: params.status,
      error_message: params.errorMessage,
      metadata: params.metadata,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save transcript: ${error.message}`);
  }

  return data.id as string;
}

async function processTranscript(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  requestId: string;
  videoId: string;
  youtubeUrl: string;
  videoTitle: string;
  effectiveLanguage: string;
}): Promise<TranscriptProcessingResult> {
  const { supabaseServiceRole, requestId, videoId, youtubeUrl, videoTitle, effectiveLanguage } = params;
  const geminiClient = createGeminiClient();
  logProcessing(requestId, 'transcription', 'Starting Gemini transcript extraction', {
    videoId,
    model: geminiClient.modelName,
  });

  let transcript;
  try {
    transcript = await geminiClient.transcribeYouTubeVideo({
      youtubeUrl,
      title: videoTitle,
      language: effectiveLanguage,
    });
  } catch (error) {
    const geminiError = error as Partial<GeminiError>;
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini transcription error';
    const transcriptId = await insertTranscriptRecord(supabaseServiceRole, {
      videoId,
      providerModel: geminiClient.modelName,
      status: 'failed',
      language: normalizeLanguage(effectiveLanguage),
      transcriptText: null,
      summary: null,
      confidence: 0,
      errorMessage,
      metadata: {
        requestId,
        code: geminiError.code ?? 'GEMINI_TRANSCRIPTION_FAILED',
        recoverable: geminiError.recoverable ?? isRecoverableExternalError(error),
      },
    });

    logProcessingError(requestId, 'transcription', 'Gemini transcript extraction failed, continuing without transcript', {
      videoId,
      transcriptId,
      code: geminiError.code ?? 'GEMINI_TRANSCRIPTION_FAILED',
      error: errorMessage,
    });

    return {
      id: transcriptId,
      provider: 'gemini',
      providerModel: geminiClient.modelName,
      status: 'failed',
      language: normalizeLanguage(effectiveLanguage),
      summary: null,
      confidence: 0,
      errorMessage,
    };
  }

  const status: 'completed' | 'unavailable' = transcript.transcriptText || transcript.transcriptSummary
    ? 'completed'
    : 'unavailable';
  const errorMessage = status === 'unavailable'
    ? transcript.unavailableReason || 'Transcript unavailable from Gemini'
    : null;

  const transcriptId = await insertTranscriptRecord(supabaseServiceRole, {
    videoId,
    providerModel: geminiClient.modelName,
    status,
    language: normalizeLanguage(transcript.language) ?? normalizeLanguage(effectiveLanguage),
    transcriptText: transcript.transcriptText,
    summary: transcript.transcriptSummary,
    confidence: transcript.confidence,
    errorMessage,
    metadata: {
      requestId,
      unavailableReason: transcript.unavailableReason,
    },
  });

  logProcessing(requestId, 'transcription', 'Gemini transcript extraction completed', {
    videoId,
    transcriptId,
    status,
    confidence: transcript.confidence,
  });

  return {
    id: transcriptId,
    provider: 'gemini',
    providerModel: geminiClient.modelName,
    status,
    language: normalizeLanguage(transcript.language) ?? normalizeLanguage(effectiveLanguage),
    summary: transcript.transcriptSummary,
    confidence: transcript.confidence,
    errorMessage,
  };
}

async function runEnhancedAssignments(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  enrichment: EnrichmentPayload;
  categoryRows: CategoryRow[];
  playlistRows: PlaylistRow[];
  videoId: string;
  currentVideoCategoryId: string | null;
  videoLanguage: string;
  videoTitle: string | null;
  videoDescription: string | null;
  channelName: string | null;
  userId: string;
}): Promise<EnhancedAssignmentResult> {
  const {
    supabaseServiceRole,
    enrichment,
    categoryRows,
    playlistRows,
    videoId,
    currentVideoCategoryId,
    videoLanguage,
    videoTitle,
    videoDescription,
    channelName,
    userId,
  } = params;

  const categoryConfidence = enrichment.classification_confidence;

  // Primary path: AI returned a valid UUID from the provided categories list
  let resolvedCategoryId: string | null =
    enrichment.suggested_category_id &&
    categoryRows.some((c) => c.id === enrichment.suggested_category_id)
      ? enrichment.suggested_category_id
      : null;

  // Fallback: token-overlap scoring (handles cases where AI skipped returning a UUID)
  if (!resolvedCategoryId) {
    const scored = resolveSuggestedCategoryId(categoryRows, enrichment);
    if (scored.score >= 4) {
      resolvedCategoryId = scored.categoryId;
    }
  }

  const hasReliableCategory = !!resolvedCategoryId && categoryConfidence >= 0.40;

  let assignedCategoryId: string | null = null;
  if (hasReliableCategory && resolvedCategoryId) {
    const unclassifiedCategoryId =
      categoryRows.find((c) => normalizeText(c.slug) === 'nao-classificados')?.id ?? null;

    const shouldUpdateCategory =
      currentVideoCategoryId === null || currentVideoCategoryId === unclassifiedCategoryId;

    if (shouldUpdateCategory) {
      const { error: updateCategoryError } = await supabaseServiceRole
        .from('videos')
        .update({ category_id: resolvedCategoryId })
        .eq('id', videoId);

      if (updateCategoryError) {
        throw new Error(`Failed to assign category: ${updateCategoryError.message}`);
      }
    }

    assignedCategoryId = resolvedCategoryId;
  }

  const playlistAssignment = assignPlaylist({
    playlists: playlistRows,
    enrichment,
    video: {
      title: videoTitle,
      description: videoDescription,
      channelName,
      language: videoLanguage || enrichment.language || 'pt',
    },
  });

  let assignedPlaylistId: string | null = null;
  if (playlistAssignment.assignedPlaylistId) {
    await assignVideoToPlaylist(
      supabaseServiceRole,
      playlistAssignment.assignedPlaylistId,
      videoId,
      userId,
    );
    assignedPlaylistId = playlistAssignment.assignedPlaylistId;
  }

  const reliable = hasReliableCategory || !!assignedPlaylistId;
  const reason = assignedPlaylistId
    ? playlistAssignment.reason
    : reliable
      ? 'Enhanced category assignment applied'
      : 'Enhanced suggestions below reliability threshold';

  return {
    suggestedCategoryId: resolvedCategoryId,
    assignedCategoryId,
    assignedPlaylistId,
    playlistAssignment,
    reliability: reliable ? 'high' : 'low',
    reason,
  };
}

serve(async (req) => {
  const requestId = createRequestId();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requiredEnv = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY'),
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

  const authHeader = req.headers.get('Authorization')
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
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    requiredEnv.SUPABASE_URL ?? '',
    requiredEnv.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

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
    })
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
      requiredEnv.SUPABASE_SERVICE_ROLE_KEY ?? ''
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

    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }

    currentStage = 'context_load';
    const { data: categoriesData, error: categoryFetchError } = await supabaseServiceRole
      .from('categories')
      .select('id, name, slug');
    if (categoryFetchError) {
      throw new Error(`Failed to load categories: ${categoryFetchError.message}`);
    }
    const categoryRows = (categoriesData ?? []) as CategoryRow[];

    const effectiveLanguage = video.language && video.language !== 'und' ? video.language : 'pt';
    const { data: playlistsByLanguage, error: playlistFetchError } = await supabaseServiceRole
      .rpc('list_education_playlists_for_assignment', {
        p_language: effectiveLanguage,
        p_limit: 120,
      });
    if (playlistFetchError) {
      throw new Error(`Failed to load playlists: ${playlistFetchError.message}`);
    }
    let playlistsData = playlistsByLanguage;
    if (!playlistsData || playlistsData.length === 0) {
      const { data: fallbackData, error: fallbackError } = await supabaseServiceRole
        .rpc('list_education_playlists_for_assignment', {
          p_language: null,
          p_limit: 120,
        });
      if (fallbackError) {
        throw new Error(`Failed to load fallback playlists: ${fallbackError.message}`);
      }
      playlistsData = fallbackData;
    }
    const playlistRows = (playlistsData ?? []) as PlaylistRow[];

    currentStage = 'transcription';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }
    const transcriptResult = await processTranscript({
      supabaseServiceRole,
      requestId,
      videoId,
      youtubeUrl,
      videoTitle: video.title || '',
      effectiveLanguage,
    });

    currentStage = 'enrichment';
    if (submissionId) {
      await updateSubmissionStatusWithMetadataPatch(
        supabaseServiceRole,
        submissionId,
        {},
        {
          ...processingMetadata(requestId, currentStage),
          transcription: {
            transcriptId: transcriptResult.id,
            provider: transcriptResult.provider,
            model: transcriptResult.providerModel,
            status: transcriptResult.status,
            summary: transcriptResult.summary,
            language: transcriptResult.language,
            confidence: transcriptResult.confidence,
            errorMessage: transcriptResult.errorMessage,
          },
        },
      );
    }
    let enrichment: EnrichmentPayload;
    try {
      const openaiClient = createOpenAIClient();
      const enrichmentParams: VideoEnrichmentParams = {
        title: video.title || '',
        description: [video.description || '', transcriptResult.summary || ''].filter(Boolean).join('\n\nTranscript summary: '),
        channelName: video.channel_name || null,
        language: transcriptResult.language || effectiveLanguage,
        categories: categoryRows,
        playlists: playlistRows,
      };
      enrichment = await openaiClient.enrichVideo(enrichmentParams) as EnrichmentPayload;
      logProcessing(requestId, currentStage, 'OpenAI enrichment completed', {
        videoId,
        suggestedCategoryId: enrichment.suggested_category_id,
        suggestedPlaylistId: enrichment.suggested_playlist_id,
      });
    } catch (openaiError) {
      const errorMsg = openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error';
      logProcessingError(requestId, currentStage, 'OpenAI enrichment failed', { error: errorMsg });
      throw new Error(`AI enrichment failed: ${errorMsg}`);
    }

    let enhancedAssignment = {
      fallbackUsed: false,
      reliability: 'low' as 'low' | 'high',
      reason: 'Enhanced assignment not evaluated',
      suggestedCategoryId: null as string | null,
      assignedCategoryId: null as string | null,
      assignedPlaylistId: null as string | null,
      playlistAssignment: null as PlaylistAssignmentResult | null,
    };

    currentStage = 'assignment';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }
    try {
      const assignment = await runEnhancedAssignments({
        supabaseServiceRole,
        enrichment,
        categoryRows,
        playlistRows,
        videoId,
        currentVideoCategoryId: video.category_id ?? null,
        videoLanguage: effectiveLanguage,
        videoTitle: video.title ?? null,
        videoDescription: video.description ?? null,
        channelName: video.channel_name ?? null,
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
        playlistAssignment: assignment.playlistAssignment,
      };
    } catch (assignmentError) {
      const assignmentErrorMessage = assignmentError instanceof Error
        ? assignmentError.message
        : 'Unknown enhanced assignment error';

      logProcessingError(requestId, currentStage, 'Enhanced assignment failed, continuing with enrichment only', {
        error: assignmentErrorMessage,
      });

      enhancedAssignment = {
        fallbackUsed: true,
        reliability: 'low',
        reason: `Fallback to legacy enrichment: ${assignmentErrorMessage}`,
        suggestedCategoryId: null,
        assignedCategoryId: null,
        assignedPlaylistId: null,
        playlistAssignment: null,
      };
    }

    currentStage = 'storage';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
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
      throw new Error(`Failed to save AI enrichment: ${error.message}`);
    }

    const detectedLanguage = normalizeLanguage(enrichment.language);
    if (detectedLanguage && detectedLanguage !== 'und') {
      const { error: updateLanguageError } = await supabaseServiceRole
        .from('videos')
        .update({ language: detectedLanguage })
        .eq('id', videoId);

      if (updateLanguageError) {
        throw new Error(`Failed to update detected language: ${updateLanguageError.message}`);
      }
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
          transcription: {
            transcriptId: transcriptResult.id,
            provider: transcriptResult.provider,
            model: transcriptResult.providerModel,
            status: transcriptResult.status,
            summary: transcriptResult.summary,
            language: transcriptResult.language,
            confidence: transcriptResult.confidence,
            errorMessage: transcriptResult.errorMessage,
          },
          assignment: {
            fallbackUsed: enhancedAssignment.fallbackUsed,
            reliability: enhancedAssignment.reliability,
            reason: enhancedAssignment.reason,
            assignedCategoryId: enhancedAssignment.assignedCategoryId,
            assignedPlaylistId: enhancedAssignment.assignedPlaylistId,
            algorithmVersion: enhancedAssignment.playlistAssignment?.algorithmVersion ?? null,
            score: enhancedAssignment.playlistAssignment?.score ?? null,
            signals: enhancedAssignment.playlistAssignment?.signals ?? null,
            topCandidates: enhancedAssignment.playlistAssignment?.topCandidates ?? [],
            rejectedAiPlaylistId: enhancedAssignment.playlistAssignment?.rejectedAiPlaylistId ?? null,
          },
        },
      });
    }

    logProcessing(requestId, 'success', 'Video processing completed', {
      videoId,
      submissionId: submissionId ?? 'none',
      enrichmentId: data.id,
      transcriptId: transcriptResult.id,
      transcriptStatus: transcriptResult.status,
    });

    return new Response(JSON.stringify({
      message: 'Video processing completed successfully',
      data,
      transcription: {
        transcript_id: transcriptResult.id,
        provider: transcriptResult.provider,
        model: transcriptResult.providerModel,
        status: transcriptResult.status,
        summary: transcriptResult.summary,
        language: transcriptResult.language,
        confidence: transcriptResult.confidence,
      },
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
          error: {
            code: errorPayload.code,
            message: errorPayload.message,
            stage: errorPayload.stage,
            recoverable: errorPayload.recoverable,
            requestId,
          },
        },
      );
    }
    return new Response(JSON.stringify({ error: errorPayload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
