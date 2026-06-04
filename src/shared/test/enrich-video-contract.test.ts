import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const enrichVideoPath = path.join(repoRoot, 'supabase/functions/enrich-video/index.ts');

describe('enrich-video fast-path contract', () => {
  it('does not import OpenAI or Gemini providers', () => {
    const source = fs.readFileSync(enrichVideoPath, 'utf8');

    expect(source).not.toMatch(/openai/i);
    expect(source).not.toMatch(/gemini/i);
    expect(source).not.toContain('../_shared/openai-client.ts');
    expect(source).not.toContain('../_shared/gemini-client.ts');
  });

  it('keeps the public fast-path provider contract', () => {
    const source = fs.readFileSync(enrichVideoPath, 'utf8');

    expect(source).toContain("provider: 'legacy_fast'");
    expect(source).toContain("provider: 'v2'");
    expect(source).toContain("status: 'pending'");
    expect(source).toContain('video_analysis_jobs');
  });
});
