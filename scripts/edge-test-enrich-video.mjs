#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const enrichVideoPath = path.join(repoRoot, 'supabase/functions/enrich-video/index.ts');

if (!fs.existsSync(enrichVideoPath)) {
  console.log('[edge:test:enrich-video] skipped: supabase/functions/enrich-video/index.ts not found on this branch.');
  process.exit(0);
}

const result = spawnSync('pnpm', ['vitest', 'run', 'src/shared/test/enrich-video-contract.test.ts'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

console.error('[edge:test:enrich-video] failed: could not execute vitest contract check.');
process.exit(1);
