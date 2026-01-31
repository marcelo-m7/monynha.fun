import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FolderX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCard } from '@/components/video/CategoryCard';
import { useCategories } from '@/features/categories/queries/useCategories';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Import ScrollArea and ScrollBar

export const CategorySection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useCategories();

  return (
    <section className="py-16 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">{t('index.categoriesTitle')}</h2>
            <p className="text-muted-foreground mt-1">{t('index.categoriesDescription')}</p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 group"
            onClick={() => navigate('/videos')}
          >
            {t('index.viewAll')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {categoriesLoading ? (
          <div className="flex space-x-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[140px] h-32 rounded-2xl" />
            ))}
          </div>
        ) : categoriesError ? (
          <div className="text-center py-12 text-destructive">
            <p>{t('common.loadError')}</p> {/* Assuming a generic load error translation */}
          </div>
        ) : categories && categories.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-4">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CategoryCard
                    category={category}
                    onClick={() => navigate(`/videos?category=${category.id}`)}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
            <FolderX className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('index.noCategoriesFound')}</p>
          </div>
        )}
      </div>
    </section>
  );
};