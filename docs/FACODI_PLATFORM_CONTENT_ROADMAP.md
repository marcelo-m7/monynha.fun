# FACODI/Tube O2 Platform And Content Roadmap

Status date: 2026-06-05

## Current Baseline

- Tube O2 has 512 videos, 84 playlists, 502 playlist-video links, and 369 submissions.
- FACODI has 12 courses, 416 curricular units, 352 knowledge chunks, 475 videos, and 243 classifications.
- LESTI is the first editorial focus: 35 playlists, 265 videos, 28 empty playlists, 4 thin playlists, 1 healthy playlist, and 2 overloaded playlists.
- LDC remains second priority: 41 playlists, 35 videos, 33 empty playlists, 6 thin playlists, and 2 healthy playlists.
- `enrich-video` remains the fast legacy enrichment path. Deep `v2_*` analysis stays optional.

## Implemented Foundation

- Added `public.v_facodi_playlist_health` for read-only playlist health.
- Added `public.v_facodi_content_backlog` for editorial backlog ordering.
- Both views use `security_invoker = true` and expose only derived public playlist health data.
- Redeployed `enrich-video` and `import-youtube-playlist` with JWT verification enabled.
- `/facodi` now shows course-first curriculum health with LESTI selected by default.

## Six-Week Track

### Week 1: Stabilization And Safety

- Keep `enrich-video` fast and authenticated.
- Reduce recoverable submission errors to at most 3.
- Process or reclassify pending analysis jobs where data is sufficient.
- Use playlist health views to drive LESTI editorial triage.

### Weeks 2-3: LESTI Content Coverage

- Prioritize required 1st and 2nd year LESTI units.
- Reduce empty LESTI playlists from 28 to at most 12.
- Keep overloaded playlists intact, but order best videos first.
- Use public YouTube URLs, public playlists, HTML, oEmbed, and feeds only.

### Weeks 3-4: Editorial Desk

- Add queues for `needs_review`, empty playlists, overloaded playlists, and recoverable submissions.
- Support accept, move, reject, duplicate, and reprocess actions.
- Show classification evidence: title, channel, tags, suggested playlist, confidence, and deterministic signals.

### Weeks 4-5: Public FACODI Experience

- Evolve `/facodi` into course -> semester -> curricular unit -> playlist navigation.
- Display empty playlists as "in curation".
- Prioritize public lists with videos and ordered study paths.

### Week 6: Controlled Expansion

- Finish LESTI before expanding to LDC or other engineering courses.
- Run blocking-only RLS/view/function audit.
- Publish a coverage report by course, unit, playlist, videos, pending work, and editorial decisions.

## Acceptance Metrics

- LESTI empty playlists <= 12.
- Recoverable submissions <= 3.
- Anonymous calls to `enrich-video` return 401/403 and do not mutate data.
- `v_facodi_playlist_health` and `v_facodi_content_backlog` are queryable from the app.
- `/facodi` renders public course health and distinguishes empty, thin, healthy, and overloaded playlists.
