import { supabase } from '@/shared/api/supabase/supabaseClient';
import type {
  HomeCategory,
  HomeCurationSignals,
  HomeExhibition,
  HomeExhibitionRow,
  HomeFacodiHighlight,
  HomeFeaturedPlaylist,
  HomeHeroVideo,
  HomeMetricSummary,
} from './home.types';

const defaultMetrics: HomeMetricSummary = {
  videos_total: 0,
  playlists_total: 0,
  categories_total: 0,
  videos_with_summaries: 0,
  videos_with_tags: 0,
  public_non_empty_playlists: 0,
  curricular_playlists: 0,
};

const defaultSignals: HomeCurationSignals = {
  with_summaries: 0,
  with_tags: 0,
  transcripts_completed: 0,
  recent_submissions: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArrayValue(value: unknown) {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length > 0 ? strings : null;
}

function arrayValue<T>(value: unknown, mapper: (item: Record<string, unknown>) => T) {
  if (!Array.isArray(value)) return [] as T[];
  return value.filter(isRecord).map(mapper);
}

function mapMetrics(value: unknown): HomeMetricSummary {
  const source = isRecord(value) ? value : {};
  return {
    videos_total: numberValue(source.videos_total),
    playlists_total: numberValue(source.playlists_total),
    categories_total: numberValue(source.categories_total),
    videos_with_summaries: numberValue(source.videos_with_summaries),
    videos_with_tags: numberValue(source.videos_with_tags),
    public_non_empty_playlists: numberValue(source.public_non_empty_playlists),
    curricular_playlists: numberValue(source.curricular_playlists),
  };
}

function mapSignals(value: unknown): HomeCurationSignals {
  const source = isRecord(value) ? value : {};
  return {
    with_summaries: numberValue(source.with_summaries),
    with_tags: numberValue(source.with_tags),
    transcripts_completed: numberValue(source.transcripts_completed),
    recent_submissions: numberValue(source.recent_submissions),
  };
}

function mapHeroVideo(item: Record<string, unknown>): HomeHeroVideo {
  return {
    id: stringValue(item.id),
    youtube_id: stringValue(item.youtube_id),
    title: stringValue(item.title),
    channel_name: stringValue(item.channel_name),
    thumbnail_url: stringValue(item.thumbnail_url),
    language: stringValue(item.language, 'und'),
    duration_seconds: typeof item.duration_seconds === 'number' ? item.duration_seconds : null,
    view_count: numberValue(item.view_count),
    favorites_count: numberValue(item.favorites_count),
    playlist_add_count: numberValue(item.playlist_add_count),
    category_name: nullableString(item.category_name),
    category_slug: nullableString(item.category_slug),
    category_color: nullableString(item.category_color),
    summary: nullableString(item.summary),
    semantic_tags: stringArrayValue(item.semantic_tags),
  };
}

function mapCategory(item: Record<string, unknown>): HomeCategory {
  return {
    id: stringValue(item.id),
    name: stringValue(item.name),
    slug: stringValue(item.slug),
    icon: stringValue(item.icon, 'folder'),
    color: stringValue(item.color, '#efff00'),
    video_count: numberValue(item.video_count),
  };
}

function mapFeaturedPlaylist(item: Record<string, unknown>): HomeFeaturedPlaylist {
  return {
    id: stringValue(item.id),
    name: stringValue(item.name),
    slug: stringValue(item.slug),
    description: nullableString(item.description),
    thumbnail_url: nullableString(item.thumbnail_url),
    course_code: nullableString(item.course_code),
    unit_code: nullableString(item.unit_code),
    language: stringValue(item.language, 'und'),
    is_ordered: booleanValue(item.is_ordered),
    video_count: numberValue(item.video_count),
    total_duration_seconds: typeof item.total_duration_seconds === 'number' ? item.total_duration_seconds : null,
    preview_video_title: nullableString(item.preview_video_title),
    preview_video_thumbnail_url: nullableString(item.preview_video_thumbnail_url),
    preview_video_channel_name: nullableString(item.preview_video_channel_name),
  };
}

function mapFacodiHighlight(item: Record<string, unknown>): HomeFacodiHighlight {
  const videoRange = stringValue(item.video_range, 'empty');
  return {
    playlist_id: stringValue(item.playlist_id),
    course_code: stringValue(item.course_code),
    course_name: stringValue(item.course_name),
    unit_code: nullableString(item.unit_code),
    playlist_name: stringValue(item.playlist_name),
    playlist_slug: stringValue(item.playlist_slug),
    playlist_description: nullableString(item.playlist_description),
    language: stringValue(item.language, 'und'),
    video_count: numberValue(item.video_count),
    thumbnail_url: nullableString(item.thumbnail_url),
    semester_label: nullableString(item.semester_label),
    video_range: ['empty', 'small', 'medium', 'large'].includes(videoRange)
      ? (videoRange as HomeFacodiHighlight['video_range'])
      : 'empty',
  };
}

function mapHomeRow(row: HomeExhibitionRow): HomeExhibition {
  return {
    generated_at: row.generated_at,
    metrics: { ...defaultMetrics, ...mapMetrics(row.metrics) },
    hero_videos: arrayValue(row.hero_videos, mapHeroVideo),
    categories: arrayValue(row.categories, mapCategory),
    featured_playlists: arrayValue(row.featured_playlists, mapFeaturedPlaylist),
    facodi_highlights: arrayValue(row.facodi_highlights, mapFacodiHighlight),
    curation_signals: { ...defaultSignals, ...mapSignals(row.curation_signals) },
  };
}

export async function getHomeExhibition() {
  const { data, error } = await supabase.from('v_home_exhibition').select('*').maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      generated_at: new Date().toISOString(),
      metrics: defaultMetrics,
      hero_videos: [],
      categories: [],
      featured_playlists: [],
      facodi_highlights: [],
      curation_signals: defaultSignals,
    } satisfies HomeExhibition;
  }

  return mapHomeRow(data as HomeExhibitionRow);
}
