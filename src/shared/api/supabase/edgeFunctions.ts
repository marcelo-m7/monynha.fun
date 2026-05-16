import { supabase } from './supabaseClient';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export async function invokeEdgeFunction<T>(name: string, options: InvokeOptions = {}) {
  return supabase.functions.invoke<T>(name, {
    body: options.body,
    headers: options.headers,
  });
}

export type EdgeFunctionErrorDetails = {
  code: string | null;
  message: string;
  stage: string | null;
  recoverable: boolean | null;
  requestId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseErrorPayload(payload: unknown): EdgeFunctionErrorDetails | null {
  if (!isRecord(payload)) return null;

  const error = isRecord(payload.error) ? payload.error : payload;
  const message = typeof error.message === 'string'
    ? error.message
    : typeof payload.error === 'string'
      ? payload.error
      : null;

  if (!message) return null;

  return {
    code: typeof error.code === 'string' ? error.code : null,
    message,
    stage: typeof error.stage === 'string' ? error.stage : null,
    recoverable: typeof error.recoverable === 'boolean' ? error.recoverable : null,
    requestId: typeof error.requestId === 'string' ? error.requestId : null,
  };
}

export async function getEdgeFunctionErrorDetails(error: unknown): Promise<EdgeFunctionErrorDetails> {
  if (isRecord(error)) {
    const context = error.context;
    if (context instanceof Response) {
      const contentType = context.headers.get('content-type') ?? '';
      const body = contentType.includes('application/json')
        ? await context.clone().json().catch(() => null)
        : await context.clone().text().catch(() => null);
      const parsed = parseErrorPayload(body);
      if (parsed) return parsed;
    }
  }

  const message = error instanceof Error ? error.message : 'Could not start video processing';
  return {
    code: null,
    message,
    stage: null,
    recoverable: null,
    requestId: null,
  };
}
