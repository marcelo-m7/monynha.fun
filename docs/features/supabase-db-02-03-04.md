# Supabase Contract: DB-02, DB-03, DB-04

This document records the local implementation contract for issues DB-02, DB-03, and DB-04.

## DB-02: Async Submit Status

- Status route identifier: `/submit/status/:id` must use `video_submissions.id`.
- Table: `public.video_submissions`.
- Frontend clients can insert and select only their own submissions via RLS.
- Workers run with the service role and update status as processing progresses.
- Status values are:
  - `pending`
  - `processing`
  - `success`
  - `failed`
  - `duplicate`
  - `recoverable_error`
- `metadata` is reserved for small worker/frontend coordination payloads such as `enrichmentId`, `detectedLanguage`, and assignment data.
- YouTube playlist imports also queue work in `video_submissions`; playlist-import metadata should include the source and YouTube playlist list id.

## YouTube Playlist Import Contract

- UI entrypoint: `src/components/playlist/PlaylistImportDialog.tsx`.
- Edge Function: `supabase/functions/import-youtube-playlist/index.ts`.
- Request payload uses snake_case:
  - `playlist_url`
  - `language`
  - `max_videos`
- The import function:
  - extracts the YouTube `list` parameter from public playlist/watch URLs,
  - upserts missing `videos` rows using fetched oEmbed metadata when available,
  - skips videos that already have enrichments,
  - reuses recent active submissions from the same user and playlist,
  - inserts new `pending` `video_submissions` rows for remaining videos.
- The frontend may call `enrich-video` for returned queued submissions with `{ videoId, youtubeUrl, submissionId }`.
- The import function must not require a client-provided Tube O2 playlist id; assignment remains part of enrichment/playlist-assignment logic.

## DB-03: Enrichment And Detected Language

- `videos.language` remains the canonical language for filters and listings.
- Submit can omit a manual language; new video rows default to `und` until enrichment detects a language.
- `ai_enrichments.language` stores the worker-detected language.
- On successful enrichment, `enrich-video` updates `videos.language` when a detected language is available.
- `v_video_exhibition` exposes:
  - `enrichment_language`
  - `detected_language`
  - `effective_language`

## DB-04: FACODI Eligibility

- FACODI eligibility v1 is `profiles.role in ('editor', 'admin')`.
- A playlist is considered FACODI/study content when:
  - `is_ordered = true`, or
  - `course_code` is filled, or
  - `unit_code` is filled.
- A database trigger blocks non-eligible users from creating or changing FACODI playlist fields even if a broader owner policy would otherwise allow the write.
- Existing general playlist flows remain valid when `is_ordered = false`, `course_code is null`, and `unit_code is null`.

## Local Validation Notes

Use the project Supabase migration flow before remote deployment. When the CLI is available, prefer `supabase migration up` locally and targeted Edge Function serving (`supabase functions serve <name> --env-file .env`) for runtime checks.
