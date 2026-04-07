import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EnrichVideoRequest {
  videoId: string;
  youtubeUrl: string;
}

export interface EnrichVideoResponse {
  message: string;
  data: {
    id: string;
    video_id: string;
    optimized_title: string;
    summary_description: string;
    semantic_tags: string[];
    suggested_category_id: string | null;
    language: string;
    cultural_relevance: string;
    short_summary: string;
    created_at: string;
  };
  assignment?: {
    fallback_used: boolean;
    reliability: 'high' | 'low';
    reason: string;
    assigned_category_id: string | null;
    assigned_playlist_id: string | null;
  };
}

/**
 * Hook to enrich video metadata using AI
 * Calls the enrich-video Edge Function
 * 
 * Usage:
 * const { mutate: enrichVideo, isPending } = useEnrichVideo();
 * 
 * enrichVideo(
 *   { videoId: 'abc123', youtubeUrl: 'https://youtube.com/watch?v=test' },
 *   {
 *     onSuccess: (data) => {
 *       console.log('Enrichment complete:', data);
 *     }
 *   }
 * );
 */
export function useEnrichVideo() {
  const { session } = useAuth();

  return useMutation<EnrichVideoResponse, Error, EnrichVideoRequest>({
    mutationFn: async (request) => {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/enrich-video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Enrichment failed: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Video enriched successfully!');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to enrich video';
      toast.error(message);
    },
  });
}
