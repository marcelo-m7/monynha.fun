-- Create function to delete user account and all associated data
-- This function should be run by the authenticated user to delete their own account

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the current user's ID
  user_id := auth.uid();
  
  -- Check if user is authenticated
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's data in order (respecting foreign key constraints)
  -- Note: Adjust table names and relationships according to your actual schema
  
  -- Delete AI enrichments
  DELETE FROM ai_enrichments WHERE video_id IN (
    SELECT id FROM videos WHERE submitted_by = user_id
  );
  
  -- Delete favorites
  DELETE FROM favorites WHERE user_id = user_id;
  
  -- Delete comments
  DELETE FROM comments WHERE user_id = user_id;
  
  -- Delete playlist items (from playlists owned by user)
  DELETE FROM playlist_videos WHERE playlist_id IN (
    SELECT id FROM playlists WHERE user_id = user_id
  );
  
  -- Delete playlists
  DELETE FROM playlists WHERE user_id = user_id;
  
  -- Delete playlist collaborators
  DELETE FROM playlist_collaborators WHERE user_id = user_id;
  
  -- Delete social accounts
  DELETE FROM user_social_accounts WHERE user_id = user_id;
  
  -- Delete videos submitted by user
  -- Note: This might want to be handled differently (keep videos but mark as deleted user)
  DELETE FROM videos WHERE submitted_by = user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE id = user_id;
  
  -- Finally, delete the auth user
  -- Note: This requires the auth.users table to have proper permissions
  -- Alternatively, you might want to mark the user as deleted instead
  DELETE FROM auth.users WHERE id = user_id;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_account() IS 'Allows authenticated users to delete their own account and all associated data';
