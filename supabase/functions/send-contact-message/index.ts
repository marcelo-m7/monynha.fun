// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { errorResponse, jsonResponse, optionsResponse } from '../_shared/http.ts';
import { renderContactNotification, renderContactReceipt } from '../_shared/email-renderer.ts';
import { getContactRecipientEmail, sendResendEmail } from '../_shared/resend-client.ts';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readContactBody(value: unknown): ContactFormData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const body = {
    name: cleanString(candidate.name, 160),
    email: cleanString(candidate.email, 320).toLowerCase(),
    subject: cleanString(candidate.subject, 200),
    message: cleanString(candidate.message, 4000),
  };

  if (!body.name || !isValidEmail(body.email) || !body.subject || body.message.length < 1) {
    return null;
  }

  return body;
}

serve(async (req: Request): Promise<Response> => {
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

  let body: ContactFormData | null = null;
  try {
    body = readContactBody(await req.json());
  } catch {
    return errorResponse(req, 400, 'INVALID_JSON', 'Invalid JSON body');
  }

  if (!body) {
    return errorResponse(req, 400, 'INVALID_PAYLOAD', 'Name, valid email, subject and message are required');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const requestId = crypto.randomUUID();

  const { data: contactMessage, error: insertError } = await supabase
    .from('contact_messages')
    .insert({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      status: 'received',
      metadata: {
        requestId,
        origin: req.headers.get('origin'),
        userAgent: req.headers.get('user-agent'),
      },
    })
    .select('id')
    .single();

  if (insertError || !contactMessage) {
    return errorResponse(req, 500, 'CONTACT_MESSAGE_INSERT_FAILED', insertError?.message || 'Could not save contact message');
  }

  try {
    const [notificationResult, receiptResult] = await Promise.all([
      sendResendEmail({
        to: getContactRecipientEmail(),
        replyTo: body.email,
        subject: `Tube O2 contact: ${body.subject}`,
        html: renderContactNotification({
          ...body,
          messageId: contactMessage.id,
        }),
      }),
      sendResendEmail({
        to: body.email,
        subject: 'Recebemos sua mensagem no Tube O2',
        html: renderContactReceipt({
          name: body.name,
          subject: body.subject,
        }),
      }),
    ]);

    await supabase
      .from('contact_messages')
      .update({
        status: 'sent',
        metadata: {
          requestId,
          origin: req.headers.get('origin'),
          userAgent: req.headers.get('user-agent'),
          notificationProviderId: notificationResult.id,
          receiptProviderId: receiptResult.id,
          sentAt: new Date().toISOString(),
        },
      })
      .eq('id', contactMessage.id);

    return jsonResponse(req, {
      success: true,
      id: contactMessage.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email provider error';

    await supabase
      .from('contact_messages')
      .update({
        status: 'failed',
        metadata: {
          requestId,
          origin: req.headers.get('origin'),
          userAgent: req.headers.get('user-agent'),
          error: message.slice(0, 1000),
          failedAt: new Date().toISOString(),
        },
      })
      .eq('id', contactMessage.id);

    return errorResponse(req, 502, 'CONTACT_EMAIL_SEND_FAILED', message, {
      id: contactMessage.id,
    });
  }
});
