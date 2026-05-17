import { describe, expect, it } from 'vitest';
import {
  renderBaseEmail,
  renderContactNotification,
  renderEditorApplicationConfirmation,
} from '../../../supabase/functions/_shared/email-renderer';

describe('email renderer', () => {
  it('renders branded transactional emails with escaped content', () => {
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

  it('escapes contact notification fields', () => {
    const html = renderContactNotification({
      name: '<User>',
      email: 'user@example.com',
      subject: '<Help>',
      message: '<script>alert(1)</script>',
      messageId: 'message-1',
    });

    expect(html).toContain('&lt;User&gt;');
    expect(html).toContain('&lt;Help&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('keeps the app CTA pointing at the production product domain', () => {
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
