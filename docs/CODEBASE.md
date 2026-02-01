# Monynha Fun Codebase & Database Migrations Exploration 🚀

*Marcelo's Guide to Not Getting Lost in His Own Code*

> **Pro Tip**: If you're reading this because you broke something, take a deep breath. We've all been there. Check git history, run the tests, and remember: `pnpm run build` is your friend. 🧘

---

## Recent Changes & Improvements (February 1, 2026 - Feature Drop Edition) 🎉

### 🎤 NEW: Mention Autocomplete in Comments

**The Feature Everyone Wanted** (even if they didn't know it yet)

Type `@` in any comment and BAM – autocomplete dropdown appears with user suggestions. Keyboard navigation included. We're not animals.

**Architecture** (because we do things properly):
```
entities/profile/
  ├── profile.api.ts          # searchProfiles() function
  └── profile.types.ts        # Profile interface

features/profile/queries/
  └── useProfile.ts           # useSearchProfiles() hook

components/comment/
  ├── MentionAutocomplete.tsx # Dropdown component (NEW)
  ├── CommentForm.tsx         # Integration + @ detection
  ├── CommentForm.test.tsx    # 10 passing tests (NEW)
  └── CommentItem.tsx         # Display mentions with hover cards
```

**Technical Highlights**:
- 300ms debouncing (no database spam)
- TanStack Query with 30s stale time (smart caching)
- Keyboard navigation (↑↓ arrows, Enter, Escape)
- Click-outside handler (but not *too* eager)
- Mobile-responsive with max-width constraints
- ARIA labels for accessibility
- Works in 4 languages (PT, EN, ES, FR)

**Why It's Cool**: Marcelo spent 3 hours debugging the click-outside handler. Worth it. Now you can tag people without copying usernames like it's 2005. 😎

---

### 🌍 NEW: Public Comments (Database Migration)

**Migration**: `make_comments_public` (applied February 1, 2026)

**What Changed**:
```sql
-- Before: Only authenticated users could view comments
CREATE POLICY "Authenticated users can view all comments" 
  ON public.comments FOR SELECT TO authenticated USING (true);

-- After: Everyone can view comments (anon + authenticated)
CREATE POLICY "Anyone can view all comments" 
  ON public.comments FOR SELECT TO anon, authenticated USING (true);
```

**Security Model** (still locked down where it matters):
- 🌍 **SELECT**: Public (anyone can read)
- 🔐 **INSERT**: Authenticated only (auth.uid() = user_id)
- 🔐 **UPDATE**: Own comments only (auth.uid() = user_id)
- 🔐 **DELETE**: Own comments only (auth.uid() = user_id)

**Impact**:
- Better SEO (Google loves public content)
- Improved discoverability (lurkers can read discussions)
- Community transparency (no gatekeeping)
- Anonymous users still need to sign up to comment (fair trade)

**Why We Did This**: Because good discussions deserve an audience. Plus, engagement metrics go brrr. 📈

---

### 🐛 Bug Fixes (The "Oops" Collection)

**DOM Nesting Violation**: 
- Fixed `<p>` containing `<div>` (HTML semantics matter, apparently)
- Changed CommentItem content wrapper to `<div>`
- Console: clean ✅

**TypeScript Lint Errors**:
- Killed 12 `any` types with `Mock` typing
- Added proper imports from vitest
- ESLint: happy ✅

**React Hook Warning**:
- Added missing `type` dependency in useMetaTags
- React: satisfied ✅

**Click Handler Bug**:
- Fixed mention dropdown closing before selection
- Added autocompleteRef tracking
- Mentions: working perfectly ✅

---

## Recent Changes & Improvements (January 31, 2026 - Phase 2)

### Code Organization - Component Structure ✅
- ✅ **Moved image utilities**: `src/lib/image.ts` → `src/shared/lib/image.ts` for consistency
- ✅ **Split test files**: Created domain-specific tests
  - `src/components/video/VideoCard.test.tsx` - VideoCard component tests
  - `src/components/layout/FeaturedHero.test.tsx` - FeaturedHero component tests
  - Removed generic `video-components.test.tsx`
- ✅ **Updated imports**: AvatarCropperDialog now imports from `@/shared/lib/image`

### Architecture Clarification
- ✅ **src/lib/** - Core UI utilities (cn function for Tailwind - shadcn/ui convention)
- ✅ **src/shared/lib/** - Business logic utilities (validation, format, youtube, slug, image)
- ✅ **Clear separation**: UI layer utilities vs application layer utilities

### Component Organization Audit
- ✅ **10 domain-organized directories** under `src/components/`
- ✅ **45+ shadcn/ui primitives** in `components/ui/`
- ✅ **Tests colocated** with their components
- ✅ **90% organization score** - Only utility components remain at root (NavLink, ScrollToTop)

### Code Quality - Continued from Phase 1 ✅
- ✅ **Shared validation schemas**: Fixed duplicate email validation in Contact.tsx to use shared `emailSchema` from `@/shared/lib/validation`
- ✅ **Component organization**: Moved `FeaturedHero` and `CategorySection` to `components/layout/` for better domain separation
- ✅ **Import consistency**: Updated Index.tsx to use organized component structure with proper imports
- ✅ **Removed duplicates**: Identified duplicate component files (Header, Footer, HeroSection, VideoCard, CategoryCard) - keeping organized versions in subdirectories

### Code Quality Baseline
- TypeScript type checking: ✓ Pass
- ESLint: Clean (no critical warnings)
- Test coverage: 16 tests passing across 9 test files
  - Header.tsx navigation/auth ✓
  - Auth.tsx login flows ✓
  - Submit.tsx form validation ✓
  - useAuth hook ✓
  - Video components ✓
  - Format utilities ✓
  - YouTube utilities ✓
  - Query keys ✓
  - Playlists page ✓

### Build & CI/CD Fixes (January 30, 2026)
- ✅ **Fixed import paths**: Corrected 12 incorrect `@hookform/resolvers/dist/zod.mjs` imports to use the proper entry point `@hookform/resolvers/zod`
- ✅ **CI/CD Pipeline**: Updated GitHub Actions workflow to properly install bun via npm in CI environment
- ✅ **Build verified**: Production build completes successfully (1.13MB minified)
- ✅ **All tests pass**: 16 tests passing across 6 test files

### Navigation & UX Improvements
- ✅ **Header Navigation**: Added explicit "Videos" nav item (`/videos` route) with dedicated translation keys
- ✅ **Multi-language support**: Added `header.videos` translation key to all 4 locales (English, Portuguese, Spanish, French)
- ✅ **Consistent labeling**: Replaced generic "Categories" label with "Videos" for clarity

### Code Quality
- TypeScript type checking: ✓ Pass
- ESLint: 8 warnings (non-breaking, react-refresh related)
- Test coverage: All critical paths tested

---

## Project Overview

**Monynha Fun** is a React + TypeScript + Vite application for cultural video curation, using Supabase as a BaaS platform. The project emphasizes human curation assisted by AI, democratizing access to valuable YouTube content.

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query (TanStack Query)
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **UI Patterns**: Lucide icons, Sonner toasts, date-fns
- **i18n**: i18next with Portuguese/English locales

---

## Codebase Structure

```
video-vault/
├── src/
│   ├── App.tsx                 # Main app with route definitions
│   ├── main.tsx               # Entry point with i18next + providers
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── layout/           # **Layout components (Header, Footer, HeroSection, FeaturedHero, CategorySection)**
│   │   ├── video/            # **Video domain components (VideoCard, CategoryCard)**
│   │   ├── playlist/         # Playlist-specific components
│   │   ├── auth/             # Authentication forms
│   │   ├── comment/          # Comment components
│   │   ├── profile/          # Profile components
│   │   └── account/          # Account settings components
│   ├── hooks/
│   │   ├── useAuth.tsx       # Auth context & hooks
│   │   ├── useVideos.ts      # Videos data fetching (TanStack Query)
│   │   ├── usePlaylists.ts   # Playlists CRUD operations
│   │   ├── useFavorites.ts   # Favorites management
│   │   ├── useProfile.ts     # Profile data
│   │   └── ...other data hooks
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Videos.tsx
│   │   ├── VideoDetails.tsx
│   │   ├── Playlists.tsx
│   │   ├── PlaylistDetails.tsx
│   │   ├── Profile.tsx
│   │   ├── EditProfile.tsx
│   │   ├── Auth.tsx          # Custom Login/Signup/Forgot Password forms
│   │   └── ...other pages
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client initialization
│   │       └── types.ts      # TypeScript types from schema
│   ├── lib/
│   │   └── utils.ts          # Core UI utility (cn for Tailwind - shadcn/ui convention)
│   ├── shared/
│   │   ├── lib/
│   │   │   ├── validation.ts # **Shared Zod validation schemas (DRY principle)**
│   │   │   ├── format.ts     # Formatting utilities
│   │   │   ├── youtube.ts    # YouTube helpers (URL parsing, oEmbed)
│   │   │   ├── slug.ts       # Slug generation
│   │   │   └── image.ts      # **Image cropping utilities**
│   │   ├── api/
│   │   │   └── supabase/
│   │   ├── config/
│   │   └── hooks/
│   ├── i18n/
│   │   ├── config.ts         # i18next configuration
│   │   └── locales/          # JSON translation files
├── supabase/
│   ├── config.toml           # Supabase local dev config
│   ├── functions/
│   │   ├── enrich-video/     # AI enrichment Edge Function
│   │   └── mark-top-featured/# Feature marking Edge Function
│   └── migrations/           # Database schema & data migrations
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── ...config files
```

### Key Routes
- `/` - Index/Home
- `/auth` - Login/Signup (Custom forms with react-hook-form + Zod)
- `/submit` - Video submission with YouTube metadata extraction
- `/videos` - Video listing with search, category, and language filters
- `/videos/:videoId` - Video details with comments and related videos
- `/favorites` - User's favorite videos
- `/community` - Community showcase page
- `/playlists` - User's playlists manager
- `/playlists/:playlistId` - Playlist details and video management
- `/playlists/new` - Create new playlist
- `/playlists/:playlistId/edit` - Edit existing playlist
- `/profile/:username` - View user profile and their curated content
- `/profile/edit` - Edit own profile with avatar upload
- `/account/settings` - Account security settings
- `/about`, `/rules`, `/contact`, `/faq` - Static info pages

---

## Code Quality & Patterns

### Shared Validation Schemas (DRY Principle)

To eliminate code duplication and ensure consistency, all form validations use **shared Zod schemas** from `src/shared/lib/validation.ts`:

```typescript
import { emailSchema, passwordSchema, usernameSchema, createPasswordConfirmationSchema } from '@/shared/lib/validation';

// ✅ Correct: Use shared schemas
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// ❌ Wrong: Don't duplicate validation logic
const loginSchema = z.object({
  email: z.string().email('auth.error.invalidEmail'), // AVOID THIS
  password: z.string().min(6, 'auth.error.passwordMinLength'), // AVOID THIS
});
```

**Available Shared Schemas:**
- `emailSchema` - Email validation with i18n error message
- `passwordSchema` - Password validation (min 6 characters)
- `usernameSchema` - Username validation (min 3 characters)
- `optionalUsernameSchema` - Optional username (allows empty string)
- `createPasswordConfirmationSchema(messageKey?)` - Password + confirmation with match validation

**Benefits:**
- Single source of truth for validation rules
- Consistent error messages across the app
- Easy to update validation requirements globally
- Follows DRY (Don't Repeat Yourself) principle
- Type-safe with full TypeScript support

**Files Using Shared Schemas:**
- `src/pages/Auth.tsx` - Login, signup, forgot password
- `src/components/auth/ResetPasswordForm.tsx` - Password reset
- `src/components/account/ChangeEmailForm.tsx` - Email change
- `src/components/account/ChangePasswordForm.tsx` - Password change
- Any new form that requires email/password validation should use these schemas

---

## Database Schema

### Core Tables (9 tables)

#### 1. **profiles** (User Profiles)
- Extends auth.users with display metadata
- Columns: id, username, avatar_url, display_name, bio, submissions_count, created_at, updated_at, **avatar_path** (for Supabase Storage management)
- RLS Enabled: Yes
- Relationships: Videos (submitted_by), Favorites (user_id), Playlists (author_id)

#### 2. **videos** (Curated Videos)
- Columns: id, youtube_id (unique), title, description, channel_name, duration_seconds, thumbnail_url, language, category_id, submitted_by, view_count, is_featured, created_at, updated_at
- RLS Enabled: Yes
- Features:
  - Atomic view count increment via `increment_video_view_count()` function
  - Featured status based on view count (via `mark_top_videos_as_featured()` function)
  - One-to-many with: favorites, playlists (via junction), ai_enrichments

#### 3. **categories** (Video Categories)
- Columns: id, name, slug (unique), icon, color, created_at
- RLS Enabled: Yes
- Sample data: 7 categories (Tech, Education, Arts, etc.)
- Referenced by: videos.category_id, ai_enrichments.suggested_category_id

#### 4. **favorites** (User Favorites)
- Junction table for user ↔ video relationships
- Columns: id, user_id, video_id, created_at
- RLS Enabled: Yes
- Unique constraint on (user_id, video_id) to prevent duplicates

#### 5. **ai_enrichments** (AI-Generated Video Metadata)
- AI-enriched data per video (titles, summaries, tags, language detection)
- Columns: id, video_id (FK), optimized_title, summary_description, semantic_tags (TEXT[]), suggested_category_id, language, cultural_relevance, short_summary, created_at, reprocessed_at
- RLS Enabled: Yes
- Populated by: `enrich-video` Edge Function

#### 6. **playlists** (User-Created Collections)
- Columns: id, name, slug (unique), description, author_id (FK auth.users), thumbnail_url, course_code, unit_code, language, is_public, is_ordered, created_at, updated_at
- RLS Enabled: Yes
- Features: Course/Unit metadata, public/private visibility, ordered playlists
- Relationships: Many playlist_videos, many playlist_collaborators, many playlist_progress

#### 7. **playlist_videos** (Playlist Content Junction)
- Links videos to playlists with ordering
- Columns: id, playlist_id, video_id, position, added_by (FK auth.users), notes, created_at
- RLS Enabled: Yes
- Features: Custom ordering via position field, per-video notes

#### 8. **playlist_collaborators** (Playlist Access Control)
- Allows multiple users to edit playlists
- Columns: id, playlist_id, user_id (FK auth.users), role ('editor'|other), invited_at
- RLS Enabled: Yes
- Currently empty (0 rows) but supports collaboration workflows

#### 9. **playlist_progress** (User Learning Progress)
- Tracks watched status and position for playlist videos
- Columns: id, playlist_id, user_id (FK auth.users), video_id, watched (boolean), watched_at, last_position_seconds, created_at, updated_at
- RLS Enabled: Yes
- Supports: Video resume playback, watch tracking, course progress

### RLS Policies & Security
All tables have RLS enabled with policies following these patterns:
- **Public reads**: Non-sensitive data readable by all (videos, categories)
- **User-scoped access**: Users can only see/edit their own data (profiles, playlists, favorites)
- **Collaborative access**: Playlist collaborators have editor permissions

### Database Functions (PL/pgSQL)

1. **increment_video_view_count(p_video_id uuid)** → integer
   - Atomically increments video view_count
   - Returns new view_count value
   - Executable by: anon, authenticated

2. **mark_top_videos_as_featured()**
   - Sets is_featured=true for top N videos by view_count
   - Called by migrations/edge functions

3. **update_updated_at_column()** (Trigger function)
   - Auto-updates updated_at timestamp on row modifications
   - Applied to: profiles, videos, playlists

4. **increment_submissions_count()**
   - Increments profile.submissions_count when user submits video

5. **handle_new_user()**
   - Trigger on auth.users INSERT
   - Creates corresponding profile record automatically, initializing `avatar_path` to NULL.

---

## Migrations Overview

### Migration System
- Stored in `supabase/migrations/` directory
- Two naming patterns:
  - **Semantic** (numbered + descriptive): `000X_description_of_changes.sql`
  - **Timestamped** (Supabase auto-generated): `20260116HHMMSS_uuid.sql`

### Recent Migrations (10 Applied)

| Version | Name | Purpose |
|---------|------|---------|
| 20260106115236 | (unnamed) | Early setup |
| 20260106115928 | (unnamed) | Early setup |
| 20260116212558 | (unnamed) | Core tables |
| 20260116221302 | Seed Marcelo Playlist | Sample data |
| 20260116222441 | Seed More Marcelo Videos | Additional sample videos |
| 20260116225527 | Increment Video View Count Function | Create atomic view count increment |
| 20260116230635 | Update Increment Video View Count to Set Featured | Modify function for featured flagging |
| 20260116230725 | Backfill Featured by View Count | Initialize featured status |
| 20260116231035 | Mark Top Videos as Featured | Create feature-marking function |
| 20260116232300 | Fix Mark Top Videos Function | Bug fix for feature logic |
| 0015 | add_avatar_path_column_to_the_public_profiles_table | Add `avatar_path` column to `profiles` table |
| 0016 | update_handle_new_user_function_to_initialize_avatar_path_for_new_profiles_ | Update `handle_new_user` to set `avatar_path` |

### Migration File Pattern Example
```sql
-- Create function to increment a video's view_count atomically
CREATE OR REPLACE FUNCTION public.increment_video_view_count(p_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = p_video_id;
  RETURN (SELECT view_count FROM public.videos WHERE id = p_video_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_video_view_count(uuid) TO authenticated;
```

---

## The `mcp_supabase_apply_migration` Tool

### Purpose
Apply new database schema or data migrations to a Supabase project. This tool executes SQL DDL (Data Definition Language) operations.

### When to Use
- **Schema Changes**: Creating/altering/dropping tables, columns, indexes
- **Function Creation**: Adding stored procedures or triggers
- **Data Seeding**: Populating test or reference data
- **RLS Setup**: Creating row-level security policies
- **Complex Operations**: Anything requiring transactional DDL

### When NOT to Use
- **Simple Queries**: Use `mcp_supabase_execute_sql` for SELECT, INSERT, UPDATE, DELETE without schema changes
- **Data Migrations with IDs**: Avoid hardcoding generated IDs in data migrations (let the database generate them)

### Tool Signature
```javascript
await mcp_supabase_apply_migration({
  name: "create_videos_enrichment_index",
  query: `
    CREATE INDEX idx_ai_enrichments_video_id 
    ON public.ai_enrichments(video_id);
    
    CREATE INDEX idx_videos_is_featured 
    ON public.videos(is_featured) 
    WHERE is_featured = true;
  `
})
```

### Key Implementation Details
1. **Idempotent Migrations**: Use `CREATE TABLE IF NOT EXISTS` or `CREATE OR REPLACE` for functions to avoid errors on re-runs
2. **Transactional**: Entire migration runs in a single transaction; if any statement fails, entire migration rolls back
3. **Version Tracking**: Supabase automatically tracks applied migrations with timestamps
4. **No Hardcoded IDs**: Never hardcode UUID/serial values; use `DEFAULT gen_random_uuid()` or `DEFAULT nextval()`
5. **RLS-First Approach**: Always enable RLS on new tables and define policies immediately

### Common Migration Patterns in This Project

#### Pattern 1: Table Creation with RLS
```sql
CREATE TABLE public.example_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own data" ON public.example_table
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON public.example_table
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Pattern 2: Function with Trigger
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_example_table_updated_at
BEFORE UPDATE ON public.example_table
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

#### Pattern 3: Index Creation
```sql
CREATE INDEX idx_videos_category_id ON public.videos(category_id);
CREATE INDEX idx_videos_featured_created ON public.videos(is_featured, created_at DESC);
```

---

## Data Flow Architecture

### Video Submission Flow
1. **User submits** video URL → `/submit` page (Submit.tsx)
2. **YouTube metadata extracted** → `lib/youtube.ts` helper functions
3. **Video saved** → `videos` table (via hook mutation)
4. **AI enrichment triggered** → Edge Function `enrich-video` called
5. **Enriched data stored** → `ai_enrichments` table
6. **Video appears** in Videos list

### Playlist Management Flow
1. **Create playlist** → `playlists` table, `handle_new_user` trigger
2. **Add videos** → `playlist_videos` junction table (with position ordering)
3. **Share/collaborate** → `playlist_collaborators` table
4. **Track progress** → `playlist_progress` table (for learning playlists)
5. **View playlist** → `/playlists/:playlistId` page with all related data

### Featured Videos Logic
1. **Videos accumulate** view_count via `increment_video_view_count()` function
2. **Background process** calls `mark_top_videos_as_featured()` function
3. **is_featured flag** set on top N videos
4. **Featured videos** displayed prominently on Index/Home page

---

## Code Conventions & Patterns

### Hook Pattern (Data Fetching)
```typescript
// hooks/useVideos.ts
import { useQuery } from '@tanstack/react-query';

export const useVideos = (filters?: { category?: string }) => {
  return useQuery({
    queryKey: ['videos', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        // ... filtering logic
      if (error) throw error;
      return data;
    }
  });
};
```

### Component Pattern (UI)
```typescript
// Use shadcn/ui components from src/components/ui/
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // For class merging

export const VideoCard = ({ video }) => (
  <Card className={cn("p-4", video.is_featured && "border-yellow-500")}>
    <h3>{video.title}</h3>
  </Card>
);
```

### Form Pattern (react-hook-form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/dist/zod.mjs';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(5),
  url: z.string().url()
});

export const VideoForm = () => {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema)
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
    </form>
  );
};
```

### i18n Pattern
```typescript
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { t } = useTranslation();
  return <h1>{t('header.title')}</h1>;
};
```

---

## Development Workflow

### Setup Local Development
```bash
# Clone & install
git clone https://github.com/Monynha-Softwares/video-vault
cd video-vault
npm install  # or pnpm install

# Environment variables (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Run dev server (http://localhost:5173)
npm run dev
```

### Database Development
```bash
# Initialize Supabase locally
supabase init
supabase start

# Apply migrations to local database
supabase migration up

# Make changes and create new migration
supabase migration new <name>

# Push to production
supabase db push
```

### Common Development Tasks

**Add a new page**:
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` (before catch-all `*`)
3. Create hook if needed in `src/hooks/useNewData.ts`
4. Add i18n keys to `src/i18n/locales/*.json`

**Add new database table**:
1. Create migration: `mcp_supabase_apply_migration` with CREATE TABLE DDL
2. Enable RLS and create policies
3. Run `mcp_supabase_generate_typescript_types` to update `src/integrations/supabase/types.ts`
4. Create corresponding hook in `src/hooks/`

**Add new Edge Function**:
1. Create `supabase/functions/my-function/index.ts`
2. Deploy via: `mcp_supabase_deploy_edge_function`
3. Call from frontend with proper auth headers

---

## Edge Functions

### Deployed Functions

#### 1. **enrich-video** (Active - v30)
- **Purpose**: AI enrichment of video metadata (currently simulated)
- **Authentication**: Manual Bearer token validation (verify_jwt disabled)
- **Input**: `{ videoId: uuid, youtubeUrl: string }`
- **Output**: Saves to `ai_enrichments` table
- **Triggered by**: Video submission flow

**File**: `supabase/functions/enrich-video/index.ts`

```typescript
// Receives request with video metadata
// Validates user auth via Bearer token
// Simulates AI enrichment (placeholder for real AI service)
// Writes enriched data to ai_enrichments table
```

#### 2. **mark-top-featured** (Active - v3)
- **Purpose**: Mark top videos as featured based on view count
- **Triggered by**: Background process or manual trigger
- **Logic**: Identifies top N videos, sets is_featured flag

---

## Performance & Optimization

### Database Indexing
The project relies on Supabase's built-in indexes plus custom ones:
```sql
-- Recommended for this schema (can be added via migration):
CREATE INDEX idx_videos_featured_created ON public.videos(is_featured, created_at DESC);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_playlist_videos_playlist_id ON public.playlist_videos(playlist_id, position);
CREATE INDEX idx_ai_enrichments_video_id ON public.ai_enrichments(video_id);
```

### Query Optimization
- **Hooks use TanStack Query** for caching and deduplication
- **Selective field fetching**: Only request needed columns
- **Relationship loading**: Use `.select('*, table2(*)')` for JOINs
- **Pagination**: Implement `.range()` for large lists

---

## Security Considerations

### RLS Policies
All tables enforce RLS with user-scoped policies. Example:
```sql
-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);
```

### Authentication Flow
1. User signs up/logs in via custom forms (`src/pages/Auth.tsx`) using `react-hook-form` and `zod`.
2. `handle_new_user()` trigger auto-creates profile record.
3. React context (`AuthProvider`) manages session state.
4. Protected routes check `user && !loading` from `useAuth()`.

### API Keys
- **Public key** (`VITE_SUPABASE_PUBLISHABLE_KEY`): Exposed in frontend, restricted by RLS
- **Service role key**: Kept in backend/Edge Functions only
- **Edge Functions**: Manual auth validation when `verify_jwt: false`

---

## Next Steps & Future Enhancements

### Development Workflow
1. **Local development**: `bun run dev` - Starts Vite dev server on http://localhost:5173
2. **Type safety**: `bun run typecheck` - Validates TypeScript
3. **Code quality**: `bun run lint` - Checks ESLint rules
4. **Testing**: `bun run test` - Runs Vitest suite
5. **Production**: `bun run build` - Creates optimized bundle in `dist/`

### CI/CD Pipeline
The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on all branches:
- Installs dependencies via bun
- Runs linter, type checker, and test suite
- Builds production bundle
- Uploads artifacts for deployment
- Requires environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

### Important: Import Path Conventions
When using form resolvers or third-party libraries:
- ✓ **Correct**: `import { zodResolver } from '@hookform/resolvers/zod'`
- ✗ **Incorrect**: `import { zodResolver } from '@hookform/resolvers/dist/zod.mjs'`
  
Always use the package's public entry points (check `package.json` exports). Direct file paths may not resolve in production builds.

### Internationalization (i18n)
- Configuration: `src/i18n/config.ts`
- Locale files: `src/i18n/locales/` (en.json, pt.json, es.json, fr.json)
- Usage: `const { t } = useTranslation()` then `t('header.videos')`
- Language switching: Available in header via globe icon selector
- **New in this update**: `header.videos` key added for Videos nav label

### Future Enhancements

1. **Code-splitting**: Reduce main bundle size (currently 1.1MB) using dynamic imports
2. **Real AI Integration**: Replace simulated enrichment with actual AI service (OpenAI, Anthropic)
3. **Video Search**: Full-text search on titles, descriptions, semantic tags
4. **Recommendations**: Algorithm for suggesting videos based on user history
5. **Social Features**: Comments, ratings, user follows
6. **Analytics**: Track user engagement, popular videos, community growth
7. **Offline Support**: Service workers for offline video playback
8. **Mobile App**: React Native version of Monynha Fun
9. **Performance**: Implement image optimization and lazy loading
10. **Accessibility**: WCAG 2.1 AA compliance audit and improvements

---

## Troubleshooting

### Common Issues

**Migrations fail with "table already exists"**
- Add `IF NOT EXISTS` to CREATE statements or use `CREATE OR REPLACE` for functions

**RLS policies blocking data access**
- Check if user is authenticated and policies reference `auth.uid()` correctly
- Verify user_id/author_id columns match authenticated user ID

**Edge Function 401 errors**
- Ensure Bearer token is valid
- Check `Authorization` header format: `Bearer <token>`
- Verify `verify_jwt` setting matches authentication method

**Stale data in hooks**
- Check React Query cache invalidation on mutations
- Use `.refetchQueries()` to force refresh

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Query Docs**: https://tanstack.com/query/latest
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev