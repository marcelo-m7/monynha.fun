import type { Database } from '@/integrations/supabase/types';

export type AiEnrichment = Database['public']['Tables']['ai_enrichments']['Row'];
export type AiEnrichmentInsert = Database['public']['Tables']['ai_enrichments']['Insert'];
export type AiEnrichmentUpdate = Database['public']['Tables']['ai_enrichments']['Update'];
