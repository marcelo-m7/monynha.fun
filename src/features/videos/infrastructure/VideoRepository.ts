import type { Video, VideoFilters } from '../types/Video';

export interface VideoRepository {
  listVideos(filters?: VideoFilters): Promise<Video[]>;
  getVideoById(id: string): Promise<Video | null>;
  listRelatedVideos(currentVideoId: string, categoryId: string, limit: number): Promise<Video[]>;
  listFeaturedVideos(limit: number): Promise<Video[]>;
  listPopularVideos(limit: number): Promise<Video[]>;
  listRecentVideos(limit: number): Promise<Video[]>;
}
