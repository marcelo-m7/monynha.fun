CREATE OR REPLACE FUNCTION public._playlist_videos_after_change_refresh_playlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM update_playlist_derived_fields(COALESCE(NEW.playlist_id, OLD.playlist_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;