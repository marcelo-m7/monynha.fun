export type ResendEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string | string[];
};

export type ResendEmailResult = {
  id: string | null;
};

export function getResendFromEmail() {
  return Deno.env.get('RESEND_FROM_EMAIL') || 'Tube O2 <noreply@open2.tech>';
}

export function getResendReplyTo() {
  return Deno.env.get('RESEND_REPLY_TO') || 'hello@open2.tech';
}

export function getContactRecipientEmail() {
  return Deno.env.get('CONTACT_RECIPIENT_EMAIL') || getResendReplyTo();
}

export async function sendResendEmail(payload: ResendEmailPayload): Promise<ResendEmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is required');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getResendFromEmail(),
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      reply_to: payload.replyTo ?? getResendReplyTo(),
      subject: payload.subject,
      html: payload.html,
    }),
  });

  const responseText = await response.text();
  let responseBody: { id?: string; message?: string; error?: string } = {};

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText) as { id?: string; message?: string; error?: string };
    } catch {
      responseBody = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(responseBody.message || responseBody.error || `Resend error: ${response.status}`);
  }

  return {
    id: responseBody.id ?? null,
  };
}
