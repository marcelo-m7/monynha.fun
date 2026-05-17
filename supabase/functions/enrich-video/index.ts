import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

type Provider = 'gemini' | 'openai';
type TranscriptStatus = 'completed' | 'unavailable' | 'failed';

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

type VideoAnalysis = {
  transcriptText: string | null;
  transcriptSummary: string | null;
  summaryDescription: string | null;
  shortSummary: string | null;
  semanticTags: string[];
  language: string | null;
  confidence: number;
  unavailableReason: string | null;
};

type AiPlaylistChoice = {
  assignedPlaylistId: string | null;
  confidence: number;
  reason: string | null;
};

type PlaylistAssignmentResult = {
  algorithmVersion: string;
  assignedPlaylistId: string | null;
  score: number;
  reliability: 'high' | 'low';
  reason: string;
  provider: Provider | null;
  providerConfidence: number | null;
  signals: Record<string, number>;
  topCandidates: Array<{
    playlistId: string;
    name: string;
    score: number;
    compatible: boolean;
    aiSuggested: boolean;
  }>;
  rejectedAiPlaylistId: string | null;
};

type TranscriptProcessingResult = {
  id: string | null;
  provider: Provider;
  providerModel: string;
  status: TranscriptStatus;
  language: string | null;
  summary: string | null;
  confidence: number;
  errorMessage: string | null;
  analysis: VideoAnalysis;
  fallbackUsed: boolean;
  fallbackFrom: Provider | null;
  fallbackError: string | null;
};

type VideoProcessingVideo = {
  youtube_id: string;
  title: string | null;
  description: string | null;
  channel_name: string | null;
  language: string | null;
  category_id: string | null;
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

function tokenize(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed));
  }
  return 0;
}

function optionalString(value: unknown, maxLength = 4000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && !!item.trim())
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function parseJsonObject(content: string): Record<string, unknown> {
  const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in AI response');
  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function parseVideoAnalysis(content: string, fallbackLanguage: string): VideoAnalysis {
  const parsed = parseJsonObject(content);
  const transcriptSummary = optionalString(parsed.transcriptSummary, 900);
  const summaryDescription = optionalString(parsed.summaryDescription, 320) ?? transcriptSummary;
  const shortSummary = optionalString(parsed.shortSummary, 180) ?? summaryDescription;

  return {
    transcriptText: optionalString(parsed.transcriptText, 1600),
    transcriptSummary,
    summaryDescription,
    shortSummary,
    semanticTags: optionalStringArray(parsed.semanticTags ?? parsed.semantic_tags),
    language: normalizeLanguage(optionalString(parsed.language, 12)) ?? normalizeLanguage(fallbackLanguage),
    confidence: normalizeConfidence(parsed.confidence),
    unavailableReason: optionalString(parsed.unavailableReason, 400),
  };
}

function analysisPrompt(params: {
  title: string;
  description: string | null;
  language: string;
  youtubeUrl: string;
}) {
  return `Analyze this public educational YouTube video and return compact educational metadata.

Title: "${params.title}"
Description: "${params.description ?? ''}"
Preferred language: ${params.language || 'auto'}
YouTube URL: ${params.youtubeUrl}

Respond ONLY with valid JSON:
{
  "transcriptText": "short faithful transcript excerpt only if immediately available, otherwise null",
  "transcriptSummary": "2-4 sentence summary of the spoken or visible educational content",
  "summaryDescription": "2-3 sentence user-facing summary under 280 characters",
  "shortSummary": "single sentence summary under 140 characters",
  "semanticTags": ["specific subject tag", "concept tag", "course topic tag"],
  "language": "ISO 639-1 language code if detected, otherwise null",
  "confidence": 0.0,
  "unavailableReason": "short reason when transcriptText is unavailable, otherwise null"
}

Rules:
- Do not invent a full transcript.
- If captions/audio are unavailable, use title and description honestly and set transcriptText to null.
- semanticTags must describe the subject matter, not clickbait wording.
- Consider all educational areas, not only programming.
- Keep summaries compact and public-safe.`;
}

function playlistChoicePrompt(analysis: VideoAnalysis, playlists: PlaylistRow[]) {
  const candidates = playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    language: playlist.language,
    course_code: playlist.course_code,
    unit_code: playlist.unit_code,
  }));

  return `Choose the single best educational playlist for this video analysis.

Video analysis:
${JSON.stringify({
    summaryDescription: analysis.summaryDescription,
    shortSummary: analysis.shortSummary,
    transcriptSummary: analysis.transcriptSummary,
    semanticTags: analysis.semanticTags,
    language: analysis.language,
    confidence: analysis.confidence,
  })}

Candidate playlists:
${JSON.stringify(candidates)}

Respond ONLY with valid JSON:
{
  "assignedPlaylistId": "exact playlist id or null",
  "confidence": 0.0,
  "reason": "short decision reason"
}

Rules:
- Use only one of the candidate ids above.
- Return null unless there is clear subject adherence.
- Prefer curricular playlists with matching course/unit subject matter.
- Do not bias toward programming; consider every educational area.
- confidence must be between 0 and 1.`;
}

async function callGemini(params: {
  apiKey: string;
  model: string;
  prompt: string;
  youtubeUrl?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 90000);
  const parts: Array<Record<string, unknown>> = [{ text: params.prompt }];

  if (params.youtubeUrl) {
    parts.push({ file_data: { file_uri: params.youtubeUrl } });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': params.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: params.temperature ?? 0.2,
          maxOutputTokens: params.maxOutputTokens ?? 1400,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const payload = await response.json().catch(() => null) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string; status?: string };
    } | null;

    if (!response.ok) {
      throw new HttpError(payload?.error?.message || `Gemini API error: ${response.status}`, response.status, {
        code: payload?.error?.status || 'GEMINI_API_ERROR',
        stage: 'analysis',
        recoverable: [408, 409, 429, 500, 502, 503, 504].includes(response.status),
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => !!part)
      .join('\n')
      .trim();

    if (!text) {
      throw new HttpError('No content in Gemini response', 503, {
        code: 'GEMINI_EMPTY_RESPONSE',
        stage: 'analysis',
        recoverable: true,
      });
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof HttpError) throw error;
    throw new HttpError(error instanceof Error ? error.message : 'Unknown Gemini error', 503, {
      code: 'GEMINI_REQUEST_FAILED',
      stage: 'analysis',
      recoverable: true,
    });
  }
}

async function callOpenAI(params: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 60000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        temperature: params.temperature ?? 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You enrich educational YouTube metadata. Return only compact valid JSON.' },
          { role: 'user', content: params.prompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const payload = await response.json().catch(() => null) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string; type?: string };
    } | null;

    if (!response.ok) {
      throw new HttpError(payload?.error?.message || `OpenAI API error: ${response.status}`, response.status, {
        code: payload?.error?.type || 'OPENAI_API_ERROR',
        stage: 'analysis_fallback',
        recoverable: [408, 409, 429, 500, 502, 503, 504].includes(response.status),
      });
    }

    const text = payload?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new HttpError('No content in OpenAI response', 503, {
        code: 'OPENAI_EMPTY_RESPONSE',
        stage: 'analysis_fallback',
        recoverable: true,
      });
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof HttpError) throw error;
    throw new HttpError(error instanceof Error ? error.message : 'Unknown OpenAI error', 503, {
      code: 'OPENAI_REQUEST_FAILED',
      stage: 'analysis_fallback',
      recoverable: true,
    });
  }
}

async function callProviderAnalysis(params: {
  provider: Provider;
  apiKey: string;
  model: string;
  youtubeUrl: string;
  title: string;
  description: string | null;
  language: string;
}): Promise<VideoAnalysis> {
  const prompt = analysisPrompt({
    title: params.title,
    description: params.description,
    language: params.language,
    youtubeUrl: params.youtubeUrl,
  });

  const content = params.provider === 'gemini'
    ? await callGemini({
      apiKey: params.apiKey,
      model: params.model,
      prompt,
      youtubeUrl: params.youtubeUrl,
      maxOutputTokens: 1600,
      timeoutMs: Number(Deno.env.get('GEMINI_TIMEOUT_MS') || 90000),
    })
    : await callOpenAI({
      apiKey: params.apiKey,
      model: params.model,
      prompt,
      timeoutMs: Number(Deno.env.get('OPENAI_TIMEOUT_MS') || 60000),
    });

  return parseVideoAnalysis(content, params.language);
}

function parsePlaylistChoice(content: string, playlists: PlaylistRow[]): AiPlaylistChoice {
  const parsed = parseJsonObject(content);
  const candidateId = optionalString(parsed.assignedPlaylistId ?? parsed.assigned_playlist_id, 64);
  const assignedPlaylistId = candidateId && playlists.some((playlist) => playlist.id === candidateId)
    ? candidateId
    : null;

  return {
    assignedPlaylistId,
    confidence: normalizeConfidence(parsed.confidence),
    reason: optionalString(parsed.reason, 300),
  };
}

async function choosePlaylistWithProvider(params: {
  provider: Provider;
  apiKey: string;
  model: string;
  analysis: VideoAnalysis;
  playlists: PlaylistRow[];
}): Promise<AiPlaylistChoice> {
  if (params.playlists.length === 0) {
    return { assignedPlaylistId: null, confidence: 0, reason: 'No playlists available' };
  }

  const prompt = playlistChoicePrompt(params.analysis, params.playlists.slice(0, 160));
  const content = params.provider === 'gemini'
    ? await callGemini({
      apiKey: params.apiKey,
      model: params.model,
      prompt,
      temperature: 0,
      maxOutputTokens: 700,
      timeoutMs: Number(Deno.env.get('GEMINI_TIMEOUT_MS') || 90000),
    })
    : await callOpenAI({
      apiKey: params.apiKey,
      model: params.model,
      prompt,
      temperature: 0,
      timeoutMs: Number(Deno.env.get('OPENAI_TIMEOUT_MS') || 60000),
    });

  return parsePlaylistChoice(content, params.playlists);
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
    provider: Provider;
    providerModel: string;
    status: TranscriptStatus;
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
      provider: params.provider,
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

  if (error) throw new Error(`Failed to save transcript: ${error.message}`);
  return data.id as string;
}

async function processVideoAnalysis(params: {
  supabaseServiceRole: ReturnType<typeof createClient>;
  requestId: string;
  videoId: string;
  youtubeUrl: string;
  videoTitle: string;
  videoDescription: string | null;
  effectiveLanguage: string;
}): Promise<TranscriptProcessingResult> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const openaiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

  let provider: Provider = 'gemini';
  let providerModel = geminiModel;
  let analysis: VideoAnalysis;
  let fallbackUsed = false;
  let fallbackFrom: Provider | null = null;
  let fallbackError: string | null = null;

  try {
    if (!geminiApiKey) {
      throw new HttpError('GEMINI_API_KEY is not configured', 503, {
        code: 'GEMINI_API_KEY_MISSING',
        stage: 'analysis',
        recoverable: true,
      });
    }

    logProcessing(params.requestId, 'analysis', 'Starting Gemini video analysis', {
      videoId: params.videoId,
      model: geminiModel,
    });

    analysis = await callProviderAnalysis({
      provider: 'gemini',
      apiKey: geminiApiKey,
      model: geminiModel,
      youtubeUrl: params.youtubeUrl,
      title: params.videoTitle,
      description: params.videoDescription,
      language: params.effectiveLanguage,
    });
  } catch (error) {
    fallbackUsed = true;
    fallbackFrom = 'gemini';
    fallbackError = error instanceof Error ? error.message : 'Unknown Gemini analysis error';

    logProcessingError(params.requestId, 'analysis', 'Gemini analysis failed; trying OpenAI fallback', {
      videoId: params.videoId,
      error: fallbackError,
    });

    if (!openaiApiKey) {
      throw new HttpError(`Gemini failed and OPENAI_API_KEY is not configured: ${fallbackError}`, 503, {
        code: 'AI_PROVIDER_UNAVAILABLE',
        stage: 'analysis',
        recoverable: true,
      });
    }

    provider = 'openai';
    providerModel = openaiModel;
    analysis = await callProviderAnalysis({
      provider: 'openai',
      apiKey: openaiApiKey,
      model: openaiModel,
      youtubeUrl: params.youtubeUrl,
      title: params.videoTitle,
      description: params.videoDescription,
      language: params.effectiveLanguage,
    });
  }

  const status: TranscriptStatus = analysis.transcriptText || analysis.transcriptSummary || analysis.summaryDescription
    ? 'completed'
    : 'unavailable';
  const errorMessage = status === 'unavailable'
    ? analysis.unavailableReason || `Transcript unavailable from ${provider}`
    : null;

  const transcriptId = await insertTranscriptRecord(params.supabaseServiceRole, {
    videoId: params.videoId,
    provider,
    providerModel,
    status,
    language: normalizeLanguage(analysis.language) ?? normalizeLanguage(params.effectiveLanguage),
    transcriptText: analysis.transcriptText,
    summary: analysis.transcriptSummary ?? analysis.summaryDescription,
    confidence: analysis.confidence,
    errorMessage,
    metadata: {
      requestId: params.requestId,
      provider,
      providerModel,
      fallbackUsed,
      fallbackFrom,
      fallbackError,
      unavailableReason: analysis.unavailableReason,
      semanticTags: analysis.semanticTags,
    },
  });

  logProcessing(params.requestId, 'analysis', 'Video analysis completed', {
    videoId: params.videoId,
    transcriptId,
    provider,
    model: providerModel,
    fallbackUsed,
    status,
    confidence: analysis.confidence,
  });

  return {
    id: transcriptId,
    provider,
    providerModel,
    status,
    language: normalizeLanguage(analysis.language) ?? normalizeLanguage(params.effectiveLanguage),
    summary: analysis.transcriptSummary ?? analysis.summaryDescription,
    confidence: analysis.confidence,
    errorMessage,
    analysis,
    fallbackUsed,
    fallbackFrom,
    fallbackError,
  };
}

function playlistText(playlist: PlaylistRow) {
  return [playlist.name, playlist.description ?? '', playlist.course_code ?? '', playlist.unit_code ?? ''].join(' ');
}

function analysisText(analysis: VideoAnalysis) {
  return [
    analysis.semanticTags.join(' '),
    analysis.summaryDescription ?? '',
    analysis.shortSummary ?? '',
    analysis.transcriptSummary ?? '',
  ].join(' ');
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  if (leftTokens.size === 0) return 0;
  return tokenize(right).reduce((score, token) => score + (leftTokens.has(token) ? 1 : 0), 0);
}

const subjectKeywords: Record<string, string[]> = {
  math: ['matematica', 'calculo', 'integral', 'derivada', 'limite', 'algebra', 'equacao', 'matriz', 'vetor', 'estatistica'],
  design: ['design', 'comunicacao', 'grafico', 'visual', 'tipografia', 'ilustracao', 'multimedia', 'interacao', 'cultura visual'],
  programming: ['programacao', 'programming', 'javascript', 'typescript', 'python', 'java', 'react', 'node', 'codigo', 'algoritmo', 'software'],
  business: ['negocio', 'business', 'marketing', 'empreendedorismo', 'gestao', 'vendas', 'financeiro', 'produto'],
  language: ['ingles', 'portugues', 'espanhol', 'lingua', 'idioma', 'grammar', 'vocabulary'],
  science: ['fisica', 'quimica', 'biologia', 'ciencia', 'laboratorio', 'energia', 'molecula'],
  humanities: ['historia', 'filosofia', 'sociologia', 'literatura', 'cultura', 'arte'],
};

function subjectSignals(sourceText: string): Record<string, number> {
  const normalized = normalizeText(sourceText);
  return Object.fromEntries(
    Object.entries(subjectKeywords).map(([subject, keywords]) => [
      subject,
      keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0),
    ]),
  );
}

function subjectHitCount(text: string, subject: string): number {
  const normalized = normalizeText(text);
  return (subjectKeywords[subject] ?? []).reduce(
    (hits, keyword) => hits + (normalized.includes(keyword) ? 1 : 0),
    0,
  );
}

function deterministicPlaylistScore(playlist: PlaylistRow, analysis: VideoAnalysis, sourceText: string, signals: Record<string, number>) {
  const text = playlistText(playlist);
  let score = 0;

  score += Math.min(10, tokenOverlapScore(sourceText, text));
  score += Math.min(6, tokenOverlapScore(analysis.semanticTags.join(' '), text));

  for (const [subject, signal] of Object.entries(signals)) {
    if (signal > 0) score += Math.min(12, signal * subjectHitCount(text, subject) * 2);
  }

  if (normalizeLanguage(playlist.language) === normalizeLanguage(analysis.language)) score += 1;
  if (playlist.course_code || playlist.unit_code) score += 1;

  return score;
}

async function runPlaylistAssignment(params: {
  provider: Provider;
  providerModel: string;
  analysis: VideoAnalysis;
  playlistRows: PlaylistRow[];
  requestId: string;
}): Promise<PlaylistAssignmentResult> {
  const sourceText = analysisText(params.analysis);
  const signals = subjectSignals(sourceText);
  const scoredCandidates = params.playlistRows
    .map((playlist) => {
      const score = deterministicPlaylistScore(playlist, params.analysis, sourceText, signals);
      return {
        playlistId: playlist.id,
        name: playlist.name,
        score,
        compatible: score >= 4,
        aiSuggested: false,
      };
    })
    .sort((left, right) => right.score - left.score);

  let aiChoice: AiPlaylistChoice | null = null;
  let rejectedAiPlaylistId: string | null = null;

  try {
    const apiKey = params.provider === 'gemini'
      ? Deno.env.get('GEMINI_API_KEY')
      : Deno.env.get('OPENAI_API_KEY');

    if (apiKey) {
      aiChoice = await choosePlaylistWithProvider({
        provider: params.provider,
        apiKey,
        model: params.providerModel,
        analysis: params.analysis,
        playlists: params.playlistRows,
      });
    }
  } catch (error) {
    logProcessingError(params.requestId, 'assignment', 'AI playlist choice failed; using deterministic fallback', {
      provider: params.provider,
      error: error instanceof Error ? error.message : 'Unknown playlist choice error',
    });
  }

  const aiCandidate = aiChoice?.assignedPlaylistId
    ? scoredCandidates.find((candidate) => candidate.playlistId === aiChoice?.assignedPlaylistId) ?? null
    : null;

  for (const candidate of scoredCandidates) {
    if (candidate.playlistId === aiChoice?.assignedPlaylistId) candidate.aiSuggested = true;
  }

  let assignedPlaylistId: string | null = null;
  let score = 0;
  let reason = 'No educational playlist met the adherence threshold';

  if (aiCandidate && aiChoice && aiChoice.confidence >= 0.65 && aiCandidate.compatible) {
    assignedPlaylistId = aiCandidate.playlistId;
    score = aiCandidate.score;
    reason = aiChoice.reason || 'AI playlist suggestion accepted after deterministic adherence check';
  } else if (aiCandidate && aiChoice) {
    rejectedAiPlaylistId = aiCandidate.playlistId;
    reason = aiChoice.confidence < 0.65
      ? 'AI playlist suggestion rejected because confidence is below threshold'
      : 'AI playlist suggestion rejected by deterministic adherence check';
  }

  if (!assignedPlaylistId) {
    const best = scoredCandidates.find((candidate) => candidate.compatible) ?? null;
    if (best) {
      assignedPlaylistId = best.playlistId;
      score = best.score;
      reason = 'Deterministic fallback selected the strongest educational playlist candidate';
    }
  }

  return {
    algorithmVersion: 'playlist-assignment-v3-provider-fallback',
    assignedPlaylistId,
    score,
    reliability: assignedPlaylistId ? 'high' : 'low',
    reason,
    provider: aiChoice ? params.provider : null,
    providerConfidence: aiChoice?.confidence ?? null,
    signals,
    topCandidates: scoredCandidates.slice(0, 5),
    rejectedAiPlaylistId,
  };
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

function hasProcessedAnalysisContent(analysis: VideoAnalysis): boolean {
  return analysis.semanticTags.length > 0
    || !!analysis.summaryDescription
    || !!analysis.shortSummary
    || !!analysis.transcriptSummary;
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
  const { supabaseServiceRole, requestId, submissionId, videoId, youtubeUrl, userId, video } = params;
  let currentStage = 'background_start';

  try {
    currentStage = 'context_load';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const effectiveLanguage = video.language && video.language !== 'und' ? video.language : 'pt';
    const { data: playlistsByLanguage, error: playlistFetchError } = await supabaseServiceRole
      .rpc('list_education_playlists_for_assignment', {
        p_language: effectiveLanguage,
        p_limit: 160,
      });

    if (playlistFetchError) throw new Error(`Failed to load playlists: ${playlistFetchError.message}`);

    let playlistsData = playlistsByLanguage;
    if (!playlistsData || playlistsData.length === 0) {
      const { data: fallbackData, error: fallbackError } = await supabaseServiceRole
        .rpc('list_education_playlists_for_assignment', {
          p_language: null,
          p_limit: 160,
        });

      if (fallbackError) throw new Error(`Failed to load fallback playlists: ${fallbackError.message}`);
      playlistsData = fallbackData;
    }

    const playlistRows = (playlistsData ?? []) as PlaylistRow[];

    currentStage = 'analysis';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const transcriptResult = await processVideoAnalysis({
      supabaseServiceRole,
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
            fallbackUsed: transcriptResult.fallbackUsed,
            fallbackFrom: transcriptResult.fallbackFrom,
            fallbackError: transcriptResult.fallbackError,
          },
        },
      );
    }

    let assignment: PlaylistAssignmentResult = {
      algorithmVersion: 'playlist-assignment-v3-provider-fallback',
      assignedPlaylistId: null,
      score: 0,
      reliability: 'low',
      reason: 'No playlist assigned because the video analysis did not provide enough educational signals',
      provider: null,
      providerConfidence: null,
      signals: {},
      topCandidates: [],
      rejectedAiPlaylistId: null,
    };

    if (playlistRows.length > 0 && hasProcessedAnalysisContent(transcriptResult.analysis)) {
      assignment = await runPlaylistAssignment({
        provider: transcriptResult.provider,
        providerModel: transcriptResult.providerModel,
        analysis: transcriptResult.analysis,
        playlistRows,
        requestId,
      });

      if (assignment.assignedPlaylistId) {
        await assignVideoToPlaylist(supabaseServiceRole, assignment.assignedPlaylistId, videoId, userId);
      }
    } else {
      logProcessing(requestId, currentStage, 'Skipping playlist assignment because processed analysis is empty', {
        videoId,
        playlistCount: playlistRows.length,
        semanticTagCount: transcriptResult.analysis.semanticTags.length,
      });
    }

    currentStage = 'storage';
    if (submissionId) await updateSubmissionStage(supabaseServiceRole, submissionId, requestId, currentStage);

    const detectedLanguage = normalizeLanguage(transcriptResult.analysis.language) ?? normalizeLanguage(effectiveLanguage);
    const { data, error } = await supabaseServiceRole
      .from('ai_enrichments')
      .insert({
        video_id: videoId,
        optimized_title: null,
        summary_description: transcriptResult.analysis.summaryDescription ?? transcriptResult.analysis.transcriptSummary,
        semantic_tags: transcriptResult.analysis.semanticTags,
        suggested_category_id: null,
        language: detectedLanguage,
        cultural_relevance: null,
        short_summary: transcriptResult.analysis.shortSummary ?? transcriptResult.analysis.summaryDescription ?? transcriptResult.analysis.transcriptSummary,
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
          transcription: {
            transcriptId: transcriptResult.id,
            provider: transcriptResult.provider,
            model: transcriptResult.providerModel,
            status: transcriptResult.status,
            summary: transcriptResult.summary,
            language: transcriptResult.language,
            confidence: transcriptResult.confidence,
            errorMessage: transcriptResult.errorMessage,
            fallbackUsed: transcriptResult.fallbackUsed,
            fallbackFrom: transcriptResult.fallbackFrom,
            fallbackError: transcriptResult.fallbackError,
          },
          assignment: {
            fallbackUsed: assignment.reliability === 'low',
            reliability: assignment.reliability,
            reason: assignment.reason,
            assignedCategoryId: null,
            assignedPlaylistId: assignment.assignedPlaylistId,
            algorithmVersion: assignment.algorithmVersion,
            score: assignment.score,
            provider: assignment.provider,
            providerConfidence: assignment.providerConfidence,
            signals: assignment.signals,
            topCandidates: assignment.topCandidates,
            rejectedPlaylistId: assignment.rejectedAiPlaylistId,
            rejectedAiPlaylistId: assignment.rejectedAiPlaylistId,
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
      provider: transcriptResult.provider,
      fallbackUsed: transcriptResult.fallbackUsed,
      assignedPlaylistId: assignment.assignedPlaylistId,
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
  };
  const hasAiProvider = !!Deno.env.get('GEMINI_API_KEY') || !!Deno.env.get('OPENAI_API_KEY');
  const missingEnv = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (!hasAiProvider) missingEnv.push('GEMINI_API_KEY or OPENAI_API_KEY');

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
