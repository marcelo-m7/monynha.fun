import { describe, expect, it } from 'vitest';
import { getEdgeFunctionErrorDetails } from './edgeFunctions';

describe('edge function error helpers', () => {
  it('extracts structured error details from a function response', async () => {
    const error = {
      context: new Response(
        JSON.stringify({
          error: {
            code: 'AI_TIMEOUT',
            message: 'Não foi possível processar o vídeo agora.',
            stage: 'enrichment',
            recoverable: true,
            requestId: 'request-1',
            retryAfterSeconds: 45,
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    };

    await expect(getEdgeFunctionErrorDetails(error)).resolves.toEqual({
      code: 'AI_TIMEOUT',
      message: 'Não foi possível processar o vídeo agora.',
      stage: 'enrichment',
      recoverable: true,
      requestId: 'request-1',
      retryAfterSeconds: 45,
    });
  });

  it('falls back to the thrown error message when the response body is unavailable', async () => {
    await expect(getEdgeFunctionErrorDetails(new Error('Edge Function returned a non-2xx status code'))).resolves.toEqual({
      code: null,
      message: 'Edge Function returned a non-2xx status code',
      stage: null,
      recoverable: null,
      requestId: null,
      retryAfterSeconds: null,
    });
  });
});
