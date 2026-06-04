import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
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

export function useEditablePlaylists() {
  const { user } = useAuth();

  return useQuery<Playlist[], Error>({
    queryKey: playlistKeys.list({ filter: 'editable', userId: user?.id }),
    queryFn: () => listPlaylists({ filter: 'editable', userId: user?.id }),
    enabled: !!user,
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
  const { t } = useTranslation();

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
      toast.success(t('playlists.feedback.createSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.createError'), { description: error.message });
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast.success(t('playlists.feedback.updateSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.updateError'), { description: error.message });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, string>({
    mutationFn: async (playlistId) => {
      return deletePlaylist(playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success(t('playlists.feedback.deleteSuccess'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.deleteError'), { description: error.message });
    },
  });
}