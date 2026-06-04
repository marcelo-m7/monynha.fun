import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { playlistKeys } from '@/entities/playlist/playlist.keys';
import type { PlaylistCollaborator } from '@/entities/playlist/playlist.types';
import {
  addCollaborator,
  listPlaylistCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
} from '@/entities/playlist/playlist.api';

export function usePlaylistCollaborators(playlistId: string | undefined) {
  return useQuery<PlaylistCollaborator[], Error>({
    queryKey: playlistId ? playlistKeys.collaborators(playlistId) : playlistKeys.collaborators(''),
    queryFn: async () => {
      if (!playlistId) return [];
      return listPlaylistCollaborators(playlistId);
    },
    enabled: !!playlistId,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<PlaylistCollaborator, Error, { playlistId: string; userId: string; role?: 'editor' | 'viewer' }>({
    mutationFn: async ({ playlistId, userId, role = 'editor' }) => {
      return addCollaborator({ playlistId, userId, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success(t('playlists.feedback.collaboratorAdded'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.collaboratorAddError'), { description: error.message });
    },
  });
}

export function useUpdateCollaboratorRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, { playlistId: string; userId: string; role: 'editor' | 'viewer' }>({
    mutationFn: async ({ playlistId, userId, role }) => {
      return updateCollaboratorRole({ playlistId, userId, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      toast.success(t('playlists.feedback.collaboratorRoleUpdated'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.collaboratorRoleUpdateError'), { description: error.message });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<void, Error, { playlistId: string; userId: string }>({
    mutationFn: async ({ playlistId, userId }) => {
      return removeCollaborator({ playlistId, userId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success(t('playlists.feedback.collaboratorRemoved'));
    },
    onError: (error) => {
      toast.error(t('playlists.feedback.collaboratorRemoveError'), { description: error.message });
    },
  });
}
