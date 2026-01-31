import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { AiEnrichment } from './ai_enrichment.types';

export async function listAiEnrichmentsByVideoId(videoId: string) {
  const { data, error } = await supabase
    .from('ai_enrichments')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AiEnrichment[];
}

export async function getLatestAiEnrichmentByVideoId(videoId: string) {
  const { data, error } = await supabase
    .from('ai_enrichments')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as AiEnrichment | null;
}
