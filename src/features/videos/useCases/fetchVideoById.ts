import type { Video } from '../types/Video';
import type { VideoRepository } from '../infrastructure/VideoRepository';

export async function fetchVideoById(
  repository: VideoRepository,
  id: string
): Promise<Video | null> {
  return repository.getVideoById(id);
}
