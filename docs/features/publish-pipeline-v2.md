# Publish Pipeline v2 (Tube -> FACODI)

This document describes the asynchronous publication pipeline introduced for module-driven publishing.

## Overview

Pipeline steps:

1. Editorial action enqueues a module publish request via `enqueue-module-publication-v2`.
2. Queue records are stored in `tube.publish_jobs`.
3. Worker claims jobs atomically via `tube.claim_publish_jobs(...)`.
4. Worker publishes through `tube.publish_module_to_facodi(...)`.
5. Outcomes are tracked in `tube.publish_job_events` and reconciled in `tube.v_publish_job_reconciliation`.

## Edge Functions

- `supabase/functions/enqueue-module-publication-v2/index.ts`
  - User-triggered endpoint.
  - Validates bearer token.
  - Applies rate limiting through `public.check_edge_rate_limit(...)`.
  - Enqueues idempotently with `tube.enqueue_module_publication(...)`.

- `supabase/functions/process-publish-jobs-v2/index.ts`
  - Worker endpoint.
  - Requires `x-worker-secret` when `PUBLISH_WORKER_SECRET` is configured.
  - Claims jobs via `tube.claim_publish_jobs(...)`.
  - Applies retry/backoff and writes audit events.

- `supabase/functions/get-module-publication-status-v2/index.ts`
  - User-triggered status endpoint.
  - Validates bearer token and applies rate limiting.
  - Returns publication jobs for the authenticated requester (by module or by job).

- `supabase/functions/list-module-publication-candidates-v2/index.ts`
  - User-triggered candidate endpoint for editorial use.
  - Validates bearer token, enforces editor/admin role, and applies rate limiting.
  - Maps legacy FACODI playlists to Tube modules and includes the latest requester job hint per module.

## Required Secrets

Set these secrets in Supabase for deployed functions:

- `SUPABASE_SERVICE_ROLE_KEY`
- `EDGE_CORS_ORIGIN` (recommended: `https://tube.open2.tech`)
- `PUBLISH_WORKER_SECRET`
- `EDGE_ENQUEUE_RATE_LIMIT_WINDOW_SECONDS`
- `EDGE_ENQUEUE_RATE_LIMIT_MAX_REQUESTS`

## Scheduling

Recommended schedule for the worker:

- Interval: every 1-2 minutes.
- Function: `process-publish-jobs-v2`.
- Body: `{ "limit": 10 }` (tune as needed).
- Header: `x-worker-secret: <PUBLISH_WORKER_SECRET>`.

## Operational Checks

1. Queue health: inspect `tube.publish_jobs` status distribution.
2. Event history: inspect `tube.publish_job_events` by `publish_job_id`.
3. Reconciliation: query `tube.v_publish_job_reconciliation` for drift between jobs and publication records.
4. Alerts: investigate repeated `retryable_error` before jobs hit `failed`.
