import { useMemo, useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHero } from '@/components/showcase';
import { VideoCard } from '@/components/video/VideoCard';
import { useFeaturedVideos, useInfiniteVideos, useVideoSemanticTags } from '@/features/videos/queries/useVideos';
import { useCategories } from '@/features/categories/queries/useCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useMetaTags } from '@/shared/hooks/useMetaTags';

const normalizeLanguageFilterValue = (value: string) => {
  if (value === 'und') return 'other';
  return value;
};

const Videos = () => {
  const { t } = useTranslation();

  useMetaTags({
    title: `${t('videos.title')} | Tube O2`,
    description: t('videos.description'),
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearchQuery = searchParams.get('query') || '';
  const initialCategoryIds = (searchParams.get('category') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const initialLanguages = [
    ...new Set(
      (searchParams.get('language') || '')
        .split(',')
        .map((item) => normalizeLanguageFilterValue(item.trim()))
        .filter(Boolean),
    ),
  ];
  const initialSortBy = (searchParams.get('sort') as 'recent' | 'mostViewed' | 'mostFavorited' | null) || 'recent';
  const initialFilterMode = (searchParams.get('match') as 'all' | 'any' | null) || 'all';
  const initialSemanticTags = (searchParams.get('tag') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const isFeatured = searchParams.get('featured') === 'true';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialLanguages);
  const [selectedSortBy, setSelectedSortBy] = useState<'recent' | 'mostViewed' | 'mostFavorited'>(initialSortBy);
  const [selectedFilterMode, setSelectedFilterMode] = useState<'all' | 'any'>(initialFilterMode);
  const [selectedSemanticTags, setSelectedSemanticTags] = useState<string[]>(initialSemanticTags);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: videosPages,
    isLoading: videosLoading,
    isError: videosIsError,
    error: videosError,
    refetch: refetchVideos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteVideos({
    searchQuery: debouncedSearchQuery || undefined,
    categoryIds: selectedCategoryIds,
    languages: selectedLanguages,
    sortBy: selectedSortBy,
    filterMode: selectedFilterMode,
    semanticTags: selectedSemanticTags,
    pageSize: 24,
    enabled: !isFeatured,
  });
    useEffect(() => {
      if (isFeatured || !hasNextPage || isFetchingNextPage || !loadMoreRef.current) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry?.isIntersecting) {
            void fetchNextPage();
          }
        },
        { rootMargin: '250px 0px', threshold: 0.01 },
      );

      observer.observe(loadMoreRef.current);
      return () => observer.disconnect();
    }, [isFeatured, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: featuredVideos, isLoading: featuredLoading } = useFeaturedVideos(24, 0, isFeatured);
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: semanticTagStats, isLoading: semanticTagsLoading } = useVideoSemanticTags(200, !isFeatured);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (debouncedSearchQuery) newSearchParams.set('query', debouncedSearchQuery);
    if (selectedCategoryIds.length > 0) newSearchParams.set('category', selectedCategoryIds.join(','));
    if (selectedLanguages.length > 0) newSearchParams.set('language', selectedLanguages.join(','));
    if (selectedSortBy !== 'recent') newSearchParams.set('sort', selectedSortBy);
    if (selectedFilterMode !== 'all') newSearchParams.set('match', selectedFilterMode);
    if (selectedSemanticTags.length > 0) newSearchParams.set('tag', selectedSemanticTags.join(','));
    if (isFeatured) newSearchParams.set('featured', 'true');
    setSearchParams(newSearchParams);
  }, [debouncedSearchQuery, selectedCategoryIds, selectedLanguages, selectedSortBy, selectedFilterMode, selectedSemanticTags, isFeatured, setSearchParams]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategoryIds([]);
    setSelectedLanguages([]);
    setSelectedSortBy('recent');
    setSelectedFilterMode('all');
    setSelectedSemanticTags([]);
    const resetParams = new URLSearchParams();
    if (isFeatured) resetParams.set('featured', 'true');
    setSearchParams(resetParams);
  };

  const availableLanguages = useMemo(() => [
    { value: 'pt', label: t('common.language.pt') },
    { value: 'en', label: t('common.language.en') },
    { value: 'es', label: t('common.language.es') },
    { value: 'fr', label: t('common.language.fr') },
    { value: 'other', label: t('common.language.other') },
  ], [t]);

  const availableSemanticTags = useMemo(
    () => (semanticTagStats ?? []).filter((entry) => entry.video_count > 0),
    [semanticTagStats],
  );

  const renderedVideos = isFeatured
    ? featuredVideos
    : (videosPages?.pages ?? []).flat();
  const isVideoListLoading = isFeatured ? featuredLoading : videosLoading;
  const hasFilters = !!(
    searchQuery ||
    selectedCategoryIds.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedSemanticTags.length > 0 ||
    selectedSortBy !== 'recent' ||
    selectedFilterMode !== 'all'
  );

  const sortOptions = useMemo(() => ([
    { value: 'recent', label: t('videos.sort.recent') },
    { value: 'mostViewed', label: t('videos.sort.mostViewed') },
    { value: 'mostFavorited', label: t('videos.sort.mostFavorited') },
  ]), [t]);

  const toggleArrayValue = (value: string, setValue: Dispatch<SetStateAction<string[]>>) => {
    setValue((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleSemanticTagClick = (tag: string) => {
    toggleArrayValue(tag, setSelectedSemanticTags);
  };

  return (
    <MainLayout>
      <PageHero
        eyebrow={t('header.videos')}
        title={t('videos.title')}
        description={t('videos.description')}
      />
      <div className="container py-8">

        {/* Search and Filter Controls */}
        <div className="mb-8 flex flex-col gap-4 border-2 border-border bg-card p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('videos.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isFeatured}
              className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-muted/50 md:w-[220px]"
                disabled={isFeatured}
              >
                <span>
                  {selectedCategoryIds.length > 0
                    ? t(
                        selectedCategoryIds.length === 1
                          ? 'videos.multi.categorySelected'
                          : 'videos.multi.categoriesSelected',
                        { count: selectedCategoryIds.length },
                      )
                    : t('videos.allCategories')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-72 overflow-y-auto" align="start">
              <DropdownMenuLabel>{t('videos.multi.categoriesLabel')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedCategoryIds(categories?.map((category) => category.id) ?? [])}
                >
                  {t('videos.multi.selectAll')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedCategoryIds([])}
                >
                  {t('videos.multi.clear')}
                </Button>
              </div>
              {categoriesLoading ? (
                <div className="p-2 text-muted-foreground">{t('videos.loadingCategories')}</div>
              ) : (
                categories?.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={selectedCategoryIds.includes(category.id)}
                    onCheckedChange={() => toggleArrayValue(category.id, setSelectedCategoryIds)}
                  >
                    {category.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-muted/50 md:w-[200px]"
                disabled={isFeatured}
              >
                <span>
                  {selectedLanguages.length > 0
                    ? t(
                        selectedLanguages.length === 1
                          ? 'videos.multi.languageSelected'
                          : 'videos.multi.languagesSelected',
                        { count: selectedLanguages.length },
                      )
                    : t('videos.allLanguages')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-64 overflow-y-auto" align="start">
              <DropdownMenuLabel>{t('videos.multi.languagesLabel')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedLanguages(availableLanguages.map((lang) => lang.value))}
                >
                  {t('videos.multi.selectAll')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedLanguages([])}
                >
                  {t('videos.multi.clear')}
                </Button>
              </div>
              {availableLanguages.map((lang) => (
                <DropdownMenuCheckboxItem
                  key={lang.value}
                  checked={selectedLanguages.includes(lang.value)}
                  onCheckedChange={() => toggleArrayValue(lang.value, setSelectedLanguages)}
                >
                  {lang.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-muted/50 md:w-[240px]"
                disabled={isFeatured}
              >
                <span>
                  {selectedSemanticTags.length > 0
                    ? t(
                        selectedSemanticTags.length === 1
                          ? 'videos.multi.tagSelected'
                          : 'videos.multi.tagsSelected',
                        { count: selectedSemanticTags.length },
                      )
                    : t('videos.allTags')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-72 overflow-y-auto" align="start">
              <DropdownMenuLabel>{t('videos.multi.tagsLabel')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedSemanticTags(availableSemanticTags.map((entry) => entry.tag))}
                >
                  {t('videos.multi.selectAll')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedSemanticTags([])}
                >
                  {t('videos.multi.clear')}
                </Button>
              </div>
              {semanticTagsLoading ? (
                <div className="p-2 text-muted-foreground">{t('videos.loadingTags')}</div>
              ) : (
                availableSemanticTags.map((entry) => (
                  <DropdownMenuCheckboxItem
                    key={entry.tag}
                    checked={selectedSemanticTags.includes(entry.tag)}
                    onCheckedChange={() => toggleArrayValue(entry.tag, setSelectedSemanticTags)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{entry.tag}</span>
                      <span className="text-xs text-muted-foreground">{entry.video_count}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            value={selectedSortBy}
            onValueChange={(value) => setSelectedSortBy(value as 'recent' | 'mostViewed' | 'mostFavorited')}
            disabled={isFeatured}
          >
            <SelectTrigger className="w-full md:w-[190px] bg-muted/50 border-0 focus:ring-primary/30">
              <SelectValue placeholder={t('videos.sort.label')} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedFilterMode}
            onValueChange={(value) => setSelectedFilterMode(value as 'all' | 'any')}
            disabled={isFeatured}
          >
            <SelectTrigger className="w-full md:w-[190px] bg-muted/50 border-0 focus:ring-primary/30">
              <SelectValue placeholder={t('videos.matchMode.label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('videos.matchMode.all')}</SelectItem>
              <SelectItem value="any">{t('videos.matchMode.any')}</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2" disabled={isFeatured}>
              <X className="w-4 h-4" />
              {t('videos.clearFilters')}
            </Button>
          )}
        </div>

        {!isVideoListLoading && !videosIsError && !isFeatured && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {t((renderedVideos?.length ?? 0) === 1 ? 'videos.resultCountOne' : 'videos.resultCount', {
                count: renderedVideos?.length ?? 0,
              })}
            </span>
            {selectedSemanticTags.map((tag) => (
              <Button
                key={tag}
                variant="outline"
                size="sm"
                className="h-7 gap-2 px-2"
                onClick={() => toggleArrayValue(tag, setSelectedSemanticTags)}
              >
                <span>{t('videos.activeTag', { tag })}</span>
                <X className="h-3 w-3" />
              </Button>
            ))}
          </div>
        )}

        {/* Video List */}
        {isVideoListLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
        ) : videosIsError && !isFeatured ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-foreground">{t('videos.loadingErrorTitle')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{videosError?.message || t('videos.loadingErrorDescription')}</p>
            <Button className="mt-4" onClick={() => void refetchVideos()}>
              {t('videos.retry')}
            </Button>
          </div>
        ) : renderedVideos && renderedVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderedVideos.map((video) => (
                <div key={video.id}>
                  <VideoCard video={video} variant="default" onTagClick={handleSemanticTagClick} />
                </div>
              ))}
            </div>
            {!isFeatured && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
                {isFetchingNextPage ? (
                  <span>{t('videos.loadingMore')}</span>
                ) : hasNextPage ? (
                  <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
                    {t('videos.loadMore')}
                  </Button>
                ) : (
                  <span>{t('videos.endOfResults')}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {isFeatured ? t('index.noFeaturedVideos') : t('videos.noVideosFound')}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Videos;
