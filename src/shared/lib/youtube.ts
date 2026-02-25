export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmedUrl = url.trim();

  // 1. Check if it's just a raw 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  try {
    // 2. Try parsing as a URL for structured extraction
    const parsedUrl = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
    const hostname = parsedUrl.hostname.replace('www.', '');

    // Handle youtu.be/ID
    if (hostname === 'youtu.be') {
      const id = parsedUrl.pathname.slice(1);
      return id.length >= 11 ? id.substring(0, 11) : null;
    }

    // Handle youtube.com and youtube-nocookie.com
    if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      // Standard watch?v=ID
      const v = parsedUrl.searchParams.get('v');
      if (v && v.length >= 11) return v.substring(0, 11);

      // Path-based IDs: /shorts/ID, /live/ID, /embed/ID, /v/ID, /watch/ID
      const pathParts = parsedUrl.pathname.split('/');
      const specialPaths = ['shorts', 'live', 'embed', 'v', 'watch'];
      
      for (const special of specialPaths) {
        const index = pathParts.indexOf(special);
        if (index !== -1 && pathParts[index + 1]) {
          const id = pathParts[index + 1];
          if (id.length >= 11) return id.substring(0, 11);
        }
      }
    }
  } catch (e) {
    // Not a valid URL structure, proceed to regex fallback
  }

  // 3. Fallback to a comprehensive regex for any remaining edge cases
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmedUrl.match(regex);
  
  return match ? match[1] : null;
}

export function extractYouTubePlaylistId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname || '';
    // Only treat URLs on YouTube domains as valid playlist URLs
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be') && !hostname.includes('youtube-nocookie.com')) {
      return null;
    }

    const listId = urlObj.searchParams.get('list');
    return listId && listId.trim() !== '' ? listId : null;
  } catch (e) {
    // Not a valid absolute URL
    return null;
  }
} 

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'max' = 'max'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    max: 'maxresdefault'
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}