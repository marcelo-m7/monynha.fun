import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  Playlist,
  PlaylistCollaborator,
  PlaylistInsert,
  PlaylistProgress,
  PlaylistUpdate,
  PlaylistVideo,
} from './playlist.types';

export interface ListPlaylistsParams {
  authorId?: string;
  isPublic?: boolean;
  searchQuery?: string;
  filter?: 'all' | 'my' | 'collaborating';
  userId?: string;
}

export async function listPlaylists(params: ListPlaylistsParams = {}) {
  let query = supabase
    .from('playlists')
    .select(
      `
      *,
      author:profiles(id, username, display_name, avatar_url)
    `,
    )
    .order('created_at', { ascending: false });

  if (params.authorId) {
    query = query.eq('author_id', params.authorId);
  }

  if (params.isPublic !== undefined) {
    query = query.eq('is_public', params.isPublic);
  }

  if (params.searchQuery) {
    query = query.or(`name.ilike.%${params.searchQuery}%,description.ilike.%${params.searchQuery}%`);
  }

  if (params.filter === 'my' && params.userId) {
    query = query.eq('author_id', params.userId);
  } else if (params.filter === 'collaborating' && params.userId) {
    // For 'collaborating' filter, we need to join with playlist_collaborators
    // This is a more complex query, so we'll fetch all and filter client-side for simplicity
    // A more performant solution for large datasets would involve a database function or view.
    const { data: collabData, error: collabError } = await supabase
      .from('playlist_collaborators')
      .select('playlist_id')
      .eq('user_id', params.userId);

    if (collabError) throw collabError;
    const collabPlaylistIds = (collabData || []).map((c) => c.playlist_id);
    query = query.in('id', collabPlaylistIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data as Playlist[];
}

export async function getPlaylistById(id: string) {
  const { data, error } = await supabase
    .from('playlists')
    .select(
      `
        *,
        author:profiles(id, username, display_name, avatar_url)
      `,
    )
    .eq('id', id)
    .single();

  if (error) throw error;

  return data as Playlist;
}

export async function createPlaylist(payload: PlaylistInsert) {
  const { data, error } = await supabase.from('playlists').insert(payload).select().single();
  if (error) throw error;
  return data as Playlist;
}

export async function updatePlaylist(payload: PlaylistUpdate & { id: string }) {
  const { data, error } = await supabase
    .from('playlists')
    .update(payload)
    .eq('id', payload.id)
    .select()
    .single();

  if (error) throw error;
  return data as Playlist;
}

export async function deletePlaylist(playlistId: string) {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

export async function listPlaylistVideos(playlistId: string) {
  const { data, error } = await supabase
    .from('playlist_videos')
    .select(
      `
      *,
      video:videos!playlist_videos_video_id_fkey(id, title, youtube_id, thumbnail_url, channel_name, duration_seconds)
    `,
    )
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (error) throw error;

  return (data || []).map((pv: PlaylistVideo) => ({
    ...pv,
    video: pv.video,
  })) as PlaylistVideo[];
}

export async function addVideoToPlaylist(payload: { playlistId: string; videoId: string; userId?: string | null; notes?: string | null }) {
  const { data: existingVideos } = await supabase
    .from('playlist_videos')
    .select('position')
    .eq('playlist_id', payload.playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingVideos && existingVideos.length > 0 ? existingVideos[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('playlist_videos')
    .insert({
      playlist_id: payload.playlistId,
      video_id: payload.videoId,
      position: nextPosition,
      added_by: payload.userId ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlaylistVideo;
}

export async function removeVideoFromPlaylist(payload: { playlistId: string; videoId: string }) {
  const { error } = await supabase
    .from('playlist_videos')
    .delete()
    .eq('playlist_id', payload.playlistId)
    .eq('video_id', payload.videoId);

  if (error) throw error;
}

export async function reorderPlaylistVideos(payload: { playlistId: string; orderedVideoIds: string[] }) {
  const updates = payload.orderedVideoIds.map((videoId, index) =>
    supabase.from('playlist_videos').update({ position: index }).eq('playlist_id', payload.playlistId).eq('video_id', videoId),
  );

  const results = await Promise.all(updates);
  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.error?.message).join(', '));
  }
}

export async function listPlaylistCollaborators(playlistId: string) {
  const { data, error } = await supabase
    .from('playlist_collaborators')
    .select(
      `
      *,
      profile:profiles(id, username, display_name, avatar_url)
    `,
    )
    .eq('playlist_id', playlistId);

  if (error) throw error;

  return data as PlaylistCollaborator[];
}

export async function addCollaborator(payload: { playlistId: string; userId: string; role?: 'editor' | 'viewer' }) {
  const { data, error } = await supabase
    .from('playlist_collaborators')
    .upsert({
      playlist_id: payload.playlistId,
      user_id: payload.userId,
      role: payload.role ?? 'editor',
    }, {
      onConflict: 'playlist_id,user_id', // Specify the unique constraint to handle conflicts
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlaylistCollaborator;
}

export async function updateCollaboratorRole(payload: { playlistId: string; userId: string; role: 'editor' | 'viewer' }) {
  const { error } = await supabase
    .from('playlist_collaborators')
    .update({ role: payload.role })
    .eq('playlist_id', payload.playlistId)
    .eq('user_id', payload.userId);

  if (error) throw error;
}

export async function removeCollaborator(payload: { playlistId: string; userId: string }) {
  const { error } = await supabase
    .from('playlist_collaborators')
    .delete()
    .eq('playlist_id', payload.playlistId)
    .eq('user_id', payload.userId);

  if (error) throw error;
}

export async function listPlaylistProgress(playlistId: string, userId: string) {
  const { data, error } = await supabase
    .from('playlist_progress')
    .select('*')
    .eq('playlist_id', playlistId)
    .eq('user_id', userId);

  if (error) throw error;
  return data as PlaylistProgress[];
}

export async function markVideoWatched(payload: {
  playlistId: string;
  userId: string;
  videoId: string;
  watched: boolean;
  lastPositionSeconds?: number;
}) {
  const { data, error } = await supabase
    .from('playlist_progress')
    .upsert(
      {
        playlist_id: payload.playlistId,
        user_id: payload.userId,
        video_id: payload.videoId,
        watched: payload.watched,
        watched_at: payload.watched ? new Date().toISOString() : null,
        last_position_seconds: payload.lastPositionSeconds ?? 0,
      },
      {
        onConflict: 'playlist_id,user_id,video_id',
      },
    )
    .select()
    .single();

  if (error) throw error;
  return data as PlaylistProgress;
}