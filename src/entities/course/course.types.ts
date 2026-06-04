export interface CoursePlaylistCatalogItem {
  playlist_id: string;
  course_code: string;
  course_name: string;
  unit_code: string | null;
  playlist_name: string;
  playlist_slug: string;
  playlist_description: string | null;
  language: string;
  is_public: boolean;
  is_ordered: boolean;
  video_count: number;
  total_duration_seconds: number;
  thumbnail_url: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  semester_label: string | null;
  video_range: 'empty' | 'small' | 'medium' | 'large';
  collaborators_count: number;
  playlist_videos_rows: number;
}

export interface CoursePlaylistSummaryItem {
  course_code: string;
  course_name: string;
  playlists_total: number;
  public_playlists_total: number;
  learning_paths_total: number;
  collections_total: number;
  units_total: number;
  empty_playlists_total: number;
  videos_total: number;
  total_duration_seconds: number;
  first_playlist_created_at: string | null;
  last_playlist_updated_at: string | null;
  languages: string[] | null;
  semesters: string[] | null;
}
