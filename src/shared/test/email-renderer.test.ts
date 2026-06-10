import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const rendererPath = path.join(process.cwd(), 'supabase/functions/_shared/email-renderer.ts');
const rendererModuleUrl = pathToFileURL(rendererPath).href;
const describeIfRendererExists = fs.existsSync(rendererPath) ? describe : describe.skip;

describeIfRendererExists('email renderer', () => {
  it('renders branded transactional emails with escaped content', async () => {
    const { renderEditorApplicationConfirmation } = await import(/* @vite-ignore */ rendererModuleUrl);

    const html = renderEditorApplicationConfirmation({
      fullName: '<Marcelo>',
      applicationId: 'application-123',
    });

    expect(html).toContain('Tube O2');
    expect(html).toContain('Open 2 Technology');
    expect(html).toContain('&lt;Marcelo&gt;');
    expect(html).not.toContain('<Marcelo>');
    expect(html).toContain('application-123');
  });

  it('escapes contact notification fields', async () => {
    const { renderContactNotification } = await import(/* @vite-ignore */ rendererModuleUrl);

    const html = renderContactNotification({
      name: '<User>',
      email: 'user@example.com',
      subject: '<Help>',
      message: '<script>alert(1)</script>',
      messageId: 'message-1',
    });

    expect(html).toContain('&lt;User&gt;');
    expect(html).toContain('&lt;Help&gt;');
    expect(html).not.toContain('&amp;lt;Help&amp;gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('keeps the app CTA pointing at the production product domain', async () => {
    const { renderBaseEmail } = await import(/* @vite-ignore */ rendererModuleUrl);

    const html = renderBaseEmail({
      title: 'Test',
      preview: 'Intro',
      bodyHtml: '<p>Body</p>',
      cta: {
        label: 'Open Tube O2',
        href: 'https://tube.open2.tech',
      },
    });

    expect(html).toContain('https://tube.open2.tech');
    expect(html).toContain('https://open2.tech');
  });
});
