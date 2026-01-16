# Monynha Fun Codebase & Database Migrations Exploration

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
│   │   ├── playlist/         # Playlist-specific components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ...other components
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
│   │   ├── Auth.tsx
│   │   └── ...other pages
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts     # Supabase client initialization
│   │       └── types.ts      # TypeScript types from schema
│   ├── lib/
│   │   ├── utils.ts          # Utility functions (cn for Tailwind)
│   │   └── youtube.ts        # YouTube helpers (URL parsing, oEmbed)
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
- `/auth` - Login/Signup
- `/submit` - Video submission
- `/videos` - Video listing
- `/videos/:videoId` - Video details
- `/favorites` - User's favorite videos
- `/community` - Community page
- `/playlists` - User's playlists
- `/playlists/:playlistId` - Playlist details
- `/playlists/new` - Create new playlist
- `/playlists/:playlistId/edit` - Edit playlist
- `/profile/:username` - View user profile
- `/profile/edit` - Edit own profile
- `/about`, `/rules`, `/contact`, `/faq` - Info pages

---

## Database Schema

### Core Tables (9 tables)

#### 1. **profiles** (User Profiles)
- Extends auth.users with display metadata
- Columns: id, username, avatar_url, display_name, bio, submissions_count, created_at, updated_at
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
   - Creates corresponding profile record automatically

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
```
mcp_supabase_apply_migration(
  name: string      // Migration name (snake_case, e.g., "add_user_profiles_table")
  query: string     // SQL DDL query to apply
) → { success: boolean, migration_version?: string }
```

### Usage Example
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
import { zodResolver } from '@hookform/resolvers/zod';
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
git clone <repo-url>
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
1. User signs up/logs in via Supabase Auth (passwordless, OAuth, password)
2. `handle_new_user()` trigger auto-creates profile record
3. React context (`AuthProvider`) manages session state
4. Protected routes check `user && !loading` from `useAuth()`

### API Keys
- **Public key** (`VITE_SUPABASE_PUBLISHABLE_KEY`): Exposed in frontend, restricted by RLS
- **Service role key**: Kept in backend/Edge Functions only
- **Edge Functions**: Manual auth validation when `verify_jwt: false`

---

## Next Steps & Future Enhancements

1. **Real AI Integration**: Replace simulated enrichment with actual AI service (OpenAI, Anthropic)
2. **Video Search**: Full-text search on titles, descriptions, semantic tags
3. **Recommendations**: Algorithm for suggesting videos based on user history
4. **Social Features**: Comments, ratings, user follows
5. **Analytics**: Track user engagement, popular videos, community growth
6. **Offline Support**: Service workers for offline video playback
7. **Mobile App**: React Native version of Monynha Fun

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

