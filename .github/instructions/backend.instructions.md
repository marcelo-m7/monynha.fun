---
description: "Use when editing Supabase Edge Functions, database migrations, Supabase shared helpers, or the Bun runtime metadata server."
name: "Supabase Backend Rules"
applyTo: "{supabase/**/*,server/**/*.ts,src/shared/api/supabase/**/*.ts}"
---
# Supabase Backend Rules

- The current backend is Supabase/Postgres plus Edge Functions in [supabase/functions](../../supabase/functions). There is no active `backend/` FastAPI service in this repository.
- Keep database changes in [supabase/migrations](../../supabase/migrations). Create migration filenames with `supabase migration new <name>` instead of inventing timestamp names by hand.
- Check Supabase CLI help before relying on flags: `supabase --help`, `supabase functions --help`, and `supabase migration --help`.
- Keep service-role access server-side only. Frontend code must not receive `SUPABASE_SERVICE_ROLE_KEY` or any non-`VITE_*` secret.
- Edge Functions should validate method, CORS, auth, and JSON payloads explicitly before privileged work.
- When an Edge Function needs the authenticated user, validate the bearer token with an anon-key Supabase client, then use a service-role client only for server-side writes that require it.
- Frontend callers must go through [src/shared/api/supabase/edgeFunctions.ts](../../src/shared/api/supabase/edgeFunctions.ts), not `supabase.functions.invoke` directly.
- Keep `video_submissions` as the async processing source of truth. `/submit/status/:id` uses `video_submissions.id`.
- `import-youtube-playlist` queues pending `video_submissions`; the frontend import dialog may dispatch `enrich-video` for returned submissions, but `enrich-video` owns enrichment status updates and playlist assignment metadata.
- Keep shared Edge Function helpers in [supabase/functions/_shared](../../supabase/functions/_shared) when behavior is reused across functions.
- When changing Edge Function env requirements, update [.env.example](../../.env.example), [README.md](../../README.md), and any relevant docs under [docs/features](../../docs/features).
- Validate with targeted frontend tests when callers change, `pnpm typecheck`, and local `supabase functions serve <function-name> --env-file .env` when the Supabase CLI is available.
