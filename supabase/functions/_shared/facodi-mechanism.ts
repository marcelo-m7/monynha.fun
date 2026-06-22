import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { errorResponse, jsonResponse, optionsResponse } from './http.ts';
import { checkEdgeRateLimit } from './rate-limit.ts';

type MechanismKind = 'analysis' | 'odoo';

type ServiceClient = {
  schema: (schema: string) => {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
        };
      };
    };
  };
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export type FacodiMechanismOptions = {
  functionName: string;
  jobType: string;
  kind?: MechanismKind;
};

const DEFAULT_RATE_LIMIT_WINDOWS = [
  { windowSeconds: 60, maxRequests: 10 },
  { windowSeconds: 24 * 60 * 60, maxRequests: 100 },
];

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function objectIdFromBody(body: Record<string, unknown>) {
  return stringValue(body.learning_object_id) ?? stringValue(body.object_id);
}

async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { user: null, error: 'Missing authorization header' };

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, error: error?.message ?? 'Invalid token' };
  return { user: data.user, error: null };
}

async function createAnalysisJob(params: {
  supabase: ServiceClient;
  body: Record<string, unknown>;
  jobType: string;
  requestId: string;
  userId: string;
}) {
  const { data, error } = await params.supabase
    .schema('facodi')
    .from('analysis_jobs')
    .insert({
      learning_object_id: objectIdFromBody(params.body),
      video_id: stringValue(params.body.video_id),
      youtube_video_id: stringValue(params.body.youtube_video_id),
      input_url: stringValue(params.body.url) ?? stringValue(params.body.youtube_url),
      job_type: params.jobType,
      status: 'queued',
      current_step: 'queued',
      requested_by: params.userId,
      request_source: params.jobType,
      input_payload: {
        ...params.body,
        requestId: params.requestId,
      },
    })
    .select('id, status, job_type')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function createOdooJob(params: {
  supabase: ServiceClient;
  body: Record<string, unknown>;
  jobType: string;
  userId: string;
}) {
  const { data, error } = await params.supabase
    .schema('facodi')
    .from('odoo_sync_jobs')
    .insert({
      instance_id: stringValue(params.body.instance_id),
      learning_object_id: objectIdFromBody(params.body),
      odoo_record_id: stringValue(params.body.odoo_record_id),
      job_type: params.jobType,
      status: 'queued',
      requested_by: params.userId,
      payload: params.body,
    })
    .select('id, status, job_type')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function handleFacodiMechanism(req: Request, options: FacodiMechanismOptions) {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return errorResponse(req, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', { requestId });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse(req, 500, 'MISSING_SUPABASE_ENV', 'Missing Supabase environment variables', { requestId });
  }

  const { user, error: authError } = await getAuthenticatedUser(req, supabaseUrl, anonKey);
  if (!user) {
    if (authError) console.warn(`[${options.functionName}] ${requestId} auth failed: ${authError}`);
    return errorResponse(req, 401, 'UNAUTHORIZED', 'Invalid or expired authorization token', { requestId });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return errorResponse(req, 400, 'INVALID_JSON', 'Invalid JSON body', { requestId });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) as unknown as ServiceClient;

  try {
    const rateLimit = await checkEdgeRateLimit(supabase, {
      functionName: options.functionName,
      userId: user.id,
      windows: DEFAULT_RATE_LIMIT_WINDOWS,
    });

    if (!rateLimit.allowed) {
      return errorResponse(req, 429, 'RATE_LIMITED', 'Too many FACODI mechanism requests. Try again later.', {
        requestId,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const job = options.kind === 'odoo'
      ? await createOdooJob({ supabase, body, jobType: options.jobType, userId: user.id })
      : await createAnalysisJob({ supabase, body, jobType: options.jobType, requestId, userId: user.id });

    if (!job) {
      throw new Error('Job insert returned no row');
    }

    return jsonResponse(req, {
      requestId,
      status: 'queued',
      mechanism: options.functionName,
      jobType: options.jobType,
      jobId: job.id,
    }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not queue FACODI mechanism';
    console.error(`[${options.functionName}] ${requestId} failed: ${message}`);
    return errorResponse(req, 500, 'QUEUE_FAILED', 'Could not queue FACODI mechanism', {
      requestId,
      details: message,
    });
  }
}