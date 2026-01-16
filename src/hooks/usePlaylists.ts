import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ==================== TYPE DEFINITIONS ====================

export interface Playlist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author_id: string;
  thumbnail_url: string | null;
  course_code: string | null;
  unit_code: string | null;
  language: string;
  is_public: boolean;
  is_ordered: boolean; // NEW: for learning paths vs collections
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  video_count?: number; // Count from playlist_videos
}

export interface PlaylistVideo {
  id: string; // NEW: explicit primary key for playlist_videos
  playlist_id: string;
  video_id: string;
  position: number;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined video data
  video?: {
    id: string;
    title: string;
    youtube_id: string;
    thumbnail_url: string;
    channel_name: string;
    duration_seconds: number | null;
  } | null;
}

export interface PlaylistCollaborator {
  id: string;
  playlist_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  invited_at: string;
  // Joined profile data
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PlaylistProgress {
  id: string;
  playlist_id: string;
  user_id: string;
  video_id: string;
  watched: boolean;
  watched_at: string | null;
  last_position_seconds: number;
  created_at: string;
  updated_at: string;
}

// ==================== PLAYLIST HOOKS ====================

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
      let query = supabase
        .from('playlists')
        .select(`
          *,
          author:profiles!playlists_author_id_fkey(id, username, display_name, avatar_url)
        `)
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

      if (error) throw error;

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
          is_ordered: playlist.is_ordered, // NEW
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

// ==================== PLAYLIST VIDEOS HOOKS ====================

export function usePlaylistVideos(playlistId: string | undefined) {
  return useQuery<PlaylistVideo[], Error>({
    queryKey: ['playlist-videos', playlistId],
    queryFn: async () => {
      if (!playlistId) return [];

      const { data, error } = await supabase
        .from('playlist_videos')
        .select(`
          *,
          video:videos!playlist_videos_video_id_fkey(id, title, youtube_id, thumbnail_url, channel_name, duration_seconds)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || []).map((pv: any) => ({
        ...pv,
        video: pv.video,
      })) as PlaylistVideo[];
    },
    enabled: !!playlistId,
  });
}

export function useAddVideoToPlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<PlaylistVideo, Error, { playlistId: string; videoId: string; notes?: string }>({
    mutationFn: async ({ playlistId, videoId, notes }) => {
      // Get the max position
      const { data: existingVideos } = await supabase
        .from('playlist_videos')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingVideos && existingVideos.length > 0 ? existingVideos[0].position + 1 : 0;

      const { data, error } = await supabase
        .from('playlist_videos')
        .insert({
          playlist_id: playlistId,
          video_id: videoId,
          position: nextPosition,
          added_by: user?.id || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlaylistVideo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-videos', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] }); // To update video_count
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // To update video_count in list
      toast.success('Video added to playlist!');
    },
    onError: (error) => {
      toast.error('Failed to add video to playlist', { description: error.message });
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; videoId: string }>({
    mutationFn: async ({ playlistId, videoId }) => {
      const { error } = await supabase
        .from('playlist_videos')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-videos', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] }); // To update video_count
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // To update video_count in list
      toast.success('Video removed from playlist!');
    },
    onError: (error) => {
      toast.error('Failed to remove video from playlist', { description: error.message });
    },
  });
}

export function useReorderPlaylistVideos() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { playlistId: string; orderedVideoIds: string[] }>({
    mutationFn: async ({ playlistId, orderedVideoIds }) => {
      // Create an array of update promises
      const updates = orderedVideoIds.map((videoId, index) =>
        supabase
          .from('playlist_videos')
          .update({ position: index })
          .eq('playlist_id', playlistId)
          .eq('video_id', videoId)
      );

      // Execute all updates concurrently
      const results = await Promise.all(updates);

      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.error?.message).join(', '));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-videos', variables.playlistId] });
      toast.success('Playlist reordered successfully!');
    },
    onError: (error) => {
      toast.error('Failed to reorder playlist', { description: error.message });
    },
  });
}

// ==================== COLLABORATOR HOOKS ====================

export function usePlaylistCollaborators(playlistId: string | undefined) {
  return useQuery<PlaylistCollaborator[], Error>({
    queryKey: ['playlist-collaborators', playlistId],
    queryFn: async () => {
      if (!playlistId) return [];

      const { data, error } = await supabase
        .from('playlist_collaborators')
        .select(`
          *,
          profile:profiles!playlist_collaborators_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('playlist_id', playlistId);

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        profile: c.profile,
      })) as PlaylistCollaborator[];
    },
    enabled: !!playlistId,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();

  return useMutation<PlaylistCollaborator, Error, { playlistId: string; userId: string; role?: 'editor' | 'viewer' }>({
    mutationFn: async ({ playlistId, userId, role = 'editor' }) => {
      const { data, error } = await supabase
        .from('playlist_collaborators')
        .insert({
          playlist_id: playlistId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlaylistCollaborator;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // To update collaboration status in list
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
      const { error } = await supabase
        .from('playlist_collaborators')
        .update({ role })
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', variables.playlistId] });
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
      const { error } = await supabase
        .from('playlist_collaborators')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] }); // To update collaboration status in list
      toast.success('Collaborator removed!');
    },
    onError: (error) => {
      toast.error('Failed to remove collaborator', { description: error.message });
    },
  });
}

// ==================== PROGRESS HOOKS ====================

export function usePlaylistProgress(playlistId: string | undefined) {
  const { user } = useAuth();

  return useQuery<PlaylistProgress[], Error>({
    queryKey: ['playlist-progress', playlistId, user?.id],
    queryFn: async () => {
      if (!playlistId || !user?.id) return [];

      const { data, error } = await supabase
        .from('playlist_progress')
        .select('*')
        .eq('playlist_id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as PlaylistProgress[];
    },
    enabled: !!playlistId && !!user?.id,
  });
}

export function useMarkVideoWatched() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<PlaylistProgress, Error, { playlistId: string; videoId: string; watched: boolean; lastPositionSeconds?: number }>({
    mutationFn: async ({ playlistId, videoId, watched, lastPositionSeconds = 0 }) => {
      if (!user?.id) throw new Error('Must be logged in to track progress');

      // Upsert the progress record
      const { data, error } = await supabase
        .from('playlist_progress')
        .upsert({
          playlist_id: playlistId,
          user_id: user.id,
          video_id: videoId,
          watched,
          watched_at: watched ? new Date().toISOString() : null,
          last_position_seconds: lastPositionSeconds,
        }, {
          onConflict: 'playlist_id,user_id,video_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlaylistProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist-progress', variables.playlistId, user?.id] });
      toast.success(variables.watched ? 'Video marked as watched!' : 'Video marked as unwatched!');
    },
    onError: (error) => {
      toast.error('Failed to update video progress', { description: error.message });
    },
  });
}

// ==================== UTILITY HOOKS ====================

export function useCanEditPlaylist(playlist: Playlist | undefined) {
  const { user } = useAuth();
  const { data: collaborators } = usePlaylistCollaborators(playlist?.id);

  if (!user || !playlist) return false;

  // Author can always edit
  if (playlist.author_id === user.id) return true;

  // Check if user is an editor collaborator
  return collaborators?.some(c => c.user_id === user.id && c.role === 'editor') || false;
}

export function useIsPlaylistAuthor(playlist: Playlist | undefined) {
  const { user } = useAuth();
  if (!user || !playlist) return false;
  return playlist.author_id === user.id;
}