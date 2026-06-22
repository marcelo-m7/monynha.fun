import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildCorsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const workerSecret = Deno.env.get('BACKFILL_WORKER_SECRET') ?? Deno.env.get('PUBLISH_WORKER_SECRET') ?? '';
const corsOrigin = Deno.env.get('EDGE_CORS_ORIGIN') ?? 'https://tube.open2.tech';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing required SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars');
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'), corsOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'method_not_allowed', corsHeaders);
  }

  if (workerSecret) {
    const providedSecret = req.headers.get('x-worker-secret') ?? '';
    if (providedSecret !== workerSecret) {
      return errorResponse('Invalid worker secret', 401, 'unauthorized', corsHeaders);
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    videoLimit?: number;
    playlistLimit?: number;
    actorId?: string | null;
    runId?: string | null;
  };

  const videoLimit = Math.max(1, Math.min(2000, body.videoLimit ?? 200));
  const playlistLimit = Math.max(1, Math.min(1000, body.playlistLimit ?? 100));

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await serviceClient.rpc('backfill_legacy_to_tube', {
    p_video_limit: videoLimit,
    p_playlist_limit: playlistLimit,
    p_actor_id: body.actorId ?? null,
    p_run_id: body.runId ?? null,
  });

  if (error) {
    return errorResponse(error.message, 500, 'backfill_failed', corsHeaders);
  }

  return jsonResponse(
    {
      ok: true,
      result: data,
    },
    { headers: corsHeaders },
  );
});