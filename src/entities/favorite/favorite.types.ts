import type { Database } from '@/integrations/supabase/types';
import type { Video } from '@/entities/video/video.types';

export type Favorite = Database['public']['Tables']['favorites']['Row'] & {
  video?: Video | null;
};
