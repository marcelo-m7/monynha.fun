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
  reliability: 'high' | 'low';
  reason: string;
};

type SubjectSignal = 'math' | 'design' | 'programming';

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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

const subjectKeywords: Record<SubjectSignal, string[]> = {
  math: [
    'matematica',
    'matematico',
    'calculo',
    'analise',
    'integral',
    'integrais',
    'integracao',
    'derivada',
    'limite',
    'equacao',
    'algebra',
    'matriz',
    'vetor',
    'linha',
    'coordenadas',
    'polares',
    'murakami',
    'rapidola',
  ],
  design: [
    'design',
    'comunicacao',
    'grafico',
    'grafica',
    'visual',
    'tipografia',
    'ilustracao',
    'multimedia',
    'interacao',
    'marketing',
    'caligrafia',
  ],
  programming: [
    'programacao',
    'programming',
    'javascript',
    'typescript',
    'python',
    'java',
    'react',
    'node',
    'codigo',
    'algoritmo',
    'dados',
    'software',
  ],
};

function subjectSignalScore(text: string, subject: SubjectSignal): number {
  const normalized = normalizeText(text);
  return subjectKeywords[subject].reduce(
    (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
    0,
  );
}

function playlistSubjectScore(playlist: PlaylistRow, subject: SubjectSignal): number {
  const playlistText = [
    playlist.name,
    playlist.description ?? '',
    playlist.course_code ?? '',
    playlist.unit_code ?? '',
  ].join(' ');

  return subjectSignalScore(playlistText, subject);
}

function getOriginalVideoText(params: {
  title: string | null;
  description: string | null;
  channelName: string | null;
}): string {
  return [
    params.title ?? '',
    params.description ?? '',
    params.channelName ?? '',
  ].join(' ');
}

function scorePlaylistAgainstOriginalSource(
  playlist: PlaylistRow,
  sourceText: string,
  videoLanguage: string,
): number {
  let score = 0;
  const playlistText = [
    playlist.name,
    playlist.description ?? '',
    playlist.course_code ?? '',
    playlist.unit_code ?? '',
  ].join(' ');

  score += Math.min(8, tokenOverlapScore(sourceText, playlistText));

  const mathSignal = subjectSignalScore(sourceText, 'math');
  const designSignal = subjectSignalScore(sourceText, 'design');
  const programmingSignal = subjectSignalScore(sourceText, 'programming');

  const playlistMath = playlistSubjectScore(playlist, 'math');
  const playlistDesign = playlistSubjectScore(playlist, 'design');
  const playlistProgramming = playlistSubjectScore(playlist, 'programming');

  if (mathSignal >= 2) {
    score += playlistMath * 6;
    if (playlistDesign > 0 && playlistMath === 0) score -= 18;
    if (normalizeText(playlist.name).includes('matematica ii')) score += 14;
    if (normalizeText(playlist.name).includes('matematica i')) score += 6;
  }

  if (designSignal >= 2) {
    score += playlistDesign * 5;
    if (playlistMath > 0 && playlistDesign === 0) score -= 8;
  }

  if (programmingSignal >= 2) {
    score += playlistProgramming * 5;
    if (playlistDesign > 0 && playlistProgramming === 0) score -= 8;
  }

  if (normalizeText(playlist.language) === normalizeText(videoLanguage)) {
    score += 1;
  }

  if (playlist.course_code || playlist.unit_code) {
    score += 1;
  }

  return score;
}

function isPlaylistCompatibleWithOriginalSource(
  playlist: PlaylistRow,
  sourceText: string,
): boolean {
  const mathSignal = subjectSignalScore(sourceText, 'math');
  const designSignal = subjectSignalScore(sourceText, 'design');
  const programmingSignal = subjectSignalScore(sourceText, 'programming');

  if (mathSignal >= 2) {
    return playlistSubjectScore(playlist, 'math') > 0;
  }

  if (designSignal >= 2) {
    return playlistSubjectScore(playlist, 'design') > 0;
  }

  if (programmingSignal >= 2) {
    return playlistSubjectScore(playlist, 'programming') > 0;
  }

  return true;
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
  sourceText: string,
): { playlistId: string | null; score: number } {
  let bestMatch: { playlistId: string | null; score: number } = {
    playlistId: null,
    score: 0,
  };

  const tagsText = enrichment.semantic_tags.join(' ');

  for (const playlist of playlists) {
    let score = scorePlaylistAgainstOriginalSource(playlist, sourceText, videoLanguage);
    const playlistText = [
      playlist.name,
      playlist.description ?? '',
      playlist.course_code ?? '',
      playlist.unit_code ?? '',
    ].join(' ');

    score += Math.min(4, tokenOverlapScore(enrichment.suggested_playlist_query, playlistText));
    score += Math.min(2, tokenOverlapScore(enrichment.suggested_category, playlistText));
    score += Math.min(3, tokenOverlapScore(tagsText, playlistText));

    if (category) {
      score += Math.min(2, tokenOverlapScore(`${category.slug} ${category.name}`, playlistText));
    }

    if (normalizeText(playlist.language) === normalizeText(videoLanguage)) {
      score += 1;
    }

    if (playlist.course_code || playlist.unit_code) {
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

async function safeUpdateSubmissionStatus(
  supabaseServiceRole: ReturnType<typeof createClient> | null,
  submissionId: string | null,
  values: Record<string, unknown>,
) {
  if (!supabaseServiceRole || !submissionId) {
    return;
  }

  try {
    await updateSubmissionStatus(supabaseServiceRole, submissionId, values);
  } catch (statusError) {
    const statusErrorMessage = statusError instanceof Error
      ? statusError.message
      : 'Unknown submission status update error';
    console.error(`[enrich-video] ${statusErrorMessage}`);
  }
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
  const originalSourceText = getOriginalVideoText({
    title: videoTitle,
    description: videoDescription,
    channelName,
  });

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

  // Primary path: AI returned a valid UUID from the provided playlists list
  let resolvedPlaylistId: string | null =
    enrichment.suggested_playlist_id &&
    playlistRows.some((p) => {
      return p.id === enrichment.suggested_playlist_id &&
        isPlaylistCompatibleWithOriginalSource(p, originalSourceText);
    })
      ? enrichment.suggested_playlist_id
      : null;

  // Fallback: token-overlap scoring for playlists
  if (!resolvedPlaylistId) {
    const categoryRow = categoryRows.find((c) => c.id === assignedCategoryId) ?? null;
    const effectiveLanguage = videoLanguage || enrichment.language || 'pt';
    const playlistCandidate = pickPlaylistCandidate(
      playlistRows,
      enrichment,
      categoryRow,
      effectiveLanguage,
      originalSourceText,
    );
    if (playlistCandidate.score >= 5 && categoryConfidence >= 0.40) {
      resolvedPlaylistId = playlistCandidate.playlistId;
    }
  }

  let assignedPlaylistId: string | null = null;
  if (resolvedPlaylistId) {
    await assignVideoToPlaylist(
      supabaseServiceRole,
      resolvedPlaylistId,
      videoId,
      userId,
    );
    assignedPlaylistId = resolvedPlaylistId;
  }

  const reliable = hasReliableCategory || !!assignedPlaylistId;
  const reason = reliable
    ? 'Enhanced assignment applied'
    : 'Enhanced suggestions below reliability threshold';

  return {
    suggestedCategoryId: resolvedCategoryId,
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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.error("[enrich-video] Unauthorized: No Authorization header provided.")
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  const token = authHeader.replace('Bearer ', '')
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

  let submissionId: string | null = null;
  let submissionBelongsToUser = false;
  let supabaseServiceRole: ReturnType<typeof createClient> | null = null;

  try {
    const { videoId, youtubeUrl, submissionId: requestedSubmissionId } = await req.json()
    submissionId = typeof requestedSubmissionId === 'string' && requestedSubmissionId.trim()
      ? requestedSubmissionId.trim()
      : null;

    if (!videoId || !youtubeUrl) {
      throw new HttpError('videoId and youtubeUrl are required', 400);
    }

    console.log(`[enrich-video] Received request for videoId: ${videoId}, youtubeUrl: ${youtubeUrl}, submissionId: ${submissionId ?? 'none'} by user: ${user.id}`)

    supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (submissionId) {
      const { data: submission, error: submissionError } = await supabaseServiceRole
        .from('video_submissions')
        .select('id, user_id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        throw new HttpError(`Submission not found: ${submissionError?.message || 'Unknown error'}`, 404);
      }

      if (submission.user_id !== user.id) {
        throw new HttpError('Submission does not belong to the authenticated user', 403);
      }

      submissionBelongsToUser = true;

      await updateSubmissionStatus(supabaseServiceRole, submissionId, {
        video_id: videoId,
        status: 'processing',
        error_message: null,
        recoverable: false,
        processing_started_at: new Date().toISOString(),
      });
    }

    const { data: video, error: videoError } = await supabaseServiceRole
      .from('videos')
      .select('title, description, channel_name, language, category_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error("[enrich-video] Video not found:", videoError?.message);
      throw new HttpError(`Video not found: ${videoError?.message || 'Unknown error'}`, 404);
    }

    // Fetch categories and playlists BEFORE calling OpenAI so they can be
    // embedded in the prompt, enabling the AI to return exact DB UUIDs.
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

    // Call OpenAI for enrichment -- categories and playlists embedded in prompt
    let enrichment: EnrichmentPayload;
    try {
      const openaiClient = createOpenAIClient();
      const enrichmentParams: VideoEnrichmentParams = {
        title: video.title || '',
        description: video.description || '',
        channelName: video.channel_name || null,
        language: effectiveLanguage,
        categories: categoryRows,
        playlists: playlistRows,
      };
      enrichment = await openaiClient.enrichVideo(enrichmentParams) as EnrichmentPayload;
      console.log(`[enrich-video] Enriched video ${videoId}: category_id=${enrichment.suggested_category_id}, playlist_id=${enrichment.suggested_playlist_id}`);
    } catch (openaiError) {
      const errorMsg = openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error';
      console.error("[enrich-video] OpenAI enrichment failed:", errorMsg);
      throw new Error(`AI enrichment failed: ${errorMsg}`);
    }

    let enhancedAssignment = {
      fallbackUsed: false,
      reliability: 'low' as 'low' | 'high',
      reason: 'Enhanced assignment not evaluated',
      suggestedCategoryId: null as string | null,
      assignedCategoryId: null as string | null,
      assignedPlaylistId: null as string | null,
    };

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
          enrichmentId: data.id,
          detectedLanguage,
          assignment: {
            fallbackUsed: enhancedAssignment.fallbackUsed,
            reliability: enhancedAssignment.reliability,
            reason: enhancedAssignment.reason,
            assignedCategoryId: enhancedAssignment.assignedCategoryId,
            assignedPlaylistId: enhancedAssignment.assignedPlaylistId,
          },
        },
      });
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
    const status = error instanceof HttpError ? error.status : 500;
    console.error(`[enrich-video] Error processing request: ${errorMessage}`)
    if (submissionBelongsToUser) {
      await safeUpdateSubmissionStatus(supabaseServiceRole, submissionId, {
        status: status >= 500 ? 'recoverable_error' : 'failed',
        error_message: errorMessage,
        recoverable: status >= 500,
        completed_at: new Date().toISOString(),
      });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
