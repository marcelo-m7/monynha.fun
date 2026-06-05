# Edge Functions Recovery

Tube O2 uses a fast, blocking-safe `enrich-video` function plus optional deep analysis tracked separately.

## Frontend-Invoked Functions

- `enrich-video`: fast required submit path. Must stay `legacy_fast`, must not import OpenAI or Gemini, and must deploy with JWT verification enabled.
- `import-youtube-playlist`: imports playlist videos and dispatches `enrich-video` for queued submissions.
- `send-contact-message`: contact form email flow.
- `send-editor-application-confirmation`: editor application confirmation email flow.

## Protected Functions

- Do not alter functions whose names start with `v2_` during legacy recovery.
- `v2_*` functions are reserved for optional deep analysis and catalog sync work.

## Required Commands

```bash
pnpm edge:functions:list
pnpm edge:deploy:enrich-video
pnpm edge:test:enrich-video
```

The deploy command expands to:

```bash
supabase functions deploy enrich-video \
  --project-ref wvkjainfwsyiyfcmbtid \
  --use-api \
  --yes
```

## Smoke Test

Unauthenticated smoke test should be rejected with 401/403 before processing starts:

```bash
curl -i -X POST https://wvkjainfwsyiyfcmbtid.supabase.co/functions/v1/enrich-video \
  -H 'Content-Type: application/json' \
  --data '{}'
```

Expected body includes an authentication error and no submission/video updates.

## Real Video Test

Run:

```bash
pnpm edge:test:enrich-video
```

Expected:

- Creates a temporary confirmed user.
- Inserts a temporary real YouTube video.
- Invokes `enrich-video`.
- Verifies `ai_enrichments`, automatic category, `video_submissions.status = success`, and a pending `video_analysis_jobs` row.
- Deletes all temporary data.

## Known Good Recovery

If a deploy accidentally reintroduces OpenAI/Gemini into `enrich-video`:

1. Restore `supabase/functions/enrich-video/index.ts` to the `legacy_fast` implementation.
2. Confirm `src/shared/test/enrich-video-contract.test.ts` passes.
3. Deploy only `enrich-video`; do not touch `v2_*`.
4. Run `pnpm edge:test:enrich-video`.
