import { useAuth } from '@/features/auth/useAuth';
import { usePlaylistCollaborators } from './queries/usePlaylistCollaborators';
import { useProfileById } from '@/features/profile/queries/useProfile';
import type { Playlist } from '@/entities/playlist/playlist.types';

export function useCanEditPlaylist(playlist: Playlist | undefined) {
  const { user } = useAuth();
  const { data: collaborators } = usePlaylistCollaborators(playlist?.id);
  const { data: profile } = useProfileById(user?.id);

  if (!user || !playlist) return false;

  if (playlist.author_id === user.id) return true;

  const isFacodiPlaylist = !!playlist.course_code || !!playlist.unit_code;
  if (isFacodiPlaylist && (profile?.role === 'editor' || profile?.role === 'admin')) {
    return true;
  }

  return collaborators?.some((c) => c.user_id === user.id && c.role === 'editor') || false;
}

export function useIsPlaylistAuthor(playlist: Playlist | undefined) {
  const { user } = useAuth();
  if (!user || !playlist) return false;
  return playlist.author_id === user.id;
}
