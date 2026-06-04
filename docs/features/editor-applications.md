# Editor Applications

## Scope

This feature introduces a full editor recruiting flow:

- Public CTA on Home page linking to `/editor/apply`
- Public application form persisted in `public.editor_applications`
- Automatic confirmation email through Supabase Edge Function `send-editor-application-confirmation`
- Internal moderation page at `/editor/applications` for `editor` and `admin` profiles

## Data model

Table: `public.editor_applications`

Key fields:

- `full_name`
- `email`
- `motivation`
- `portfolio_url`
- `consent_privacy`
- `source_page`
- `status` (`pending | under_review | approved | rejected`)
- `review_notes`
- `reviewed_by`
- `reviewed_at`
- `created_at`
- `updated_at`

## Security model

- RLS enabled on table.
- `anon` and `authenticated` can `INSERT` only when `consent_privacy = true`.
- `authenticated` can `SELECT` and `UPDATE` only if current profile role is `editor` or `admin`.
- Direct grants are explicit for Data API compatibility with recent Supabase exposure changes.

## Frontend architecture

- Entity layer:
  - `src/entities/editor_application/editor_application.types.ts`
  - `src/entities/editor_application/editor_application.api.ts`
  - `src/entities/editor_application/editor_application.keys.ts`
- Feature layer:
  - `src/features/editor-applications/editorApplicationSchema.ts`
  - `src/features/editor-applications/queries/useEditorApplications.ts`
  - `src/features/editor-applications/components/EditorApplicationForm.tsx`
  - `src/features/editor-applications/components/EditorApplicationCTA.tsx`
- Pages:
  - `src/pages/EditorApply.tsx`
  - `src/pages/EditorApplications.tsx`

## Email flow

After successful insert:

1. Frontend calls `send-editor-application-confirmation` with `applicationId`, `fullName`, and `email`.
2. Function validates payload.
3. Function verifies record consistency in DB.
4. Function sends email via Resend API.
5. Email failure does not rollback application insert.

Required Edge Function environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional, has fallback)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Moderation workflow

Current workflow:

- `pending`
- `under_review`
- `approved`
- `rejected`

Moderators can search by applicant name/email and update status directly from the moderation page.
