export interface CourseCatalogParams {
  courseCode?: string;
}

const normalizeCourseCatalogParams = (params: CourseCatalogParams = {}) => ({
  courseCode: params.courseCode ?? '',
});

export const courseKeys = {
  all: ['courses'] as const,
  summaries: () => [...courseKeys.all, 'summary'] as const,
  summaryList: () => [...courseKeys.summaries(), 'list'] as const,
  catalogs: () => [...courseKeys.all, 'catalog'] as const,
  catalogList: (params?: CourseCatalogParams) => [...courseKeys.catalogs(), normalizeCourseCatalogParams(params)] as const,
  health: () => [...courseKeys.all, 'health'] as const,
  healthList: (params?: CourseCatalogParams) => [...courseKeys.health(), normalizeCourseCatalogParams(params)] as const,
};
