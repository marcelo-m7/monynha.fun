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
  filter?: 'all' | 'my' | 'collaborating' | 'editable';
  userId?: string;
}

export async function listPlaylists(params: ListPlaylistsParams = {}) {
  const buildQuery = (includeAuthor: boolean) => {
    const baseQuery = includeAuthor
      ? `
      *,
      author:profiles(id, username, display_name, avatar_url)
    `
      : '*';

    let query = supabase
      .from('playlists')
      .select(baseQuery)
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

    return query;
  };

  let query = buildQuery(true);

  if (params.filter === 'my' && params.userId) {
    query = query.eq('author_id', params.userId);
  } else if (params.filter === 'collaborating' && params.userId) {
    const { data: collabData, error: collabError } = await supabase
      .from('playlist_collaborators')
      .select('playlist_id')
      .eq('user_id', params.userId);

    if (collabError) throw collabError;
    const collabPlaylistIds = (collabData || []).map((c) => c.playlist_id);
    query = query.in('id', collabPlaylistIds);
  } else if (params.filter === 'editable' && params.userId) {
    // Get collaborated playlist IDs where role is editor
    const { data: collabData, error: collabError } = await supabase
      .from('playlist_collaborators')
      .select('playlist_id')
      .eq('user_id', params.userId)
      .eq('role', 'editor');

    if (collabError) throw collabError;
    const collabPlaylistIds = (collabData || []).map((c) => c.playlist_id);
    
    // Select where user is author OR user is in collaborated IDs
    query = query.or(`author_id.eq.${params.userId},id.in.(${collabPlaylistIds.length > 0 ? collabPlaylistIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
  }

  let { data, error } = await query;

  // Fallback for environments where nested profiles relation is not publicly readable.
  if (error && (error.status === 401 || error.status === 403)) {
    query = buildQuery(false);

    if (params.filter === 'my' && params.userId) {
      query = query.eq('author_id', params.userId);
    } else if (params.filter === 'collaborating' && params.userId) {
      const { data: collabData, error: collabError } = await supabase
        .from('playlist_collaborators')
        .select('playlist_id')
        .eq('user_id', params.userId);

      if (collabError) throw collabError;
      const collabPlaylistIds = (collabData || []).map((c) => c.playlist_id);
      query = query.in('id', collabPlaylistIds);
    } else if (params.filter === 'editable' && params.userId) {
      const { data: collabData, error: collabError } = await supabase
        .from('playlist_collaborators')
        .select('playlist_id')
        .eq('user_id', params.userId)
        .eq('role', 'editor');

      if (collabError) throw collabError;
      const collabPlaylistIds = (collabData || []).map((c) => c.playlist_id);
      query = query.or(`author_id.eq.${params.userId},id.in.(${collabPlaylistIds.length > 0 ? collabPlaylistIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
    }

    const fallbackResult = await query;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) throw error;

  return data as Playlist[];
}

export async function getPlaylistById(id: string) {
  let { data, error } = await supabase
    .from('playlists')
    .select(
      `
        *,
        author:profiles(id, username, display_name, avatar_url)
      `,
    )
    .eq('id', id)
    .single();

  if (error && (error.status === 401 || error.status === 403)) {
    const fallbackResult = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

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
  // Position is auto-calculated by database trigger - no need for separate query
  const { data, error } = await supabase
    .from('playlist_videos')
    .insert({
      playlist_id: payload.playlistId,
      video_id: payload.videoId,
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
  // Use batch update with upsert for efficient reordering
  const updates = payload.orderedVideoIds.map((videoId, index) => ({
    id: videoId,
    position: index,
  }));

  // Since we can't batch update directly with Supabase client in a single call,
  // use RPC function if available, or batch updates with Promise.all but optimized
  // For now, keep Promise.all but ensure it's done server-side efficiently
  const updatePromises = payload.orderedVideoIds.map((videoId, index) =>
    supabase
      .from('playlist_videos')
      .update({ position: index })
      .match({ playlist_id: payload.playlistId, video_id: videoId }),
  );

  const results = await Promise.all(updatePromises);
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

  return (data || []) as PlaylistCollaborator[];
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