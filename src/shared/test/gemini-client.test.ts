import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const geminiClientPath = path.join(process.cwd(), 'supabase/functions/_shared/gemini-client.ts');
const geminiClientModuleUrl = pathToFileURL(geminiClientPath).href;
const describeIfGeminiExists = fs.existsSync(geminiClientPath) ? describe : describe.skip;

describeIfGeminiExists('GeminiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a YouTube URL as Gemini file data and parses transcript JSON', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      transcriptText: 'Full transcript',
                      transcriptSummary: 'Short transcript summary',
                      language: 'pt',
                      confidence: 0.91,
                      unavailableReason: null,
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient({ apiKey: 'gemini-key', model: 'gemini-2.5-flash', timeout: 1000 });
    const result = await client.transcribeYouTubeVideo({
      youtubeUrl: 'https://youtu.be/USW31veYWAc',
      title: 'Integrais Duplas',
      language: 'pt',
    });

    expect(result).toEqual({
      transcriptText: 'Full transcript',
      transcriptSummary: 'Short transcript summary',
      language: 'pt',
      confidence: 0.91,
      unavailableReason: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/models/gemini-2.5-flash:generateContent'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"file_uri":"https://youtu.be/USW31veYWAc"'),
      }),
    );
  });

  it('marks transient API failures as recoverable', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'rate limited' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const client = new GeminiClient({ apiKey: 'gemini-key', timeout: 1000, maxRetries: 0 });
    await expect(client.transcribeYouTubeVideo({
      youtubeUrl: 'https://youtu.be/USW31veYWAc',
      title: 'Integrais Duplas',
      language: 'pt',
    })).rejects.toMatchObject({
      code: 'RESOURCE_EXHAUSTED',
      recoverable: true,
      status: 429,
    });
  });

  it('uses non-JSON Gemini text as a transcript summary fallback', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'A compact summary returned as plain text.',
                },
              ],
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const client = new GeminiClient({ apiKey: 'gemini-key', timeout: 1000, maxRetries: 0 });
    await expect(client.transcribeYouTubeVideo({
      youtubeUrl: 'https://youtu.be/USW31veYWAc',
      title: 'Integrais Duplas',
      language: 'pt',
    })).resolves.toEqual({
      transcriptText: null,
      transcriptSummary: 'A compact summary returned as plain text.',
      language: null,
      confidence: 0.35,
      unavailableReason: 'Gemini returned a non-JSON transcript summary',
    });
  });

  it('extracts useful transcript data from truncated Gemini JSON', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{\\n  "transcriptText": "Partial transcript text",\\n  "language": "pt"',
                },
              ],
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const client = new GeminiClient({ apiKey: 'gemini-key', timeout: 1000, maxRetries: 0 });
    await expect(client.transcribeYouTubeVideo({
      youtubeUrl: 'https://youtu.be/USW31veYWAc',
      title: 'Integrais Duplas',
      language: 'pt',
    })).resolves.toEqual({
      transcriptText: 'Partial transcript text',
      transcriptSummary: 'Partial transcript text',
      language: 'pt',
      confidence: 0.35,
      unavailableReason: 'Gemini returned partial JSON transcript data',
    });
  });

  it('analyzes a YouTube video into summaries, tags and detected language', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    transcriptText: 'Aula sobre integrais de linha.',
                    transcriptSummary: 'Resumo da aula de calculo.',
                    summaryDescription: 'Aula sobre integrais de linha e calculo vetorial.',
                    shortSummary: 'Integral de linha em calculo.',
                    semanticTags: ['integral de linha', 'calculo', 'matematica'],
                    language: 'pt',
                    confidence: 0.86,
                    unavailableReason: null,
                  }),
                },
              ],
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const client = new GeminiClient({ apiKey: 'gemini-key', timeout: 1000, maxRetries: 0 });
    await expect(client.analyzeYouTubeVideo({
      youtubeUrl: 'https://youtu.be/USW31veYWAc',
      title: 'Integral de linha',
      language: 'pt',
    })).resolves.toEqual({
      transcriptText: 'Aula sobre integrais de linha.',
      transcriptSummary: 'Resumo da aula de calculo.',
      summaryDescription: 'Aula sobre integrais de linha e calculo vetorial.',
      shortSummary: 'Integral de linha em calculo.',
      semanticTags: ['integral de linha', 'calculo', 'matematica'],
      language: 'pt',
      confidence: 0.86,
      unavailableReason: null,
    });
  });

  it('assigns playlists from processed analysis without sending YouTube file data', async () => {
    const { GeminiClient } = await import(/* @vite-ignore */ geminiClientModuleUrl);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    assignedPlaylistId: 'math-ii',
                    confidence: 0.82,
                    reason: 'Tags and summary match Analise Matematica II.',
                  }),
                },
              ],
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient({ apiKey: 'gemini-key', timeout: 1000, maxRetries: 0 });
    const result = await client.assignPlaylistFromAnalysis({
      analysis: {
        transcriptText: null,
        transcriptSummary: 'Resumo de calculo.',
        summaryDescription: 'Aula de calculo sobre integral.',
        shortSummary: 'Integral em calculo.',
        semanticTags: ['integral', 'calculo', 'matematica'],
        language: 'pt',
        confidence: 0.88,
        unavailableReason: null,
      },
      playlists: [
        {
          id: 'math-ii',
          name: 'Analise Matematica II',
          description: 'Calculo integral',
          language: 'pt',
          course_code: 'LESTI',
          unit_code: '19411008',
        },
      ],
    });

    expect(result).toEqual({
      assignedPlaylistId: 'math-ii',
      confidence: 0.82,
      reason: 'Tags and summary match Analise Matematica II.',
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(JSON.stringify(body)).not.toContain('file_uri');
  });
});
