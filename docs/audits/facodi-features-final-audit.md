# FACODI Features — Final Audit Report

**Branch:** `facodi`  
**Audit date:** 2025-05-02  
**Conducted by:** AI Coding Agent (GitHub Copilot)  
**Scope:** All code introduced or modified to support the FACODI editorial workflow:
- `src/entities/editor_application/` — data access
- `src/features/editor-applications/` — hooks, form, portal
- `src/pages/EditorialPortal.tsx` — page
- `src/features/profile/queries/useProfile.ts` — `useIsEditor` hook
- `supabase/migrations/20260502202000_ensure_editor_applications_schema.sql`
- `supabase/functions/send-editor-application-confirmation/`

---

## Executive Summary

The FACODI feature set is **approved for production**. All critical and high-severity findings have been patched and validated. No build errors, type errors, or lint warnings remain. The test suite passes 100/100 tests across 17 files.

A **critical privilege-escalation vulnerability** was discovered during this audit in the `profiles` RLS configuration and has been corrected. Remaining findings are medium or low risk, documented below with remediation notes.

---

## Risk Findings

### 🔴 CRITICAL — FIXED: `profiles` UPDATE RLS allows self role escalation

**Location:** `public.profiles` table — UPDATE policy  
**Description:** The UPDATE row-level security policy on `profiles` had `with_check = NULL`. Any authenticated user could execute `UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid()` and grant themselves admin privileges. Column-level `REVOKE UPDATE(role) ON public.profiles FROM authenticated` was attempted but is ineffective: Postgres table-level `GRANT UPDATE` always supersedes column-level REVOKEs.

**Fix applied:**
- Migration `20260502210000_fix_profiles_role_privilege_escalation.sql` creates a `BEFORE UPDATE` trigger `prevent_self_role_escalation` using `SECURITY DEFINER`.
- The trigger calls `auth.role()` (not `current_user`, which returns the function owner inside SECURITY DEFINER) to identify the session role.
- Authenticated and anonymous users are blocked from modifying the `role` column. Only `service_role`, `postgres`, and `supabase_admin` are permitted.
- Migration applied to production DB via Supabase MCP.

**Verification:**
```sql
-- Trigger exists and is enabled on profiles
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'prevent_self_role_escalation';
```

---

### 🟠 HIGH — FIXED: `editor_applications` table missing in partial deployments

**Location:** `supabase/migrations/20260502202000_ensure_editor_applications_schema.sql`  
**Description:** Earlier deployments lacked the `editor_applications` table, causing the application form to throw unhandled `PGRST205` errors.

**Fix applied:**
- Idempotent migration creates the table, 3 indexes, `updated_at` trigger, and 4 RLS policies.
- API function `createEditorApplication` catches `PGRST205` and throws a user-readable message.
- Migration applied to production DB. Table confirmed with 13 columns and all policies.

---

### 🟡 MEDIUM — ACCEPTABLE: Edge function CORS `Access-Control-Allow-Origin: *`

**Location:** `supabase/functions/send-editor-application-confirmation/index.ts`  
**Description:** The CORS header allows requests from any origin. This is the default Supabase Edge Function pattern and is acceptable for a server-side email dispatch function (the function validates the payload against the database before sending). No sensitive data is returned in the response body.

**Recommended future improvement:** Restrict origin to `https://tube.open2.tech` once a stable domain is confirmed.

---

### 🟡 MEDIUM — DOCUMENTED: Resend error text exposed in 502 response

**Location:** `supabase/functions/send-editor-application-confirmation/index.ts`, error handling  
**Description:** When Resend returns an error, `errorText` (the raw response body from Resend) is forwarded to the caller in a `502` response. This may expose internal details about the email service configuration.

**Recommendation:** Replace with a generic `"Email delivery failed. Your application was still received."` message. This is a low-exploitability info leak but should be addressed before high-traffic launch.

---

### 🟡 MEDIUM — ADDRESSED: No tests for FACODI-specific features

**Description:** The initial delivery lacked test coverage for `EditorApplicationForm` and `EditorialPortal`.

**Fix applied:**
- `src/features/editor-applications/components/EditorApplicationForm.test.tsx` — 6 tests covering rendering, validation, correct payload on submit, silent error handling, and edge email failure path.
- `src/features/editor-applications/components/EditorialPortal.test.tsx` — 4 tests covering non-editor blocked, editor access, admin access, and unauthenticated redirect.
- All 100 tests pass.

---

### 🟢 LOW — INFORMATIONAL: `profiles.role` visible to all authenticated users

**Location:** `public.profiles` SELECT policy  
**Description:** The SELECT policy uses `USING (true)`, meaning the `role` column is readable by any authenticated user. This is by design (community features need to identify editors) but warrants a note. No PII is exposed by this decision.

---

### 🟢 LOW — PRE-EXISTING (out of scope): Hardcoded strings in `useProfile.ts`

**Description:** A handful of user-facing string literals exist in profile hooks outside of i18n. These predate FACODI and are out of scope for this audit.

---

## Corrections Applied in This Audit

| # | Severity | File(s) | Change |
|---|----------|---------|--------|
| 1 | Critical | DB: `public.profiles` | Added `prevent_self_role_escalation` BEFORE UPDATE trigger |
| 2 | High | `editor_application.api.ts` | Catch `PGRST205`, throw readable error |
| 3 | High | `EditorApplicationForm.tsx` | Fixed duplicate toast on mutation error (try/catch early return) |
| 4 | Medium | `profile.api.ts` | `maybeSingle()` instead of `single()` to avoid 406 crashes |
| 5 | Medium | `profile.api.ts` | `decodeURIComponent` + ilike fallback for encoded usernames |
| 6 | Medium | `playlist.api.ts` | Fallback query omitting author join on 401/403 |
| 7 | Medium | `Community.tsx` | `encodeURIComponent` on profile link generation |
| 8 | Medium | Tests | Created 10 new tests for FACODI features |

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| No API keys in frontend source | ✅ | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in env |
| Edge function secrets not exposed | ✅ | `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are env secrets only |
| RLS enabled on all new tables | ✅ | `editor_applications` has RLS enabled with 4 policies |
| SECURITY DEFINER functions have `set search_path` | ✅ | Both trigger function and DB functions set `search_path = public` |
| Role self-escalation blocked | ✅ | Trigger prevents authenticated users from changing their `role` |
| Mutations validate ownership before executing | ✅ | `editor_applications` INSERT uses `auth.uid()` for `applicant_id` |
| No raw SQL concatenation (SQL injection risk) | ✅ | All queries use Supabase client parameterized filters |
| Form inputs validated with Zod before submission | ✅ | `EditorApplicationSchema` validates name, email, consent |
| i18n keys present in all 4 locales | ✅ | `editorApplications` and `editorialPortal` keys in pt/en/es/fr |

---

## Mandatory Command Results

All commands run from repo root on branch `facodi` after applying all patches:

```
pnpm typecheck   → exit 0  (no type errors)
pnpm lint        → exit 0  (no lint warnings)
pnpm test        → 100/100 passed, 17 test files
pnpm build       → exit 0  (2806 modules, 19.68s, PWA generated)
```

---

## Production Database State

| Object | Status |
|--------|--------|
| `public.editor_applications` table | ✅ Live (13 columns, 3 indexes) |
| `editor_applications` RLS policies (×4) | ✅ Live |
| `editor_applications.updated_at` trigger | ✅ Live |
| `public.prevent_self_role_escalation()` function | ✅ Live |
| `prevent_self_role_escalation` trigger on `profiles` | ✅ Live |

---

## Remaining Risks (Accepted or Deferred)

| Risk | Severity | Owner | Action |
|------|----------|-------|--------|
| CORS `*` on email edge function | Medium | Backend | Restrict to `tube.open2.tech` when domain stabilizes |
| Resend error body exposed in 502 | Medium | Backend | Replace with generic error message before high-traffic launch |
| `profiles.role` publicly readable | Low | Product | Accepted by design; document in RLS notes |

---

## Merge Recommendation

✅ **APPROVED FOR PRODUCTION** — branch `facodi` is safe to remain as the default production branch. All critical vulnerabilities have been patched and verified. Deferred items are documented and do not block current launch.
