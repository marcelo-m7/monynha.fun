import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

  return useMutation<PlaylistCollaborator, Error, { playlistId: string; userId: string; role?: 'editor' | 'viewer' }>({
    mutationFn: async ({ playlistId, userId, role = 'editor' }) => {
      return addCollaborator({ playlistId, userId, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Collaborator added!');
    },
    onError: (error) => {
      toast.error('Failed to add collaborator', { description: error.message });
    },
  });
}

export function useUpdateCollaboratorRole() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; userId: string; role: 'editor' | 'viewer' }>({
    mutationFn: async ({ playlistId, userId, role }) => {
      return updateCollaboratorRole({ playlistId, userId, role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      toast.success('Collaborator role updated!');
    },
    onError: (error) => {
      toast.error('Failed to update collaborator role', { description: error.message });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; userId: string }>({
    mutationFn: async ({ playlistId, userId }) => {
      return removeCollaborator({ playlistId, userId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playlistKeys.collaborators(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: playlistKeys.all });
      toast.success('Collaborator removed!');
    },
    onError: (error) => {
      toast.error('Failed to remove collaborator', { description: error.message });
    },
  });
}
