-- Drop the permissive insert policy for ai_enrichments
DROP POLICY IF EXISTS "ai_enrichments_insert_policy" ON public.ai_enrichments;

-- Optionally, you could add a more restrictive policy here if needed,
-- for example, allowing only service_role to insert.
-- However, since the Edge Function will use the service role key,
-- RLS will be bypassed for that specific operation, making a policy unnecessary for the Edge Function itself.
-- If direct database inserts by specific roles were desired, a policy like this could be used:
-- CREATE POLICY "Allow service role to insert enrichments" ON public.ai_enrichments
-- FOR INSERT TO service_role WITH CHECK (true);