import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { HomeCategory } from '@/entities/home/home.types';
import { cn } from '@/lib/utils';

interface CategorySwatchCardProps {
  category: HomeCategory;
  className?: string;
}

export function CategorySwatchCard({ category, className }: CategorySwatchCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => navigate(`/videos?category=${category.id}`)}
      className={cn(
        'group flex min-h-36 flex-col justify-between border-2 border-border bg-card p-4 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="h-9 w-9 border-2 border-border" style={{ backgroundColor: category.color }} />
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
      <div>
        <h3 className="text-lg font-black uppercase leading-tight">{category.name}</h3>
        <p className="mt-2 text-xs font-black uppercase text-muted-foreground">
          {t('homeExhibition.categories.videoCount', { count: category.video_count })}
        </p>
      </div>
    </button>
  );
}
