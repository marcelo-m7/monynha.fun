import { Category } from "@/features/categories";
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
      className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] bg-muted/50 border-border/50 hover:border-primary/30 hover:bg-primary/5"
      style={{ 
        '--category-color': category.color 
      } as React.CSSProperties}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-sm text-foreground">{category.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{videoCount} vídeos</p>
      </div>
    </button>
  );
};
