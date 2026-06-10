import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildCorsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';

type EnqueuePayload = {
  moduleId?: string;
  force?: boolean;
  payload?: Record<string, unknown>;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const corsOrigin = Deno.env.get('EDGE_CORS_ORIGIN') ?? 'https://tube.open2.tech';
const rateLimitWindowSeconds = Number(Deno.env.get('EDGE_ENQUEUE_RATE_LIMIT_WINDOW_SECONDS') ?? '60');
const rateLimitMaxRequests = Number(Deno.env.get('EDGE_ENQUEUE_RATE_LIMIT_MAX_REQUESTS') ?? '20');

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Missing required SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY env vars');
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(corsOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'method_not_allowed', corsHeaders);
  }

  const token = getBearerToken(req);
  if (!token) {
    return errorResponse('Missing bearer token', 401, 'unauthorized', corsHeaders);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) {
    return errorResponse('Invalid bearer token', 401, 'unauthorized', corsHeaders);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: rateLimitData, error: rateLimitError } = await serviceClient.rpc('check_edge_rate_limit', {
    p_function_name: 'enqueue-module-publication-v2',
    p_subject_id: userData.user.id,
    p_window_seconds: Math.max(1, rateLimitWindowSeconds),
    p_max_requests: Math.max(1, rateLimitMaxRequests),
  });

  if (rateLimitError) {
    return errorResponse('Could not verify rate limit', 500, 'rate_limit_unavailable', corsHeaders);
  }

  const rateLimitRow = Array.isArray(rateLimitData) ? rateLimitData[0] : rateLimitData;
  if (!rateLimitRow?.allowed) {
    const retryAfter = Number(rateLimitRow?.retry_after_seconds ?? rateLimitWindowSeconds);
    const headers = {
      ...corsHeaders,
      'Retry-After': `${Math.max(1, retryAfter)}`,
    };
    return errorResponse('Rate limit exceeded for enqueue requests', 429, 'rate_limit_exceeded', headers);
  }

  const body = (await req.json().catch(() => null)) as EnqueuePayload | null;
  if (!body || !body.moduleId) {
    return errorResponse('moduleId is required', 400, 'validation_error', corsHeaders);
  }

  const { data, error } = await serviceClient.rpc('enqueue_module_publication', {
    p_module_id: body.moduleId,
    p_actor_id: userData.user.id,
    p_payload: body.payload ?? {},
    p_force: body.force ?? false,
  });

  if (error) {
    return errorResponse(error.message, 400, 'enqueue_failed', corsHeaders);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.created === true && row?.job_id) {
    await serviceClient
      .schema('tube')
      .from('publish_job_events')
      .insert({
        publish_job_id: row.job_id,
        event_type: 'enqueued',
        event_payload: {
          source: 'enqueue-module-publication-v2',
          force: body.force ?? false,
        },
      });
  }

  return jsonResponse(
    {
      ok: true,
      job: row ?? null,
    },
    { headers: corsHeaders },
  );
});