-- Create playlists table
CREATE TABLE public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code TEXT,
  unit_code TEXT,
  language TEXT DEFAULT 'pt' NOT NULL,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on course_code and unit_code for quick lookups
CREATE INDEX idx_playlists_course_unit ON public.playlists (course_code, unit_code);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Policies for playlists table
CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists
FOR SELECT USING (is_public = TRUE OR auth.uid() = author_id);

CREATE POLICY "Authenticated users can create playlists" ON public.playlists
FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Owners can update their own playlists" ON public.playlists
FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Owners can delete their own playlists" ON public.playlists
FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Trigger to update 'updated_at' column on playlist changes
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();