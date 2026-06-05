import type { Category } from "@/entities/category/category.types";
import { resolveCategoryIcon } from "@/entities/category/category.icons";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: Category;
  videoCount?: number;
  onClick?: () => void;
  index?: number;
}

export const CategoryCard = ({ category, videoCount = 0, onClick, index = 0 }: CategoryCardProps) => {
  const Icon = resolveCategoryIcon(category);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-4 p-6 rounded-md border transition-[border-color,box-shadow,transform] duration-150",
        "bg-card/95 border-primary/20 hover:border-primary/70 active:scale-[0.98]",
        "min-w-[160px] sm:min-w-[200px] flex-1 animate-fade-up"
      )}
      style={{ 
        animationDelay: `${index * 0.05}s`
      }}
    >
      <div 
        className="w-14 h-14 rounded-md flex items-center justify-center transition-transform duration-150 motion-safe:group-hover:scale-105 shadow-sm"
        style={{ backgroundColor: `${category.color}15`, color: category.color }}
      >
        <Icon className="w-7 h-7" />
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:opacity-75 transition-opacity uppercase tracking-[0.08em]">
          {category.name}
        </h3>
        <p className="text-xs text-muted-foreground font-medium">
          {videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}
        </p>
      </div>

      {/* Subtle glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: category.color }}
      />
    </button>
  );
};