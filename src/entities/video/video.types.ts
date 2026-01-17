import type { Database } from '@/integrations/supabase/types';

export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export type VideoCategory = Database['public']['Tables']['categories']['Row'];

export type VideoWithCategory = Video & {
  category?: VideoCategory | null;
};
