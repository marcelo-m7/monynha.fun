export type GeminiTranscriptResult = {
  transcriptText: string | null;
  transcriptSummary: string | null;
  language: string | null;
  confidence: number;
  unavailableReason: string | null;
};

export type GeminiVideoAnalysisResult = GeminiTranscriptResult & {
  summaryDescription: string | null;
  shortSummary: string | null;
  semanticTags: string[];
};

export type GeminiPlaylistAssignmentPlaylist = {
  id: string;
  name: string;
  description: string | null;
  language: string;
  course_code: string | null;
  unit_code: string | null;
};

export type GeminiPlaylistAssignmentResult = {
  assignedPlaylistId: string | null;
  confidence: number;
  reason: string | null;
};

export interface GeminiError extends Error {
  code: string;
  status?: number;
  retryAfter?: number;
  recoverable: boolean;
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
};

function createGeminiError(params: {
  message: string;
  code: string;
  status?: number;
  retryAfter?: number;
  recoverable?: boolean;
}): GeminiError {
  const error = new Error(params.message) as GeminiError;
  error.code = params.code;
  error.status = params.status;
  error.retryAfter = params.retryAfter;
  error.recoverable = params.recoverable ?? true;
  return error;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }

  return 0;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string' && !!item.trim())
    .map((item) => item.trim())
    .slice(0, 10);
}

function parseJsonObject(content: string): Record<string, unknown> {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Gemini response');
  }

  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function extractPartialJsonStringField(content: string, field: string): string | null {
  const fieldMarker = `"${field}"`;
  const fieldIndex = content.indexOf(fieldMarker);
  if (fieldIndex === -1) {
    return null;
  }

  const afterField = content.slice(fieldIndex + fieldMarker.length);
  const colonIndex = afterField.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const afterColon = afterField.slice(colonIndex + 1).trimStart();
  if (!afterColon.startsWith('"')) {
    return null;
  }

  let result = '';
  let escaped = false;
  for (let index = 1; index < afterColon.length; index += 1) {
    const char = afterColon[index];
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      break;
    }
    result += char;
  }

  return optionalString(result);
}

function compactSummaryFallback(content: string): GeminiTranscriptResult | null {
  const summary = content
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()
    .slice(0, 700)
    .trim();
  const transcriptText = extractPartialJsonStringField(content, 'transcriptText');
  const transcriptSummary = extractPartialJsonStringField(content, 'transcriptSummary');
  const language = extractPartialJsonStringField(content, 'language');

  if (transcriptText || transcriptSummary) {
    return {
      transcriptText: transcriptText ? transcriptText.slice(0, 1200).trim() : null,
      transcriptSummary: (transcriptSummary ?? transcriptText ?? null)?.slice(0, 700).trim() ?? null,
      language: language?.slice(0, 12).trim() ?? null,
      confidence: 0.35,
      unavailableReason: 'Gemini returned partial JSON transcript data',
    };
  }

  if (!summary) {
    return null;
  }

  return {
    transcriptText: null,
    transcriptSummary: summary,
    language: null,
    confidence: 0.35,
    unavailableReason: 'Gemini returned a non-JSON transcript summary',
  };
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number.parseInt(Deno.env.get(name) || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private timeout: number;
  private maxRetries: number;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(options: {
    apiKey: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'gemini-2.5-flash';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries ?? 1;
  }

  get modelName() {
    return this.model;
  }

  async transcribeYouTubeVideo(params: {
    youtubeUrl: string;
    title: string;
    language?: string | null;
  }): Promise<GeminiTranscriptResult> {
    const prompt = this.buildTranscriptPrompt(params.title, params.language);
    const response = await this.callWithRetry(() => this.callGemini({
      youtubeUrl: params.youtubeUrl,
      prompt,
      maxOutputTokens: 1024,
    }));
    return this.parseTranscriptResponse(response);
  }

  async analyzeYouTubeVideo(params: {
    youtubeUrl: string;
    title: string;
    description?: string | null;
    language?: string | null;
  }): Promise<GeminiVideoAnalysisResult> {
    const prompt = this.buildVideoAnalysisPrompt(params);
    const response = await this.callWithRetry(() => this.callGemini({
      youtubeUrl: params.youtubeUrl,
      prompt,
      maxOutputTokens: 1600,
    }));
    return this.parseVideoAnalysisResponse(response);
  }

  /**
   * Text-only fast enrichment — does NOT send the YouTube URL to Gemini.
   * Use this for the fast-path enrichment where video duration may be long.
   * analyzeYouTubeVideo is better for deep analysis of short/medium videos.
   */
  async enrichFromText(params: {
    title: string;
    description?: string | null;
    language?: string | null;
  }): Promise<GeminiVideoAnalysisResult> {
    const prompt = this.buildVideoAnalysisPrompt(params);
    const response = await this.callWithRetry(() => this.callGemini({
      // no youtubeUrl — text-only, much faster
      prompt,
      maxOutputTokens: 1600,
    }));
    return this.parseVideoAnalysisResponse(response);
  }

  async assignPlaylistFromAnalysis(params: {
    analysis: GeminiVideoAnalysisResult;
    playlists: GeminiPlaylistAssignmentPlaylist[];
  }): Promise<GeminiPlaylistAssignmentResult> {
    const prompt = this.buildPlaylistAssignmentPrompt(params.analysis, params.playlists);
    const response = await this.callWithRetry(() => this.callGemini({
      prompt,
      temperature: 0,
      maxOutputTokens: 700,
    }));
    return this.parsePlaylistAssignmentResponse(response, params.playlists);
  }

  private buildTranscriptPrompt(title: string, language?: string | null) {
    return `Analyze the public YouTube video and extract a compact transcript summary.

Video title: "${title}"
Preferred language: ${language || 'auto'}

Respond ONLY with valid JSON:
{
  "transcriptText": "short faithful transcript excerpt only when captions/audio are immediately available, otherwise null",
  "transcriptSummary": "public-safe 2-4 sentence summary of the spoken content",
  "language": "ISO 639-1 language code if detected, otherwise null",
  "confidence": 0.0,
  "unavailableReason": "short reason when transcriptText is unavailable, otherwise null"
}

Rules:
- Do not attempt a long full-video transcript.
- Do not invent transcriptText when captions/audio are unavailable quickly.
- transcriptSummary should be present when the video can be analyzed.
- Keep transcriptSummary under 700 characters.
- Keep transcriptText under 1200 characters when present.
- confidence must be a number between 0 and 1.
`;
  }

  private buildVideoAnalysisPrompt(params: {
    title: string;
    description?: string | null;
    language?: string | null;
  }) {
    return `Analyze the public YouTube video and return compact educational metadata.

Video title: "${params.title}"
Video description: "${params.description || ''}"
Preferred language: ${params.language || 'auto'}

Respond ONLY with valid JSON:
{
  "transcriptText": "short faithful transcript excerpt only when captions/audio are immediately available, otherwise null",
  "transcriptSummary": "2-4 sentence summary of the spoken or visible educational content",
  "summaryDescription": "2-3 sentence user-facing summary under 280 characters",
  "shortSummary": "single sentence summary under 140 characters",
  "semanticTags": ["specific subject tag", "concept tag", "course topic tag"],
  "language": "ISO 639-1 language code if detected, otherwise null",
  "confidence": 0.0,
  "unavailableReason": "short reason when transcriptText is unavailable, otherwise null"
}

Rules:
- Do not attempt a long full-video transcript.
- Do not invent transcriptText when captions/audio are unavailable quickly.
- semanticTags must describe the real subject matter, not visual style or clickbait wording.
- Prefer concrete concepts such as "integral de linha", "calculo", "design de comunicacao", "programacao".
- Keep summaries compact and public-safe.
- confidence must be a number between 0 and 1.
`;
  }

  private buildPlaylistAssignmentPrompt(
    analysis: GeminiVideoAnalysisResult,
    playlists: GeminiPlaylistAssignmentPlaylist[],
  ) {
    const playlistLines = playlists
      .map((playlist) => JSON.stringify({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        language: playlist.language,
        course_code: playlist.course_code,
        unit_code: playlist.unit_code,
      }))
      .join('\n');

    return `Choose the single best educational playlist for this processed video analysis.

Processed video analysis:
${JSON.stringify({
  summaryDescription: analysis.summaryDescription,
  shortSummary: analysis.shortSummary,
  transcriptSummary: analysis.transcriptSummary,
  semanticTags: analysis.semanticTags,
  language: analysis.language,
  confidence: analysis.confidence,
})}

Candidate playlists:
${playlistLines}

Respond ONLY with valid JSON:
{
  "assignedPlaylistId": "exact playlist id or null",
  "confidence": 0.0,
  "reason": "short decision reason"
}

Rules:
- Use only the processed analysis above. Do not infer from unavailable original metadata.
- Return null unless there is strong real content adherence to an existing educational playlist.
- Prefer curricular playlists with matching course/unit subject matter over broad general education collections.
- Do not assign a design playlist to math/programming content, or a math playlist to design/programming content.
- confidence must be at least 0.70 only when the match is clearly supported by tags or summary.
`;
  }

  private async callGemini(params: {
    prompt: string;
    youtubeUrl?: string;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const parts: Array<Record<string, unknown>> = [{ text: params.prompt }];

    if (params.youtubeUrl) {
      parts.push({
        file_data: {
          file_uri: params.youtubeUrl,
        },
      });
    }

    try {
      const response = await fetch(`${this.apiUrl}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: params.maxOutputTokens ?? 1024,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const payload = await response.json().catch(() => null) as GeminiGenerateContentResponse | null;

      if (!response.ok) {
        const message = payload?.error?.message || `Gemini API error: ${response.status}`;
        const retryAfter = Number.parseInt(response.headers.get('retry-after') || '', 10);
        throw createGeminiError({
          message,
          code: payload?.error?.status || 'GEMINI_API_ERROR',
          status: response.status,
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
          recoverable: [408, 409, 429, 500, 502, 503, 504].includes(response.status),
        });
      }

      const text = payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter((part): part is string => !!part)
        .join('\n')
        .trim();

      if (!text) {
        throw createGeminiError({
          message: 'No content in Gemini response',
          code: 'GEMINI_EMPTY_RESPONSE',
          recoverable: true,
        });
      }

      return text;
    } catch (error) {
      clearTimeout(timeoutId);

      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.toLowerCase().includes('aborted') ||
          error.message.toLowerCase().includes('timeout'))
      ) {
        throw createGeminiError({
          message: `Gemini request timeout after ${this.timeout}ms`,
          code: 'GEMINI_TIMEOUT',
          recoverable: true,
        });
      }

      throw error;
    }
  }

  private async callWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const geminiError = error as Partial<GeminiError>;
      const retryable = geminiError.recoverable === true || geminiError.retryAfter !== undefined;

      if (retryable && geminiError.code !== 'GEMINI_TIMEOUT' && attempt < this.maxRetries) {
        const delay = (geminiError.retryAfter ? geminiError.retryAfter * 1000 : Math.pow(2, attempt) * 1000);
        console.log(`[Gemini] Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callWithRetry(fn, attempt + 1);
      }

      throw error;
    }
  }

  private parseTranscriptResponse(content: string): GeminiTranscriptResult {
    try {
      try {
        const parsed = parseJsonObject(content);
        return {
          transcriptText: optionalString(parsed.transcriptText),
          transcriptSummary: optionalString(parsed.transcriptSummary),
          language: optionalString(parsed.language),
          confidence: normalizeConfidence(parsed.confidence),
          unavailableReason: optionalString(parsed.unavailableReason),
        };
      } catch {
        const fallback = compactSummaryFallback(content);
        if (fallback) {
          return fallback;
        }
        throw new Error('No JSON found in Gemini response');
      }
    } catch (error) {
      const fallback = compactSummaryFallback(content);
      if (fallback) {
        return fallback;
      }

      throw createGeminiError({
        message: `Failed to parse Gemini transcript response: ${
          error instanceof Error ? error.message : 'Unknown parse error'
        }`,
        code: 'GEMINI_PARSE_ERROR',
        recoverable: true,
      });
    }
  }

  private parseVideoAnalysisResponse(content: string): GeminiVideoAnalysisResult {
    try {
      const parsed = parseJsonObject(content);
      const transcriptSummary = optionalString(parsed.transcriptSummary);
      const summaryDescription = optionalString(parsed.summaryDescription) ?? transcriptSummary;
      const shortSummary = optionalString(parsed.shortSummary) ?? summaryDescription;

      return {
        transcriptText: optionalString(parsed.transcriptText),
        transcriptSummary,
        summaryDescription,
        shortSummary,
        semanticTags: optionalStringArray(parsed.semanticTags ?? parsed.semantic_tags),
        language: optionalString(parsed.language),
        confidence: normalizeConfidence(parsed.confidence),
        unavailableReason: optionalString(parsed.unavailableReason),
      };
    } catch (error) {
      const fallback = compactSummaryFallback(content);
      if (fallback) {
        return {
          ...fallback,
          summaryDescription: fallback.transcriptSummary,
          shortSummary: fallback.transcriptSummary,
          semanticTags: [],
        };
      }

      throw createGeminiError({
        message: `Failed to parse Gemini video analysis response: ${
          error instanceof Error ? error.message : 'Unknown parse error'
        }`,
        code: 'GEMINI_PARSE_ERROR',
        recoverable: true,
      });
    }
  }

  private parsePlaylistAssignmentResponse(
    content: string,
    playlists: GeminiPlaylistAssignmentPlaylist[],
  ): GeminiPlaylistAssignmentResult {
    try {
      const parsed = parseJsonObject(content);
      const candidateId = optionalString(parsed.assignedPlaylistId ?? parsed.assigned_playlist_id);
      const assignedPlaylistId = candidateId && playlists.some((playlist) => playlist.id === candidateId)
        ? candidateId
        : null;

      return {
        assignedPlaylistId,
        confidence: normalizeConfidence(parsed.confidence),
        reason: optionalString(parsed.reason),
      };
    } catch (error) {
      throw createGeminiError({
        message: `Failed to parse Gemini playlist assignment response: ${
          error instanceof Error ? error.message : 'Unknown parse error'
        }`,
        code: 'GEMINI_PARSE_ERROR',
        recoverable: true,
      });
    }
  }
}

export function createGeminiClient(): GeminiClient {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw createGeminiError({
      message: 'GEMINI_API_KEY environment variable is not set',
      code: 'GEMINI_API_KEY_MISSING',
      recoverable: false,
    });
  }

  return new GeminiClient({
    apiKey,
    model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash',
    timeout: readPositiveIntegerEnv('GEMINI_TIMEOUT_MS', 90000),
    maxRetries: readPositiveIntegerEnv('GEMINI_MAX_RETRIES', 1),
  });
}
