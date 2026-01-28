import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCard } from '@/components/CategoryCard';
import { useCategories } from '@/features/categories/queries/useCategories';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Import ScrollArea and ScrollBar

export const CategorySection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  return (
    <section className="w-full py-12 sm:py-16 lg:py-20 bg-background">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('index.categoriesTitle')}</h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('index.categoriesDescription')}</p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 group shrink-0 h-9 sm:h-10"
            onClick={() => navigate('/videos')}
          >
            <span className="hidden sm:inline">{t('index.viewAll')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {categoriesLoading ? (
          <div className="flex space-x-3 sm:space-x-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[120px] sm:min-w-[140px] h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
            ))}
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-3 sm:pb-4">
            <div className="flex w-max space-x-3 sm:space-x-4">
              {categories?.map((category, index) => (
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
        )}
      </div>
    </section>
  );
};