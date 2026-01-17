import type { Video } from '../types/Video';
import type { VideoRepository } from '../infrastructure/VideoRepository';

export async function fetchRelatedVideos(
  repository: VideoRepository,
  currentVideoId: string,
  categoryId: string | null,
  limit: number
): Promise<Video[]> {
  if (!categoryId) return [];
  return repository.listRelatedVideos(currentVideoId, categoryId, limit);
}
