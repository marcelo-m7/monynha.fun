# Changelog - Tube O2 🎬

*Where we document every bug fix, feature drop, and "oops I broke production" moment*

> **Open 2 Technology Philosophy**: Move fast, break things (but fix them quickly), and always keep it real. No corporate BS here. 🚀

---

## [v0.3.1] - May 2, 2026 ⚡ **Playlists UX + Build Performance**

### 🎓 Course-Centric Playlists Discovery

**What's New**:
- Added aggregated course data integration on playlists page:
  - `src/entities/course/course.types.ts`
  - `src/entities/course/course.keys.ts`
  - `src/entities/course/course.api.ts`
  - `src/features/courses/queries/useCoursePlaylists.ts`
- `src/pages/Playlists.tsx` now consumes `v_course_playlist_summary` and shows course summary cards.
- Advanced filter UX improvements:
  - removable active filter chips
  - responsive filter layout
  - URL-persisted filter state
  - fallback options when course summary view is empty

**Testing**:
- `src/pages/Playlists.test.tsx` updated to mock course summary hook and avoid unhandled network warnings.
- Typecheck and playlists tests passing after integration.

### 📦 Build Performance Improvements

**The Problem**: Initial bundle was too large (~570 kB minified for `index`) with chunk warning in production build.

**The Solution**: Updated `vite.config.ts` manual chunk strategy by domain (`react-core`, `router`, `query`, `supabase`, `i18n`, `radix-ui`, `icons`, `zod`, `i18n-locales`).

**Result**:
- Main `index` chunk reduced from ~570 kB to ~75 kB.
- Large chunk warning eliminated in build output.

### 🖼️ Docs Refresh

- README screenshots updated to current UI state (homepage, videos, playlists, comments, community/profile).

---

## [v0.3.0] - March 12, 2026 🤖 **Phase 2: AI Integration**

### 🤖 OpenAI Integration for Video Enrichment

**The Problem**: Video metadata is manually entered. Inconsistent, time-consuming, and prone to errors.

**The Solution**: AI-powered video enrichment using OpenAI API (gpt-4o-mini model).

**What's New**:
- 🧠 **OpenAI Client** (`supabase/functions/_shared/openai-client.ts`):
  - Complete TypeScript client with timeout (15s) and retry logic (2 retries, exponential backoff)
  - Structured output parsing for reliable JSON responses
  - Smart error classification (retryable vs. non-retryable)
  - Handles markdown-wrapped JSON from AI responses
- 🎬 **Video Enrichment Features**:
  - **Optimized Titles**: AI generates SEO-friendly video titles
  - **Summaries**: Short and detailed descriptions for better curation
  - **Semantic Tags**: Auto-generated tags for video categorization
  - **Cultural Relevance**: AI assesses cultural significance (High/Medium/Low)
  - **Language Support**: Respects video language (Portuguese default)
- 🔗 **Edge Function** (`enrich-video`):
  - Integrates OpenAI client
  - Fetches video from database
  - Handles enrichment errors gracefully
  - Inserts results into `ai_enrichments` table
- ⚛️ **Frontend Hook** (`useEnrichVideo`):
  - TanStack Query mutation for loading/error states
  - Toast notifications for user feedback
  - Type-safe request/response handling
- 🔐 **Security**:
  - JWT authentication before API calls
  - Service role for database operations (RLS bypass)
  - Environment variables protected in Supabase secrets

**Files Created**:
- `supabase/functions/_shared/openai-client.ts` (290 lines) — OpenAI client implementation
- `supabase/functions/_shared/env.ts` (50 lines) — Environment variable validation
- `src/features/videos/queries/useEnrichVideo.ts` (70 lines) — Frontend hook
- `src/features/videos/queries/useEnrichVideo.test.ts` (180 lines) — Unit tests
- `supabase/functions/enrich-video/index.test.ts` (150 lines) — Edge function tests

**Files Modified**:
- `supabase/functions/enrich-video/index.ts` — Integrated OpenAI client, replaced `simulatedEnrichment`
- `src/shared/test/mswHandlers.ts` — Added OpenAI API mock for unit testing

**Environment Variables**:
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx  # Set in Supabase secrets
OPENAI_MODEL=gpt-4o-mini              # Documented in .env.example
```

**Cost Estimate**: $0.0002-0.0005 per enrichment (~$20-50 for 100,000 videos annually)

**Deployment Status**: ✅ **DEPLOYED TO PRODUCTION**
- 🚀 **Edge Function Version**: 128 (Active)
- 📅 **Deployed**: March 8, 2026
- 🔗 **Endpoint**: `https://wvkjainfwsyiyfcmbtid.supabase.co/functions/v1/enrich-video`
- ✅ **Status**: ACTIVE and operational

**Testing Status**:
- ✅ Unit tests structured and ready
- ✅ MSW mock handler integrated
- ✅ Manual browser testing completed (all features working)
  - Login/Logout ✓
  - Video submission ✓
  - Favorites ✓
  - Comments ✓
  - Video details page ✓
  - Playlists ✓
- ⏳ OpenAI enrichment (requires OPENAI_API_KEY to be set in Supabase secrets)

**Next Steps**:
- Set API key: `supabase secrets set OPENAI_API_KEY sk-proj-xxxxxxxxxxxxx`
- Test AI enrichment with real OpenAI API
- Monitor OpenAI usage and response times
- Phase 3: Batch enrichment for existing videos

---

## [v0.2.0] - March 8, 2026 🚀 **Phase 1: Foundation & Observability**

### 📊 Bundle Analysis & Performance Monitoring

**The Problem**: No visibility into bundle size. Features added silently ballooning the JS payload? Not anymore.

**The Solution**: Integrated Rollup Visualizer for interactive bundle analysis.

**What's New**:
- 📈 **Bundle Analyzer**: Run `pnpm build:analyze` to generate interactive `stats.html` with chunk breakdown
- 🎯 **Manual Chunking**: Split build into vendor, UI, and query libraries (better cache busting)
- 📍 **CI Integration**: Bundle size reported in CI/CD pipeline
- 📋 **Current Metrics**: Main bundle ~500 KB (141 KB gzipped) – healthy baseline

**Files Changed**:
- `vite.config.ts` — Added visualizer + manual chunks
- `package.json` — New build:analyze script

---

### ♿ Accessibility Testing Foundation

**The Problem**: How do we ensure WCAG 2.1 AA compliance doesn't regress? Manual testing sucks.

**The Solution**: Built comprehensive a11y testing utilities using axe-core.

**What's New**:
- 🔍 **A11y Test Utilities** (`a11y-setup.ts`):
  - `auditPageA11y()` — Run accessibility audits on pages
  - `a11yPatterns` object with reusable test helpers:
    - `checkButtonAccessibility()` — Verify button labels
    - `checkImageAccessibility()` — Check alt text coverage
    - `checkContrast()` — Detect color contrast violations
    - `checkKeyboardNav()` — Validate keyboard support
    - `checkFocusIndicators()` — Verify focus visibility
- 📋 **Test Template** (`a11y-test-template.ts`): Boilerplate for WCAG 2.1 Level AA compliance across 9 categories
- 🧪 **jsdom Mocks**: Added IntersectionObserver polyfill for jsdom testing environment
- 📦 **Dependency**: `axe-core` installed

**Files Created**:
- `src/shared/test/a11y-setup.ts`
- `src/shared/test/a11y-test-template.ts`

---

### 🖼️ Enhanced LazyImage Component with IntersectionObserver

**The Problem**: Images loading regardless of viewport visibility = wasted bandwidth on mobile.

**The Solution**: Refactored LazyImage with IntersectionObserver-based lazy loading.

**What's New**:
- 👁️ **IntersectionObserver**: Only load images when entering viewport (50px margin by default, configurable)
- 🫙 **Blur Placeholder**: Optional low-quality image placeholder while high-quality loads
- 💾 **Fallback Support**: Automatic fallback image if primary fails
- ⚠️ **Error Handling**: User-friendly error message with retry option
- ♿ **A11y Improvements**:
  - `aria-hidden` on blur placeholder
  - `loading="lazy"` native attribute
  - `decoding="async"` for non-blocking decode
- 🧪 **Test Coverage**: 15 comprehensive tests across 7 categories

**Props:**
```tsx
<LazyImage
  src="image.jpg"
  alt="Description"
  blurDataURL="data:image/..." // Optional
  fallbackSrc="fallback.jpg" // Optional
  observerOptions={{ rootMargin: '100px' }} // Optional
  onLoadComplete={() => {}} // Optional callback
  onErrorOccurred={(error) => {}} // Optional callback
/>
```

**Files Changed**:
- `src/shared/components/LazyImage.tsx` — Complete refactor

**Files Created**:
- `src/shared/components/LazyImage.test.tsx` — 15 tests

---

### 📱 PWA Configuration (Phase Prep)

**The Problem**: Users want offline access and installable app experience.

**The Solution**: Configured Vite PWA plugin with Workbox caching strategies.

**What's New**:
- 🔧 **Service Worker**: Auto-generated at `dist/sw.js`
- 📄 **Web App Manifest**: Generated at `dist/manifest.webmanifest`
- 💾 **Smart Caching**:
  - Cache-first for images, fonts, static assets (long-term caching)
  - Network-first for Supabase API (with 1-hour fallback)
  - Stale-while-revalidate for HTML pages
- 📦 **Precache**: 83 static entries for offline access
- 🎨 **Install Prompt**: Mobile/desktop PWA install support (UI coming in Phase 7)
- 📚 **Dependencies**: `vite-plugin-pwa` + `idb` (for offline sync queue in Phase 7)

**Configuration**:
```javascript
{
  name: 'Tube O2',
  short_name: 'Tube O2',
  display: 'standalone',
  theme_color: '#1a1a1a',
  icons: [192x192, 512x512],
  workbox: { /* caching strategies */ }
}
```

**Files Changed**:
- `vite.config.ts` — Added PWA plugin configuration

---

### 🔧 CI/CD Pipeline Enhancements

**The Problem**: CI was basic. No coverage reporting, no bundle monitoring.

**The Solution**: Enhanced pipeline with test coverage, bundle analysis, and PWA verification.

**What's New**:
- 📊 **Test Coverage Reports**: Generated and uploaded as artifact
- 📈 **Bundle Size Awareness**: Logs bundle size per build
- 🔄 **PWA Verification**: Confirms service worker generation
- 📦 **Artifact Retention**: 7-day retention for coverage reports
- ✅ **Package Manager**: Updated to use pnpm (more reliable than bun for this project)

**Files Changed**:
- `.github/workflows/ci.yml`

**Test Results**:
```
✓ 52 tests passed across 14 test files
✓ Build time: 30.09s
✓ No broken changes
```

---

### 🌍 Environment Configuration

**What's New**:
- Updated `.env.example` with organized variables for all phases
- Added feature flag support:
  - `VITE_ENABLE_RECOMMENDATIONS`
  - `VITE_ENABLE_RATINGS`
  - `VITE_ENABLE_SOCIAL_FEATURES`
  - `VITE_ENABLE_PWA`
- Prepared variables for Phase 2 OpenAI integration:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (default: gpt-4o-mini)

**Files Changed**:
- `.env.example`

---

### 📚 Documentation

**Files Created**:
- `docs/PHASE_1_SUMMARY.md` — Comprehensive Phase 1 summary with metrics and next steps

---

## Breaking Changes
**None** – Phase 1 is fully backward compatible.

---

## Migration Guide (if any)
No migration needed. Update dependencies and build.

---

---

## [v0.1.6] - February 1, 2026 🎉

### 🎤 "Ey, You There!" - Mention Autocomplete Feature

**The Problem**: You wanted to tag someone in a comment, but typing `@username` like a caveman? That's so 2010.

**The Solution**: Marcelo built you an autocomplete dropdown that's smoother than Brazilian coffee. ☕

**What's New**:
- ✨ **Smart Autocomplete**: Type `@` in any comment and boom – user suggestions appear faster than you can say "algoritmo maluco"
- ⌨️ **Keyboard Navigation**: Arrow keys to browse, Enter to select, Escape to bail. We respect keyboard warriors.
- 🔍 **Real-time Search**: 300ms debouncing so we don't spam the database like amateurs
- 🌐 **Fully Internationalized**: Works in PT, EN, ES, FR – porque somos globais, né?
- 📱 **Mobile-Ready**: Touch-friendly, responsive, no janky behavior
- ♿ **Accessible**: ARIA labels, proper role attributes – porque inclusão importa

**Technical Goodies**:
- `searchProfiles` API endpoint in entities layer (proper FSD architecture, baby)
- `useSearchProfiles` TanStack Query hook with smart caching
- `MentionAutocomplete` component with hover states and avatar previews
- Fixed click-outside handler bug (comments stay open when clicking mentions – you're welcome)

**Files Changed**:
- `src/entities/profile/profile.api.ts` - Added search function
- `src/features/profile/queries/useProfile.ts` - New hook
- `src/components/comment/MentionAutocomplete.tsx` - Beautiful dropdown
- `src/components/comment/CommentForm.tsx` - Integrated autocomplete magic
- `src/i18n/locales/*.json` - Translations for all languages
- `src/components/comment/CommentForm.test.tsx` - 10 passing tests because we're professionals

**Tests**: 10/10 passing ✅ (we don't ship broken code)

---

### 💬 "Everyone Can See Your Hot Takes Now" - Public Comments

**The Change**: Comments are now visible to EVERYONE, including anonymous lurkers.

**Why?**: Because good discussions deserve an audience. Plus, SEO juice and community transparency. 🍹

**What Changed**:
- 🌍 Dropped the auth-only RLS policy on comments
- 🔓 New policy: `"Anyone can view all comments"` (anon + authenticated users)
- 🔒 Security intact: Only logged-in users can post/edit/delete (we're not *that* crazy)

**Database Migration**: `make_comments_public`
```sql
-- Out with the old
DROP POLICY "Authenticated users can view all comments" ON public.comments;

-- In with the new
CREATE POLICY "Anyone can view all comments" ON public.comments
FOR SELECT TO anon, authenticated USING (true);
```

**Impact**:
- ✅ Better content discoverability
- ✅ Improved SEO (Google loves public content)
- ✅ Community transparency
- ✅ Engagement boost (people see conversations happening)
- 🔒 Write operations still require auth (no spam bots allowed)

---

### 🐛 "Whoops, That Wasn't Supposed to Happen" - Bug Fixes

**DOM Nesting Horror**: Fixed React warning about `<p>` tags containing `<div>` elements
- **File**: `src/components/comment/CommentItem.tsx`
- **Fix**: Changed comment content wrapper from `<p>` to `<div>` (HTML semantics matter, who knew?)
- **Why it happened**: MentionLink's HoverCard has block elements – can't nest those in `<p>` tags
- **Status**: Console errors gone, W3C validator happy 🎉

**Lint Errors Massacre**: Killed 12 TypeScript `any` types with proper `Mock` typing
- **File**: `src/components/comment/CommentForm.test.tsx`
- **Fix**: `(useAuth as unknown as Mock)` instead of lazy `as any`
- **Bonus**: Added `import type { Mock } from 'vitest'` like grown-ups
- **Status**: ESLint now purrs like a happy cat 😺

**Missing Dependency**: Added `type` to useMetaTags hook dependency array
- **File**: `src/shared/hooks/useMetaTags.ts`  
- **Why**: React was yelling at us in the console
- **Status**: Hooks exhaustive-deps warning eliminated ✅

---

## [v0.1.5] - January 30, 2026

### 🔧 Build & Infrastructure
- **Fixed import paths**: Corrected 12 incorrect `@hookform/resolvers/dist/zod.mjs` imports to use correct entry point `@hookform/resolvers/zod` across the codebase
  - Affected files: Submit, EditProfile, CreateEditPlaylist, Contact, Auth, PlaylistImportDialog, SocialAccountsManager, HeroSection, ResetPasswordForm, CommentForm, ChangePasswordForm, ChangeEmailForm
  - **Impact**: Resolves Rollup build errors preventing production builds
  
- **CI/CD Improvements**: Updated `.github/workflows/ci.yml` to properly install bun via npm in GitHub Actions environment
  - Changed from `corepack prepare bun@latest --activate` (unsupported) to `npm install -g bun`
  - **Impact**: CI pipeline now successfully runs linter, type checker, tests, and build

- **Build Status**: ✅ Production build verified successful
  - Bundle size: 1.13MB minified (317.5KB gzipped)
  - Modules transformed: 2,745
  - Non-fatal warnings: Code-splitting recommendation for large chunks

### ✨ Features & UX
- **Navigation Enhancement**: Added explicit "Videos" nav item to Header component
  - Route: `/videos` now labeled as "Videos" instead of generic "Categories"
  - **Implementation**: Updated `navLinks` array in `src/components/Header.tsx`
  - **Applies to**: Both desktop and mobile navigation menus

- **Internationalization**: Added `header.videos` translation key to all supported locales
  - ✅ English (en.json): "Videos"
  - ✅ Portuguese (pt.json): "Vídeos"
  - ✅ Spanish (es.json): "Videos"
  - ✅ French (fr.json): "Vidéos"
  - **Impact**: Videos nav label displays correctly in all languages

### 🧪 Quality Assurance
- **Test Suite**: All 16 tests passing across 6 test files
  - Video components test
  - Submit page functionality
  - Playlist management
  - Query keys and formatting utilities
  - YouTube URL parsing
  
- **Type Safety**: TypeScript compilation passes without errors
  
- **Code Quality**: ESLint checks completed with 8 non-breaking warnings (react-refresh)

### 📚 Documentation
- **Updated CODEBASE.md** with:
  - Recent changes and improvements section
  - Expanded route descriptions with functionality details
  - Development workflow commands
  - CI/CD pipeline documentation
  - Import path conventions and best practices
  - i18n usage patterns
  - Enhanced future enhancements roadmap
  
- **New CHANGELOG.md** (this file) for version tracking

### 🐛 Bug Fixes
- Resolved Rollup module resolution errors during production build
- Fixed CI/CD environment setup preventing GitHub Actions execution
- Corrected import resolution for form validation libraries

### ⚠️ Known Issues
- Large bundle size (1.1MB minified) - future optimization needed via code-splitting
- 8 ESLint warnings related to fast-refresh (non-critical, from shadcn/ui)
- Some chunks exceed 500KB recommendation (performance warning only)

### 🔐 Security
- All RLS policies remain intact and functional
- Supabase public key and service role key handling unchanged
- No security vulnerabilities introduced

---

## [v0.1.0] - Initial Stable Release

### Initial Features
- Video discovery and search
- User authentication (signup/login/password reset)
- Video submission with AI enrichment
- Playlist creation and management
- User profiles with customization
- Favorites management
- Community page
- Multi-language support (PT, EN, ES, FR)
- Responsive design (mobile/tablet/desktop)
- Comments on videos
- Social account linking
- Dark/light theme support

---

## Version Support

| Version | Status | Node | pnpm | Supabase |
|---------|--------|------|------|----------|
| 0.1.5   | Current | 20.x | Latest | Latest |
| 0.1.0   | Stable | 20.x | Latest | Latest |

---

## Migration Guide

### From v0.1.0 to v0.1.5
No breaking changes. Simply pull latest changes and run:
```bash
pnpm install
pnpm build
```

All existing data and migrations remain compatible.

---

## Contributing
When making changes, please:
1. Update this CHANGELOG.md with your changes
2. Follow the format: `### Category: Description`
3. Include affected files or components
4. Document any breaking changes
5. Update version in package.json if releasing

---

## Resources
- [Main README](../README.md)
- [CODEBASE Documentation](./CODEBASE.md)
- [GitHub Repository](https://github.com/marcelo-m7/tube-o2)
