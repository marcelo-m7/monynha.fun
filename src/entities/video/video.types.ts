import type { Database } from '@/integrations/supabase/types';
import type { AiEnrichment } from '@/entities/ai_enrichment/ai_enrichment.types';

export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export type VideoCategory = Database['public']['Tables']['categories']['Row'];

export type VideoAssignedPlaylist = Pick<
  Database['public']['Tables']['playlists']['Row'],
  'id' | 'name' | 'slug' | 'is_ordered' | 'course_code' | 'unit_code'
>;

export type VideoWithCategory = Video & {
  category?: VideoCategory | null;
  enrichment?: AiEnrichment | null;
  assignedPlaylists?: VideoAssignedPlaylist[];
};
