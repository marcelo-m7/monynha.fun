# Changelog - Monynha Fun

All notable changes to Monynha Fun are documented in this file.

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

| Version | Status | Node | Bun | Supabase |
|---------|--------|------|-----|----------|
| 0.1.5   | Current | 20.x | Latest | Latest |
| 0.1.0   | Stable | 20.x | Latest | Latest |

---

## Migration Guide

### From v0.1.0 to v0.1.5
No breaking changes. Simply pull latest changes and run:
```bash
bun install
bun run build
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
- [GitHub Repository](https://github.com/Monynha-Softwares/video-vault)
