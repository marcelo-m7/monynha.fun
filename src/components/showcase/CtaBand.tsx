import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CtaBandProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: 'lime' | 'dark' | 'light';
  className?: string;
}

export function CtaBand({ title, description, actions, tone = 'lime', className }: CtaBandProps) {
  return (
    <section
      className={cn(
        'border-y-2 border-border',
        tone === 'lime' && 'bg-[#efff00] text-black',
        tone === 'dark' && 'bg-secondary text-secondary-foreground',
        tone === 'light' && 'bg-background text-foreground',
        className,
      )}
    >
      <div className="container flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-black leading-none md:text-5xl">{title}</h2>
          {description && <p className={cn('mt-4 max-w-2xl text-sm font-semibold leading-6', tone === 'dark' ? 'text-secondary-foreground/70' : 'text-black/75')}>{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{actions}</div>}
      </div>
    </section>
  );
}
