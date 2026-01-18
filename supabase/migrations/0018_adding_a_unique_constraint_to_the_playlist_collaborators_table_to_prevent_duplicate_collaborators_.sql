ALTER TABLE public.playlist_collaborators
ADD CONSTRAINT unique_playlist_user_collaborator UNIQUE (playlist_id, user_id);