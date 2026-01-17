import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/useAuth';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import type { Playlist } from '@/entities/playlist/playlist.types';
import {
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  listPlaylists,
  updatePlaylist,
} from '@/entities/playlist/playlist.api';
import type { ListPlaylistsParams } from '@/entities/playlist/playlist.api';

interface UsePlaylistsOptions extends ListPlaylistsParams {
  enabled?: boolean;
}

export function usePlaylists(options: UsePlaylistsOptions = {}) {
  const { user } = useAuth();
  const { enabled = true, ...params } = options;

  return useQuery<Playlist[], Error>({
    queryKey: playlistKeys.list({ ...params, userId: user?.id }),
    queryFn: () => listPlaylists({ ...params, userId: user?.id }),
    enabled,
  });
}

export function usePlaylistById(id: string | undefined) {
  return useQuery<Playlist, Error>({
    queryKey: id ? playlistKeys.detail(id) : playlistKeys.detail(''),
    queryFn: async () => {
      if (!id) throw new Error('Playlist ID is required');
      return getPlaylistById(id);
    },
    enabled: !!id,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Playlist, Error, Omit<Playlist, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'author' | 'video_count' | 'total_duration_seconds'>>({
    mutationFn: async (playlist) => {
      if (!user) throw new Error('Must be logged in to create a playlist');
      return createPlaylist({
        ...playlist,
        author_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Playlist created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create playlist', { description: error.message });
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation<Playlist, Error, Partial<Omit<Playlist, 'author_id' | 'created_at' | 'author' | 'video_count'>> & { id: string }>({
    mutationFn: async (playlist) => {
      return updatePlaylist({
        id: playlist.id,
        name: playlist.name,
        slug: playlist.slug,
        description: playlist.description,
        thumbnail_url: playlist.thumbnail_url,
        course_code: playlist.course_code,
        unit_code: playlist.unit_code,
        language: playlist.language,
        is_public: playlist.is_public,
        is_ordered: playlist.is_ordered,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      queryClient.invalidateQueries({ queryKey: playlistKeys.detail(data.id) });
      toast.success('Playlist updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update playlist', { description: error.message });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (playlistId) => {
      return deletePlaylist(playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Playlist deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete playlist', { description: error.message });
    },
  });
}
