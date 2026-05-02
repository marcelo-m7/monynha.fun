---
description: "Use when working on FastAPI backend routes, scheduler, YouTube sync, Supabase integration, or backend tests in backend/*.py."
name: "Backend Service Rules"
applyTo: "backend/**/*.py"
---
# Backend Service Rules

- Keep HTTP route handling in [backend/main.py](../../backend/main.py) and business logic in [backend/services](../../backend/services).
- Preserve service boundaries:
  - YouTube API access in [backend/services/youtube_api.py](../../backend/services/youtube_api.py)
  - Sync orchestration in [backend/services/video_sync.py](../../backend/services/video_sync.py)
  - Scheduling in [backend/services/scheduler.py](../../backend/services/scheduler.py)
  - Supabase access wrapper in [backend/services/supabase_client.py](../../backend/services/supabase_client.py)
- Reuse existing logging style and keep errors explicit at API boundaries.
- When changing API behavior, keep [backend/API_REFERENCE.md](../../backend/API_REFERENCE.md) consistent.
- When changing setup or env expectations, keep [backend/QUICK_START.md](../../backend/QUICK_START.md) consistent.
- Validate backend changes with `cd backend && pytest tests/ -v`.
