import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SemanticTagBadgeProps {
  tag: string;
  className?: string;
  onClick?: () => void;
}

// Generate a consistent color based on tag text (using hash)
function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300',
    'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
    'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
    'bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-300',
    'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300',
    'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300',
    'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300',
    'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

export function SemanticTagBadge({ tag, className, onClick }: SemanticTagBadgeProps) {
  const colorClasses = getTagColor(tag);
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-xs font-normal cursor-pointer transition-colors',
        colorClasses,
        className,
      )}
      onClick={onClick}
    >
      {tag}
    </Badge>
  );
}
