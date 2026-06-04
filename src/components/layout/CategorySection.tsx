import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FolderX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCard } from '@/components/video/CategoryCard';
import { useCategories } from '@/features/categories/queries/useCategories';
import { useVideos } from '@/features/videos/queries/useVideos';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export const CategorySection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useCategories();
  
  // We only enable video fetching if categories are present to avoid unnecessary loads
  const { data: videos } = useVideos({ enabled: !!categories?.length });

  const categoryVideoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    videos?.forEach((video) => {
      const categoryId = video.category?.id ?? video.category_id;
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] ?? 0) + 1;
      }
    });
    return counts;
  }, [videos]);

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/videos?category=${categoryId}`);
  };

  return (
    <section className="py-20 bg-background relative overflow-hidden border-t border-primary/20">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-primary/40 bg-primary/8 text-foreground text-[0.65rem] font-bold uppercase tracking-[0.25em]">
              <Sparkles className="w-3 h-3" />
              {t('index.categoriesTitle')}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-[0.1em] font-mono">
              {t('index.categoriesDescription')}
            </h2>
          </div>
          
          <Button
            variant="ghost"
            className="w-fit gap-2 group text-muted-foreground hover:opacity-75 transition-opacity"
            onClick={() => navigate('/videos')}
          >
            {t('index.viewAll')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {categoriesLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40 min-w-[200px] rounded-2xl" />
            ))}
          </div>
        ) : categoriesError ? (
          <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-3xl border border-dashed">
            <FolderX className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold text-muted-foreground">{t('index.categoriesError')}</p>
          </div>
        ) : categories && categories.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-5 pb-6">
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  videoCount={categoryVideoCounts[category.id] ?? 0}
                  onClick={() => handleCategoryClick(category.id)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden sm:flex" />
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-3xl border border-dashed">
            <FolderX className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold text-muted-foreground">{t('index.noCategories')}</p>
          </div>
        )}
      </div>
    </section>
  );
};