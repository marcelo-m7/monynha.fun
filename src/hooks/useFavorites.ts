import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Video } from '@/features/videos';

export interface Favorite {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
  video?: Video; // Optionally include video details
}

// Hook to fetch a user's favorite videos
export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<Favorite[], Error>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          video:videos(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(fav => ({
        ...fav,
        video: fav.video as Video // Type assertion for nested video object
      })) as Favorite[];
    },
    enabled: !!user, // Only run if user is authenticated
  });
}

// Hook to check if a specific video is favorited by the current user
export function useIsFavorited(videoId: string | undefined) {
  const { user } = useAuth();
  return useQuery<boolean, Error>({
    queryKey: ['isFavorited', user?.id, videoId],
    queryFn: async () => {
      if (!user || !videoId) return false;
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle(); // Use maybeSingle to get one or null

      if (error) throw error;
      return !!data; // Returns true if data exists, false otherwise
    },
    enabled: !!user && !!videoId,
  });
}

// Hook to add a video to favorites
export function useAddFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Favorite, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, video_id: videoId })
        .select()
        .single();

      if (error) throw error;
      return data as Favorite;
    },
    onSuccess: (newFavorite) => {
      toast.success('Vídeo adicionado aos favoritos!');
      // Invalidate queries to refetch favorites and isFavorited status
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['isFavorited', user?.id, newFavorite.video_id] });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar aos favoritos', {
        description: error.message,
      });
    },
  });
}

// Hook to remove a video from favorites
export function useRemoveFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);

      if (error) throw error;
    },
    onSuccess: (_, videoId) => {
      toast.success('Vídeo removido dos favoritos!');
      // Invalidate queries to refetch favorites and isFavorited status
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['isFavorited', user?.id, videoId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover dos favoritos', {
        description: error.message,
      });
    },
  });
}
