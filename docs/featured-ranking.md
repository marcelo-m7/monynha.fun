# Featured Videos Ranking

## Ranking formula
Featured videos are ranked simply by the number of views (most viewed first):

```
featured_score = view_count
```

### Rationale
- **Views** are the primary metric for determining video popularity.
- Videos with more views appear first in the featured section.
- Simple and transparent ranking that users can easily understand.

## Data sources
- `view_count` increments once per video per user/session per day.
- Counter columns `favorites_count` and `playlist_add_count` are still maintained for other features but do not affect featured ranking.

## Manual verification (dev)
1. Start the app (`npm run dev`).
2. Open the homepage and note the featured ordering.
3. Click on different videos multiple times (as different sessions or users).
4. Refresh the homepage and confirm videos are ordered by view count (highest to lowest).
5. Verify that clicking the same video multiple times in the same day does not increase the view count more than once for that session.
