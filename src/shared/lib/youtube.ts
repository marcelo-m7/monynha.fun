export function extractYouTubeId(url: string): string | null {
  const patterns = [
    // New combined pattern to handle various YouTube URL formats
    /(?:youtube\.com\/(?:watch(?:\?v=|\/)|live\/|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Existing pattern for just the ID
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
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