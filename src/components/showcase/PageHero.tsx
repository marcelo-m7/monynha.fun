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
  animateEntrance?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
  contentClassName,
  animateEntrance = false,
}: PageHeroProps) {
  const titleDelayClass = eyebrow ? 'animation-delay-70' : 'animation-delay-0';
  const descriptionDelayClass = eyebrow ? 'animation-delay-140' : 'animation-delay-70';
  const actionsDelayClass = eyebrow ? 'animation-delay-210' : 'animation-delay-140';

  return (
    <section className={cn('border-b-2 border-border bg-background text-foreground', className)}>
      <div className="container grid gap-10 py-10 md:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-20">
        <div className={cn('max-w-3xl space-y-6', contentClassName)}>
          {eyebrow && (
            <p
              className={cn(
                'text-xs font-black uppercase text-muted-foreground',
                animateEntrance && 'animate-home-hero-item animation-delay-0',
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'text-5xl font-black leading-[0.92] md:text-7xl xl:text-8xl',
              animateEntrance && `animate-home-hero-item ${titleDelayClass}`,
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                'max-w-2xl text-base leading-7 text-muted-foreground md:text-xl md:leading-8',
                animateEntrance && `animate-home-hero-item ${descriptionDelayClass}`,
              )}
            >
              {description}
            </p>
          )}
          {actions && (
            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row',
                animateEntrance && `animate-home-hero-item ${actionsDelayClass}`,
              )}
            >
              {actions}
            </div>
          )}
        </div>
        {aside && (
          <div className={cn('min-w-0', animateEntrance && 'animate-home-hero-aside animation-delay-140')}>
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}
