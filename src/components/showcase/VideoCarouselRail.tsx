import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import type { HomeHeroVideo } from '@/entities/home/home.types';
import { cn } from '@/lib/utils';
import { SectionHeader } from './SectionHeader';
import { VideoShowcaseCard } from './VideoShowcaseCard';

interface VideoCarouselRailProps {
  title: string;
  description: string;
  videos: HomeHeroVideo[];
  isLoading?: boolean;
  emptyMessage: string;
  actionLabel: string;
  onAction: () => void;
  variant?: 'light' | 'dark';
}

export function VideoCarouselRail({
  title,
  description,
  videos,
  isLoading = false,
  emptyMessage,
  actionLabel,
  onAction,
  variant = 'light',
}: VideoCarouselRailProps) {
  const isDark = variant === 'dark';

  return (
    <section className={cn('overflow-x-clip border-y-2 border-border py-14 md:py-20', isDark ? 'bg-black text-white' : 'bg-background text-foreground')}>
      <div className="container">
        <SectionHeader
          title={title}
          description={description}
          action={
            <Button
              variant="outline"
              className={cn(
                isDark && 'border-white bg-black text-white hover:bg-[#efff00] hover:text-black',
              )}
              onClick={onAction}
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'aspect-video border-2 animate-pulse',
                  isDark ? 'border-white/30 bg-white/10' : 'border-border bg-muted/60',
                )}
              />
            ))}
          </div>
        ) : videos.length ? (
          <Carousel opts={{ align: 'start', dragFree: true }} className="px-1 md:px-2">
            <CarouselPrevious
              className={cn(
                'left-0 top-1/2 h-10 w-10 -translate-y-1/2 border-2 lg:-left-12',
                isDark && 'border-white bg-black text-white hover:bg-[#efff00] hover:text-black',
              )}
            />
            <CarouselContent>
              {videos.map((video) => (
                <CarouselItem key={video.id} className="basis-[84%] sm:basis-1/2 lg:basis-1/3 2xl:basis-1/4">
                  <VideoShowcaseCard
                    video={video}
                    variant="tile"
                    className={cn(
                      'h-full',
                      isDark && 'border-white/40 bg-black text-white hover:border-[#efff00] [&_p]:text-white/70 [&_.text-muted-foreground]:text-white/70',
                    )}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext
              className={cn(
                'right-0 top-1/2 h-10 w-10 -translate-y-1/2 border-2 lg:-right-12',
                isDark && 'border-white bg-black text-white hover:bg-[#efff00] hover:text-black',
              )}
            />
          </Carousel>
        ) : (
          <div className={cn('border-2 p-8', isDark ? 'border-white/30 text-white/70' : 'border-border text-muted-foreground')}>
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}