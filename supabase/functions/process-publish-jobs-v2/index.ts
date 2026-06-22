import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildCorsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';

type PublishJob = {
  id: string;
  module_id: string;
  max_attempts: number;
  attempt_count: number;
  requested_by: string | null;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const workerSecret = Deno.env.get('PUBLISH_WORKER_SECRET') ?? '';
const corsOrigin = Deno.env.get('EDGE_CORS_ORIGIN') ?? 'https://tube.open2.tech';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing required SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars');
}

function getRetryDelaySeconds(attemptCount: number) {
  const exponential = Math.pow(2, Math.max(0, attemptCount - 1));
  return Math.min(300, exponential * 15);
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
    const provided = req.headers.get('x-worker-secret') ?? '';
    if (provided !== workerSecret) {
      return errorResponse('Invalid worker secret', 401, 'unauthorized', corsHeaders);
    }
  }

  const body = (await req.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(100, body.limit ?? 10));
  const lockId = crypto.randomUUID();

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: claimed, error: claimError } = await serviceClient.rpc('claim_publish_jobs', {
    p_limit: limit,
    p_lock_id: lockId,
  });

  if (claimError) {
    return errorResponse(claimError.message, 500, 'job_claim_failed', corsHeaders);
  }

  const jobs = (claimed ?? []) as PublishJob[];
  const summary = {
    locked: 0,
    succeeded: 0,
    retryable_error: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    summary.locked += 1;

    const { error: publishError } = await serviceClient.rpc('publish_module_to_facodi', {
      p_module_id: job.module_id,
      p_actor_id: job.requested_by,
    });

    if (!publishError) {
      await serviceClient
        .schema('tube')
        .from('publish_jobs')
        .update({
          status: 'succeeded',
          finished_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          last_error_code: null,
          last_error_message: null,
          last_error_at: null,
        })
        .eq('id', job.id);

      await serviceClient
        .schema('tube')
        .from('publish_job_events')
        .insert({
          publish_job_id: job.id,
          event_type: 'succeeded',
          event_payload: {
            lock_id: lockId,
          },
        });

      summary.succeeded += 1;
      continue;
    }

    const nextAttempt = job.attempt_count;
    const reachedMaxAttempts = nextAttempt >= job.max_attempts;

    if (reachedMaxAttempts) {
      await serviceClient
        .schema('tube')
        .from('publish_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          last_error_code: 'publish_failed',
          last_error_message: publishError.message,
          last_error_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      await serviceClient
        .schema('tube')
        .from('publish_job_events')
        .insert({
          publish_job_id: job.id,
          event_type: 'failed',
          event_payload: {
            lock_id: lockId,
            error_message: publishError.message,
          },
        });

      summary.failed += 1;
      continue;
    }

    const delaySeconds = getRetryDelaySeconds(nextAttempt);
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

    await serviceClient
      .schema('tube')
      .from('publish_jobs')
      .update({
        status: 'retryable_error',
        next_retry_at: nextRetryAt,
        locked_at: null,
        locked_by: null,
        last_error_code: 'publish_retryable_error',
        last_error_message: publishError.message,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    await serviceClient
      .schema('tube')
      .from('publish_job_events')
      .insert({
        publish_job_id: job.id,
        event_type: 'retryable_error',
        event_payload: {
          lock_id: lockId,
          retry_in_seconds: delaySeconds,
          error_message: publishError.message,
        },
      });

    summary.retryable_error += 1;
  }

  return jsonResponse(
    {
      ok: true,
      summary,
    },
    { headers: corsHeaders },
  );
});