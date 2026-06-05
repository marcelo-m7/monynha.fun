import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHero } from '@/components/showcase';
import { VideoCard } from '@/components/video/VideoCard';
import { useFeaturedVideos, useVideos } from '@/features/videos/queries/useVideos';
import { useCategories } from '@/features/categories/queries/useCategories';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Videos = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSearchQuery = searchParams.get('query') || '';
  const initialCategoryId = searchParams.get('category') || '';
  const initialLanguage = searchParams.get('language') || '';
  const isFeatured = searchParams.get('featured') === 'true';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);

  const { data: videos, isLoading: videosLoading } = useVideos({
    searchQuery: debouncedSearchQuery || undefined,
    categoryId: selectedCategory || undefined,
    language: selectedLanguage || undefined,
    enabled: !isFeatured,
  });
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
    if (isFeatured) newSearchParams.set('featured', 'true');
    setSearchParams(newSearchParams);
  }, [debouncedSearchQuery, selectedCategory, selectedLanguage, isFeatured, setSearchParams]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategory('');
    setSelectedLanguage('');
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

  const renderedVideos = isFeatured ? featuredVideos : videos;
  const isVideoListLoading = isFeatured ? featuredLoading : videosLoading;

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

          {(searchQuery || selectedCategory || selectedLanguage) && (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2" disabled={isFeatured}>
              <X className="w-4 h-4" />
              {t('videos.clearFilters')}
            </Button>
          )}
        </div>

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
        ) : renderedVideos && renderedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderedVideos.map((video) => (
                <div key={video.id}>
                  <VideoCard video={video} variant="default" />
                </div>
              ))}
            </div>
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
