import type { Video } from './video.types';

export function getVideoRoute(video: Pick<Video, 'id'> & Partial<Pick<Video, 'slug'>>) {
  return `/videos/${video.slug || video.id}`;
}
