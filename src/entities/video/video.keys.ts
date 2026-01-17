export interface VideoListParams {
  featured?: boolean;
  limit?: number;
  searchQuery?: string;
  categoryId?: string;
  language?: string;
  submittedBy?: string;
}

const normalizeVideoListParams = (params: VideoListParams = {}) => ({
  featured: params.featured ?? false,
  limit: params.limit ?? null,
  searchQuery: params.searchQuery ?? '',
  categoryId: params.categoryId ?? '',
  language: params.language ?? '',
  submittedBy: params.submittedBy ?? '',
});

export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (params?: VideoListParams) => [...videoKeys.lists(), normalizeVideoListParams(params)] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
  featured: (limit: number) => [...videoKeys.all, 'featured', limit] as const,
  recent: (limit: number) => [...videoKeys.all, 'recent', limit] as const,
  related: (currentVideoId: string, categoryId: string | null, limit: number) =>
    [...videoKeys.all, 'related', currentVideoId, categoryId ?? 'none', limit] as const,
  count: () => [...videoKeys.all, 'count'] as const,
};
