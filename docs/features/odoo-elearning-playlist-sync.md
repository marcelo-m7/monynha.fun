# Odoo eLearning -> Supabase FACODI Playlist Sync

## Objective

Create missing FACODI playlists in Supabase from Odoo eLearning data without touching existing portal/editor flows.

## Implemented Components

- `backend/services/odoo_elearning.py`
  - XML-RPC read-only client for `slide.channel` and `slide.slide`
  - Extracts normalized course/unit snapshots
  - Uses only environment variables: `ODOO_HOST`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`
- `backend/services/odoo_playlist_sync.py`
  - Builds planned playlist rows from Odoo snapshot
  - Supports three modes: `dry-run`, `apply`, `verify`
  - Dedup by `external_source + external_id`
  - Writes sanitized execution logs under `docs/logs/`
- `backend/sync_odoo_playlists.py`
  - CLI entrypoint for mode execution (`--dry-run`, `--apply`, `--verify`)
- `backend/main.py`
  - New endpoint `POST /sync_odoo_playlists`

## Sync Modes

- `dry-run`
  - Reads Odoo and Supabase
  - Returns plan only (no writes)
- `apply`
  - Inserts only missing playlists
  - Uses dedup key to avoid duplicates
- `verify`
  - Compares expected Odoo-based identities against existing Supabase rows
  - Reports `verified`, `mismatches`, and duplicate identities

## Supabase Schema Changes

Migration added:

- `supabase/migrations/20260502142000_add_odoo_external_identity_to_playlists.sql`

Changes:

- Add `playlists.external_source` (text) if missing
- Add `playlists.external_id` (text) if missing
- Add unique constraint on `(external_source, external_id)` if missing
- Add index `idx_playlists_external_source` if missing

## API Contract

`POST /sync_odoo_playlists`

Request:

```json
{
  "mode": "dry-run"
}
```

Response:

```json
{
  "mode": "apply",
  "planned": 20,
  "created": 20,
  "verified": 0,
  "duplicates": 0,
  "mismatches": 0,
  "skipped": 0,
  "log_path": ".../docs/logs/odoo-elearning-playlist-sync-apply-*.json"
}
```

## Safety Notes

- No credentials are hardcoded.
- Logs contain operational metadata only (mode, counts, payload preview).
- Existing playlists are not modified by `dry-run` or `verify`.
- `apply` inserts only rows that are not already present by external identity.
