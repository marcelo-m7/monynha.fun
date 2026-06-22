function parseAllowedOrigins(originList?: string | null) {
  return (originList ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localhost'))
    );
  } catch {
    return false;
  }
}

export function buildCorsHeaders(requestOrigin?: string | null, allowedOrigins?: string | null) {
  const origins = parseAllowedOrigins(allowedOrigins);
  const fallbackOrigin = origins[0] ?? 'https://tube.open2.tech';
  const normalizedRequestOrigin = requestOrigin?.trim() ?? '';
  const allowedOrigin = normalizedRequestOrigin && (origins.includes(normalizedRequestOrigin) || isLocalDevelopmentOrigin(normalizedRequestOrigin))
    ? normalizedRequestOrigin
    : fallbackOrigin;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
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