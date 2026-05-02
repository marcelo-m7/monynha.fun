import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  CoursePlaylistCatalogItem,
  CoursePlaylistSummaryItem,
} from './course.types';

export interface ListCourseCatalogParams {
  courseCode?: string;
}

export async function listCoursePlaylistSummary() {
  const { data, error } = await supabase
    .from('v_course_playlist_summary')
    .select(
      `
      course_code,
      course_name,
      playlists_total,
      public_playlists_total,
      learning_paths_total,
      collections_total,
      units_total,
      empty_playlists_total,
      videos_total,
      total_duration_seconds,
      first_playlist_created_at,
      last_playlist_updated_at,
      languages,
      semesters
      `,
    )
    .order('course_code', { ascending: true });

  if (error) throw error;
  return (data || []) as CoursePlaylistSummaryItem[];
}

export async function listCoursePlaylistCatalog(params: ListCourseCatalogParams = {}) {
  let query = supabase
    .from('v_course_playlist_catalog')
    .select(
      `
      playlist_id,
      course_code,
      course_name,
      unit_code,
      playlist_name,
      playlist_slug,
      playlist_description,
      language,
      is_public,
      is_ordered,
      video_count,
      total_duration_seconds,
      thumbnail_url,
      author_id,
      created_at,
      updated_at,
      semester_label,
      video_range,
      collaborators_count,
      playlist_videos_rows
      `,
    )
    .order('course_code', { ascending: true })
    .order('unit_code', { ascending: true });

  if (params.courseCode) {
    query = query.eq('course_code', params.courseCode);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as CoursePlaylistCatalogItem[];
}
