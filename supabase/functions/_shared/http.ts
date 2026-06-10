export function buildCorsHeaders(origin?: string | null) {
  const allowedOrigin = origin && origin.length > 0 ? origin : 'https://tube.open2.tech';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function errorResponse(
  message: string,
  status = 400,
  code = 'bad_request',
  headers?: HeadersInit,
) {
  return jsonResponse(
    {
      error: {
        code,
        message,
      },
    },
    { status, headers },
  );
}