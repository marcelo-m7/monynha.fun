# FACODI v2 Gap Report

Date: 2026-06-22

## Summary

FACODI v2 has the right database shape in place, but the implementation was still mostly a schema foundation plus queue-only Edge Functions. The next architecture step is to make Supabase the functional backend: Postgres RPC functions own learning-object consistency and job state, Edge Functions act as authenticated mechanism entrypoints/processors, and React stays thin through action hooks.

## Current State

- The local branch for this implementation started at `b48b97c9827db00898254a24a65738bf676a4f39`.
- The deployed `facodi` schema includes learning objects, relations, specializations, jobs, semantic matches, embeddings, generated structures, and Odoo sync tables.
- The historical migration `20260622215518_facodi_learning_objects_core.sql` recreates `facodi` with `drop schema if exists facodi cascade`; this must not be repeated.
- Future FACODI schema work must be additive and preserve existing data.
- The deployed FACODI RPC surface was limited to helper functions before this phase.
- The canonical local `v2_` Edge Functions authenticated and queued jobs, but did not execute mechanisms.
- Older deployed `v2_` functions from a previous source tree remain active and should be wrapped, migrated, deprecated, or removed only after consumer review.
- The current frontend does not call the new FACODI v2 mechanisms yet.

## Gaps Addressed In This Slice

- Added an additive FACODI functional API migration with RPCs for learning object creation/update, relations, tree reads, job queueing, analysis results, semantic matches, generated structures, Odoo mappings, and job status reads.
- Refactored the shared v2 Edge Function queue helper to call FACODI queue RPCs instead of inserting directly into job tables.
- Added a thin frontend FACODI action/hook layer for v2 mechanisms and job status subscriptions.
- Added requested `src/lib/supabase/*` compatibility modules as re-exports only; business logic remains in entities/features/shared APIs.
- Added a transactional SQL smoke test script for the new RPC surface.

## Remaining Gaps

- The v2 Edge Functions still need real processors for import, analysis, matching, generation, and Odoo sync.
- `tube.publish_module_to_facodi` still needs a consistency refactor so Tube modules and videos always create/reuse `facodi.learning_objects` and `facodi.learning_object_relations`.
- `facodi.embeddings.embedding` is still JSONB; pgvector migration remains to be implemented safely.
- `vector` is installed in `public`; Supabase advisors recommend moving it out of public.
- Odoo mappings need live target-instance verification before final seed data.
- FACODI Realtime publication for job tables remains to be added after RLS review.
- Old deployed `v2_` functions need a compatibility/deprecation plan.

## Verification Targets

- Run the migration against Supabase and confirm all new `facodi.*` functions exist.
- Run `scripts/facodi-functional-api-smoke.sql` in a safe transaction.
- Run Supabase advisors after applying database changes.
- Run `pnpm typecheck`, `pnpm lint`, targeted tests, and `pnpm build`.