import type { Database } from '@/integrations/supabase/types';

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];
