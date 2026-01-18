-- Create user_social_accounts table
CREATE TABLE public.user_social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.user_social_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for user_social_accounts table
-- Public read access: Anyone can view social accounts
CREATE POLICY "Public read access to user social accounts" ON public.user_social_accounts
FOR SELECT USING (true);

-- Authenticated users can insert their own social accounts
CREATE POLICY "Users can insert their own social accounts" ON public.user_social_accounts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own social accounts
CREATE POLICY "Users can update their own social accounts" ON public.user_social_accounts
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Authenticated users can delete their own social accounts
CREATE POLICY "Users can delete their own social accounts" ON public.user_social_accounts
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add a trigger to update the 'updated_at' column automatically
CREATE TRIGGER update_user_social_accounts_updated_at
BEFORE UPDATE ON public.user_social_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();