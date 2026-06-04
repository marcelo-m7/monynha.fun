# Tube O2 Backlog & Status Notes

Updated: May 17, 2026

Use this file for lightweight repository status. Detailed architecture lives in `docs/CODEBASE.md`; release history lives in `docs/CHANGELOG.md`.

## Current Baseline

- Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query.
- Backend: Supabase Postgres/Auth/Edge Functions plus Bun runtime server for production metadata injection.
- Async processing: manual submissions and YouTube playlist imports use `public.video_submissions`.
- Social preview fallback image: `public/placeholder.png`.
- Generated output: `dist/` should not be edited by hand.

## Recently Aligned

- Documentation and agent instructions now point to Supabase Edge Functions instead of the removed FastAPI backend.
- `docs/features/supabase-db-02-03-04.md` records the async submission and YouTube playlist import contracts.
- `docs/features/odoo-elearning-playlist-sync.md` is marked as a historical design note.
- Generic social preview image has been refreshed for Tube O2 branding.

## Near-Term Tasks

- Run the full quality suite before release: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Add/expand tests around `import-youtube-playlist` behavior if Edge Function test harness coverage grows.
- Regenerate Supabase TypeScript types after any schema changes.
- Review social preview rendering on deployed pages after cache/CDN invalidation.

## Product Backlog

- Batch enrichment/reprocessing for existing videos.
- Full-text search across titles, descriptions, transcripts, and semantic tags.
- Privacy-conscious analytics for videos, playlists, and creator/editor activity.
- More resilient playlist import UX for very large or partially unavailable YouTube playlists.
- PWA/offline polish and better install affordances.
- Continued accessibility work toward WCAG 2.1 AA.

## Release Checklist

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Verify `public/placeholder.png` is used by `index.html` OG/Twitter tags.
- [ ] Verify `/videos/:id` dynamic metadata still falls back to `https://tube.open2.tech/placeholder.png` when a video has no thumbnail.
