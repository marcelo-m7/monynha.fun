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

// ─── Design tokens ────────────────────────────────────────────────────────────
// outer bg  : #0a0a0a   card bg   : #111111   header bg : #000000
// accent    : #efff00   cta text  : #000000   border    : #1e1e1e
// text main : #f2f2f2   text muted: #888888   divider   : #1e1e1e
// radius    : 0px (brand standard)
// ─────────────────────────────────────────────────────────────────────────────

export function renderBaseEmail({ title, preview, bodyHtml, cta }: BaseEmailParams): string {
  const ctaHtml = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 0;">
        <tr>
          <td>
            <a href="${escapeHtml(cta.href)}"
               style="display:inline-block;background:#efff00;color:#000000;text-decoration:none;padding:14px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;color:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">

            <!-- HEADER -->
            <tr>
              <td style="background:#000000;border-top:4px solid #efff00;border-left:2px solid #1e1e1e;border-right:2px solid #1e1e1e;padding:24px 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    <td>
                      <span style="display:inline-block;background:#efff00;color:#000000;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;padding:3px 8px;">O2</span>
                      <span style="margin-left:10px;font-size:17px;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;color:#f2f2f2;">TUBE O2</span>
                    </td>
                    <td align="right">
                      <span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#555555;">Open 2 Technology</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="background:#111111;border-left:2px solid #1e1e1e;border-right:2px solid #1e1e1e;padding:36px 32px;">
                <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;line-height:1.2;letter-spacing:-0.01em;color:#f2f2f2;">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.7;color:#cccccc;">
                  ${bodyHtml}
                </div>
                ${ctaHtml}
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#0a0a0a;border:2px solid #1e1e1e;border-top:none;padding:20px 32px;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#555555;">
                  Tube O2 &mdash; Open 2 Technology &middot;
                  <a href="https://tube.open2.tech" style="color:#888888;text-decoration:none;">tube.open2.tech</a> &middot;
                  <a href="https://open2.tech" style="color:#888888;text-decoration:none;">open2.tech</a> &middot;
                  <a href="mailto:hello@open2.tech" style="color:#888888;text-decoration:none;">hello@open2.tech</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </body>
</html>`;
}

export function renderEditorApplicationConfirmation(params: {
  fullName: string;
  applicationId: string;
}) {
  const safeName = escapeHtml(params.fullName);
  const safeId = escapeHtml(params.applicationId);

  return renderBaseEmail({
    title: 'Candidatura recebida',
    preview: `${params.fullName}, recebemos sua candidatura para editor no Tube O2.`,
    bodyHtml: `
      <p style="margin:0 0 14px;">Olá, ${safeName}.</p>
      <p style="margin:0 0 14px;">Sua candidatura para atuar como editor na comunidade Tube O2 foi registrada com sucesso.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;border-left:3px solid #efff00;">
        <tr>
          <td style="padding:12px 16px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888888;">ID da candidatura</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#f2f2f2;">${safeId}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 14px;">A equipe editorial vai analisar sua solicitação e entrar em contato assim que houver uma atualização. O processo costuma levar até 5 dias úteis.</p>
      <p style="margin:0;color:#888888;font-size:13px;">Enquanto isso, continue explorando e enviando vídeos para a plataforma.</p>
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
    title: `Novo contato: ${params.subject}`,
    preview: `Mensagem de ${params.name} via Tube O2.`,
    bodyHtml: `
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888888;">Nome</span><br>
            <span style="font-size:14px;color:#f2f2f2;">${escapeHtml(params.name)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888888;">Email</span><br>
            <a href="mailto:${escapeHtml(params.email)}" style="font-size:14px;color:#efff00;text-decoration:none;">${escapeHtml(params.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888888;">Assunto</span><br>
            <span style="font-size:14px;color:#f2f2f2;">${escapeHtml(params.subject)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888888;">ID</span><br>
            <span style="font-size:12px;color:#888888;">${escapeHtml(params.messageId)}</span>
          </td>
        </tr>
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #efff00;padding:12px 16px;background:#0a0a0a;font-size:14px;line-height:1.7;color:#cccccc;">${escapeHtml(params.message)}</div>
    `,
  });
}

export function renderContactReceipt(params: {
  name: string;
  subject: string;
}) {
  return renderBaseEmail({
    title: 'Mensagem recebida',
    preview: `Obrigado por entrar em contato, ${params.name}. Já recebemos sua mensagem.`,
    bodyHtml: `
      <p style="margin:0 0 14px;">Olá, ${escapeHtml(params.name)}.</p>
      <p style="margin:0 0 14px;">Recebemos sua mensagem sobre <strong style="color:#f2f2f2;">${escapeHtml(params.subject)}</strong>.</p>
      <p style="margin:0 0 14px;">A equipe Open 2 Technology vai analisar e responder em até 48 horas.</p>
      <p style="margin:0;color:#888888;font-size:13px;">Se precisar de resposta mais rápida, envie diretamente para <a href="mailto:hello@open2.tech" style="color:#efff00;text-decoration:none;">hello@open2.tech</a>.</p>
    `,
    cta: {
      label: 'Voltar ao Tube O2',
      href: 'https://tube.open2.tech',
    },
  });
}
