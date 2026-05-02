import type { ListEditorApplicationsParams } from './editor_application.types';

const normalizeListParams = (params: ListEditorApplicationsParams = {}) => ({
  query: params.query ?? '',
  status: params.status ?? 'all',
  limit: params.limit ?? 50,
});

export const editorApplicationKeys = {
  all: ['editor-applications'] as const,
  lists: () => [...editorApplicationKeys.all, 'list'] as const,
  list: (params?: ListEditorApplicationsParams) =>
    [...editorApplicationKeys.lists(), normalizeListParams(params)] as const,
};
