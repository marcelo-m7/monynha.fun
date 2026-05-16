export type GeminiTranscriptResult = {
  transcriptText: string | null;
  transcriptSummary: string | null;
  language: string | null;
  confidence: number;
  unavailableReason: string | null;
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
    const response = await this.callWithRetry(() => this.callGemini(params.youtubeUrl, prompt));
    return this.parseTranscriptResponse(response);
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

  private async callGemini(youtubeUrl: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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
              parts: [
                { text: prompt },
                {
                  file_data: {
                    file_uri: youtubeUrl,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        transcriptText: optionalString(parsed.transcriptText),
        transcriptSummary: optionalString(parsed.transcriptSummary),
        language: optionalString(parsed.language),
        confidence: normalizeConfidence(parsed.confidence),
        unavailableReason: optionalString(parsed.unavailableReason),
      };
    } catch (error) {
      throw createGeminiError({
        message: `Failed to parse Gemini transcript response: ${
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
