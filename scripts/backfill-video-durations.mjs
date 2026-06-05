#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_LIMIT = 50;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_DELAY_MS = 500;
const WATCH_URL = 'https://www.youtube.com/watch?v=';

function parseArgs(argv) {
  const args = {
    write: false,
    dryRun: false,
    limit: DEFAULT_LIMIT,
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--write') {
      args.write = true;
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--limit' && next) {
      args.limit = Math.max(1, Number.parseInt(next, 10));
      index += 1;
      continue;
    }
    if (arg === '--concurrency' && next) {
      args.concurrency = Math.max(1, Number.parseInt(next, 10));
      index += 1;
      continue;
    }
    if (arg === '--delay-ms' && next) {
      args.delayMs = Math.max(0, Number.parseInt(next, 10));
      index += 1;
      continue;
    }
  }

  if (!args.write) {
    args.dryRun = true;
  }

  return args;
}

async function loadDotEnv(cwd = process.cwd()) {
  const envPath = path.join(cwd, '.env');
  let contents = '';

  try {
    contents = await readFile(envPath, 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

export function parseIso8601DurationToSeconds(value) {
  if (typeof value !== 'string') return null;

  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return null;

  const days = Number.parseInt(match[1] ?? '0', 10);
  const hours = Number.parseInt(match[2] ?? '0', 10);
  const minutes = Number.parseInt(match[3] ?? '0', 10);
  const seconds = Number.parseInt(match[4] ?? '0', 10);
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? total : null;
}

export function extractDurationSecondsFromYoutubeHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return null;

  const lengthSecondsMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
  if (lengthSecondsMatch?.[1]) {
    const seconds = Number.parseInt(lengthSecondsMatch[1], 10);
    if (seconds > 0) return seconds;
  }

  const isoDurationMatch =
    html.match(/itemprop=["']duration["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/content=["']([^"']+)["'][^>]+itemprop=["']duration["']/i) ??
    html.match(/"duration"\s*:\s*"([^"]+)"/);

  if (isoDurationMatch?.[1]) {
    return parseIso8601DurationToSeconds(isoDurationMatch[1]);
  }

  return null;
}

function getSupabaseAdminKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (process.env.SUPABASE_SECRET_KEY) {
    return process.env.SUPABASE_SECRET_KEY;
  }

  if (process.env.SUPABASE_SECRET_KEYS) {
    try {
      const secretKeys = JSON.parse(process.env.SUPABASE_SECRET_KEYS);
      const firstKey = Object.values(secretKeys).find((value) => typeof value === 'string' && value.length > 0);
      if (typeof firstKey === 'string') return firstKey;
    } catch {
      return null;
    }
  }

  return null;
}

async function resolveDurationSeconds(youtubeId) {
  const response = await fetch(`${WATCH_URL}${encodeURIComponent(youtubeId)}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
      'user-agent': 'TubeO2DurationBackfill/1.0 (+https://tube.open2.tech)',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube responded with HTTP ${response.status}`);
  }

  return extractDurationSecondsFromYoutubeHtml(await response.text());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency(items, concurrency, delayMs, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;

      results[current] = await mapper(items[current], current);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function writeReport(report) {
  const logsDir = path.join(process.cwd(), 'docs', 'logs');
  await mkdir(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(logsDir, `video_durations_backfill_${timestamp}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

async function main() {
  const startedAt = new Date().toISOString();
  const args = parseArgs(process.argv.slice(2));
  await loadDotEnv();

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = getSupabaseAdminKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or Supabase admin key.');
  }

  const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const supabaseHeaders = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };

  const videosResponse = await fetch(
    `${restUrl}/videos?select=id,youtube_id,duration_seconds&or=(duration_seconds.is.null,duration_seconds.lte.0)&youtube_id=not.is.null&order=created_at.asc&limit=${args.limit}`,
    { headers: supabaseHeaders },
  );

  if (!videosResponse.ok) {
    throw new Error(`Failed fetching videos: HTTP ${videosResponse.status} ${await videosResponse.text()}`);
  }

  const rows = await videosResponse.json();
  const report = {
    started_at: startedAt,
    completed_at: null,
    mode: args.write ? 'write' : 'dry-run',
    limit: args.limit,
    concurrency: args.concurrency,
    delay_ms: args.delayMs,
    totals: {
      candidates: rows.length,
      resolved: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    },
    items: [],
  };

  const results = await mapWithConcurrency(rows, args.concurrency, args.delayMs, async (video) => {
    try {
      const durationSeconds = await resolveDurationSeconds(video.youtube_id);
      if (!durationSeconds) {
        return {
          id: video.id,
          youtube_id: video.youtube_id,
          previous_duration_seconds: video.duration_seconds,
          status: 'skipped',
          reason: 'duration_not_found_in_public_html',
        };
      }

      const item = {
        id: video.id,
        youtube_id: video.youtube_id,
        previous_duration_seconds: video.duration_seconds,
        duration_seconds: durationSeconds,
        status: args.write ? 'updated' : 'resolved_dry_run',
      };

      if (args.write) {
        const updateResponse = await fetch(`${restUrl}/videos?id=eq.${encodeURIComponent(video.id)}`, {
          method: 'PATCH',
          headers: {
            ...supabaseHeaders,
            'content-type': 'application/json',
            prefer: 'return=minimal',
          },
          body: JSON.stringify({
            duration_seconds: durationSeconds,
            updated_at: new Date().toISOString(),
          }),
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed updating video: HTTP ${updateResponse.status} ${await updateResponse.text()}`);
        }
      }

      return item;
    } catch (error) {
      return {
        id: video.id,
        youtube_id: video.youtube_id,
        previous_duration_seconds: video.duration_seconds,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  report.items = results;
  for (const item of results) {
    if (item.status === 'updated') report.totals.updated += 1;
    if (item.status === 'resolved_dry_run') report.totals.resolved += 1;
    if (item.status === 'skipped') report.totals.skipped += 1;
    if (item.status === 'failed') report.totals.failed += 1;
  }
  report.completed_at = new Date().toISOString();

  const reportPath = await writeReport(report);
  console.log(`Mode: ${report.mode}`);
  console.log(`Candidates: ${report.totals.candidates}`);
  console.log(`Resolved: ${report.totals.resolved}`);
  console.log(`Updated: ${report.totals.updated}`);
  console.log(`Skipped: ${report.totals.skipped}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Report: ${reportPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
