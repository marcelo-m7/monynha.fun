import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createGeminiClient, type GeminiError, type GeminiVideoAnalysisResult } from '../_shared/gemini-client.ts'
import { assignPlaylist, type PlaylistAssignmentResult } from '../_shared/playlist-assignment.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
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

type EnhancedAssignmentResult = {
  assignedPlaylistId: string | null;
  playlistAssignment: PlaylistAssignmentResult | null;
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
  analysis: GeminiVideoAnalysisResult;
};

type VideoProcessingVideo = {
  youtube_id: string;
  title: string | null;
  description: string | null;
  channel_name: string | null;
  language: string | null;
  category_id: string | null;
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

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length >= 2 ? normalized : null;
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

async function processVideoAnalysis(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  geminiClient: ReturnType<typeof createGeminiClient>;
  requestId: string;
  videoId: string;
  youtubeUrl: string;
  videoTitle: string;
  videoDescription: string | null;
  effectiveLanguage: string;
}): Promise<TranscriptProcessingResult> {
  const {
    supabaseServiceRole,
    geminiClient,
    requestId,
    videoId,
    youtubeUrl,
    videoTitle,
    videoDescription,
    effectiveLanguage,
  } = params;
  logProcessing(requestId, 'analysis', 'Starting Gemini video analysis', {
    videoId,
    model: geminiClient.modelName,
  });

  let analysis: GeminiVideoAnalysisResult;
  try {
    analysis = await geminiClient.analyzeYouTubeVideo({
      youtubeUrl,
      title: videoTitle,
      description: videoDescription,
      language: effectiveLanguage,
    });
  } catch (error) {
    const geminiError = error as Partial<GeminiError>;
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini analysis error';
    const recoverable = geminiError.recoverable ?? isRecoverableExternalError(error);
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
        code: geminiError.code ?? 'GEMINI_ANALYSIS_FAILED',
        recoverable,
      },
    });

    logProcessingError(requestId, 'analysis', 'Gemini video analysis failed, continuing without transcript', {
      videoId,
      transcriptId,
      code: geminiError.code ?? 'GEMINI_ANALYSIS_FAILED',
      error: errorMessage,
    });

    if (recoverable) {
      throw new HttpError(`Gemini video analysis failed: ${errorMessage}`, 503, {
        code: geminiError.code ?? 'GEMINI_ANALYSIS_FAILED',
        stage: 'analysis',
        recoverable: true,
      });
    }

    return {
      id: transcriptId,
      provider: 'gemini',
      providerModel: geminiClient.modelName,
      status: 'failed',
      language: normalizeLanguage(effectiveLanguage),
      summary: null,
      confidence: 0,
      errorMessage,
      analysis: {
        transcriptText: null,
        transcriptSummary: null,
        summaryDescription: null,
        shortSummary: null,
        semanticTags: [],
        language: normalizeLanguage(effectiveLanguage),
        confidence: 0,
        unavailableReason: errorMessage,
      },
    };
  }

  const status: 'completed' | 'unavailable' = analysis.transcriptText || analysis.transcriptSummary || analysis.summaryDescription
    ? 'completed'
    : 'unavailable';
  const errorMessage = status === 'unavailable'
    ? analysis.unavailableReason || 'Transcript unavailable from Gemini'
    : null;

  const transcriptId = await insertTranscriptRecord(supabaseServiceRole, {
    videoId,
    providerModel: geminiClient.modelName,
    status,
    language: normalizeLanguage(analysis.language) ?? normalizeLanguage(effectiveLanguage),
    transcriptText: analysis.transcriptText,
    summary: analysis.transcriptSummary ?? analysis.summaryDescription,
    confidence: analysis.confidence,
    errorMessage,
    metadata: {
      requestId,
      unavailableReason: analysis.unavailableReason,
      semanticTags: analysis.semanticTags,
    },
  });

  logProcessing(requestId, 'analysis', 'Gemini video analysis completed', {
    videoId,
    transcriptId,
    status,
    confidence: analysis.confidence,
  });

  return {
    id: transcriptId,
    provider: 'gemini',
    providerModel: geminiClient.modelName,
    status,
    language: normalizeLanguage(analysis.language) ?? normalizeLanguage(effectiveLanguage),
    summary: analysis.transcriptSummary ?? analysis.summaryDescription,
    confidence: analysis.confidence,
    errorMessage,
    analysis,
  };
}

async function runEnhancedAssignments(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  geminiClient: ReturnType<typeof createGeminiClient>;
  analysis: GeminiVideoAnalysisResult;
  playlistRows: PlaylistRow[];
  videoId: string;
  userId: string;
}): Promise<EnhancedAssignmentResult> {
  const {
    supabaseServiceRole,
    geminiClient,
    analysis,
    playlistRows,
    videoId,
    userId,
  } = params;

  const geminiAssignment = await geminiClient.assignPlaylistFromAnalysis({
    analysis,
    playlists: playlistRows,
  });

  const playlistAssignment = assignPlaylist({
    playlists: playlistRows,
    analysis: {
      semanticTags: analysis.semanticTags,
      summaryDescription: analysis.summaryDescription,
      shortSummary: analysis.shortSummary,
      language: analysis.language,
      geminiAssignedPlaylistId: geminiAssignment.assignedPlaylistId,
      geminiConfidence: geminiAssignment.confidence,
      geminiReason: geminiAssignment.reason,
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

  const reliable = !!assignedPlaylistId;
  const reason = assignedPlaylistId
    ? playlistAssignment.reason
    : playlistAssignment.reason;

  return {
    assignedPlaylistId,
    playlistAssignment,
    reliability: reliable ? 'high' : 'low',
    reason,
  };
}

function hasProcessedAnalysisContent(analysis: GeminiVideoAnalysisResult): boolean {
  return (
    analysis.semanticTags.length > 0 ||
    !!analysis.summaryDescription ||
    !!analysis.shortSummary ||
    !!analysis.transcriptSummary
  );
}

async function runVideoProcessingTask(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  requestId: string;
  submissionId: string | null;
  videoId: string;
  youtubeUrl: string;
  userId: string;
  video: VideoProcessingVideo;
}) {
  const {
    supabaseServiceRole,
    requestId,
    submissionId,
    videoId,
    youtubeUrl,
    userId,
    video,
  } = params;
  let currentStage = 'background_start';

  try {
    currentStage = 'context_load';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }

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
    const geminiClient = createGeminiClient();

    currentStage = 'analysis';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }
    const transcriptResult = await processVideoAnalysis({
      supabaseServiceRole,
      geminiClient,
      requestId,
      videoId,
      youtubeUrl,
      videoTitle: video.title || '',
      videoDescription: video.description ?? null,
      effectiveLanguage,
    });

    currentStage = 'assignment';
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

    let enhancedAssignment: EnhancedAssignmentResult = {
      assignedPlaylistId: null,
      playlistAssignment: null,
      reliability: 'low',
      reason: 'No playlist assigned because the video analysis did not provide enough educational signals',
    };

    try {
      if (playlistRows.length > 0 && hasProcessedAnalysisContent(transcriptResult.analysis)) {
        enhancedAssignment = await runEnhancedAssignments({
          supabaseServiceRole,
          geminiClient,
          analysis: transcriptResult.analysis,
          playlistRows,
          videoId,
          userId,
        });
      } else {
        logProcessing(requestId, currentStage, 'Skipping playlist assignment because processed analysis is empty', {
          videoId,
          playlistCount: playlistRows.length,
          semanticTagCount: transcriptResult.analysis.semanticTags.length,
        });
      }
    } catch (assignmentError) {
      const assignmentErrorMessage = assignmentError instanceof Error
        ? assignmentError.message
        : 'Unknown playlist assignment error';
      const geminiError = assignmentError as Partial<GeminiError>;
      const recoverable = geminiError.recoverable ?? isRecoverableExternalError(assignmentError);

      logProcessingError(requestId, currentStage, 'Playlist assignment failed', {
        error: assignmentErrorMessage,
        recoverable,
      });

      if (recoverable) {
        throw new HttpError(`Playlist assignment failed: ${assignmentErrorMessage}`, 503, {
          code: geminiError.code ?? 'PLAYLIST_ASSIGNMENT_FAILED',
          stage: currentStage,
          recoverable: true,
        });
      }

      enhancedAssignment = {
        assignedPlaylistId: null,
        playlistAssignment: null,
        reliability: 'low',
        reason: `Playlist assignment skipped after error: ${assignmentErrorMessage}`,
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
        optimized_title: null,
        summary_description: transcriptResult.analysis.summaryDescription ?? transcriptResult.analysis.transcriptSummary,
        semantic_tags: transcriptResult.analysis.semanticTags,
        suggested_category_id: null,
        language: normalizeLanguage(transcriptResult.analysis.language) ?? normalizeLanguage(effectiveLanguage),
        cultural_relevance: null,
        short_summary: transcriptResult.analysis.shortSummary ?? transcriptResult.analysis.summaryDescription ?? transcriptResult.analysis.transcriptSummary,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save AI enrichment: ${error.message}`);
    }

    const detectedLanguage = normalizeLanguage(transcriptResult.analysis.language) ?? normalizeLanguage(effectiveLanguage);
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
            fallbackUsed: enhancedAssignment.reliability === 'low',
            reliability: enhancedAssignment.reliability,
            reason: enhancedAssignment.reason,
            assignedCategoryId: null,
            assignedPlaylistId: enhancedAssignment.assignedPlaylistId,
            algorithmVersion: enhancedAssignment.playlistAssignment?.algorithmVersion ?? null,
            score: enhancedAssignment.playlistAssignment?.score ?? null,
            geminiConfidence: enhancedAssignment.playlistAssignment?.geminiConfidence ?? null,
            signals: enhancedAssignment.playlistAssignment?.signals ?? null,
            topCandidates: enhancedAssignment.playlistAssignment?.topCandidates ?? [],
            rejectedPlaylistId: enhancedAssignment.playlistAssignment?.rejectedPlaylistId ?? null,
            rejectedAiPlaylistId: enhancedAssignment.playlistAssignment?.rejectedPlaylistId ?? null,
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
      assignedPlaylistId: enhancedAssignment.assignedPlaylistId,
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

    if (typeof EdgeRuntime === 'undefined' || typeof EdgeRuntime.waitUntil !== 'function') {
      throw new HttpError('Edge background processing is unavailable', 500, {
        code: 'BACKGROUND_RUNTIME_UNAVAILABLE',
        stage: currentStage,
        recoverable: true,
      });
    }

    currentStage = 'queued';
    if (submissionId) {
      await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);
    }

    EdgeRuntime.waitUntil(runVideoProcessingTask({
      supabaseServiceRole,
      requestId,
      submissionId,
      videoId,
      youtubeUrl,
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
