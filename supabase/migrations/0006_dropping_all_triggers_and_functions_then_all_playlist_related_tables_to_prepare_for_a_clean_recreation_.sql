-- Drop triggers that depend on functions, starting with auth.users trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_videos_updated_at ON public.videos;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
DROP TRIGGER IF EXISTS update_playlist_progress_updated_at ON public.playlist_progress;
DROP TRIGGER IF EXISTS on_video_submitted ON public.videos;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.increment_submissions_count();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing tables if they exist, cascading to dependent objects
DROP TABLE IF EXISTS public.playlist_collaborators CASCADE;
DROP TABLE IF EXISTS public.playlist_progress CASCADE;
DROP TABLE IF EXISTS public.playlist_videos CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;