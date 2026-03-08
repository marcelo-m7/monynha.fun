import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://www.youtube.com/oembed', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  /**
   * Mock OpenAI API response for testing
   * Used in unit tests for AI enrichment features
   */
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as Record<string, any>;

    // Simulate different responses based on request content
    const userMessage = body.messages?.find((m: any) => m.role === 'user')?.content || '';

    // Mock successful enrichment response
    const mockResponse = {
      id: 'chatcmpl-mock-123',
      object: 'chat.completion',
      created: Date.now(),
      model: body.model || 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              optimized_title: 'Test Video - Optimized Title',
              summary_description: 'This is a test video with AI-optimized description',
              semantic_tags: ['test', 'video', 'ai-enrichment', 'mock'],
              suggested_category_id: null,
              language: 'pt',
              cultural_relevance: 'High',
              short_summary: 'A test video demonstrating AI enrichment capabilities',
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 60,
        total_tokens: 110,
      },
    };

    return HttpResponse.json(mockResponse, { status: 200 });
  }),
];
