import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Playlist } from './types';

interface UsePlaylistsOptions {
  authorId?: string;
  isPublic?: boolean;
  searchQuery?: string;
  enabled?: boolean;
  filter?: 'all' | 'my' | 'collaborating';
}

export function usePlaylists(options: UsePlaylistsOptions = {}) {
  const { user } = useAuth();
  const { authorId, isPublic, searchQuery, enabled = true, filter = 'all' } = options;

  return useQuery<Playlist[], Error>({
    queryKey: ['playlists', { authorId, isPublic, searchQuery, filter, userId: user?.id }],
    queryFn: async () => {
      const selectStr = `*, author:profiles!playlists_author_id_fkey(id, username, display_name, avatar_url)`;

      // Debug: show constructed query pieces to help inspect network request
      // (will appear in the browser console)
      // eslint-disable-next-line no-console
      console.debug('Playlists query', { select: selectStr, authorId, isPublic, searchQuery, filter, userId: user?.id });

      let query = supabase
        .from('playlists')
        .select(selectStr)
        .order('created_at', { ascending: false });

      if (authorId) {
        query = query.eq('author_id', authorId);
      }

      if (isPublic !== undefined) {
        query = query.eq('is_public', isPublic);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Filter by ownership or collaboration
      if (filter === 'my' && user?.id) {
        query = query.eq('author_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        // Log full error for easier inspection in browser devtools
        // eslint-disable-next-line no-console
        console.error('Supabase playlists error', error, { select: selectStr, authorId, isPublic, searchQuery, filter, userId: user?.id });
        throw error;
      }

      // Fetch video counts separately for each playlist
      const playlistsWithCounts = await Promise.all((data || []).map(async (playlist: any) => {
        const { count, error: countError } = await supabase
          .from('playlist_videos')
          .select('*', { count: 'exact', head: true })
          .eq('playlist_id', playlist.id);

        if (countError) {
          console.error(`Error fetching video count for playlist ${playlist.id}:`, countError);
          return { ...playlist, video_count: 0 };
        }
        return { ...playlist, video_count: count || 0 };
      }));

      let result = playlistsWithCounts.map((playlist: any) => ({
        ...playlist,
        author: playlist.author,
      })) as Playlist[];

      // If filtering by collaborating, fetch collaborator playlists
      if (filter === 'collaborating' && user?.id) {
        const { data: collabData } = await supabase
          .from('playlist_collaborators')
          .select('playlist_id')
          .eq('user_id', user.id);

        const collabPlaylistIds = (collabData || []).map(c => c.playlist_id);
        result = result.filter(p => collabPlaylistIds.includes(p.id));
      }

      return result;
    },
    enabled,
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
          author:profiles!playlists_author_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch video count separately for this playlist
      const { count, error: countError } = await supabase
        .from('playlist_videos')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', data.id);

      if (countError) {
        console.error(`Error fetching video count for playlist ${data.id}:`, countError);
        return {
          ...data,
          author: data.author,
          video_count: 0,
        } as Playlist;
      }

      return {
        ...data,
        author: data.author,
        video_count: count || 0,
      } as Playlist;
    },
    enabled: !!id,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Playlist, Error, Omit<Playlist, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'author' | 'video_count'>>({
    mutationFn: async (playlist) => {
      if (!user) throw new Error('Must be logged in to create a playlist');

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          ...playlist,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
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
      const { data, error } = await supabase
        .from('playlists')
        .update({
          name: playlist.name,
          slug: playlist.slug,
          description: playlist.description,
          thumbnail_url: playlist.thumbnail_url,
          course_code: playlist.course_code,
          unit_code: playlist.unit_code,
          language: playlist.language,
          is_public: playlist.is_public,
          is_ordered: playlist.is_ordered,
        })
        .eq('id', playlist.id)
        .select()
        .single();

      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', data.id] });
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
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete playlist', { description: error.message });
    },
  });
}