import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHero } from '@/components/showcase';
import { VideoCard } from '@/components/video/VideoCard';
import { useFeaturedVideos, useInfiniteVideos } from '@/features/videos/queries/useVideos';
import { useCategories } from '@/features/categories/queries/useCategories';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Videos = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearchQuery = searchParams.get('query') || '';
  const initialCategoryId = searchParams.get('category') || '';
  const initialLanguage = searchParams.get('language') || '';
  const initialSortBy = (searchParams.get('sort') as 'recent' | 'mostViewed' | 'mostFavorited' | null) || 'recent';
  const initialSemanticTag = searchParams.get('tag') || '';
  const isFeatured = searchParams.get('featured') === 'true';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedSortBy, setSelectedSortBy] = useState<'recent' | 'mostViewed' | 'mostFavorited'>(initialSortBy);
  const [selectedSemanticTag, setSelectedSemanticTag] = useState(initialSemanticTag);

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
    categoryId: selectedCategory || undefined,
    language: selectedLanguage || undefined,
    sortBy: selectedSortBy,
    semanticTag: selectedSemanticTag || undefined,
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (debouncedSearchQuery) newSearchParams.set('query', debouncedSearchQuery);
    if (selectedCategory) newSearchParams.set('category', selectedCategory);
    if (selectedLanguage) newSearchParams.set('language', selectedLanguage);
    if (selectedSortBy !== 'recent') newSearchParams.set('sort', selectedSortBy);
    if (selectedSemanticTag) newSearchParams.set('tag', selectedSemanticTag);
    if (isFeatured) newSearchParams.set('featured', 'true');
    setSearchParams(newSearchParams);
  }, [debouncedSearchQuery, selectedCategory, selectedLanguage, selectedSortBy, selectedSemanticTag, isFeatured, setSearchParams]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('');
    setSelectedLanguage('');
    setSelectedSortBy('recent');
    setSelectedSemanticTag('');
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

  const renderedVideos = isFeatured
    ? featuredVideos
    : (videosPages?.pages ?? []).flat();
  const isVideoListLoading = isFeatured ? featuredLoading : videosLoading;
  const hasFilters = !!(searchQuery || selectedCategory || selectedLanguage || selectedSemanticTag || selectedSortBy !== 'recent');

  const sortOptions = useMemo(() => ([
    { value: 'recent', label: t('videos.sort.recent') },
    { value: 'mostViewed', label: t('videos.sort.mostViewed') },
    { value: 'mostFavorited', label: t('videos.sort.mostFavorited') },
  ]), [t]);

  const handleSemanticTagClick = (tag: string) => {
    setSelectedSemanticTag(tag);
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

          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}
            disabled={isFeatured}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-muted/50 border-0 focus:ring-primary/30">
              <SelectValue placeholder={t('videos.allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('videos.allCategories')}</SelectItem>
              {categoriesLoading ? (
                <div className="p-2 text-muted-foreground">{t('videos.loadingCategories')}</div>
              ) : (
                categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            value={selectedLanguage}
            onValueChange={(value) => setSelectedLanguage(value === "all" ? "" : value)}
            disabled={isFeatured}
          >
            <SelectTrigger className="w-full md:w-[150px] bg-muted/50 border-0 focus:ring-primary/30">
              <SelectValue placeholder={t('videos.allLanguages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('videos.allLanguages')}</SelectItem>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          {hasFilters && (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2" disabled={isFeatured}>
              <X className="w-4 h-4" />
              {t('videos.clearFilters')}
            </Button>
          )}
        </div>

        {!isVideoListLoading && !videosIsError && !isFeatured && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{t('videos.resultCount', { count: renderedVideos?.length ?? 0 })}</span>
            {selectedSemanticTag && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-2 px-2"
                onClick={() => setSelectedSemanticTag('')}
              >
                <span>{t('videos.activeTag', { tag: selectedSemanticTag })}</span>
                <X className="h-3 w-3" />
              </Button>
            )}
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
