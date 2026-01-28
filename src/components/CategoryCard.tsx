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
import { cn } from "@/lib/utils"; // Import cn for conditional class merging

interface CategoryCardProps {
  category: Category;
  videoCount?: number;
  onClick?: () => void;
  variant?: 'default' | 'compact'; // Add variant prop
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

export const CategoryCard = ({ category, videoCount = 0, onClick, variant = 'default' }: CategoryCardProps) => {
  const Icon = iconMap[category.icon] || HelpCircle;
  
  const isCompact = variant === 'compact';

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] bg-muted/50 border-border/50 hover:border-primary/30 hover:bg-primary/5",
        isCompact ? "p-2" : "p-4" // Reduced padding for compact
      )}
      style={{ 
        '--category-color': category.color 
      } as React.CSSProperties}
    >
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          isCompact ? "w-8 h-8" : "w-10 h-10" // Smaller icon container for compact
        )}
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        <Icon className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} /> {/* Smaller icon for compact */}
      </div>
      <div className="text-center">
        <h3 className={cn("font-semibold text-foreground line-clamp-1", isCompact ? "text-xs" : "text-sm")}> {/* Smaller text for compact */}
          {category.name}
        </h3>
        <p className={cn("text-muted-foreground mt-1 line-clamp-1", isCompact ? "text-2xs" : "text-xs")}> {/* Smaller text for video count */}
          {videoCount} vídeos
        </p>
      </div>
    </button>
  );
};