import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VideoRow = { id: string; youtube_id: string };

type ImportBody = {
  playlist_url?: unknown;
  playlist_id?: unknown;
  language?: unknown;
  submitted_by_user_id?: unknown;
  max_videos?: unknown;
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
  return Number.isFinite(parsed) ? Math.max(1, Math.min(Math.trunc(parsed), 500)) : 200;
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const { user, error: authError } = await getAuthenticatedUser(req, supabaseUrl, anonKey);
  if (!user) return json({ error: "Unauthorized", details: authError }, 401);

  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const playlistUrl = typeof body.playlist_url === "string" ? body.playlist_url.trim() : "";
  const playlistId = typeof body.playlist_id === "string" ? body.playlist_id.trim() : "";
  const submittedBy = typeof body.submitted_by_user_id === "string" && isUuid(body.submitted_by_user_id)
    ? body.submitted_by_user_id
    : user.id;

  if (!playlistUrl) return json({ error: "playlist_url is required" }, 400);
  if (!playlistId || !isUuid(playlistId)) return json({ error: "playlist_id is required and must be a playlist UUID" }, 400);
  if (submittedBy !== user.id) return json({ error: "submitted_by_user_id must match the authenticated user" }, 403);

  const listParam = extractPlaylistListParam(playlistUrl);
  const canonicalUrl = normalizeYoutubePlaylistUrl(playlistUrl);
  if (!listParam || !canonicalUrl) return json({ error: "Invalid YouTube playlist_url" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id,author_id")
    .eq("id", playlistId)
    .single();
  if (playlistError || !playlist) return json({ error: "Playlist not found", details: playlistError?.message }, 404);

  const { data: collaborator } = await supabase
    .from("playlist_collaborators")
    .select("id")
    .eq("playlist_id", playlistId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (playlist.author_id !== user.id && !collaborator) {
    return json({ error: "Only the playlist owner or collaborators can import YouTube playlists" }, 403);
  }

  const htmlRes = await fetch(canonicalUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TubeO2PlaylistImporter/1.0)",
      "accept-language": "en-US,en;q=0.9,pt;q=0.8",
    },
  });
  if (!htmlRes.ok) return json({ error: "Failed to fetch YouTube playlist HTML", status: htmlRes.status, playlist_list: listParam }, 502);

  const html = await htmlRes.text();
  const uniqueIds = [...new Set(extractVideoIdsFromPlaylistHtml(html).filter((id) => id.length === 11))]
    .slice(0, parseLimit(body.max_videos));
  if (uniqueIds.length === 0) return json({ error: "No videos found in playlist HTML", playlist_list: listParam }, 404);

  const language = safeLanguage(body.language);
  const videoRowsToUpsert = uniqueIds.map((youtubeId) => ({
    youtube_id: youtubeId,
    title: youtubeId,
    description: null,
    channel_name: "YouTube",
    duration_seconds: null,
    thumbnail_url: thumbnailUrl(youtubeId),
    language,
    submitted_by: submittedBy,
    view_count: 0,
    is_featured: false,
  }));

  for (let i = 0; i < videoRowsToUpsert.length; i += 100) {
    const { error } = await supabase
      .from("videos")
      .upsert(videoRowsToUpsert.slice(i, i + 100), { onConflict: "youtube_id", ignoreDuplicates: false });
    if (error) return json({ error: "Failed upserting videos", details: error.message }, 500);
  }

  const { data: videoRows, error: videoRowsError } = await supabase
    .from("videos")
    .select("id,youtube_id")
    .in("youtube_id", uniqueIds);
  if (videoRowsError) return json({ error: "Failed fetching video ids", details: videoRowsError.message }, 500);

  const rows = (videoRows ?? []) as VideoRow[];
  const byYoutubeId = new Map(rows.map((row) => [row.youtube_id, row.id]));
  const videoIds = rows.map((row) => row.id);

  const { data: existing, error: existingError } = await supabase
    .from("playlist_videos")
    .select("video_id")
    .eq("playlist_id", playlistId)
    .in("video_id", videoIds);
  if (existingError) return json({ error: "Failed checking existing playlist_videos", details: existingError.message }, 500);

  const existingSet = new Set((existing ?? []).map((row: { video_id: string }) => row.video_id));
  const { data: lastPositionRows, error: lastPositionError } = await supabase
    .from("playlist_videos")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);
  if (lastPositionError) return json({ error: "Failed calculating playlist positions", details: lastPositionError.message }, 500);

  const startPosition = lastPositionRows && lastPositionRows.length > 0 ? Number(lastPositionRows[0].position ?? 0) + 1 : 0;
  const toAdd = uniqueIds
    .map((youtubeId, idx) => {
      const videoId = byYoutubeId.get(youtubeId);
      if (!videoId || existingSet.has(videoId)) return null;
      return { playlist_id: playlistId, video_id: videoId, position: startPosition + idx, added_by: submittedBy, notes: null };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  if (toAdd.length > 0) {
    const { error } = await supabase.from("playlist_videos").insert(toAdd);
    if (error) return json({ error: "Failed inserting playlist_videos", details: error.message }, 500);
  }

  const addedVideoIds = new Set(toAdd.map((row) => row.video_id));
  const addedYoutubeIds = uniqueIds.filter((youtubeId) => {
    const videoId = byYoutubeId.get(youtubeId);
    return videoId ? addedVideoIds.has(videoId) : false;
  });

  if (addedYoutubeIds.length > 0) {
    const submissions = addedYoutubeIds.map((youtubeId) => ({
      user_id: submittedBy,
      video_id: byYoutubeId.get(youtubeId) ?? null,
      youtube_id: youtubeId,
      youtube_url: watchUrl(youtubeId),
      status: "pending",
      metadata: { source: "youtube_playlist", playlist_id: playlistId, playlist_list: listParam, playlist_url: canonicalUrl },
      error_message: null,
      recoverable: false,
    }));
    const { data: insertedSubmissions, error: subErr } = await supabase
      .from("video_submissions")
      .insert(submissions)
      .select("id, video_id, youtube_id, youtube_url, status");
    if (subErr) return json({ error: "Failed inserting video_submissions", details: subErr.message }, 500);

    return json({
      playlist_id: playlistId,
      playlist_list: listParam,
      fetched_video_count: uniqueIds.length,
      existing_in_playlist_count: existingSet.size,
      added_to_playlist_count: toAdd.length,
      pipeline_enqueued_count: addedYoutubeIds.length,
      videos: addedYoutubeIds.map((youtubeId) => ({ youtube_id: youtubeId, video_id: byYoutubeId.get(youtubeId), youtube_url: watchUrl(youtubeId) })),
      submissions: insertedSubmissions ?? [],
    });
  }

  return json({
    playlist_id: playlistId,
    playlist_list: listParam,
    fetched_video_count: uniqueIds.length,
    existing_in_playlist_count: existingSet.size,
    added_to_playlist_count: toAdd.length,
    pipeline_enqueued_count: addedYoutubeIds.length,
    videos: addedYoutubeIds.map((youtubeId) => ({ youtube_id: youtubeId, video_id: byYoutubeId.get(youtubeId), youtube_url: watchUrl(youtubeId) })),
    submissions: [],
  });
});
