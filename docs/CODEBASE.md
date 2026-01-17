# Monynha Fun Codebase & Database Migrations Exploration

## Stack & Core Setup
- **Tech**: Vite + React 18 + TypeScript, Tailwind CSS (utilities only), shadcn/ui components, Lucide icons, TanStack Query (server state), React Hook Form + Zod (forms), Sonner (toasts), i18next (i18n).
- **Backend**: Supabase (Postgres, Auth, Edge Functions, RLS policies).
- **Build**: `npm run dev` (port 8080 or 3000), `npm run build`, `npm run lint`, `npm run test` (Vitest).
- **Vite alias**: `@` resolves to `src/`.

## Architecture: Feature-Sliced Design (FSD)

```
src/
├── entities/        # Domain models (video, playlist, profile, etc.)
│   └── {domain}/    # video.api.ts, video.keys.ts, video.types.ts
├── features/        # Feature-level logic by domain
│   └── {domain}/    # queries/, mutations/ with custom hooks
├── shared/          # Cross-cutting concerns
│   ├── api/         # Supabase client (src/shared/api/supabase/supabaseClient.ts)
│   ├── hooks/       # Utility hooks
│   ├── lib/         # youtube.ts, youtube.test.ts
│   └── config/      # Environment, i18n setup
├── pages/           # Route components (match App.tsx routes)
├── components/      # UI & domain-specific components
│   └── ui/          # shadcn/ui primitives
├── i18n/            # i18next config + locale/*.json
├── App.tsx          # Route definitions (keep custom routes above catch-all *)
└── main.tsx         # Entry point wrapped with AppProviders
```

**Key pattern**: Queries live in `src/features/{domain}/queries/useXxx.ts`, mutations in mutations/, API calls in `src/entities/{domain}/{domain}.api.ts`, query key factories in `{domain}.keys.ts`, types in `{domain}.types.ts`.

## Authentication & App Context
- `AuthProvider` in `src/features/auth/AuthProvider.tsx` wraps the app; `useAuth()` exposes `user`, `session`, `loading`, and methods `signUp/signIn/signOut`.
- Full provider stack in `src/app/providers/AppProviders.tsx`: I18next → QueryClient → Auth → Tooltip → Sonner.
- Always guard protected UI behind `user` or `!loading` checks; mutations use `useAuth()` to attach `user.id`.

## Data Fetching & Caching

**Pattern**: Query hooks in `src/features/{domain}/queries/` wrap entity API calls + TanStack Query, using stable queryKey factories from `src/entities/{domain}/{domain}.keys.ts`.

Examples:
- `useVideos(options)` → calls `listVideos()` from entity API, returns typed data
- `usePlaylists(options)` → includes `authorId`, filters by current user
- Mutations (`useCreatePlaylist`, `useUpdatePlaylist`) invalidate related queryKeys on success + show Sonner toast

**Key pattern**: On mutations, invalidate broad queryKeys (e.g., `playlistKeys.all`) to refetch dependent queries; pair with `toast.success('...')` / `toast.error('...')`.

## Database & RLS
- Tables: `videos`, `ai_enrichments`, `categories`, `favorites`, `playlists`, `playlist_videos`, `playlist_collaborators`, `playlist_progress`, `profiles`.
- RLS enabled on all; public reads for `videos`/`categories`, user-scoped access for user data.
- Atomic functions: `increment_video_view_count()`, `mark_top_videos_as_featured()`, auto-updated `updated_at` timestamps.
- Migrations in `supabase/migrations/*.sql`; use `mcp_supabase_apply_migration` for new schema changes.

## UI & Styling
- **Components**: Prioritize `shadcn/ui` from `src/components/ui/`; create small local components only if needed, matching shadcn patterns (don't modify upstream shadcn files).
- **Styling**: Tailwind utilities exclusively; use `cn()` from `src/shared/lib/utils.ts` to merge classes. No inline styles or CSS modules unless isolated + justified.
- **Icons**: `lucide-react`.
- **Responsive**: Tailwind breakpoints by default; test mobile first.

## Routing & Navigation
- Routes in `src/App.tsx`: `/`, `/auth`, `/submit`, `/videos/:videoId`, `/favorites`, `/community`, `/about`, `/rules`, `/contact`, `/faq`, `/playlists*`, `/profile/:username`, `/profile/edit`, catch-all `*`.
- **Important**: Add new custom routes above the `*` route to avoid shadowing them.

## i18n
- Config: `src/i18n/config.ts`; default language from `localStorage` (`pt` fallback).
- Translations: `src/i18n/locales/{lang}.json`.
- Usage: `const { t } = useTranslation()`, then add missing keys to locale files.

## YouTube Integration
- Helpers in `src/shared/lib/youtube.ts`: ID extraction, embed/watch URLs, thumbnails.
- Debounced oEmbed lookups for URL inputs (component pattern in `/submit` or video detail).

## Edge Functions
- Located in `supabase/functions/enrich-video/index.ts`, `mark-top-featured/index.ts`.
- Expect `Authorization: Bearer {token}` (verify_jwt currently disabled).
- Currently simulate enrichment → write to `ai_enrichments` table.

## Testing & Code Quality
- Unit tests co-located with code (e.g., `youtube.test.ts`, `queryKeys.test.ts`).
- Run with `npm run test:watch` (Vitest); coverage with `npm run test:coverage`.
- ESLint config in `eslint.config.js`; typecheck with `npm run typecheck`.

## Common Workflows
1. **Add a new data entity**: Create `src/entities/{domain}/{domain}.api.ts` (API calls), `.keys.ts` (queryKey factory), `.types.ts` (types). Then `src/features/{domain}/queries/useXxx.ts` for query hooks.
2. **Create a form**: Use `react-hook-form` + Zod schema; pair with `react-hook-form/resolvers`.
3. **Add a page**: Create `src/pages/NewPage.tsx`, add route in `src/App.tsx` above `*`, import components and hooks by domain.
4. **Migrate DB schema**: Write SQL in `supabase/migrations/`, apply with `mcp_supabase_apply_migration`.
5. **Debug failing query**: Check `src/entities/{domain}/{domain}.api.ts` (Supabase query), verify RLS policies, use `mcp_supabase_get_advisors('security')` for issues.
