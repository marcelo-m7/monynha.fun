import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts';
import { renderEditorApplicationConfirmation } from '../_shared/email-renderer.ts';
import { sendResendEmail } from '../_shared/resend-client.ts';

interface RequestBody {
  applicationId: string;
  fullName: string;
  email: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readRequestBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const applicationId = typeof candidate.applicationId === 'string' ? candidate.applicationId.trim() : '';
  const fullName = typeof candidate.fullName === 'string' ? candidate.fullName.trim() : '';
  const email = typeof candidate.email === 'string' ? candidate.email.trim().toLowerCase() : '';

  if (!applicationId || !fullName || !email || !isValidEmail(email)) {
    return null;
  }

  return { applicationId, fullName, email };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return errorResponse(req, 500, 'MISSING_SUPABASE_ENV', 'Missing Supabase environment variables');
  }

  let body: RequestBody | null = null;
  try {
    body = readRequestBody(await req.json());
  } catch {
    return errorResponse(req, 400, 'INVALID_JSON', 'Invalid JSON body');
  }

  if (!body) {
    return errorResponse(req, 400, 'INVALID_PAYLOAD', 'applicationId, fullName and a valid email are required');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentCount, error: recentCountError } = await supabase
    .from('editor_applications')
    .select('id', { count: 'exact', head: true })
    .eq('email', body.email)
    .gte('created_at', tenMinutesAgo);

  if (recentCountError) {
    return errorResponse(req, 500, 'RECENT_APPLICATION_CHECK_FAILED', recentCountError.message);
  }

  if ((recentCount || 0) > 5) {
    return errorResponse(req, 429, 'RATE_LIMITED', 'Too many requests for this email');
  }

  const { data: application, error: applicationError } = await supabase
    .from('editor_applications')
    .select('id, full_name, email, status, created_at')
    .eq('id', body.applicationId)
    .maybeSingle();

  if (applicationError) {
    return errorResponse(req, 500, 'APPLICATION_LOAD_FAILED', applicationError.message);
  }

  if (!application) {
    return errorResponse(req, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  if (
    application.email.toLowerCase() !== body.email ||
    application.full_name !== body.fullName
  ) {
    return errorResponse(req, 409, 'APPLICATION_PAYLOAD_MISMATCH', 'Payload does not match application record');
  }

  try {
    const emailResult = await sendResendEmail({
      to: body.email,
      subject: 'Recebemos sua candidatura para editor no Tube O2',
      html: renderEditorApplicationConfirmation({
        fullName: body.fullName,
        applicationId: body.applicationId,
      }),
    });

    await supabase
      .from('editor_applications')
      .update({
        confirmation_sent_at: new Date().toISOString(),
        confirmation_error: null,
        confirmation_provider_id: emailResult.id,
      })
      .eq('id', body.applicationId);

    return jsonResponse(req, {
      success: true,
      providerId: emailResult.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email provider error';

    await supabase
      .from('editor_applications')
      .update({
        confirmation_error: message.slice(0, 1000),
      })
      .eq('id', body.applicationId);

    return errorResponse(req, 502, 'EMAIL_SEND_FAILED', message);
  }
});
