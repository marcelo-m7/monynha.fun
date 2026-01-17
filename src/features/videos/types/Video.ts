export interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface Video {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  channel_name: string;
  duration_seconds: number | null;
  thumbnail_url: string;
  language: string;
  category_id: string | null;
  submitted_by: string | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: VideoCategory;
}

export interface VideoFilters {
  featured?: boolean;
  limit?: number;
  categorySlug?: string;
  searchQuery?: string;
  categoryId?: string;
  language?: string;
  submittedBy?: string;
  enabled?: boolean;
}
