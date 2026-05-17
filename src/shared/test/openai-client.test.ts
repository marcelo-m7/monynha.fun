import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAIClient } from '../../../supabase/functions/_shared/openai-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAIClient', () => {
  it('generates summary and tags through OpenAI without requiring Gemini', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              optimized_title: 'Integral de Linha em Calculo Vetorial',
              summary_description: 'Aula curta sobre integrais de linha e calculo vetorial.',
              semantic_tags: ['integral de linha', 'calculo', 'matematica'],
              suggested_category_id: null,
              suggested_category: 'Matematica',
              suggested_playlist_id: null,
              suggested_playlist_query: 'calculo integral',
              classification_confidence: 0.82,
              cultural_relevance: 'High',
              short_summary: 'Integral de linha explicada de forma objetiva.',
              language: 'pt',
            }),
          },
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    vi.stubGlobal('fetch', fetchMock);

    const client = new OpenAIClient({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      timeout: 1000,
      maxRetries: 0,
    });

    const result = await client.enrichVideo({
      title: 'Integral de Linha',
      description: 'Aula de calculo vetorial.',
      language: 'pt',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(result.summary_description).toContain('integrais de linha');
    expect(result.semantic_tags).toEqual(['integral de linha', 'calculo', 'matematica']);
    expect(result.language).toBe('pt');
  });
});
