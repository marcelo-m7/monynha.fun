-- Backfill existing videos as featured if they already meet the view threshold
UPDATE public.videos
SET is_featured = true
WHERE view_count >= 100 AND is_featured = false;
