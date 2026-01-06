-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT '#FF6B5B',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories (public read)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

-- Insert default categories
INSERT INTO public.categories (name, slug, icon, color) VALUES
  ('Tutoriais Antigos', 'tutoriais-antigos', 'BookOpen', '#FF6B5B'),
  ('Receitas Tradicionais', 'receitas-tradicionais', 'ChefHat', '#4ECDC4'),
  ('Educação', 'educacao', 'GraduationCap', '#FFE66D'),
  ('Memes Icônicos', 'memes-iconicos', 'Laugh', '#95E1D3'),
  ('Música', 'musica', 'Music', '#F38181'),
  ('Cultura', 'cultura', 'Globe', '#AA96DA'),
  ('Não Classificados', 'nao-classificados', 'HelpCircle', '#A8A8A8');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
ON public.videos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can submit videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own videos"
ON public.videos FOR UPDATE
USING (auth.uid() = submitted_by);

CREATE POLICY "Users can delete their own videos"
ON public.videos FOR DELETE
USING (auth.uid() = submitted_by);

-- Trigger for videos updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment submissions count
CREATE OR REPLACE FUNCTION public.increment_submissions_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET submissions_count = submissions_count + 1
  WHERE id = NEW.submitted_by;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment submissions count
CREATE TRIGGER on_video_submitted
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.increment_submissions_count();

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_videos_category ON public.videos(category_id);
CREATE INDEX idx_videos_submitted_by ON public.videos(submitted_by);
CREATE INDEX idx_videos_language ON public.videos(language);
CREATE INDEX idx_videos_featured ON public.videos(is_featured) WHERE is_featured = true;
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_video ON public.favorites(video_id);