import type { Database } from '@/integrations/supabase/types';
import type { Video } from '@/entities/video/video.types';
import type { Profile } from '@/entities/profile/profile.types';

export type Playlist = Database['public']['Tables']['playlists']['Row'] & {
  author?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  video_count?: number;
  collaborator_count?: number;
  preview_video_id?: string | null;
  preview_video_title?: string | null;
  preview_video_thumbnail_url?: string | null;
  preview_video_channel_name?: string | null;
  activity_at?: string | null;
};

export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];

export type PlaylistVideo = Database['public']['Tables']['playlist_videos']['Row'] & {
  video?: Pick<
    Video,
    'id' | 'title' | 'youtube_id' | 'thumbnail_url' | 'channel_name' | 'duration_seconds'
  > | null;
};

export type PlaylistCollaborator = Database['public']['Tables']['playlist_collaborators']['Row'] & {
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export type PlaylistProgress = Database['public']['Tables']['playlist_progress']['Row'];
