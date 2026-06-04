import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'start' | 'split';
  className?: string;
}

export function SectionHeader({ title, description, action, align = 'split', className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-5',
        align === 'split' && 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="max-w-3xl">
        <h2 className="text-3xl font-black leading-none md:text-5xl">{title}</h2>
        {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
