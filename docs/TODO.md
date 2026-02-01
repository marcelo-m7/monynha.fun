# Recent Updates Summary - February 1, 2026

## Overview
*Where Marcelo documents his coding adventures and occasional "oh crap" moments* 😅

Comprehensive updates to Monynha Fun codebase: mentions autocomplete (porque copiar usernames é coisa de 2005), public comments (everyone can see your hot takes now), bug fixes (DOM nesting horror resolved), and docs updates (because future-Marcelo will thank past-Marcelo).

---

## 🎉 NEW FEATURES - February 1, 2026

### 1. Mention Autocomplete ✨

**The Vibe**: Type `@` in comments and watch the magic happen. Autocomplete dropdown appears faster than you can say "algoritmo maluco".

**What Works**:
- ✅ Smart user search with 300ms debouncing (no database spam)
- ✅ Keyboard navigation (↑↓ arrows, Enter to select, Escape to bail)
- ✅ Avatar previews and display names (because faces > usernames)
- ✅ Real-time filtering as you type
- ✅ Mobile-responsive (no janky behavior on touch screens)
- ✅ Fully accessible (ARIA labels, proper roles)
- ✅ Internationalized (PT, EN, ES, FR)
- ✅ Click outside to close (but not *too* eager – mentions dropdown stays open when clicking suggestions)

**Technical Implementation**:
```typescript
// Entity layer - profile.api.ts
export async function searchProfiles(query: string, limit = 10)

// Feature layer - useProfile.ts  
export function useSearchProfiles(query: string, limit?: number)

// Component - MentionAutocomplete.tsx
<MentionAutocomplete users={...} onSelect={insertMention} />

// Integration - CommentForm.tsx
// @ detection, debouncing, keyboard handlers, cursor positioning
```

**Files Modified**:
- `src/entities/profile/profile.api.ts` - Search API
- `src/features/profile/queries/useProfile.ts` - Query hook
- `src/components/comment/MentionAutocomplete.tsx` - Dropdown component (NEW)
- `src/components/comment/CommentForm.tsx` - Integration logic
- `src/components/comment/CommentForm.test.tsx` - 10 passing tests (NEW)
- `src/i18n/locales/{en,pt,es,fr}.json` - Translations

**Test Coverage**: 10/10 tests passing ✅
- Autocomplete display
- User filtering
- Loading states
- Keyboard navigation
- Mention insertion
- Accessibility
- Unauthenticated state

**Why It's Cool**: No more copying usernames like a caveman. Just type, select, done. Plus, it's faster than most autocompletes out there (300ms debounce + smart caching). Marcelo is proud of this one. 😎

---

### 2. Public Comments 🌍

**The Change**: Comments are now visible to EVERYONE – authenticated users AND anonymous lurkers.

**Database Migration**: `make_comments_public` (applied February 1, 2026)
```sql
-- Out with the old auth-only policy
DROP POLICY "Authenticated users can view all comments" ON public.comments;

-- In with the new public policy  
CREATE POLICY "Anyone can view all comments" ON public.comments
FOR SELECT TO anon, authenticated USING (true);
```

**Security Status**: 🔒 Still Locked Down Where It Matters
- ✅ READ: Public (anon + authenticated)
- 🔐 CREATE: Authenticated only
- 🔐 UPDATE: Own comments only
- 🔐 DELETE: Own comments only

**Why We Did This**:
1. Better content discoverability (good discussions deserve audiences)
2. SEO juice (Google loves public content)
3. Community transparency (no gatekeeping)
4. Engagement boost (people see convos happening)
5. Makes the platform feel more alive

**Impact**: Anonymous visitors can now read all the spicy takes and thoughtful discussions. But they still need to sign up to contribute. Fair trade. 🤝

---

### 3. Bug Slaying Session 🐛⚔️

**DOM Nesting Horror** (Fixed)
- **Error**: `Warning: validateDOMNesting(...): <p> cannot appear as a descendant of <p>`
- **Root Cause**: Comment content wrapped in `<p>`, but MentionLink's HoverCard has block elements (`<div>`, `<p>`). HTML gods were angry.
- **Fix**: Changed wrapper from `<p>` to `<div>` in `CommentItem.tsx`
- **Status**: Console clean, W3C validator happy ✅

**TypeScript Lint Errors** (Massacred)
- **Errors**: 12x "Unexpected any. Specify a different type" in test files
- **Fix**: Replaced lazy `as any` with proper `as unknown as Mock` typing
- **Bonus**: Added `import type { Mock } from 'vitest'`
- **Status**: ESLint purring like a happy cat 😺

**React Hook Dependency Warning** (Silenced)
- **Warning**: `useEffect has a missing dependency: 'type'`
- **Fix**: Added `type` to dependency array in `useMetaTags.ts`
- **Status**: React happy, console quiet ✅

**Click Outside Handler Bug** (Squashed)
- **Issue**: Clicking mention suggestion closed dropdown before selection fired
- **Fix**: Added `autocompleteRef` to track dropdown element, updated click-outside logic
- **Status**: Mentions now insert properly on click 🎯

---

## PREVIOUS UPDATES - January 30, 2026

---

## 1. Build Fixes ✅

### Issue: Rollup Import Resolution Error
**Error**: `Rollup failed to resolve import "@hookform/resolvers/dist/zod.mjs"`

**Root Cause**: Direct file path imports don't resolve in production builds. The package exposes a public entry point that should be used instead.

**Solution**: Updated 12 files with incorrect import paths
```javascript
// ❌ Before
import { zodResolver } from '@hookform/resolvers/dist/zod.mjs';

// ✅ After  
import { zodResolver } from '@hookform/resolvers/zod';
```

**Files Updated**:
1. `src/pages/Submit.tsx`
2. `src/pages/EditProfile.tsx`
3. `src/pages/CreateEditPlaylist.tsx`
4. `src/pages/Contact.tsx`
5. `src/pages/Auth.tsx`
6. `src/components/playlist/PlaylistImportDialog.tsx`
7. `src/components/profile/SocialAccountsManager.tsx`
8. `src/components/HeroSection.tsx`
9. `src/components/auth/ResetPasswordForm.tsx`
10. `src/components/comment/CommentForm.tsx`
11. `src/components/account/ChangePasswordForm.tsx`
12. `src/components/account/ChangeEmailForm.tsx`

**Status**: ✅ Build now completes successfully

---

## 2. CI/CD Pipeline Setup ✅

### Issue: GitHub Actions Failing
**Error**: `bun: command not found` in GitHub Actions environment

**Root Cause**: Bun was not installed in the CI runner. Corepack preparation syntax was incorrect.

**Solution**: Updated `.github/workflows/ci.yml`
```yaml
# ❌ Before
- name: Prepare bun
  run: corepack prepare bun@latest --activate

# ✅ After
- name: Install bun
  run: npm install -g bun
```

**Pipeline Status**: ✅ All jobs now execute successfully
- Lint: ✓ Pass (8 non-critical warnings)
- Type check: ✓ Pass (no errors)
- Tests: ✓ Pass (16/16 passing)
- Build: ✓ Pass (1.13MB bundle)

---

## 3. Navigation & UX Improvements ✅

### Header Videos Nav Item
**Change**: Added explicit "Videos" navigation item to replace generic "Categories" label

**Files Updated**:
- `src/components/Header.tsx` - Updated `navLinks` array
- `src/i18n/locales/en.json` - Added `header.videos: "Videos"`
- `src/i18n/locales/pt.json` - Added `header.videos: "Vídeos"`
- `src/i18n/locales/es.json` - Added `header.videos: "Videos"`
- `src/i18n/locales/fr.json` - Added `header.videos: "Vidéos"`

**Implementation**:
```tsx
const navLinks = [
  { to: "/", label: t('header.home'), icon: Home },
  { to: "/videos", label: t('header.videos'), icon: ListVideo },
  // ... other nav items
];
```

**Impact**: 
- ✅ Clearer navigation semantics
- ✅ Multi-language support for Videos label
- ✅ Consistent across desktop and mobile menus

---

## 4. Documentation Updates ✅

### CODEBASE.md Enhancements
- Added "Recent Changes & Improvements" section at top
- Expanded route descriptions with functionality details
- Added "Development Workflow" section with all available commands
- Added "CI/CD Pipeline" documentation
- Added "Important: Import Path Conventions" best practices
- Expanded "Internationalization (i18n)" section
- Enhanced "Future Enhancements" roadmap

### NEW: CHANGELOG.md
Created comprehensive version history tracking:
- v0.1.5 (current) - All recent changes documented
- v0.1.0 (initial) - Feature overview
- Version support table
- Migration guide
- Contributing guidelines

### NEW: RECENT_UPDATES.md
This document - quick reference for January 30 updates

---

## 5. Quality Metrics ✅

| Metric | Status | Details |
|--------|--------|---------|
| **Build** | ✅ Pass | 1.13MB minified (317.5KB gzip) |
| **TypeScript** | ✅ Pass | No type errors |
| **Tests** | ✅ Pass | 16/16 tests passing |
| **Lint** | ⚠️ 8 warnings | Non-breaking, from shadcn/ui |
| **Module Count** | 2,745 | Transformed successfully |
| **CI Pipeline** | ✅ Pass | All jobs execute |

---

## 6. Key Takeaways

### For Developers
1. ✅ Build system is now robust and tested
2. ✅ CI/CD pipeline is fully functional
3. ✅ Import paths follow package conventions (not direct file paths)
4. ✅ Navigation UX is improved with clearer labeling
5. ✅ Documentation is comprehensive and up-to-date

### For Future Contributors
- Always use public entry points for third-party library imports
- Run `bun run build` locally before pushing to verify production build
- Update CHANGELOG.md when making changes
- All 4 locales (PT, EN, ES, FR) need synchronization for new features
- CI/CD automatically validates code quality on all branches

---

## 7. Next Steps

### Immediate
- [ ] Merge changes to main/stable branch
- [ ] Create release v0.1.5 on GitHub
- [ ] Tag deployment with latest version

### Near-term (February)
- [ ] Implement code-splitting to reduce bundle size
- [ ] Address 8 ESLint warnings
- [ ] Consider additional locales (Italian, German, Japanese)

### Medium-term
- [ ] Performance optimization: image lazy loading, caching strategies
- [ ] Accessibility audit and improvements (WCAG 2.1 AA)
- [ ] Enhanced search capabilities

---

## Testing Checklist

Before deployment, verify:
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` completes
- [ ] `/videos` route displays "Videos" label in all languages
- [ ] Header nav works on mobile and desktop
- [ ] No console errors in browser DevTools

---

## Contact & Support

For questions about these updates:
- **Repository**: https://github.com/Monynha-Softwares/video-vault
- **Documentation**: See `docs/` folder
- **Issues**: Report on GitHub Issues

---

*Last Updated: January 30, 2026*
