import { supabase } from '@/shared/api/supabase/supabaseClient';
import type { Favorite } from './favorite.types';
import type { Video } from '@/entities/video/video.types';

export async function listFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `
      *,
      video:videos(*)
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((fav) => ({
    ...fav,
    video: fav.video as Video,
  })) as Favorite[];
}

export async function isFavorited(userId: string, videoId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function addFavorite(userId: string, videoId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, video_id: videoId })
    .select()
    .single();

  if (error) throw error;
  return data as Favorite;
}

export async function removeFavorite(userId: string, videoId: string) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('video_id', videoId);
  if (error) throw error;
}
