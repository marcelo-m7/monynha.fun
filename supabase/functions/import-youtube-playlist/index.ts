import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { errorResponse, jsonResponse, optionsResponse } from "../_shared/http.ts";
import { checkEdgeRateLimit } from "../_shared/rate-limit.ts";

const IMPORT_RATE_LIMIT_WINDOWS = [
  { windowSeconds: 60 * 60, maxRequests: 2 },
  { windowSeconds: 24 * 60 * 60, maxRequests: 10 },
];

type VideoRow = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  channel_name: string;
  thumbnail_url: string;
};

type ImportBody = {
  playlist_url?: unknown;
  language?: unknown;
  max_videos?: unknown;
};

type SubmissionRow = {
  id: string;
  video_id: string | null;
  youtube_id: string;
  youtube_url: string;
  status: string;
  metadata: Record<string, unknown> | null;
  updated_at?: string;
  created_at?: string;
};

type ImportResultStatus = "queued" | "already_queued" | "skipped_existing_enriched";

type ImportResult = {
  youtube_id: string;
  video_id: string | null;
  youtube_url: string;
  status: ImportResultStatus;
  submission_id: string | null;
};

type YouTubeOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

type VideoMetadata = {
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
};

function extractPlaylistListParam(inputUrl: string): string | null {
  try {
    return new URL(inputUrl).searchParams.get("list");
  } catch {
    return null;
  }
}

function normalizeYoutubePlaylistUrl(inputUrl: string): string | null {
  const list = extractPlaylistListParam(inputUrl);
  return list ? `https://www.youtube.com/playlist?list=${encodeURIComponent(list)}` : null;
}

function extractVideoIdsFromPlaylistHtml(html: string): string[] {
  const ids = new Set<string>();
  const patterns = [
    /\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g,
    /"videoId"\s*,\s*"([a-zA-Z0-9_-]{11})"/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) ids.add(match[1]);
  }

  return [...ids];
}

function parseLimit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(Math.trunc(parsed), 100)) : 50;
}

function safeLanguage(value: unknown) {
  return typeof value === "string" && value.trim().length >= 2
    ? value.trim().slice(0, 12).toLowerCase()
    : "und";
}

function watchUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
}

function thumbnailUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
}

function fallbackMetadata(youtubeId: string): VideoMetadata {
  return {
    youtubeId,
    title: youtubeId,
    channelName: "YouTube",
    thumbnailUrl: thumbnailUrl(youtubeId),
  };
}

function shouldRefreshVideoMetadata(video: Pick<VideoRow, "youtube_id" | "title" | "channel_name" | "description">) {
  return video.title === video.youtube_id || (video.channel_name === "YouTube" && !video.description);
}

async function fetchVideoMetadata(youtubeId: string): Promise<VideoMetadata> {
  const fallback = fallbackMetadata(youtubeId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(youtubeId))}`,
      {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TubeO2PlaylistImporter/1.0)",
          "accept-language": "en-US,en;q=0.9,pt;q=0.8",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) return fallback;

    const payload = await response.json().catch(() => null) as YouTubeOEmbedResponse | null;
    return {
      youtubeId,
      title: typeof payload?.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 300) : fallback.title,
      channelName: typeof payload?.author_name === "string" && payload.author_name.trim() ? payload.author_name.trim().slice(0, 200) : fallback.channelName,
      thumbnailUrl: typeof payload?.thumbnail_url === "string" && payload.thumbnail_url.trim() ? payload.thumbnail_url.trim() : fallback.thumbnailUrl,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }));

  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameImportSubmission(submission: SubmissionRow, listParam: string) {
  const metadata = isRecord(submission.metadata) ? submission.metadata : {};
  const source = metadata.source;
  const playlistList = metadata.youtube_playlist_list ?? metadata.playlist_list;

  return (
    (source === "youtube_playlist_import" || source === "youtube_playlist_import_repair" || source === "youtube_playlist") &&
    playlistList === listParam
  );
}

function isRecentActiveSubmission(submission: SubmissionRow) {
  const timestamp = submission.updated_at ?? submission.created_at;
  if (!timestamp) return true;

  const ageMs = Date.now() - new Date(timestamp).getTime();
  return Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000;
}

async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, error: "Missing authorization header" };

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, error: error?.message ?? "Invalid token" };
  return { user: data.user, error: null };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return optionsResponse(req);
  if (req.method !== "POST") return errorResponse(req, 405, "METHOD_NOT_ALLOWED", "Method not allowed", { requestId });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return errorResponse(req, 500, "MISSING_SUPABASE_ENV", "Missing Supabase environment variables", { requestId });
  }

  const { user, error: authError } = await getAuthenticatedUser(req, supabaseUrl, anonKey);
  if (!user) {
    if (authError) console.warn(`[import-youtube-playlist] ${requestId} auth failed: ${authError}`);
    return errorResponse(req, 401, "UNAUTHORIZED", "Invalid or expired authorization token", { requestId });
  }

  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, 400, "INVALID_JSON", "Invalid JSON body", { requestId });
  }

  const playlistUrl = typeof body.playlist_url === "string" ? body.playlist_url.trim() : "";
  if (!playlistUrl) return errorResponse(req, 400, "INVALID_PAYLOAD", "playlist_url is required", { requestId });

  const listParam = extractPlaylistListParam(playlistUrl);
  const canonicalUrl = normalizeYoutubePlaylistUrl(playlistUrl);
  if (!listParam || !canonicalUrl) {
    return errorResponse(req, 400, "INVALID_PLAYLIST_URL", "Invalid YouTube playlist_url", { requestId });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const rateLimit = await checkEdgeRateLimit(supabase, {
      functionName: "import-youtube-playlist",
      userId: user.id,
      windows: IMPORT_RATE_LIMIT_WINDOWS,
    });

    if (!rateLimit.allowed) {
      return errorResponse(req, 429, "RATE_LIMITED", "Too many playlist imports. Try again later.", {
        requestId,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }
  } catch (error) {
    console.error(`[import-youtube-playlist] ${requestId} rate-limit check failed: ${error instanceof Error ? error.message : "unknown"}`);
    return errorResponse(req, 500, "RATE_LIMIT_CHECK_FAILED", "Could not start playlist import", { requestId });
  }

  const htmlRes = await fetch(canonicalUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TubeO2PlaylistImporter/1.0)",
      "accept-language": "en-US,en;q=0.9,pt;q=0.8",
    },
  });
  if (!htmlRes.ok) {
    console.warn(`[import-youtube-playlist] ${requestId} YouTube playlist fetch failed: ${htmlRes.status}`);
    return errorResponse(req, 502, "YOUTUBE_PLAYLIST_FETCH_FAILED", "Could not fetch YouTube playlist", { requestId });
  }

  const html = await htmlRes.text();
  const uniqueIds = [...new Set(extractVideoIdsFromPlaylistHtml(html).filter((id) => id.length === 11))]
    .slice(0, parseLimit(body.max_videos));
  if (uniqueIds.length === 0) {
    return errorResponse(req, 404, "NO_PLAYLIST_VIDEOS_FOUND", "No videos found in playlist", { requestId });
  }

  const language = safeLanguage(body.language);
  const metadataRows = await mapWithConcurrency(uniqueIds, 6, fetchVideoMetadata);
  const metadataByYoutubeId = new Map(metadataRows.map((metadata) => [metadata.youtubeId, metadata]));
  const videoRowsToUpsert = uniqueIds.map((youtubeId) => ({
    youtube_id: youtubeId,
    title: metadataByYoutubeId.get(youtubeId)?.title ?? youtubeId,
    description: null,
    channel_name: metadataByYoutubeId.get(youtubeId)?.channelName ?? "YouTube",
    duration_seconds: null,
    thumbnail_url: metadataByYoutubeId.get(youtubeId)?.thumbnailUrl ?? thumbnailUrl(youtubeId),
    language,
    submitted_by: user.id,
    view_count: 0,
    is_featured: false,
  }));

  for (let i = 0; i < videoRowsToUpsert.length; i += 100) {
    const { error } = await supabase
      .from("videos")
      .upsert(videoRowsToUpsert.slice(i, i + 100), { onConflict: "youtube_id", ignoreDuplicates: true });
    if (error) {
      console.error(`[import-youtube-playlist] ${requestId} video upsert failed: ${error.message}`);
      return errorResponse(req, 500, "VIDEO_UPSERT_FAILED", "Could not import playlist videos", { requestId });
    }
  }

  const { data: videoRows, error: videoRowsError } = await supabase
    .from("videos")
    .select("id,youtube_id,title,description,channel_name,thumbnail_url")
    .in("youtube_id", uniqueIds);
  if (videoRowsError) {
    console.error(`[import-youtube-playlist] ${requestId} video id lookup failed: ${videoRowsError.message}`);
    return errorResponse(req, 500, "VIDEO_LOOKUP_FAILED", "Could not import playlist videos", { requestId });
  }

  const rows = (videoRows ?? []) as VideoRow[];

  const metadataRefreshRows = rows
    .filter(shouldRefreshVideoMetadata)
    .map((row) => {
      const metadata = metadataByYoutubeId.get(row.youtube_id);
      if (!metadata || metadata.title === row.youtube_id) return null;
      return {
        id: row.id,
        title: metadata.title,
        channel_name: metadata.channelName,
        thumbnail_url: metadata.thumbnailUrl,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  for (const row of metadataRefreshRows) {
    const { error } = await supabase
      .from("videos")
      .update({
        title: row.title,
        channel_name: row.channel_name,
        thumbnail_url: row.thumbnail_url,
      })
      .eq("id", row.id);
    if (error) {
      console.error(`[import-youtube-playlist] ${requestId} metadata refresh failed: ${error.message}`);
      return errorResponse(req, 500, "VIDEO_METADATA_REFRESH_FAILED", "Could not refresh video metadata", { requestId });
    }
  }

  const byYoutubeId = new Map(rows.map((row) => [row.youtube_id, row.id]));
  const videoIds = rows.map((row) => row.id);

  const { data: enrichments, error: enrichmentsError } = await supabase
    .from("ai_enrichments")
    .select("video_id")
    .in("video_id", videoIds);
  if (enrichmentsError) {
    console.error(`[import-youtube-playlist] ${requestId} enrichment lookup failed: ${enrichmentsError.message}`);
    return errorResponse(req, 500, "ENRICHMENT_LOOKUP_FAILED", "Could not import playlist videos", { requestId });
  }

  const enrichedVideoIds = new Set((enrichments ?? []).map((row: { video_id: string }) => row.video_id));

  const { data: existingSubmissions, error: existingSubmissionsError } = await supabase
    .from("video_submissions")
    .select("id, video_id, youtube_id, youtube_url, status, metadata, created_at, updated_at")
    .eq("user_id", user.id)
    .in("youtube_id", uniqueIds)
    .in("status", ["pending", "processing", "recoverable_error"]);
  if (existingSubmissionsError) {
    console.error(`[import-youtube-playlist] ${requestId} submission lookup failed: ${existingSubmissionsError.message}`);
    return errorResponse(req, 500, "SUBMISSION_LOOKUP_FAILED", "Could not import playlist videos", { requestId });
  }

  const existingImportSubmissionByYoutubeId = new Map<string, SubmissionRow>();
  for (const submission of (existingSubmissions ?? []) as SubmissionRow[]) {
    if (!isSameImportSubmission(submission, listParam)) continue;
    if (!isRecentActiveSubmission(submission)) continue;
    if (!existingImportSubmissionByYoutubeId.has(submission.youtube_id)) {
      existingImportSubmissionByYoutubeId.set(submission.youtube_id, submission);
    }
  }

  const results: ImportResult[] = [];
  const youtubeIdsToQueue: string[] = [];

  for (const youtubeId of uniqueIds) {
    const videoId = byYoutubeId.get(youtubeId) ?? null;
    const youtubeUrl = watchUrl(youtubeId);

    if (videoId && enrichedVideoIds.has(videoId)) {
      results.push({ youtube_id: youtubeId, video_id: videoId, youtube_url: youtubeUrl, status: "skipped_existing_enriched", submission_id: null });
      continue;
    }

    const existingSubmission = existingImportSubmissionByYoutubeId.get(youtubeId);
    if (existingSubmission) {
      results.push({
        youtube_id: youtubeId,
        video_id: existingSubmission.video_id ?? videoId,
        youtube_url: existingSubmission.youtube_url || youtubeUrl,
        status: "already_queued",
        submission_id: existingSubmission.id,
      });
      continue;
    }

    youtubeIdsToQueue.push(youtubeId);
  }

  let insertedSubmissions: Array<Pick<SubmissionRow, "id" | "video_id" | "youtube_id" | "youtube_url" | "status">> = [];

  if (youtubeIdsToQueue.length > 0) {
    const importedAt = new Date().toISOString();
    const submissions = youtubeIdsToQueue.map((youtubeId) => ({
      user_id: user.id,
      video_id: byYoutubeId.get(youtubeId) ?? null,
      youtube_id: youtubeId,
      youtube_url: watchUrl(youtubeId),
      status: "pending",
      metadata: {
        source: "youtube_playlist_import",
        youtube_playlist_list: listParam,
        youtube_playlist_url: canonicalUrl,
        imported_at: importedAt,
      },
      error_message: null,
      recoverable: false,
    }));

    const { data: insertedSubmissionRows, error: subErr } = await supabase
      .from("video_submissions")
      .insert(submissions)
      .select("id, video_id, youtube_id, youtube_url, status");
    if (subErr) {
      console.error(`[import-youtube-playlist] ${requestId} submission insert failed: ${subErr.message}`);
      return errorResponse(req, 500, "SUBMISSION_INSERT_FAILED", "Could not queue playlist videos", { requestId });
    }

    insertedSubmissions = insertedSubmissionRows ?? [];
    for (const submission of insertedSubmissions) {
      results.push({
        youtube_id: submission.youtube_id,
        video_id: submission.video_id,
        youtube_url: submission.youtube_url,
        status: "queued",
        submission_id: submission.id,
      });
    }
  }

  const queuedSubmissions = insertedSubmissions.map((submission) => ({
    id: submission.id,
    video_id: submission.video_id,
    youtube_url: submission.youtube_url,
    status: submission.status,
  }));

  return jsonResponse(req, {
    playlist_list: listParam,
    youtube_playlist_url: canonicalUrl,
    requestId,
    fetched_video_count: uniqueIds.length,
    created_video_count: rows.length,
    skipped_existing_enriched_count: results.filter((result) => result.status === "skipped_existing_enriched").length,
    already_queued_count: results.filter((result) => result.status === "already_queued").length,
    created_submission_count: queuedSubmissions.length,
    pipeline_enqueued_count: queuedSubmissions.length,
    videos: results.map((result) => ({
      youtube_id: result.youtube_id,
      video_id: result.video_id,
      youtube_url: result.youtube_url,
      import_status: result.status,
      submission_id: result.submission_id,
    })),
    submissions: queuedSubmissions,
  });
});
