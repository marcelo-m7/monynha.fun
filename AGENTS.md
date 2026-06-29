# Tube O2 Agent Guide

This file is the fast-start guide for AI coding agents in this repository. Keep changes small, follow existing patterns, and prefer linking to docs over duplicating them.

## Fast Facts

- Product: Tube O2, the cultural video curation platform.
- Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase, TanStack Query.
- Package manager: Bun only (`bun install`, `bun run <script>`, `bunx <tool>`).
- Work from the repository root: [README.md](README.md).
- Source of truth: [README.md](README.md), [AI_RULES.md](AI_RULES.md), and the scoped rules in [.github/instructions](.github/instructions).
- Supabase project ref: `wvkjainfwsyiyfcmbtid`.

## Quick Start

- Product: Tube O2 (https://tube.open2.tech)
- Company: Open 2 Technology (Open2 / O2T)
- Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase, TanStack Query
- Architecture style: Feature-Sliced Design

Run from repository root:

| Goal | Command |
|---|---|
| Development | `bun run dev` |
| Build | `bun run build` |
| Analyze build | `bun run build:analyze` |
| Lint | `bun run lint` |
| Type check | `bun run typecheck` |
| Tests | `bun run test` |
| Coverage | `bun run test:coverage` |
| E2E tests | `bun run test:e2e` |

- Prefer targeted checks on the touched slice before broad test runs.
- Use `bun run dev` for UI verification and `bun run build` before final handoff.
- Keep `bun.lock` as the only dependency lockfile. Do not reintroduce pnpm, npm, or Yarn lock/workspace files.

Supabase/backend commands:

| Goal | Command |
|---|---|
| Discover Supabase CLI commands | `supabase --help` |
| Serve an Edge Function locally | `supabase functions serve <function-name> --env-file .env` |
| Create a migration | `supabase migration new <descriptive-name>` |
| Apply local migrations | `supabase migration up` |
| Push Supabase config | `bunx supabase config push --project-ref wvkjainfwsyiyfcmbtid` |

Never run `supabase config push --yes` for this project. Inspect every prompt and accept only the intended diff. Local [supabase/config.toml](supabase/config.toml) must preserve remote API schemas/search paths, Auth URLs/redirects/MFA/email settings, and Storage settings before pushing template changes.

There is currently no `backend/` FastAPI service in this tree. Backend work lives in [supabase/functions](supabase/functions), [supabase/migrations](supabase/migrations), and the Bun SSR preview server in [server/server.ts](server/server.ts).

## Runtime & Ports

- Frontend dev server runs on port `8080` (see [vite.config.ts](vite.config.ts)).
- SSR preview server runs on port `3000` by default (see [server/server.ts](server/server.ts)); override with `PORT`.
- Production preview flow: run `bun run build` then `bun run preview`.
- Cloudflare static SPA deploys use [wrangler.jsonc](wrangler.jsonc), `dist/`, and SPA fallback. Docker/Bun server deploys are required for dynamic OG/Twitter injection.
- Supabase Edge Functions run through the Supabase CLI. Check `supabase functions --help` before assuming command flags.

## Test Runner Notes

- Tests use Vitest + jsdom with shared setup in [src/shared/test/setup.ts](src/shared/test/setup.ts).
- Use `bun run test -- <pattern>` for targeted tests.
- Do **not** use Jest-style `--testPathPattern` with Vitest in this repo.
- Networked frontend tests should follow MSW patterns in [src/shared/test/mswHandlers.ts](src/shared/test/mswHandlers.ts).

## Instruction Files

- Frontend code rules: [.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md)
- Supabase/backend code rules: [.github/instructions/backend.instructions.md](.github/instructions/backend.instructions.md)
- Docs, branding, and SEO rules: [.github/instructions/content-seo.instructions.md](.github/instructions/content-seo.instructions.md)
- i18n rules (keep locales aligned): [.github/instructions/i18n.instructions.md](.github/instructions/i18n.instructions.md)
- Test rules: [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md)

## Architecture Boundaries

Use these boundaries when deciding where code belongs:

- `src/entities/*`: domain types, query keys, and API functions
- `src/features/*`: feature logic, mostly query/mutation hooks and orchestration
- `src/components/*`: UI components by domain (`ui`, `video`, `comment`, etc.)
- `src/shared/*`: cross-domain utilities, validation, shared API clients, shared hooks
- `src/pages/*`: route-level pages
- `src/i18n/*`: localization setup and translation resources
- `supabase/functions/*`: Supabase Edge Functions and shared Deno helpers
- `supabase/migrations/*`: Postgres schema, RLS, functions, triggers, and data fixes
- `server/*`: Bun runtime server for serving `dist/` and injecting dynamic OG/Twitter tags

## Frontend Guardrails

- Keep UI components provider-agnostic; put data access in entity/API modules and orchestration in features.
- Reuse shared validation from [src/shared/lib/validation.ts](src/shared/lib/validation.ts) instead of redefining schemas.
- Keep locale files aligned when adding user-facing strings.
- Avoid creating extra Supabase clients; use the shared client in [src/shared/api/supabase/supabaseClient.ts](src/shared/api/supabase/supabaseClient.ts).
- Do not reintroduce legacy local catalog mock fallbacks.
- Preserve the current brand direction: Tube O2 / Open 2 Technology, not the old Monynha naming.

## Supabase Operational Guardrails

- Treat [supabase/config.toml](supabase/config.toml) as deployment-as-code for hosted Supabase settings, including Auth email templates under [supabase/email-templates](supabase/email-templates).
- Push config with `bunx supabase config push --project-ref wvkjainfwsyiyfcmbtid` and confirm the CLI diff before answering prompts.
- Keep `api.schemas` and `api.extra_search_path` aligned with the remote project, including the `facodi` schema.
- Keep production Auth settings intact: `site_url`, redirect URLs, manual linking, MFA TOTP, email confirmations, and OTP length.
- Edge Functions that are user-triggered should keep `verify_jwt = true`, use shared CORS/JSON helpers from [supabase/functions/_shared/http.ts](supabase/functions/_shared/http.ts), and apply shared rate limiting after auth but before expensive work.
- Do not use wildcard CORS on deployed functions unless the task explicitly calls for a public unauthenticated endpoint.
- In Vitest, avoid opening Supabase realtime sockets. Guard realtime hooks with `import.meta.env.MODE === 'test'` or mock the client.

## Non-Negotiable Conventions

### 1. Validation Is Centralized (DRY)

- Always reuse schemas from [src/shared/lib/validation.ts](src/shared/lib/validation.ts).
- Do not redefine email/password/username validators in feature or component files.
- Prefer these exports: `emailSchema`, `passwordSchema`, `usernameSchema`, `createPasswordConfirmationSchema`.

### 2. Server State Uses TanStack Query

- Do not fetch server data directly inside components.
- Keep query/mutation hooks in `src/features/*/queries`.
- Use domain query-key factories from `src/entities/*/*.keys.ts`.
- Keep key behavior covered by [src/entities/queryKeys.test.ts](src/entities/queryKeys.test.ts).

### 3. API Calls Live In Entities

- Put Supabase access in `src/entities/[domain]/[domain].api.ts`.
- Import Supabase via [src/shared/api/supabase/supabaseClient.ts](src/shared/api/supabase/supabaseClient.ts).
- Select relations up front to avoid avoidable follow-up queries.
- Throw or handle errors explicitly.
- Use `getSupabaseErrorMessage()` from [src/shared/api/supabase/supabaseErrors.ts](src/shared/api/supabase/supabaseErrors.ts) to extract readable error strings.
- Invoke Supabase Edge Functions via `invokeEdgeFunction()` from [src/shared/api/supabase/edgeFunctions.ts](src/shared/api/supabase/edgeFunctions.ts) — do not call `supabase.functions.invoke` directly.
- Keep service-role operations inside Edge Functions or server-only runtime code. Never expose service-role keys through `VITE_*` variables.

### 4. UI And Styling Standards

- Prefer shadcn/ui primitives before creating custom UI.
- Use Tailwind utilities for styling.
- Use `cn()` from [src/lib/utils.ts](src/lib/utils.ts) for class composition.
- Avoid editing generated shadcn primitives directly unless the task explicitly requires it.

> **`src/lib/` vs `src/shared/lib/`**: `src/lib/utils.ts` is the shadcn/ui convention file (only `cn()`). All other shared utilities (format, image, slug, youtube, validation) live in `src/shared/lib/`. Never add business logic to `src/lib/`.

### 5. Forms

- Use React Hook Form + Zod together.
- Reuse shared schemas from [src/shared/lib/validation.ts](src/shared/lib/validation.ts).

### 6. Localization

- Do not hard-code user-facing strings.
- Use i18n keys and update locale resources in [src/i18n/locales](src/i18n/locales).
- Keep locale files aligned (pt, en, es, fr) when adding or changing translation keys.

### 7. Imports

- Use alias imports with `@/`.
- Avoid deep relative import chains like `../../../`.

## Common Pitfalls

- Duplicating validation logic instead of reusing shared schemas.
- Fetching data directly in pages/components instead of using feature query hooks.
- Adding custom CSS when Tailwind utilities are sufficient.
- Forgetting to invalidate related queries after successful mutations.
- Writing mutable or unstable query keys instead of using key factories.
- Bypassing access constraints in mutations instead of respecting RLS-compatible patterns.
- Putting business logic utilities in `src/lib/` instead of `src/shared/lib/`.
- Calling `supabase.functions.invoke` directly instead of using `invokeEdgeFunction()`.
- Running `supabase config push --yes` and accidentally overwriting production settings.
- Updating one locale file but leaving other locales missing the same key.
- Running `bun run test -- --testPathPattern=...` (unsupported by Vitest in this repo).

## Adding New Pages

All routes are lazy-loaded. When creating a new page:
1. Add the component in `src/pages/`.
2. Register with `React.lazy()` at the top of [src/App.tsx](src/App.tsx).
3. Add the `<Route>` inside the existing `<Routes>` block.
4. Add i18n keys for any new navigation labels.

## Providers

All global context providers (QueryClient, Auth, i18n, ThemeProvider, Helmet, Toasts) are in [src/app/providers/AppProviders.tsx](src/app/providers/AppProviders.tsx). Add new providers there, not in `main.tsx` or component files.

## Key Files For Pattern Discovery

- Router: [src/App.tsx](src/App.tsx)
- Shared validation: [src/shared/lib/validation.ts](src/shared/lib/validation.ts)
- Query-key behavior: [src/entities/queryKeys.test.ts](src/entities/queryKeys.test.ts)
- API pattern: [src/entities/video/video.api.ts](src/entities/video/video.api.ts)
- Form pattern: [src/components/comment/CommentForm.tsx](src/components/comment/CommentForm.tsx)
- Mention UX pattern: [src/components/comment/MentionAutocomplete.tsx](src/components/comment/MentionAutocomplete.tsx)
- YouTube playlist import UI: [src/components/playlist/PlaylistImportDialog.tsx](src/components/playlist/PlaylistImportDialog.tsx) and [src/pages/PlaylistImportProgress.tsx](src/pages/PlaylistImportProgress.tsx)
- Async submission status API: [src/entities/video_submission/video_submission.api.ts](src/entities/video_submission/video_submission.api.ts)
- SSR preview server: [server/server.ts](server/server.ts)
- Supabase functions: [supabase/functions](supabase/functions), especially [supabase/functions/enrich-video/index.ts](supabase/functions/enrich-video/index.ts) and [supabase/functions/import-youtube-playlist/index.ts](supabase/functions/import-youtube-playlist/index.ts)
- Supabase project config and Auth templates: [supabase/config.toml](supabase/config.toml) and [supabase/email-templates](supabase/email-templates)

## Generated Artifacts

- Do not edit [dist](dist) by hand; it is build output.
- The default social preview used by metadata is [public/social-preview-default.png](public/social-preview-default.png). Keep [public/placeholder.png](public/placeholder.png) for generic documentation or fallback usage unless you intentionally update the metadata layer too.

## Where To Look First

- Router and page registration: [src/App.tsx](src/App.tsx)
- Shared validation: [src/shared/lib/validation.ts](src/shared/lib/validation.ts)
- Query key behavior: [src/entities/queryKeys.test.ts](src/entities/queryKeys.test.ts)
- API pattern example: [src/entities/video/video.api.ts](src/entities/video/video.api.ts)
- Form pattern example: [src/components/comment/CommentForm.tsx](src/components/comment/CommentForm.tsx)
- Frontend-specific rules: [.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md)

If a task touches a file covered by an `applyTo` instruction, follow that instruction file as authoritative.

## Branding Migration Notes

This repository is mid-transition:

- Old product/brand references: Monynha Fun, Monynha Softwares
- Current product/brand references: Tube O2, Open 2 Technology

When editing copy, metadata, URLs, docs, or SEO files, prefer:

- `tube.open2.tech` for the product
- `open2.tech` for corporate references

## Source Of Truth Docs

- Project overview: [README.md](README.md)
- Frontend architecture and file-placement rules: [.github/instructions/frontend.instructions.md](.github/instructions/frontend.instructions.md)
- Backend and Supabase rules: [.github/instructions/backend.instructions.md](.github/instructions/backend.instructions.md)
- Docs, branding, and SEO rules: [.github/instructions/content-seo.instructions.md](.github/instructions/content-seo.instructions.md)
- Testing rules: [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md)
- Design direction: [docs/visual-elevation.md](docs/visual-elevation.md)
- Team coding rules: [AI_RULES.md](AI_RULES.md)

## Instruction Maintenance

- Use `/chronicle improve` to refine [AGENTS.md](AGENTS.md) or scoped instructions only after session summaries exist and a pattern has repeated.
- If chronicle history is empty, keep guidance lean and prefer local code/doc evidence over speculative workflow rules.
