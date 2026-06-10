import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const openaiClientPath = path.join(process.cwd(), 'supabase/functions/_shared/openai-client.ts');
const openaiClientModuleUrl = pathToFileURL(openaiClientPath).href;
const describeIfOpenAIExists = fs.existsSync(openaiClientPath) ? describe : describe.skip;

afterEach(() => {
  vi.unstubAllGlobals();
});

describeIfOpenAIExists('OpenAIClient', () => {
  it('generates summary and tags through OpenAI without requiring Gemini', async () => {
    const { OpenAIClient } = await import(/* @vite-ignore */ openaiClientModuleUrl);

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
