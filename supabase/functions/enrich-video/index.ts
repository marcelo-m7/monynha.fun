import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import {
  buildVideoSummary,
  deriveTags,
  normalizeLanguage,
  pickCategory,
  type LegacyFastCategory,
} from '../_shared/legacy-fast-enrichment.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class HttpError extends Error {
  status: number;
  code: string;
  recoverable: boolean;

  constructor(message: string, status: number, options: { code?: string; recoverable?: boolean } = {}) {
    super(message);
    this.status = status;
    this.code = options.code ?? 'HTTP_ERROR';
    this.recoverable = options.recoverable ?? status >= 500;
  }
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

async function safeUpdateSubmissionStatus(
  supabaseServiceRole: ReturnType<typeof createClient> | null,
  submissionId: string | null,
  values: Record<string, unknown>,
) {
  if (!supabaseServiceRole || !submissionId) return;

  try {
    await updateSubmissionStatus(supabaseServiceRole, submissionId, values);
  } catch (error) {
    console.error(`[enrich-video] ${error instanceof Error ? error.message : 'Unknown status update error'}`);
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({
      error: {
        code: 'UNAUTHORIZED_NO_AUTH_HEADER',
        message: 'Missing authorization header',
        requestId,
      },
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({
      error: {
        code: 'MISSING_ENVIRONMENT',
        message: 'Missing required Supabase environment variables',
        requestId,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({
      error: {
        code: 'UNAUTHORIZED_INVALID_TOKEN',
        message: 'Invalid or expired authorization token',
        requestId,
      },
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let submissionId: string | null = null;
  let submissionBelongsToUser = false;
  let supabaseServiceRole: ReturnType<typeof createClient> | null = null;

  try {
    const requestBody = await req.json().catch(() => {
      throw new HttpError('Request body must be valid JSON', 400, { code: 'INVALID_JSON', recoverable: false });
    });

    const videoId = typeof requestBody?.videoId === 'string' ? requestBody.videoId.trim() : '';
    const youtubeUrl = typeof requestBody?.youtubeUrl === 'string' ? requestBody.youtubeUrl.trim() : '';
    const requestedSubmissionId = typeof requestBody?.submissionId === 'string' ? requestBody.submissionId.trim() : '';
    submissionId = requestedSubmissionId || null;

    if (!videoId || !youtubeUrl) {
      throw new HttpError('videoId and youtubeUrl are required', 400, { code: 'INVALID_PAYLOAD', recoverable: false });
    }

    const requestYoutubeId = extractYouTubeId(youtubeUrl);
    if (!requestYoutubeId) {
      throw new HttpError('youtubeUrl must be a valid YouTube video URL', 400, {
        code: 'INVALID_YOUTUBE_URL',
        recoverable: false,
      });
    }

    supabaseServiceRole = createClient(supabaseUrl, serviceRoleKey);

    if (submissionId) {
      const { data: submission, error: submissionError } = await supabaseServiceRole
        .from('video_submissions')
        .select('id, user_id, youtube_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        throw new HttpError(`Submission not found: ${submissionError?.message || 'Unknown error'}`, 404, {
          code: 'SUBMISSION_NOT_FOUND',
          recoverable: false,
        });
      }

      if (submission.user_id !== user.id) {
        throw new HttpError('Submission does not belong to the authenticated user', 403, {
          code: 'SUBMISSION_FORBIDDEN',
          recoverable: false,
        });
      }

      if (submission.youtube_id && submission.youtube_id !== requestYoutubeId) {
        throw new HttpError('Submission YouTube ID does not match request URL', 400, {
          code: 'YOUTUBE_ID_MISMATCH',
          recoverable: false,
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
        metadata: {
          processing: {
            requestId,
            stage: 'legacy_fast_enrichment',
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }

    const { data: video, error: videoError } = await supabaseServiceRole
      .from('videos')
      .select('youtube_id, title, description, channel_name, language, category_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new HttpError(`Video not found: ${videoError?.message || 'Unknown error'}`, 404, {
        code: 'VIDEO_NOT_FOUND',
        recoverable: false,
      });
    }

    if (video.youtube_id !== requestYoutubeId) {
      throw new HttpError('Request YouTube URL does not match the stored video', 400, {
        code: 'VIDEO_YOUTUBE_ID_MISMATCH',
        recoverable: false,
      });
    }

    const { data: categoriesData, error: categoriesError } = await supabaseServiceRole
      .from('categories')
      .select('id, name, slug');

    if (categoriesError) {
      throw new Error(`Failed to load categories: ${categoriesError.message}`);
    }

    const categoryRows = (categoriesData ?? []) as LegacyFastCategory[];
    const language = normalizeLanguage(video.language);
    const title = video.title || 'Video do YouTube';
    const summary = buildVideoSummary({
      title: video.title,
      description: video.description,
      channelName: video.channel_name,
      youtubeId: requestYoutubeId,
    });
    const semanticTags = deriveTags({
      title: video.title,
      description: video.description,
      channelName: video.channel_name,
      language,
    });
    const selectedCategory = pickCategory(categoryRows, {
      currentCategoryId: video.category_id ?? null,
      title: video.title,
      description: video.description,
      channelName: video.channel_name,
      semanticTags,
    });

    if (selectedCategory && selectedCategory.id !== video.category_id) {
      const { error: categoryUpdateError } = await supabaseServiceRole
        .from('videos')
        .update({ category_id: selectedCategory.id })
        .eq('id', videoId);

      if (categoryUpdateError) {
        throw new Error(`Failed to update video category: ${categoryUpdateError.message}`);
      }
    }

    const { data: enrichment, error: enrichmentError } = await supabaseServiceRole
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        optimized_title: title,
        summary_description: summary,
        semantic_tags: semanticTags,
        suggested_category_id: selectedCategory?.id ?? null,
        language,
        cultural_relevance: 'Curadoria rapida sem analise externa',
        short_summary: summary,
      })
      .select()
      .single();

    if (enrichmentError) {
      throw new Error(`Failed to save AI enrichment: ${enrichmentError.message}`);
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
          enrichmentId: enrichment.id,
          detectedLanguage: language,
          enrichment: {
            provider: 'legacy_fast',
            model: null,
            optimizedTitle: title,
            summaryDescription: summary,
            shortSummary: summary,
            semanticTags,
          },
          assignment: {
            fallbackUsed: true,
            reliability: 'low',
            reason: selectedCategory
              ? `Categoria selecionada automaticamente: ${selectedCategory.name}`
              : 'Legacy fast enrichment restored; playlist assignment skipped',
            assignedCategoryId: selectedCategory?.id ?? null,
            assignedPlaylistId: null,
            decisionSource: 'none',
            provider: 'legacy_fast',
            providerConfidence: null,
            signals: null,
            topCandidates: [],
            rejectedPlaylistId: null,
            rejectedAiPlaylistId: null,
          },
        },
      });
    }

    return new Response(JSON.stringify({
      message: 'AI enrichment saved successfully',
      data: enrichment,
      provider: 'legacy_fast',
      requestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const recoverable = error instanceof HttpError ? error.recoverable : true;
    const code = error instanceof HttpError ? error.code : 'PROCESSING_ERROR';
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    if (submissionBelongsToUser) {
      await safeUpdateSubmissionStatus(supabaseServiceRole, submissionId, {
        status: recoverable ? 'recoverable_error' : 'failed',
        error_message: message,
        recoverable,
        completed_at: new Date().toISOString(),
        metadata: {
          processing: {
            requestId,
            stage: 'legacy_fast_enrichment_error',
            updatedAt: new Date().toISOString(),
          },
          error: {
            code,
            message,
            recoverable,
            requestId,
          },
        },
      });
    }

    return new Response(JSON.stringify({
      error: {
        code,
        message,
        recoverable,
        requestId,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
})
