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

The Supabase CLI was not available in this environment, so migrations were authored locally and require application with the project Supabase migration flow before remote deployment.
