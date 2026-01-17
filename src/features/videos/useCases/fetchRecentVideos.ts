import type { Video } from '../types/Video';
import type { VideoRepository } from '../infrastructure/VideoRepository';

export async function fetchRecentVideos(
  repository: VideoRepository,
  limit: number
): Promise<Video[]> {
  return repository.listRecentVideos(limit);
}
