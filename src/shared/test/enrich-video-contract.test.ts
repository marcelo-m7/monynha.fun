import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const enrichVideoPath = path.join(repoRoot, 'supabase/functions/enrich-video/index.ts');

describe('enrich-video fast-path contract', () => {
  it('imports OpenAI primary path with Gemini fallback', () => {
    const source = fs.readFileSync(enrichVideoPath, 'utf8');

    expect(source).toContain('../_shared/openai-client.ts');
    expect(source).toContain('../_shared/gemini-client.ts');
    expect(source).toContain("provider: 'openai'");
    expect(source).toContain("provider: 'gemini'");
  });

  it('stores completed fast-path analysis jobs instead of pending deep jobs', () => {
    const source = fs.readFileSync(enrichVideoPath, 'utf8');

    expect(source).toContain("provider: 'fast_path_ai'");
    expect(source).toContain("status: 'completed'");
    expect(source).toContain('video_analysis_jobs');
  });
});
