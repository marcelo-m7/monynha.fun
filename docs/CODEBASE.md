# Codebase Architecture & Boundaries

This document describes the architectural organization of Tube O2 and the conventions that guide where code belongs.

**For quick start commands and tech stack details, see [AGENTS.md](../AGENTS.md) and [README.md](../README.md).**

---

## Architecture Boundaries

Use these boundaries when deciding where code belongs:

### Frontend Structure

```
src/
├── entities/          # Domain types, query keys, and API functions
├── features/          # Feature logic, query/mutation hooks, orchestration
├── components/        # UI components by domain (ui, video, comment, etc.)
├── shared/           # Cross-domain utilities, validation, API clients, hooks
├── pages/            # Route-level pages (lazy-loaded)
├── i18n/             # Localization setup and translation resources
├── lib/              # Utility functions (minimal; mostly shadcn/ui utils)
└── app/              # Global providers and app initialization
```

### Backend & Infrastructure

```
supabase/
├── functions/        # Supabase Edge Functions and shared Deno helpers
├── migrations/       # Postgres schema, RLS, functions, triggers, data fixes
├── config.toml       # Hosted Supabase settings (Auth, Storage, API config)
└── email-templates/  # Auth email templates

server/
└── server.ts         # Bun runtime SSR server for serving dist/ and OG/Twitter tags
```

---

## Module Responsibilities

### `src/entities/[domain]/`

Domain-focused modules. Responsibilities:

- **Domain types**: TypeScript interfaces and types for the domain
- **Query keys**: TanStack Query key factories (`[domain].keys.ts`)
- **API functions**: Direct Supabase calls (`[domain].api.ts`)
  - Select relations up front (avoid N+1 queries)
  - Throw or handle errors explicitly
  - Use `getSupabaseErrorMessage()` for readable errors
  - Invoke Edge Functions via `invokeEdgeFunction()` helper

**Example files:**
- `src/entities/video/video.api.ts` — Fetch video, list videos, etc.
- `src/entities/video/video.keys.ts` — Query key factories
- `src/entities/video/video.types.ts` — Video domain types

### `src/features/[domain]/`

Feature-level orchestration. Responsibilities:

- **Query/mutation hooks**: Feature-specific uses of entity API (via TanStack Query)
- **State orchestration**: Multi-entity state coordination
- **Business logic**: Feature-specific validation, transformation

**Example files:**
- `src/features/videos/queries/useVideoList.ts` — List videos with filters
- `src/features/playlists/mutations/useCreatePlaylist.ts` — Create playlist hook

### `src/components/[domain]/`

UI components organized by domain. Responsibilities:

- **Provider-agnostic**: Keep components independent of specific data sources
- **Domain-specific components**: Group by concern (video, comment, auth, etc.)
- **Shared UI**: Primitives and base components in `components/ui/`

**Example files:**
- `src/components/video/VideoCard.tsx` — Video display component
- `src/components/comment/CommentForm.tsx` — Comment input form
- `src/components/ui/Dialog.tsx` — shadcn/ui Dialog primitive

### `src/shared/`

Cross-domain utilities. Do not add domain-specific logic here.

**Key modules:**
- `src/shared/lib/validation.ts` — Centralized Zod schemas (email, password, etc.)
- `src/shared/lib/format.ts` — Format utilities (dates, durations, numbers)
- `src/shared/api/supabase/supabaseClient.ts` — Shared Supabase client instance
- `src/shared/api/supabase/edgeFunctions.ts` — Edge Function invocation helper
- `src/shared/api/supabase/supabaseErrors.ts` — Error handling utilities
- `src/shared/test/` — Test setup, MSW handlers, test utilities

### `src/pages/`

Route-level page components. Responsibilities:

- Top-level route layout
- Connect to feature hooks
- Pass data to components

**Example files:**
- `src/pages/Index.tsx` — Home page
- `src/pages/Favorites.tsx` — Favorites page
- `src/pages/Auth.tsx` — Authentication page

All routes are lazy-loaded. Register new routes in [src/App.tsx](../src/App.tsx) with `React.lazy()`.

### `src/i18n/`

Internationalization setup and translation resources.

- `src/i18n/config.ts` — i18n initialization
- `src/i18n/locales/pt.json` — Portuguese translations
- `src/i18n/locales/en.json` — English translations
- `src/i18n/locales/{es,fr}.json` — Additional language translations

**Convention:** Keep locale files aligned. When adding a translation key, update all 4 language files.

### `supabase/functions/`

Serverless functions (Deno runtime). Responsibilities:

- Backend compute for expensive operations
- External API integrations
- Webhook handlers
- Rate limiting (after auth, before expensive work)

**Conventions:**
- Use `verify_jwt = true` for user-triggered functions
- Use shared helpers from `_shared/http.ts` for CORS/JSON responses
- Keep service-role operations isolated here (never expose keys to frontend)

### `supabase/migrations/`

Database schema as code. Responsibilities:

- Postgres schema (tables, columns, indexes)
- Row-Level Security (RLS) policies
- Triggers, functions, views
- Data migrations and backfills

**Convention:** Use descriptive names (`20250601000000_add_video_enrichment_table.sql`).

---

## Key Patterns & Conventions

### Validation (DRY)

Always reuse schemas from `src/shared/lib/validation.ts`:

```typescript
import { emailSchema, passwordSchema, usernameSchema } from '@/shared/lib/validation';

// ✓ Reuse
const form = useForm({ resolver: zodResolver(emailSchema) });

// ✗ Don't define locally
const localEmailSchema = z.string().email();
```

### Server State (TanStack Query)

Do not fetch directly in components. Use feature query hooks:

```typescript
// ✓ Use query hooks
const { data, isLoading } = useVideoList();

// ✗ Don't fetch in component
const [video, setVideo] = useState(null);
useEffect(() => {
  supabase.from('videos').select().then(setVideo);
}, []);
```

### API Calls

Centralize Supabase access in entity API modules:

```typescript
// src/entities/video/video.api.ts
export const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('videos')
    .select('*, category(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

// src/features/videos/queries/useVideo.ts
export const useVideo = (id: string) => {
  return useQuery({
    queryKey: video.keys.detail(id),
    queryFn: () => fetchVideo(id),
  });
};
```

### Edge Function Invocation

Use the helper, don't call `supabase.functions.invoke` directly:

```typescript
import { invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

const result = await invokeEdgeFunction('enrich-video', { videoId: '123' });
```

### UI & Styling

Prefer shadcn/ui primitives. Use Tailwind utilities for styling:

```typescript
// ✓ Use primitives + Tailwind
<Button className={cn('px-4 py-2', isDanger && 'bg-red-600')} />

// ✗ Don't add custom CSS when Tailwind is available
<button style={{ padding: '8px 16px' }} />
```

**File convention:**
- `src/lib/utils.ts` — Only shadcn/ui utilities like `cn()`
- `src/shared/lib/` — All other shared utilities (format, image, slug, etc.)

### Forms

Use React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailSchema } from '@/shared/lib/validation';

const { register, formState: { errors } } = useForm({
  resolver: zodResolver(emailSchema),
});
```

### Localization

Use i18n keys. Don't hard-code user-facing strings:

```typescript
// ✓ Use translation keys
<h1>{t('home.title')}</h1>

// ✗ Don't hard-code
<h1>Welcome to Tube O2</h1>
```

Keep all 4 locale files aligned when adding keys.

### Imports

Use alias imports with `@/`:

```typescript
// ✓ Alias import
import { emailSchema } from '@/shared/lib/validation';

// ✗ Relative imports (hard to follow when deep)
import { emailSchema } from '../../../shared/lib/validation';
```

---

## Global Providers

All context providers (QueryClient, Auth, i18n, ThemeProvider, Helmet, Toasts) are initialized in:

**[src/app/providers/AppProviders.tsx](../src/app/providers/AppProviders.tsx)**

Do not add providers to `main.tsx` or component files. Follow the pattern in `AppProviders.tsx`.

---

## Frontend Guardrails

- Keep UI components provider-agnostic; put data access in entity/API modules
- Reuse shared validation instead of redefining schemas
- Keep locale files aligned when adding user-facing strings
- Avoid creating extra Supabase clients; use the shared client
- Do not reintroduce legacy local catalog mock fallbacks
- Preserve current branding: Tube O2 / Open 2 Technology (not Monynha)

## Supabase Operational Guardrails

- Treat `supabase/config.toml` as deployment-as-code
- Confirm CLI diff before running `pnpx supabase config push`
- Keep auth settings intact (site_url, redirects, MFA, email confirmations)
- Edge Functions should use `verify_jwt = true` for user-triggered operations
- Avoid wildcard CORS unless explicitly needed for public endpoints
- In Vitest: avoid opening realtime sockets; mock or guard with `import.meta.env.MODE === 'test'`

---

## Testing

- **Vitest** + React Testing Library for component and unit tests
- **Playwright** for E2E tests
- Tests live alongside source files: `FileName.test.tsx`
- Shared test setup in `src/shared/test/setup.ts`
- MSW handlers in `src/shared/test/mswHandlers.ts` for API mocking

Run tests with:
```bash
pnpm test                    # All tests
pnpm test -- <pattern>       # Targeted tests
pnpm test:coverage          # Coverage report
pnpm test:e2e               # E2E tests
```

---

## Common Pitfalls

| ❌ Pitfall | ✅ Solution |
|-----------|-----------|
| Duplicate validation logic | Reuse `src/shared/lib/validation.ts` schemas |
| Fetch directly in components | Use feature query hooks (TanStack Query) |
| Add custom CSS | Use Tailwind utilities + shadcn/ui |
| Forget to invalidate queries | Invalidate related keys after mutations |
| Mutable query keys | Use key factories from `src/entities/*/` |
| Bypass RLS in mutations | Respect row-level security constraints |
| Put utils in `src/lib/` | Use `src/shared/lib/` for business logic |
| Call `supabase.functions.invoke` directly | Use `invokeEdgeFunction()` helper |
| Hard-code user strings | Use i18n keys + keep locales aligned |
| Run `supabase config push --yes` | Inspect diff; confirm each prompt |

---

## Adding New Features

1. **Create entity module** — `src/entities/[domain]/` with types, API, query keys
2. **Create feature module** — `src/features/[domain]/` with query/mutation hooks
3. **Create components** — `src/components/[domain]/` for UI
4. **Create page** — `src/pages/FeatureName.tsx` and register in `src/App.tsx`
5. **Add translations** — Update all 4 locale files in `src/i18n/locales/`

---

## For More Information

- **Quick Start & Commands**: [AGENTS.md](../AGENTS.md)
- **Tech Stack & Runtime**: [README.md](../README.md)
- **Frontend Rules**: [.github/instructions/frontend.instructions.md](../.github/instructions/frontend.instructions.md)
- **Backend Rules**: [.github/instructions/backend.instructions.md](../.github/instructions/backend.instructions.md)
- **Design System**: [docs/visual-elevation.md](./visual-elevation.md)
- **Team Rules**: [AI_RULES.md](../AI_RULES.md)
