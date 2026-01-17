import { useState, useEffect } from 'react';
import { extractYouTubeId, getYouTubeThumbnail } from '@/shared/lib/youtube';

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;
}

interface UseYouTubeMetadataResult {
  metadata: YouTubeMetadata | null;
  isLoading: boolean;
  error: string | null;
}

export function useYouTubeMetadata(url: string): UseYouTubeMetadataResult {
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url.trim()) {
        setMetadata(null);
        setError(null);
        return;
      }

      const videoId = extractYouTubeId(url);
      if (!videoId) {
        setMetadata(null);
        setError('URL do YouTube inválida');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use YouTube oEmbed API (no API key required)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
          throw new Error('Vídeo não encontrado ou indisponível');
        }

        const data = await response.json();
        
        setMetadata({
          videoId,
          title: data.title,
          channelName: data.author_name,
          thumbnailUrl: getYouTubeThumbnail(videoId, 'max'),
          description: ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar informações do vídeo');
        setMetadata(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  return { metadata, isLoading, error };
}
