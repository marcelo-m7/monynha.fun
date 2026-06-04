import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageHero({ eyebrow, title, description, actions, aside, className, contentClassName }: PageHeroProps) {
  return (
    <section className={cn('border-b-2 border-border bg-background text-foreground', className)}>
      <div className="container grid gap-10 py-10 md:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-20">
        <div className={cn('max-w-3xl space-y-6', contentClassName)}>
          {eyebrow && (
            <p className="text-xs font-black uppercase text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="text-5xl font-black leading-[0.92] md:text-7xl xl:text-8xl">
            {title}
          </h1>
          {description && <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-xl md:leading-8">{description}</p>}
          {actions && <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  );
}
