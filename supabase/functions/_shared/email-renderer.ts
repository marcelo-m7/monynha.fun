export type BaseEmailParams = {
  title: string;
  preview: string;
  bodyHtml: string;
  cta?: {
    label: string;
    href: string;
  };
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderBaseEmail({ title, preview, bodyHtml, cta }: BaseEmailParams): string {
  const ctaHtml = cta
    ? `
      <p style="margin:28px 0;">
        <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;">
          ${escapeHtml(cta.label)}
        </a>
      </p>
    `
    : '';

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f7f8;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;">Open 2 Technology</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#111827;">Tube O2</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h2>
                <div style="font-size:15px;line-height:1.65;color:#374151;">
                  ${bodyHtml}
                </div>
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.5;">
                <p style="margin:0;">Tube O2 é um produto da Open 2 Technology.</p>
                <p style="margin:4px 0 0;"><a href="https://open2.tech" style="color:#374151;">open2.tech</a> · <a href="https://tube.open2.tech" style="color:#374151;">tube.open2.tech</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEditorApplicationConfirmation(params: {
  fullName: string;
  applicationId: string;
}) {
  const safeName = escapeHtml(params.fullName);
  const safeApplicationId = escapeHtml(params.applicationId);

  return renderBaseEmail({
    title: 'Recebemos sua candidatura para editor no Tube O2',
    preview: 'Sua candidatura para ajudar na curadoria do Tube O2 foi recebida.',
    bodyHtml: `
      <p style="margin:0 0 12px;">Olá, ${safeName}.</p>
      <p style="margin:0 0 12px;">Recebemos sua candidatura para atuar como editor na comunidade Tube O2.</p>
      <p style="margin:0 0 12px;"><strong>ID da candidatura:</strong> ${safeApplicationId}</p>
      <p style="margin:0;">A equipe editorial vai analisar a candidatura e entrar em contato quando houver uma atualização.</p>
    `,
    cta: {
      label: 'Abrir Tube O2',
      href: 'https://tube.open2.tech',
    },
  });
}

export function renderContactNotification(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  messageId: string;
}) {
  return renderBaseEmail({
    title: `Novo contato Tube O2: ${params.subject}`,
    preview: `Mensagem de ${params.name} (${params.email})`,
    bodyHtml: `
      <p style="margin:0 0 12px;"><strong>Nome:</strong> ${escapeHtml(params.name)}</p>
      <p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
      <p style="margin:0 0 12px;"><strong>Assunto:</strong> ${escapeHtml(params.subject)}</p>
      <p style="margin:0 0 12px;"><strong>ID:</strong> ${escapeHtml(params.messageId)}</p>
      <div style="white-space:pre-wrap;border-left:3px solid #111827;padding-left:12px;margin-top:16px;">${escapeHtml(params.message)}</div>
    `,
  });
}

export function renderContactReceipt(params: {
  name: string;
  subject: string;
}) {
  return renderBaseEmail({
    title: 'Recebemos sua mensagem no Tube O2',
    preview: 'Obrigado por entrar em contato com o Tube O2.',
    bodyHtml: `
      <p style="margin:0 0 12px;">Olá, ${escapeHtml(params.name)}.</p>
      <p style="margin:0 0 12px;">Recebemos sua mensagem sobre <strong>${escapeHtml(params.subject)}</strong>.</p>
      <p style="margin:0;">A equipe Open 2 Technology vai responder assim que possível.</p>
    `,
    cta: {
      label: 'Voltar ao Tube O2',
      href: 'https://tube.open2.tech',
    },
  });
}
