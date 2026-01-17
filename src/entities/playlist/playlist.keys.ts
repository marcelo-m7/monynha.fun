export interface PlaylistListParams {
  authorId?: string;
  isPublic?: boolean;
  searchQuery?: string;
  filter?: 'all' | 'my' | 'collaborating';
  userId?: string;
}

const normalizePlaylistListParams = (params: PlaylistListParams = {}) => ({
  authorId: params.authorId ?? '',
  isPublic: params.isPublic ?? null,
  searchQuery: params.searchQuery ?? '',
  filter: params.filter ?? 'all',
  userId: params.userId ?? '',
});

export const playlistKeys = {
  all: ['playlists'] as const,
  lists: () => [...playlistKeys.all, 'list'] as const,
  list: (params?: PlaylistListParams) => [...playlistKeys.lists(), normalizePlaylistListParams(params)] as const,
  details: () => [...playlistKeys.all, 'detail'] as const,
  detail: (id: string) => [...playlistKeys.details(), id] as const,
  videos: (playlistId: string) => [...playlistKeys.all, 'videos', playlistId] as const,
  collaborators: (playlistId: string) => [...playlistKeys.all, 'collaborators', playlistId] as const,
  progress: (playlistId: string, userId?: string) => [...playlistKeys.all, 'progress', playlistId, userId ?? ''] as const,
};
