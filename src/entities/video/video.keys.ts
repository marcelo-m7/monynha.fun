export interface VideoListParams {
  featured?: boolean;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  filterMode?: 'all' | 'any';
  categoryIds?: string[];
  categoryId?: string;
  languages?: string[];
  language?: string;
  sortBy?: 'recent' | 'mostViewed' | 'mostFavorited';
  semanticTags?: string[];
  semanticTag?: string;
  submittedBy?: string;
}

const normalizeStringArray = (value?: string[] | null) =>
  [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))].sort();

const normalizeVideoListParams = (params: VideoListParams = {}) => ({
  featured: params.featured ?? false,
  limit: params.limit ?? null,
  offset: params.offset ?? 0,
  searchQuery: params.searchQuery ?? '',
  filterMode: params.filterMode ?? 'all',
  categoryIds: normalizeStringArray(params.categoryIds),
  categoryId: params.categoryId ?? '',
  languages: normalizeStringArray(params.languages),
  language: params.language ?? '',
  sortBy: params.sortBy ?? 'recent',
  semanticTags: normalizeStringArray(params.semanticTags),
  semanticTag: params.semanticTag ?? '',
  submittedBy: params.submittedBy ?? '',
});

export const videoKeys = {
  all: ['videos'] as const,
  semanticTags: (limit = 200) => [...videoKeys.all, 'semantic-tags', limit] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (params?: VideoListParams) => [...videoKeys.lists(), normalizeVideoListParams(params)] as const,
  infiniteList: (params?: VideoListParams) => [
    ...videoKeys.lists(),
    'infinite',
    normalizeVideoListParams({ ...params, offset: 0 }),
  ] as const,
  editable: (submittedBy: string) => [...videoKeys.all, 'editable', submittedBy] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
  featured: (limit: number, offset = 0) => [...videoKeys.all, 'featured', limit, offset] as const,
  recent: (limit: number) => [...videoKeys.all, 'recent', limit] as const,
  related: (currentVideoId: string, categoryId: string | null, limit: number) =>
    [...videoKeys.all, 'related', currentVideoId, categoryId ?? 'none', limit] as const,
  count: () => [...videoKeys.all, 'count'] as const,
};
