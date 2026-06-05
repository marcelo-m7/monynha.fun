import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import {
  buildVideoSummary,
  deriveTags,
  normalizeLanguage,
  pickCategory,
  type LegacyFastCategory,
} from '../_shared/legacy-fast-enrichment.ts'
import {
  assignPlaylist,
  type PlaylistAssignmentPlaylist,
  type PlaylistAssignmentResult,
} from '../_shared/playlist-assignment.ts'
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts'
import { checkEdgeRateLimit } from '../_shared/rate-limit.ts'

const ENRICH_RATE_LIMIT_WINDOWS = [
  { windowSeconds: 60, maxRequests: 5 },
  { windowSeconds: 24 * 60 * 60, maxRequests: 50 },
]

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

function decodeHtml(value: string | null | undefined): string | null {
  const decoded = (value ?? '')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  return decoded || null;
}

function extractMetaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  return null;
}

function detectLanguage(...values: Array<string | null | undefined>): string {
  const text = values
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const portugueseSignals = [
    ' voce ',
    ' aula ',
    ' curso ',
    ' como ',
    ' para ',
    ' programador',
    ' calculo',
    ' integral',
    ' nessa ',
    ' por onde',
  ];
  const englishSignals = [
    ' the ',
    ' and ',
    ' with ',
    ' for ',
    ' beginners',
    ' course',
    ' tutorial',
    ' database',
    ' management',
    ' sql ',
  ];

  const padded = ` ${text} `;
  const portugueseScore = portugueseSignals.filter((signal) => padded.includes(signal)).length;
  const englishScore = englishSignals.filter((signal) => padded.includes(signal)).length;

  if (englishScore > portugueseScore) return 'en';
  if (portugueseScore > 0) return 'pt';
  return 'pt';
}

function isGenericYouTubeDescription(value: string | null | undefined): boolean {
  const normalized = (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalized.includes('profitez des videos et de la musique') ||
    normalized.includes('enjoy the videos and music you love') ||
    normalized.includes('sube videos originales') ||
    normalized.includes('mettez en ligne des contenus originaux');
}

async function fetchPublicYouTubeMetadata(youtubeId: string): Promise<{
  description: string | null;
  durationSeconds: number | null;
  language: string | null;
}> {
  try {
    const playerResponse = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 Tube O2 public metadata fetcher',
        'x-youtube-client-name': '1',
        'x-youtube-client-version': '2.20240101.00.00',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
        videoId: youtubeId,
      }),
    });
    const playerData = await playerResponse.json().catch(() => null) as {
      videoDetails?: {
        title?: string;
        author?: string;
        shortDescription?: string;
        lengthSeconds?: string;
      };
    } | null;
    const videoDetails = playerData?.videoDetails;
    if (videoDetails) {
      const description = decodeHtml(videoDetails.shortDescription);
      const durationSeconds = videoDetails.lengthSeconds
        ? Number.parseInt(videoDetails.lengthSeconds, 10)
        : null;

      return {
        description: isGenericYouTubeDescription(description) ? null : description,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
        language: detectLanguage(videoDetails.title, videoDetails.author, description),
      };
    }

    const response = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 Tube O2 public metadata fetcher',
      },
    });

    if (!response.ok) {
      console.warn(`[enrich-video] YouTube public metadata fetch failed for ${youtubeId}: ${response.status}`);
      return { description: null, durationSeconds: null, language: null };
    }

    const html = await response.text();
    const description = extractMetaContent(html, 'description') ?? extractMetaContent(html, 'og:description');
    const durationRaw = html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/)?.[1] ?? null;
    const durationSeconds = durationRaw ? Number.parseInt(durationRaw, 10) : null;
    const descriptionIsGeneric = isGenericYouTubeDescription(description);
    const language = descriptionIsGeneric ? null : detectLanguage(description);

    return {
      description: descriptionIsGeneric ? null : description,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      language,
    };
  } catch (error) {
    console.warn(`[enrich-video] YouTube public metadata fetch failed for ${youtubeId}: ${error instanceof Error ? error.message : 'unknown error'}`);
    return { description: null, durationSeconds: null, language: null };
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

async function ensureDeepAnalysisJob(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  videoId: string;
  submissionId: string | null;
  enrichmentId: string;
  requestId: string;
}) {
  const { supabaseServiceRole, videoId, submissionId, enrichmentId, requestId } = params;
  const { data: existing, error: existingError } = await supabaseServiceRole
    .from('video_analysis_jobs')
    .select('id, status')
    .eq('video_id', videoId)
    .eq('provider', 'v2')
    .in('status', ['pending', 'processing', 'recoverable_error'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check video analysis jobs: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseServiceRole
    .from('video_analysis_jobs')
    .insert({
      video_id: videoId,
      submission_id: submissionId,
      status: 'pending',
      provider: 'v2',
      provider_model: null,
      metadata: {
        source: 'enrich-video',
        fastProvider: 'legacy_fast',
        enrichmentId,
        requestId,
      },
    })
    .select('id, status')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: racedJob, error: racedJobError } = await supabaseServiceRole
        .from('video_analysis_jobs')
        .select('id, status')
        .eq('video_id', videoId)
        .eq('provider', 'v2')
        .in('status', ['pending', 'processing', 'recoverable_error'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!racedJobError && racedJob) {
        return racedJob;
      }
    }

    throw new Error(`Failed to create video analysis job: ${error.message}`);
  }

  return data;
}

async function loadPlaylistCandidates(
  supabaseServiceRole: ReturnType<typeof createClient>,
  language: string,
): Promise<PlaylistAssignmentPlaylist[]> {
  const { data, error } = await supabaseServiceRole.rpc('list_education_playlists_for_assignment', {
    p_language: language,
    p_limit: 120,
  });

  if (error) {
    throw new Error(`Failed to load playlist assignment candidates: ${error.message}`);
  }

  return (data ?? []) as PlaylistAssignmentPlaylist[];
}

async function persistPlaylistAssignment(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  assignment: PlaylistAssignmentResult;
  videoId: string;
  userId: string;
}) {
  const { supabaseServiceRole, assignment, videoId, userId } = params;
  if (!assignment.assignedPlaylistId) {
    return null;
  }

  const { data: existing, error: existingError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('id, playlist_id, position')
    .eq('playlist_id', assignment.assignedPlaylistId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check playlist assignment: ${existingError.message}`);
  }

  if (existing) {
    return { ...existing, created: false };
  }

  const { data: lastItem, error: lastItemError } = await supabaseServiceRole
    .from('playlist_videos')
    .select('position')
    .eq('playlist_id', assignment.assignedPlaylistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) {
    throw new Error(`Failed to resolve playlist position: ${lastItemError.message}`);
  }

  const nextPosition = typeof lastItem?.position === 'number' ? lastItem.position + 1 : 0;
  const notes = [
    `Assigned by ${assignment.algorithmVersion}`,
    assignment.reason,
  ].join(': ');

  const { data: inserted, error: insertError } = await supabaseServiceRole
    .from('playlist_videos')
    .insert({
      playlist_id: assignment.assignedPlaylistId,
      video_id: videoId,
      position: nextPosition,
      added_by: userId,
      notes,
    })
    .select('id, playlist_id, position')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: racedAssignment, error: racedAssignmentError } = await supabaseServiceRole
        .from('playlist_videos')
        .select('id, playlist_id, position')
        .eq('playlist_id', assignment.assignedPlaylistId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (!racedAssignmentError && racedAssignment) {
        return { ...racedAssignment, created: false };
      }
    }

    throw new Error(`Failed to persist playlist assignment: ${insertError.message}`);
  }

  return { ...inserted, created: true };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', { requestId });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse(req, 401, 'UNAUTHORIZED_NO_AUTH_HEADER', 'Missing authorization header', { requestId });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return errorResponse(req, 500, 'MISSING_ENVIRONMENT', 'Missing required Supabase environment variables', { requestId });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return errorResponse(req, 401, 'UNAUTHORIZED_INVALID_TOKEN', 'Invalid or expired authorization token', { requestId });
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

    if (!videoId || !youtubeUrl || !submissionId) {
      throw new HttpError('videoId, youtubeUrl and submissionId are required', 400, { code: 'INVALID_PAYLOAD', recoverable: false });
    }

    const requestYoutubeId = extractYouTubeId(youtubeUrl);
    if (!requestYoutubeId) {
      throw new HttpError('youtubeUrl must be a valid YouTube video URL', 400, {
        code: 'INVALID_YOUTUBE_URL',
        recoverable: false,
      });
    }

    supabaseServiceRole = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const rateLimit = await checkEdgeRateLimit(supabaseServiceRole, {
      functionName: 'enrich-video',
      userId: user.id,
      windows: ENRICH_RATE_LIMIT_WINDOWS,
    });

    if (!rateLimit.allowed) {
      return errorResponse(req, 429, 'RATE_LIMITED', 'Too many enrichment requests. Try again later.', {
        requestId,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    if (submissionId) {
      const { data: submission, error: submissionError } = await supabaseServiceRole
        .from('video_submissions')
        .select('id, user_id, video_id, youtube_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        if (submissionError) {
          console.error(`[enrich-video] ${requestId} submission lookup failed: ${submissionError.message}`);
        }
        throw new HttpError('Submission not found', 404, {
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

      if (submission.video_id && submission.video_id !== videoId) {
        throw new HttpError('Submission video ID does not match request video', 400, {
          code: 'VIDEO_ID_MISMATCH',
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
      if (videoError) {
        console.error(`[enrich-video] ${requestId} video lookup failed: ${videoError.message}`);
      }
      throw new HttpError('Video not found', 404, {
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

    const publicMetadata = await fetchPublicYouTubeMetadata(requestYoutubeId);
    const storedDescriptionIsGeneric = isGenericYouTubeDescription(video.description);
    const storedDescription = storedDescriptionIsGeneric ? null : video.description;
    const enrichedDescription = storedDescription || publicMetadata.description;
    const inferredLanguage = publicMetadata.language ?? detectLanguage(video.title, video.channel_name, enrichedDescription);
    const enrichedLanguage = normalizeLanguage(inferredLanguage);

    const videoPatch: Record<string, unknown> = {};
    if (!video.description || storedDescriptionIsGeneric) {
      videoPatch.description = publicMetadata.description ?? null;
    }
    if (publicMetadata.durationSeconds !== null) {
      videoPatch.duration_seconds = publicMetadata.durationSeconds;
    }
    if (!video.language || video.language === 'und' || video.language !== enrichedLanguage) {
      videoPatch.language = enrichedLanguage;
    }

    if (Object.keys(videoPatch).length > 0) {
      const { error: videoMetadataUpdateError } = await supabaseServiceRole
        .from('videos')
        .update(videoPatch)
        .eq('id', videoId);

      if (videoMetadataUpdateError) {
        throw new Error(`Failed to update video public metadata: ${videoMetadataUpdateError.message}`);
      }
    }

    const { data: categoriesData, error: categoriesError } = await supabaseServiceRole
      .from('categories')
      .select('id, name, slug');

    if (categoriesError) {
      throw new Error(`Failed to load categories: ${categoriesError.message}`);
    }

    const categoryRows = (categoriesData ?? []) as LegacyFastCategory[];
    const language = enrichedLanguage;
    const title = video.title || 'Video do YouTube';
    const summary = buildVideoSummary({
      title: video.title,
      description: enrichedDescription,
      channelName: video.channel_name,
      youtubeId: requestYoutubeId,
    });
    const semanticTags = deriveTags({
      title: video.title,
      description: enrichedDescription,
      channelName: video.channel_name,
      language,
    });
    const selectedCategory = pickCategory(categoryRows, {
      currentCategoryId: video.category_id ?? null,
      title: video.title,
      description: enrichedDescription,
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

    const playlistCandidates = await loadPlaylistCandidates(supabaseServiceRole, language);
    const playlistAssignment = assignPlaylist({
      playlists: playlistCandidates,
      analysis: {
        title,
        description: enrichedDescription,
        semanticTags,
        summaryDescription: summary,
        shortSummary: summary,
        language,
        suggestedPlaylistId: null,
        suggestedPlaylistQuery: semanticTags.join(' '),
        classificationConfidence: null,
      },
    });
    const persistedPlaylistAssignment = await persistPlaylistAssignment({
      supabaseServiceRole,
      assignment: playlistAssignment,
      videoId,
      userId: user.id,
    });

    const analysisJob = await ensureDeepAnalysisJob({
      supabaseServiceRole,
      videoId,
      submissionId,
      enrichmentId: enrichment.id,
      requestId,
    });

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
          analysisJob: {
            id: analysisJob.id,
            status: analysisJob.status,
            provider: 'v2',
          },
          enrichment: {
            provider: 'legacy_fast',
            model: null,
            optimizedTitle: title,
            summaryDescription: summary,
            shortSummary: summary,
            semanticTags,
          },
          assignment: {
            fallbackUsed: playlistAssignment.assignedPlaylistId === null,
            reliability: playlistAssignment.reliability,
            reason: playlistAssignment.assignedPlaylistId
              ? playlistAssignment.reason
              : selectedCategory
                ? `${playlistAssignment.reason} Categoria selecionada automaticamente: ${selectedCategory.name}`
                : playlistAssignment.reason,
            assignedCategoryId: selectedCategory?.id ?? null,
            assignedPlaylistId: playlistAssignment.assignedPlaylistId,
            decisionSource: playlistAssignment.decisionSource,
            provider: 'legacy_fast',
            providerConfidence: playlistAssignment.providerConfidence,
            score: playlistAssignment.score,
            algorithmVersion: playlistAssignment.algorithmVersion,
            signals: playlistAssignment.signals,
            topCandidates: playlistAssignment.topCandidates,
            rejectedPlaylistId: playlistAssignment.rejectedPlaylistId,
            rejectedAiPlaylistId: null,
            persisted: persistedPlaylistAssignment
              ? {
                id: persistedPlaylistAssignment.id,
                position: persistedPlaylistAssignment.position,
                created: persistedPlaylistAssignment.created,
              }
              : null,
          },
        },
      });
    }

    return jsonResponse(req, {
      message: 'AI enrichment saved successfully',
      data: enrichment,
      provider: 'legacy_fast',
      requestId,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const recoverable = error instanceof HttpError ? error.recoverable : true;
    const code = error instanceof HttpError ? error.code : 'PROCESSING_ERROR';
    const internalMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const message = error instanceof HttpError ? error.message : 'Video enrichment failed';

    if (!(error instanceof HttpError)) {
      console.error(`[enrich-video] ${requestId} failed: ${internalMessage}`);
    }

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

    return errorResponse(req, status, code, message, { recoverable, requestId });
  }
})
