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
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: Category;
  videoCount?: number;
  onClick?: () => void;
  index?: number;
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

export const CategoryCard = ({ category, videoCount = 0, onClick, index = 0 }: CategoryCardProps) => {
  const Icon = iconMap[category.icon] || HelpCircle;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border transition-all duration-300",
        "bg-card border-border/50 elevation-card hover:scale-[1.02] active:scale-[0.98]",
        "min-w-[160px] sm:min-w-[200px] flex-1 animate-fade-up"
      )}
      style={{ 
        animationDelay: `${index * 0.05}s`
      }}
    >
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
        style={{ backgroundColor: `${category.color}15`, color: category.color }}
      >
        <Icon className="w-7 h-7" />
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
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