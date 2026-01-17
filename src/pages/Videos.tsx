import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VideoCard } from '@/components/VideoCard';
import { useVideos } from '@/features/videos';
import { useCategories } from '@/features/categories';
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

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);

  const { data: videos, isLoading: videosLoading } = useVideos({
    searchQuery: searchQuery || undefined,
    categoryId: selectedCategory || undefined,
    language: selectedLanguage || undefined,
  });
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (searchQuery) newSearchParams.set('query', searchQuery);
    if (selectedCategory) newSearchParams.set('category', selectedCategory);
    if (selectedLanguage) newSearchParams.set('language', selectedLanguage);
    setSearchParams(newSearchParams);
  }, [searchQuery, selectedCategory, selectedLanguage, setSearchParams]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLanguage('');
    setSearchParams(new URLSearchParams());
  };

  const availableLanguages = [
    { value: 'pt', label: t('common.language.pt') },
    { value: 'en', label: t('common.language.en') },
    { value: 'es', label: t('common.language.es') },
    { value: 'fr', label: t('common.language.fr') },
    { value: 'other', label: t('common.language.other') },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{t('videos.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('videos.description')}
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('videos.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>

          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
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

          <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value === "all" ? "" : value)}>
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
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <X className="w-4 h-4" />
              {t('videos.clearFilters')}
            </Button>
          )}
        </div>

        {/* Video List */}
        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <VideoCard video={video} variant="default" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('videos.noVideosFound')}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Videos;
