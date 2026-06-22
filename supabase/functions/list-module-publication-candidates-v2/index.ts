import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildCorsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';

type CandidatesPayload = {
  search?: string;
  limit?: number;
};

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

type PlaylistRow = {
  id: string;
  name: string;
  course_code: string | null;
  unit_code: string | null;
  review_status: string;
  video_count: number | null;
  total_duration_seconds: number | null;
  is_public: boolean;
  is_ordered: boolean;
};

type PublishJobRow = {
  id: string;
  module_id: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  next_retry_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getLegacyPlaylistId(metadata: Record<string, unknown> | null) {
  if (!metadata || !isRecord(metadata.legacy)) return null;
  const playlistId = metadata.legacy.playlist_id;
  return typeof playlistId === 'string' ? playlistId : null;
}

function sanitizeSearchTerm(value: string | undefined) {
  if (!value) return '';
  return value
    .replace(/[,%]/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'), corsOrigin);

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

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return errorResponse('Could not verify profile role', 500, 'authorization_check_failed', corsHeaders);
  }

  const role = profile?.role;
  if (role !== 'editor' && role !== 'admin') {
    return errorResponse('Editor role required', 403, 'forbidden', corsHeaders);
  }

  const { data: rateLimitData, error: rateLimitError } = await serviceClient.rpc('check_edge_rate_limit', {
    p_function_name: 'list-module-publication-candidates-v2',
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
    return errorResponse('Rate limit exceeded for candidate requests', 429, 'rate_limit_exceeded', headers);
  }

  const body = (await req.json().catch(() => ({}))) as CandidatesPayload;
  const limit = Math.max(1, Math.min(50, body.limit ?? 20));
  const search = sanitizeSearchTerm(body.search);

  let modulesQuery = serviceClient
    .schema('tube')
    .from('modules')
    .select('id, slug, title, description, status, metadata, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (search) {
    modulesQuery = modulesQuery.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data: modulesData, error: modulesError } = await modulesQuery;

  if (modulesError) {
    return errorResponse(modulesError.message, 400, 'candidate_query_failed', corsHeaders);
  }

  const modules = (modulesData ?? []) as ModuleRow[];
  const playlistIds = Array.from(
    new Set(
      modules
        .map((moduleRow) => getLegacyPlaylistId(moduleRow.metadata))
        .filter((playlistId): playlistId is string => !!playlistId),
    ),
  );

  const moduleIds = modules.map((moduleRow) => moduleRow.id);

  const playlistMap = new Map<string, PlaylistRow>();

  if (playlistIds.length > 0) {
    const { data: playlistsData, error: playlistsError } = await serviceClient
      .from('playlists')
      .select('id, name, course_code, unit_code, review_status, video_count, total_duration_seconds, is_public, is_ordered')
      .in('id', playlistIds);

    if (playlistsError) {
      return errorResponse(playlistsError.message, 400, 'playlist_mapping_failed', corsHeaders);
    }

    ((playlistsData ?? []) as PlaylistRow[]).forEach((playlist) => {
      playlistMap.set(playlist.id, playlist);
    });
  }

  const latestRequesterJobByModuleId = new Map<string, PublishJobRow>();

  if (moduleIds.length > 0) {
    const { data: jobsData, error: jobsError } = await serviceClient
      .schema('tube')
      .from('publish_jobs')
      .select(
        'id, module_id, status, attempt_count, max_attempts, requested_by, requested_at, started_at, finished_at, next_retry_at, last_error_code, last_error_message, last_error_at, created_at, updated_at',
      )
      .in('module_id', moduleIds)
      .eq('requested_by', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(Math.max(limit * 5, 50));

    if (jobsError) {
      return errorResponse(jobsError.message, 400, 'status_query_failed', corsHeaders);
    }

    ((jobsData ?? []) as PublishJobRow[]).forEach((job) => {
      if (!latestRequesterJobByModuleId.has(job.module_id)) {
        latestRequesterJobByModuleId.set(job.module_id, job);
      }
    });
  }

  const candidates = modules
    .map((moduleRow) => {
      const playlistId = getLegacyPlaylistId(moduleRow.metadata);
      if (!playlistId) return null;

      const playlist = playlistMap.get(playlistId);
      if (!playlist) return null;

      return {
        module_id: moduleRow.id,
        module_slug: moduleRow.slug,
        module_title: moduleRow.title,
        module_description: moduleRow.description,
        module_status: moduleRow.status,
        module_updated_at: moduleRow.updated_at,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          course_code: playlist.course_code,
          unit_code: playlist.unit_code,
          review_status: playlist.review_status,
          video_count: playlist.video_count,
          total_duration_seconds: playlist.total_duration_seconds,
          is_public: playlist.is_public,
          is_ordered: playlist.is_ordered,
        },
        latest_job: latestRequesterJobByModuleId.get(moduleRow.id) ?? null,
      };
    })
    .filter((candidate) => !!candidate)
    .sort((a, b) => {
      const aTime = a?.latest_job?.created_at ? new Date(a.latest_job.created_at).getTime() : 0;
      const bTime = b?.latest_job?.created_at ? new Date(b.latest_job.created_at).getTime() : 0;
      if (aTime === bTime) {
        return (a?.playlist.name ?? '').localeCompare(b?.playlist.name ?? '');
      }
      return bTime - aTime;
    });

  return jsonResponse(
    {
      ok: true,
      candidates,
    },
    { headers: corsHeaders },
  );
});