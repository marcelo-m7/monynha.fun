import fs from 'node:fs';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'wvkjainfwsyiyfcmbtid';
const supabaseUrl = process.env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;
const youtubeId = process.env.EDGE_TEST_YOUTUBE_ID || 'HXV3zeQKqGY';
const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
const email = `codex-edge-test-${Date.now()}@example.com`;
const password = `CodexTest-${Date.now()}-Aa1!`;

let anonKey = process.env.SUPABASE_ANON_KEY || '';
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let userId;
let videoId;
let submissionId;
let enrichmentId;

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? safeJson(text) : null;
  if (!response.ok) {
    const message = typeof body === 'object' && body
      ? body.message || body.error || body.msg
      : body;
    throw new Error(`${options.method || 'GET'} ${url} failed ${response.status}: ${message || response.statusText}`);
  }
  return body;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function serviceHeaders(extra = {}) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...extra };
}

async function getProjectKeys() {
  if (anonKey && serviceRoleKey) return;

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
    || readOptionalFile(`${process.env.HOME}/.supabase/access-token`);
  if (!accessToken) {
    throw new Error('Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, or provide SUPABASE_ACCESS_TOKEN.');
  }

  const data = await jsonFetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  const keys = Array.isArray(data) ? data : data.api_keys || data.keys || [];
  anonKey = anonKey || keys.find((key) => key.name === 'anon')?.api_key || keys.find((key) => key.name === 'anon')?.key;
  serviceRoleKey = serviceRoleKey || keys.find((key) => key.name === 'service_role')?.api_key || keys.find((key) => key.name === 'service_role')?.key;

  if (!anonKey || !serviceRoleKey) {
    throw new Error('Missing anon/service_role keys.');
  }
}

function readOptionalFile(path) {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

async function cleanup() {
  if (!serviceRoleKey) return;
  const headers = serviceHeaders();
  if (enrichmentId) await fetch(`${supabaseUrl}/rest/v1/ai_enrichments?id=eq.${enrichmentId}`, { method: 'DELETE', headers }).catch(() => undefined);
  if (submissionId) await fetch(`${supabaseUrl}/rest/v1/video_submissions?id=eq.${submissionId}`, { method: 'DELETE', headers }).catch(() => undefined);
  if (videoId) await fetch(`${supabaseUrl}/rest/v1/videos?id=eq.${videoId}`, { method: 'DELETE', headers }).catch(() => undefined);
  if (userId) {
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE', headers }).catch(() => undefined);
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers }).catch(() => undefined);
  }
}

async function main() {
  await getProjectKeys();

  const oembed = await jsonFetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`);
  const existing = await jsonFetch(`${supabaseUrl}/rest/v1/videos?youtube_id=eq.${youtubeId}&select=id`, {
    headers: serviceHeaders(),
  });
  if (existing.length > 0) throw new Error(`Test video already exists in DB: ${youtubeId}`);

  const createdUser = await jsonFetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  userId = createdUser.id;

  const token = await jsonFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!token.access_token) throw new Error('No user access token returned.');

  const insertedVideo = await jsonFetch(`${supabaseUrl}/rest/v1/videos?select=id`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      youtube_id: youtubeId,
      title: oembed.title,
      description: null,
      channel_name: oembed.author_name,
      thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      language: 'en',
      category_id: null,
      submitted_by: userId,
    }),
  });
  videoId = insertedVideo[0].id;

  const insertedSubmission = await jsonFetch(`${supabaseUrl}/rest/v1/video_submissions?select=id`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({ user_id: userId, video_id: videoId, youtube_id: youtubeId, youtube_url: youtubeUrl, status: 'pending' }),
  });
  submissionId = insertedSubmission[0].id;

  const invoked = await jsonFetch(`${supabaseUrl}/functions/v1/enrich-video`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, youtubeUrl, submissionId }),
  });
  enrichmentId = invoked?.data?.id;

  const videoRows = await jsonFetch(`${supabaseUrl}/rest/v1/videos?id=eq.${videoId}&select=id,category_id,category:categories(id,name,slug)`, { headers: serviceHeaders() });
  const enrichmentRows = await jsonFetch(`${supabaseUrl}/rest/v1/ai_enrichments?video_id=eq.${videoId}&select=id,summary_description,suggested_category_id,semantic_tags`, { headers: serviceHeaders() });
  const submissionRows = await jsonFetch(`${supabaseUrl}/rest/v1/video_submissions?id=eq.${submissionId}&select=id,status,recoverable,metadata`, { headers: serviceHeaders() });
  const jobRows = await jsonFetch(`${supabaseUrl}/rest/v1/video_analysis_jobs?video_id=eq.${videoId}&select=id,status,provider`, { headers: serviceHeaders() });

  const video = videoRows[0];
  const enrichment = enrichmentRows[0];
  const submission = submissionRows[0];
  const job = jobRows[0];
  if (!enrichmentId && enrichment?.id) enrichmentId = enrichment.id;

  const checks = {
    categorySlug: video?.category?.slug || null,
    suggestedCategoryMatchesVideo: Boolean(enrichment?.suggested_category_id && video?.category_id === enrichment.suggested_category_id),
    summaryCreated: Boolean(enrichment?.summary_description && enrichment.summary_description.length > 30),
    semanticTags: enrichment?.semantic_tags || [],
    submissionStatus: submission?.status || null,
    jobStatus: job?.status || null,
    jobProvider: job?.provider || null,
  };

  if (!checks.categorySlug) throw new Error('Video category was not selected.');
  if (!checks.suggestedCategoryMatchesVideo) throw new Error('Suggested category does not match selected video category.');
  if (!checks.summaryCreated) throw new Error('Summary was not created.');
  if (checks.submissionStatus !== 'success') throw new Error(`Submission did not succeed: ${checks.submissionStatus}`);
  if (checks.jobStatus !== 'pending' || checks.jobProvider !== 'v2') throw new Error('Deep-analysis job was not queued.');

  console.log(JSON.stringify(checks, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
