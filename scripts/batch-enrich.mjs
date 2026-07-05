#!/usr/bin/env bun
/**
 * Batch enrichment script: re-processes existing videos through the pipeline.
 *
 * Usage:
 *   bun scripts/batch-enrich.mjs [--limit 20] [--offset 0] [--delay 1200] [--dry-run]
 *
 * Options:
 *   --limit N      Number of videos to process (default: 20)
 *   --offset N     Offset into video list ordered by created_at desc (default: 0)
 *   --delay N      Milliseconds between requests (default: 1200)
 *   --dry-run      List videos without calling pipeline
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Config from args ---
const args = process.argv.slice(2);
function argVal(flag, def) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : def;
}
const LIMIT = parseInt(argVal('--limit', '20'), 10);
const OFFSET = parseInt(argVal('--offset', '0'), 10);
const DELAY_MS = parseInt(argVal('--delay', '1200'), 10);
const DRY_RUN = args.includes('--dry-run');

// --- Load .env from workspace root ---
const envPath = resolve(import.meta.dirname, '../.env');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const BASE = process.env.VITE_SUPABASE_URL;
const APIKEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.BATCH_EMAIL ?? 'test-fun@monynha.com';
const PASSWORD = process.env.BATCH_PASSWORD ?? 'monynha.com';

if (!BASE || !APIKEY) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in .env');
  process.exit(1);
}

// --- Helpers ---
async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Main ---
console.log(`[batch-enrich] Config: limit=${LIMIT} offset=${OFFSET} delay=${DELAY_MS}ms dry-run=${DRY_RUN}`);

const login = await jfetch(`${BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: APIKEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!login.ok) {
  console.error('ERROR: Login failed', JSON.stringify(login.body));
  process.exit(1);
}
const token = login.body.access_token;
console.log(`[batch-enrich] Authenticated as ${login.body.user?.email}`);

const videosRes = await jfetch(
  `${BASE}/rest/v1/videos?select=id,youtube_id,title,created_at&order=created_at.desc&limit=${LIMIT}&offset=${OFFSET}`,
  { headers: { apikey: APIKEY, Authorization: `Bearer ${token}` } },
);
if (!videosRes.ok) {
  console.error('ERROR: Failed to fetch videos', JSON.stringify(videosRes.body));
  process.exit(1);
}

const videos = videosRes.body ?? [];
console.log(`[batch-enrich] Found ${videos.length} videos to process\n`);

if (DRY_RUN) {
  for (const v of videos) {
    console.log(`  ${v.id} | ${v.youtube_id} | ${v.title?.slice(0, 60)}`);
  }
  process.exit(0);
}

const results = [];
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < videos.length; i++) {
  const v = videos[i];
  const youtubeUrl = `https://www.youtube.com/watch?v=${v.youtube_id}`;
  const submissionId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  const prefix = `[${i + 1}/${videos.length}] ${v.youtube_id}`;

  // Step 1: import-video
  const importRes = await jfetch(`${BASE}/functions/v1/import-video`, {
    method: 'POST',
    headers: { apikey: APIKEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl, submissionId, idempotencyKey }),
  });

  if (!importRes.ok) {
    console.log(`${prefix} IMPORT FAILED ${importRes.status}: ${JSON.stringify(importRes.body?.error ?? importRes.body)}`);
    results.push({ youtubeId: v.youtube_id, step: 'import', ok: false, status: importRes.status });
    errorCount++;
    await delay(DELAY_MS);
    continue;
  }

  const videoId = importRes.body.videoId;
  await delay(DELAY_MS);

  // Step 2: enrich-video
  const enrichRes = await jfetch(`${BASE}/functions/v1/enrich-video`, {
    method: 'POST',
    headers: { apikey: APIKEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, youtubeUrl, submissionId: importRes.body.submissionId }),
  });

  if (!enrichRes.ok) {
    console.log(`${prefix} ENRICH FAILED ${enrichRes.status}: ${JSON.stringify(enrichRes.body?.error ?? enrichRes.body)}`);
    results.push({ youtubeId: v.youtube_id, step: 'enrich', ok: false, status: enrichRes.status });
    errorCount++;
    await delay(DELAY_MS);
    continue;
  }

  const enrichProvider = enrichRes.body?.provider ?? 'unknown';
  const tags = enrichRes.body?.data?.semantic_tags ?? [];
  await delay(DELAY_MS);

  // Step 3: auto-associate-video
  const assocRes = await jfetch(`${BASE}/functions/v1/auto-associate-video`, {
    method: 'POST',
    headers: { apikey: APIKEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, persist: true }),
  });

  const assignedPlaylist = assocRes.body?.data?.assignedPlaylistId ?? null;
  const fallback = assocRes.body?.data?.fallbackUsed ?? null;
  const confidence = assocRes.body?.data?.confidence ?? null;

  console.log(
    `${prefix} OK provider=${enrichProvider} tags=${tags.length} playlist=${assignedPlaylist ? '✓' : '✗'} fallback=${fallback} confidence=${confidence}`,
  );

  results.push({
    youtubeId: v.youtube_id,
    videoId,
    ok: true,
    enrichProvider,
    tagsCount: tags.length,
    assignedPlaylistId: assignedPlaylist,
    fallbackUsed: fallback,
    confidence,
  });
  successCount++;

  if (i < videos.length - 1) {
    await delay(DELAY_MS);
  }
}

// --- Summary ---
const providerCounts = results.filter(r => r.ok).reduce((acc, r) => {
  acc[r.enrichProvider] = (acc[r.enrichProvider] ?? 0) + 1;
  return acc;
}, {});
const withPlaylist = results.filter(r => r.ok && r.assignedPlaylistId).length;
const withTags = results.filter(r => r.ok && r.tagsCount > 0).length;

console.log(`
=== BATCH SUMMARY ===
Total:      ${videos.length}
Success:    ${successCount}
Errors:     ${errorCount}
Providers:  ${JSON.stringify(providerCounts)}
w/ Playlist: ${withPlaylist}/${successCount} (${Math.round(withPlaylist / successCount * 100) || 0}%)
w/ Tags:    ${withTags}/${successCount} (${Math.round(withTags / successCount * 100) || 0}%)
`);
