import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CulturalRelevanceBadgeProps {
  relevance: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}

export function CulturalRelevanceBadge({ 
  relevance, 
  className,
  showLabel = true 
}: CulturalRelevanceBadgeProps) {
  if (!relevance) return null;
  
  const normalized = relevance.toLowerCase();
  
  const config: Record<string, { icon: React.ReactNode; label: string; colorClasses: string }> = {
    high: {
      icon: <Flame className="w-3 h-3" />,
      label: 'High Relevance',
      colorClasses: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300',
    },
    medium: {
      icon: <TrendingUp className="w-3 h-3" />,
      label: 'Medium Relevance',
      colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300',
    },
    low: {
      icon: <Minus className="w-3 h-3" />,
      label: 'Low Relevance',
      colorClasses: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-300',
    },
  };
  
  const current = config[normalized] || config.low;
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 text-xs font-normal',
        current.colorClasses,
        className,
      )}
    >
      {current.icon}
      {showLabel && <span>{current.label}</span>}
    </Badge>
  );
}
