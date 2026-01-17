import type { Video } from '@/features/videos';

export interface Playlist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author_id: string;
  thumbnail_url: string | null;
  course_code: string | null;
  unit_code: string | null;
  language: string;
  is_public: boolean;
  is_ordered: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  video_count?: number;
}

export interface PlaylistVideo {
  id: string;
  playlist_id: string;
  video_id: string;
  position: number;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  video?: {
    id: string;
    title: string;
    youtube_id: string;
    thumbnail_url: string;
    channel_name: string;
    duration_seconds: number | null;
  } | null;
}

export interface PlaylistCollaborator {
  id: string;
  playlist_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  invited_at: string;
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PlaylistProgress {
  id: string;
  playlist_id: string;
  user_id: string;
  video_id: string;
  watched: boolean;
  watched_at: string | null;
  last_position_seconds: number;
  created_at: string;
  updated_at: string;
}
