import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiClient } from '../../../supabase/functions/_shared/gemini-client';

describe('GeminiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a YouTube URL as Gemini file data and parses transcript JSON', async () => {
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
});
