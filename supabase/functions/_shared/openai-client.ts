/**
 * OpenAI Client for Deno
 * 
 * Provides utilities for calling OpenAI API with:
 * - Timeout handling (15s per request)
 * - Retry logic with exponential backoff (max 2 retries)
 * - Structured output parsing
 * - Error handling and logging
 */

export interface CategoryContext {
  id: string;
  name: string;
  slug: string;
}

export interface PlaylistContext {
  id: string;
  name: string;
  description: string | null;
}

export interface VideoEnrichmentParams {
  title: string;
  description: string;
  language?: string;
  categories?: CategoryContext[];
  playlists?: PlaylistContext[];
}

export interface VideoEnrichmentResult {
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
}

export interface OpenAIError extends Error {
  code: string;
  status?: number;
  retryAfter?: number;
}

/**
 * OpenAI API Client for video enrichment
 */
export class OpenAIClient {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1';
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(options: {
    apiKey: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-4o-mini';
    this.timeout = options.timeout || 15000; // 15 seconds
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Enrich video metadata using OpenAI
   * @param params Video title and description to enrich
   * @returns Enrichment result with optimized title, summary, tags, etc.
   */
  async enrichVideo(
    params: VideoEnrichmentParams
  ): Promise<VideoEnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(params);
    
    const result = await this.callWithRetry(() =>
      this.callOpenAI(prompt)
    );

    return this.parseEnrichmentResponse(result, params.language);
  }

  /**
   * Call OpenAI API with timeout
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a cultural video metadata expert. Enrich video metadata with optimized titles, summaries, tags, and cultural relevance assessments. Always respond with valid JSON.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const baseError = new Error(
          error.error?.message || `OpenAI API error: ${response.status}`
        );
        const openaiError = baseError as OpenAIError;
        openaiError.code = error.error?.code || 'API_ERROR';
        openaiError.status = response.status;
        
        // Retry on rate limit or server errors, not on auth errors
        if ([429, 500, 502, 503].includes(response.status)) {
          openaiError.retryAfter = parseInt(
            response.headers.get('retry-after') || '1'
          );
          throw openaiError;
        } else if ([400, 401, 403].includes(response.status)) {
          // Don't retry auth/validation errors
          throw new Error(`Non-retryable API error: ${openaiError.message}`);
        }
        
        throw openaiError;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof TypeError && error.message.includes('signal')) {
        throw new Error(`OpenAI request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Call API with exponential backoff retry logic
   */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable =
        error instanceof Error &&
        (error.message.includes('timeout') ||
          (error as OpenAIError).retryAfter !== undefined);

      if (isRetryable && attempt < this.maxRetries) {
        // Exponential backoff: 1s, 2s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[OpenAI] Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callWithRetry(fn, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Build enrichment prompt for OpenAI
   */
  private buildEnrichmentPrompt(params: VideoEnrichmentParams): string {
    const categoryBlock =
      params.categories && params.categories.length > 0
        ? `\nAvailable categories (return the EXACT id of the best match, or null if none fit):\n${params.categories
            .map((c) => `  {"id": "${c.id}", "name": "${c.name}", "slug": "${c.slug}"}`)
            .join('\n')}\n`
        : '';

    const playlistBlock =
      params.playlists && params.playlists.length > 0
        ? `\nAvailable playlists (return the EXACT id of the best match, or null if none is clearly relevant):\n${params.playlists
            .map((p) => `  {"id": "${p.id}", "name": "${p.name}"${p.description ? `, "description": "${p.description.substring(0, 80)}"` : ''}}`)
            .join('\n')}\n`
        : '';

    return `Enrich the following video metadata and classify it.

Title: "${params.title}"
Description: "${params.description}"
Preferred Language: ${params.language || 'Portuguese'}
${categoryBlock}${playlistBlock}
Respond ONLY with valid JSON (no markdown, no explanation):
{
  "optimized_title": "A catchy, SEO-friendly title (max 100 chars)",
  "summary_description": "A 2-3 sentence summary (max 250 chars)",
  "semantic_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_category_id": "exact-uuid-from-list-or-null",
  "suggested_playlist_id": "exact-uuid-from-list-or-null",
  "classification_confidence": 0.0,
  "cultural_relevance": "High, Medium, or Low",
  "short_summary": "A single sentence summary for UI display"
}

Rules:
- suggested_category_id MUST be one of the exact UUIDs from the categories list above, or null.
- suggested_playlist_id MUST be one of the exact UUIDs from the playlists list above, or null.
- classification_confidence: number 0-1 reflecting how confident you are in the category choice.
- If uncertain about category or playlist, return null for that field and set confidence < 0.5.
`;
  }

  /**
   * Parse and validate OpenAI response
   */
  private parseEnrichmentResponse(
    content: string,
    language: string = 'pt'
  ): VideoEnrichmentResult {
    try {
      // Extract JSON from response (sometimes wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        optimized_title: parsed.optimized_title || '',
        summary_description: parsed.summary_description || '',
        semantic_tags: Array.isArray(parsed.semantic_tags)
          ? parsed.semantic_tags.slice(0, 5)
          : [],
        suggested_category_id: this.parseUuid(parsed.suggested_category_id),
        suggested_category:
          typeof parsed.suggested_category === 'string'
            ? parsed.suggested_category.trim() || null
            : null,
        suggested_playlist_id: this.parseUuid(parsed.suggested_playlist_id),
        suggested_playlist_query:
          typeof parsed.suggested_playlist_query === 'string'
            ? parsed.suggested_playlist_query.trim() || null
            : null,
        classification_confidence: this.normalizeConfidence(
          parsed.classification_confidence
        ),
        language: language || 'pt',
        cultural_relevance: this.normalizeRelevance(
          parsed.cultural_relevance
        ),
        short_summary: parsed.short_summary || '',
      };
    } catch (error) {
      console.error('[OpenAI] Failed to parse response:', content);
      throw new Error(
        `Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Normalize cultural relevance to consistent format
   */
  private normalizeRelevance(value: string): string {
    const normalized = value?.toLowerCase().trim();
    if (normalized?.includes('high')) return 'High';
    if (normalized?.includes('medium')) return 'Medium';
    if (normalized?.includes('low')) return 'Low';
    return 'Medium'; // Default
  }

  /**
   * Parse and validate a UUID string; returns null if invalid.
   */
  private parseUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return UUID_RE.test(trimmed) ? trimmed : null;
  }

  /**
   * Normalize classification confidence to [0, 1]
   */
  private normalizeConfidence(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(1, Math.max(0, value));
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return Math.min(1, Math.max(0, parsed));
      }
    }

    return 0.5;
  }
}

/**
 * Factory function to create OpenAI client from environment
 */
export function createOpenAIClient(): OpenAIClient {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAIClient({
    apiKey,
    model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
    timeout: 15000,
    maxRetries: 2,
  });
}
