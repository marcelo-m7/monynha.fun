import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichmentIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EnrichmentIndicator({ className, size = 'sm' }: EnrichmentIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-primary p-1',
        className,
      )}
      title="Enhanced with AI"
    >
      <Sparkles className={cn('text-white', sizeClasses[size])} />
    </div>
  );
}
