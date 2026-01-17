import type { Video } from '../types/Video';
import type { VideoRepository } from '../infrastructure/VideoRepository';

export async function fetchFeaturedVideos(
  repository: VideoRepository,
  limit: number
): Promise<Video[]> {
  const featured = await repository.listFeaturedVideos(limit);
  if (featured.length > 0) return featured;
  return repository.listPopularVideos(limit);
}
