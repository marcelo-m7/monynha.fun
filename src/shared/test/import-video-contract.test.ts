import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const importVideoPath = path.join(repoRoot, 'supabase/functions/import-video/index.ts');

describe('import-video contract', () => {
  it('reuses shared backend helpers and association logic', () => {
    const source = fs.readFileSync(importVideoPath, 'utf8');

    expect(source).toContain("../_shared/http.ts");
    expect(source).toContain("../_shared/auth.ts");
    expect(source).toContain("../_shared/association.ts");
    expect(source).toContain('buildAutoAssociationDecision');
    expect(source).toContain('persistAutoAssociation');
  });

  it('accepts the expected payload keys and returns processing status', () => {
    const source = fs.readFileSync(importVideoPath, 'utf8');

    expect(source).toContain('youtubeUrl');
    expect(source).toContain('submissionId');
    expect(source).toContain('idempotencyKey');
    expect(source).toContain("status: 'processing'");
    expect(source).toContain('assignedCategoryId');
    expect(source).toContain('assignedPlaylistIds');
    expect(source).toContain('fallbackUsed');
  });
});