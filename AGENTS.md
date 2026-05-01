# Tube O2 Agent Guide

This file is the fast-start guide for AI coding agents in this repository. Keep changes small, follow existing patterns, and prefer linking to docs over duplicating them.

## Quick Start

- Product: Tube O2 (https://tube.open2.tech)
- Company: Open 2 Technology (Open2 / O2T)
- Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Supabase, TanStack Query
- Architecture style: Feature-Sliced Design

Run from repository root:

| Goal | Command |
|---|---|
| Development | `pnpm dev` |
| Build | `pnpm build` |
| Analyze build | `pnpm build:analyze` |
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Tests | `pnpm test` |
| Coverage | `pnpm test:coverage` |

## Architecture Boundaries

Use these boundaries when deciding where code belongs:

- `src/entities/*`: domain types, query keys, and API functions
- `src/features/*`: feature logic, mostly query/mutation hooks and orchestration
- `src/components/*`: UI components by domain (`ui`, `video`, `comment`, etc.)
- `src/shared/*`: cross-domain utilities, validation, shared API clients, shared hooks
- `src/pages/*`: route-level pages
- `src/i18n/*`: localization setup and translation resources

Reference architecture details in [docs/CODEBASE.md](docs/CODEBASE.md).

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
- SSR preview server: [server/server.ts](server/server.ts)
- Supabase functions: [supabase/functions](supabase/functions)

## Branding Migration Notes

This repository is mid-transition:

- Old product/brand references: Monynha Fun, Monynha Softwares
- Current product/brand references: Tube O2, Open 2 Technology

When editing copy, metadata, URLs, docs, or SEO files, prefer:

- `tube.open2.tech` for the product
- `open2.tech` for corporate references

## Source Of Truth Docs

- Project overview: [README.md](README.md)
- Architecture and conventions: [docs/CODEBASE.md](docs/CODEBASE.md)
- Version history: [docs/CHANGELOG.md](docs/CHANGELOG.md)
- Work backlog and status notes: [docs/TODO.md](docs/TODO.md)
- React Router migration flags: [docs/REACT_ROUTER_V7_FLAGS.md](docs/REACT_ROUTER_V7_FLAGS.md)
- Team coding rules: [AI_RULES.md](AI_RULES.md)
