import type { Json } from '@/integrations/supabase/types';

export interface HomeMetricSummary {
  videos_total: number;
  playlists_total: number;
  categories_total: number;
  videos_with_summaries: number;
  videos_with_tags: number;
  public_non_empty_playlists: number;
  curricular_playlists: number;
}

export interface HomeHeroVideo {
  id: string;
  youtube_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  language: string;
  duration_seconds: number | null;
  view_count: number;
  favorites_count: number;
  playlist_add_count: number;
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
  summary: string | null;
  semantic_tags: string[] | null;
}

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  video_count: number;
}

export interface HomeFeaturedPlaylist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  course_code: string | null;
  unit_code: string | null;
  language: string;
  is_ordered: boolean;
  video_count: number;
  total_duration_seconds: number | null;
  preview_video_title: string | null;
  preview_video_thumbnail_url: string | null;
  preview_video_channel_name: string | null;
}

export interface HomeFacodiHighlight {
  playlist_id: string;
  course_code: string;
  course_name: string;
  unit_code: string | null;
  playlist_name: string;
  playlist_slug: string;
  playlist_description: string | null;
  language: string;
  video_count: number;
  thumbnail_url: string | null;
  semester_label: string | null;
  video_range: 'empty' | 'small' | 'medium' | 'large';
}

export interface HomeCurationSignals {
  with_summaries: number;
  with_tags: number;
  transcripts_completed: number;
  recent_submissions: number;
}

export interface HomeExhibition {
  generated_at: string;
  metrics: HomeMetricSummary;
  hero_videos: HomeHeroVideo[];
  categories: HomeCategory[];
  featured_playlists: HomeFeaturedPlaylist[];
  facodi_highlights: HomeFacodiHighlight[];
  curation_signals: HomeCurationSignals;
}

export interface HomeExhibitionRow {
  generated_at: string;
  metrics: Json;
  hero_videos: Json;
  categories: Json;
  featured_playlists: Json;
  facodi_highlights: Json;
  curation_signals: Json;
}
