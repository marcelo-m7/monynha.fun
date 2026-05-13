-- Restore client access to homepage featured videos RPC.
-- This function is SECURITY DEFINER and safe to expose with EXECUTE.

grant execute on function public.list_featured_videos(integer, integer) to anon, authenticated;
