import type { Category } from "@/entities/category/category.types";
import { 
  BookOpen, 
  ChefHat, 
  GraduationCap, 
  Laugh, 
  Music, 
  Globe, 
  HelpCircle,
  LucideIcon
} from "lucide-react";

interface CategoryCardProps {
  category: Category;
  videoCount?: number;
  onClick?: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  ChefHat,
  GraduationCap,
  Laugh,
  Music,
  Globe,
  HelpCircle,
};

export const CategoryCard = ({ category, videoCount = 0, onClick }: CategoryCardProps) => {
  const Icon = iconMap[category.icon] || HelpCircle;
  
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] bg-muted/50 border-border/50 hover:border-primary/30 hover:bg-primary/5 min-w-[120px] sm:min-w-[140px]"
      style={{ 
        '--category-color': category.color 
      } as React.CSSProperties}
    >
      <div 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-xs sm:text-sm text-foreground">{category.name}</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{videoCount} vídeos</p>
      </div>
    </button>
  );
};
