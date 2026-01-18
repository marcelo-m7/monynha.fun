CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, bio, avatar_path)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', new.email),
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    NULL, -- Default bio to NULL, user can update later
    NULL  -- Initialize avatar_path to NULL
  );
  RETURN new;
END;
$$;