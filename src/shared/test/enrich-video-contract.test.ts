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

  it('queues or reuses pending v2 deep-analysis jobs after fast-path enrichment', () => {
    const source = fs.readFileSync(enrichVideoPath, 'utf8');

    expect(source).toContain('createOrReusePendingDeepAnalysisJob');
    expect(source).toContain("provider: 'v2'");
    expect(source).toContain("status: 'pending'");
    expect(source).toContain('video_analysis_jobs');
  });
});
