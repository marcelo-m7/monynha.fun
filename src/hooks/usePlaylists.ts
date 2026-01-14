import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Video } from './useVideos';

export interface Playlist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author_id: string | null;
  course_code: string | null;
  unit_code: string | null;
  language: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
  };
  video_count?: number; // For displaying count in list
}

export interface PlaylistVideo {
  playlist_id: string;
  video_id: string;
  position: number;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  video?: Video; // Nested video details
}

// --- Playlists CRUD Hooks ---

export function usePlaylists(options?: { authorId?: string; isPublic?: boolean; searchQuery?: string; enabled?: boolean }) {
  return useQuery<Playlist[], Error>({
    queryKey: ['playlists', options],
    queryFn: async () => {
      let query = supabase
        .from('playlists')
        .select(`
          *,
          author:profiles(username),
          video_count:playlist_videos(count)
        `)
        .order('created_at', { ascending: false });

      if (options?.authorId) {
        query = query.eq('author_id', options.authorId);
      }
      if (options?.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
      }
      if (options?.searchQuery) {
        query = query.or(
          `name.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(p => ({
        ...p,
        video_count: p.video_count?.[0]?.count ?? 0,
        author: p.author as { username: string } | undefined
      })) as Playlist[];
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePlaylistById(id: string | undefined) {
  return useQuery<Playlist, Error>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      if (!id) throw new Error('Playlist ID is required');
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          author:profiles(username)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        author: data.author as { username: string } | undefined
      } as Playlist;
    },
    enabled: !!id,
  });
}

export function useCreatePlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Playlist, Error, Omit<Playlist, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'author' | 'video_count'>>({
    mutationFn: async (newPlaylistData) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('playlists')
        .insert({ ...newPlaylistData, author_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => {
      toast.success('Playlist criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar playlist', { description: error.message });
    },
  });
}

export function useUpdatePlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<Playlist, Error, Partial<Omit<Playlist, 'author_id' | 'created_at' | 'author' | 'video_count'>> & { id: string }>({
    mutationFn: async (updatedPlaylistData) => {
      if (!user) throw new Error('User not authenticated');
      const { id, ...updateData } = updatedPlaylistData;
      const { data, error } = await supabase
        .from('playlists')
        .update(updateData)
        .eq('id', id)
        .eq('author_id', user.id) // Ensure only author can update
        .select()
        .single();

      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: (updatedPlaylist) => {
      toast.success('Playlist atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', updatedPlaylist.id] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar playlist', { description: error.message });
    },
  });
}

export function useDeletePlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (playlistId) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('author_id', user.id); // Ensure only author can delete

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Playlist excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir playlist', { description: error.message });
    },
  });
}

// --- Playlist Videos CRUD Hooks ---

export function usePlaylistVideos(playlistId: string | undefined) {
  return useQuery<PlaylistVideo[], Error>({
    queryKey: ['playlistVideos', playlistId],
    queryFn: async () => {
      if (!playlistId) return [];
      const { data, error } = await supabase
        .from('playlist_videos')
        .select(`
          *,
          video:videos(*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data.map(pv => ({
        ...pv,
        video: pv.video as Video // Type assertion for nested video object
      })) as PlaylistVideo[];
    },
    enabled: !!playlistId,
  });
}

export function useAddVideoToPlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<PlaylistVideo, Error, { playlistId: string; videoId: string; notes?: string }>({
    mutationFn: async ({ playlistId, videoId, notes }) => {
      if (!user) throw new Error('User not authenticated');

      // Get the current max position for the playlist
      const { data: maxPositionData, error: maxPositionError } = await supabase
        .from('playlist_videos')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      if (maxPositionError && maxPositionError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw maxPositionError;
      }

      const newPosition = (maxPositionData?.position || 0) + 1;

      const { data, error } = await supabase
        .from('playlist_videos')
        .insert({
          playlist_id: playlistId,
          video_id: videoId,
          position: newPosition,
          added_by: user.id,
          notes
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlaylistVideo;
    },
    onSuccess: (newPlaylistVideo) => {
      toast.success('Vídeo adicionado à playlist!');
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', newPlaylistVideo.playlist_id] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // Invalidate playlist list to update video count
    },
    onError: (error) => {
      toast.error('Erro ao adicionar vídeo à playlist', { description: error.message });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; videoId: string }>({
    mutationFn: async ({ playlistId, videoId }) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('playlist_videos')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId);

      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      toast.success('Vídeo removido da playlist!');
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // Invalidate playlist list to update video count
    },
    onError: (error) => {
      toast.error('Erro ao remover vídeo da playlist', { description: error.message });
    },
  });
}

export function useUpdatePlaylistVideoPosition() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; videoId: string; newPosition: number }>({
    mutationFn: async ({ playlistId, videoId, newPosition }) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('playlist_videos')
        .update({ position: newPosition })
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId);

      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      toast.success('Posição do vídeo atualizada!');
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', playlistId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar posição do vídeo', { description: error.message });
    },
  });
}
