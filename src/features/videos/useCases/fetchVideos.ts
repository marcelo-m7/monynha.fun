import type { VideoFilters, Video } from '../types/Video';
import type { VideoRepository } from '../infrastructure/VideoRepository';

export async function fetchVideos(
  repository: VideoRepository,
  filters?: VideoFilters
): Promise<Video[]> {
  return repository.listVideos(filters);
}
