import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { notify } from '@/shared/lib/notify';
import { getEdgeFunctionErrorDetails, invokeEdgeFunction } from '@/shared/api/supabase/edgeFunctions';

export interface EnrichVideoRequest {
  videoId: string;
  youtubeUrl: string;
  submissionId: string;
}

export interface EnrichVideoResponse {
  message: string;
  requestId?: string;
  submissionId?: string | null;
  status?: 'processing';
  data?: {
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
 *   { videoId: 'abc123', youtubeUrl: 'https://youtube.com/watch?v=test', submissionId: 'submission-uuid' },
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

      const { data, error } = await invokeEdgeFunction<EnrichVideoResponse>('enrich-video', {
        body: request,
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        const details = await getEdgeFunctionErrorDetails(error);
        throw new Error(details.requestId ? `${details.message} (request ${details.requestId})` : details.message);
      }

      if (!data) {
        throw new Error('No enrichment response returned');
      }

      return data;
    },
    onSuccess: (data) => {
      notify.success(data.status === 'processing' ? 'Video processing started!' : 'Video enriched successfully!');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to enrich video';
      notify.error(message);
    },
  });
}
