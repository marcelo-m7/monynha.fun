import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavorite, isFavorited, listFavorites, removeFavorite } from '@/entities/favorite/favorite.api';
import type { Favorite } from '@/entities/favorite/favorite.types';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from 'sonner';

const favoriteKeys = {
  all: ['favorites'] as const,
  list: (userId: string | undefined) => [...favoriteKeys.all, userId ?? ''] as const,
  status: (userId: string | undefined, videoId: string | undefined) =>
    [...favoriteKeys.all, 'status', userId ?? '', videoId ?? ''] as const,
};

export function useFavorites() {
  const { user } = useAuth();

  return useQuery<Favorite[], Error>({
    queryKey: favoriteKeys.list(user?.id),
    queryFn: async () => {
      if (!user) return [];
      return listFavorites(user.id);
    },
    enabled: !!user,
  });
}

export function useIsFavorited(videoId: string | undefined) {
  const { user } = useAuth();

  return useQuery<boolean, Error>({
    queryKey: favoriteKeys.status(user?.id, videoId),
    queryFn: async () => {
      if (!user || !videoId) return false;
      return isFavorited(user.id, videoId);
    },
    enabled: !!user && !!videoId,
  });
}

export function useAddFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Favorite, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('User not authenticated');
      return addFavorite(user.id, videoId);
    },
    onSuccess: (newFavorite) => {
      toast.success('Vídeo adicionado aos favoritos!');
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoriteKeys.status(user?.id, newFavorite.video_id) });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar aos favoritos', { description: error.message });
    },
  });
}

export function useRemoveFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('User not authenticated');
      return removeFavorite(user.id, videoId);
    },
    onSuccess: (_, videoId) => {
      toast.success('Vídeo removido dos favoritos!');
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoriteKeys.status(user?.id, videoId) });
    },
    onError: (error) => {
      toast.error('Erro ao remover dos favoritos', { description: error.message });
    },
  });
}
