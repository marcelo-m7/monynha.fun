import { Heart, ListPlus, Play, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VideoDurationBadge } from '@/components/video/VideoDurationBadge';
import type { HomeHeroVideo } from '@/entities/home/home.types';
import { getVideoRoute } from '@/entities/video/video.routes';
import { LazyImage } from '@/shared/components/LazyImage';
import { formatViewCount } from '@/shared/lib/format';
import { getReliableYouTubeThumbnailUrl } from '@/shared/lib/youtube';
import { cn } from '@/lib/utils';

interface VideoShowcaseCardProps {
  video: HomeHeroVideo;
  variant?: 'feature' | 'tile' | 'row';
  className?: string;
}

export function VideoShowcaseCard({ video, variant = 'tile', className }: VideoShowcaseCardProps) {
  const navigate = useNavigate();
  const primaryTag = video.semantic_tags?.[0] ?? video.category_name;
  const image = getReliableYouTubeThumbnailUrl(video.thumbnail_url, '/placeholder.png');

  return (
    <button
      type="button"
      onClick={() => navigate(getVideoRoute(video))}
      className={cn(
        'group block w-full border-2 border-border bg-card text-left text-card-foreground transition-transform duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variant === 'row' && 'grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 overflow-hidden p-2',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          variant === 'feature' && 'aspect-[16/10]',
          variant === 'tile' && 'aspect-video',
          variant === 'row' && 'aspect-video h-full',
        )}
      >
        <LazyImage src={image} fallbackSrc="/placeholder.png" alt={video.title} className="object-cover" />
        <VideoDurationBadge durationSeconds={video.duration_seconds} className="font-black" />
        <span className="absolute left-2 top-2 border border-black bg-[#efff00] px-2 py-1 text-[0.62rem] font-black uppercase text-black">
          {video.language}
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span className="flex h-10 w-10 scale-95 items-center justify-center border-2 border-black bg-[#efff00] text-black opacity-0 transition-[opacity,transform] duration-150 motion-safe:group-hover:scale-100 group-hover:opacity-100">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </span>
      </div>

      <div className={cn('min-w-0 space-y-3 p-4', variant === 'row' && 'p-0 pr-2')}>
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[0.65rem] font-black uppercase text-muted-foreground">
          {video.category_name && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <span className="h-2 w-2" style={{ backgroundColor: video.category_color ?? '#efff00' }} />
              {video.category_name}
            </span>
          )}
          {primaryTag && (
            <span className="hidden min-w-0 items-center gap-1 truncate sm:inline-flex">
              <Tag className="h-3 w-3" />
              {primaryTag}
            </span>
          )}
        </div>
        <h3 className={cn('font-black uppercase leading-tight', variant === 'feature' ? 'text-xl md:text-2xl' : 'text-sm', variant === 'row' && 'line-clamp-2')}>
          {video.title}
        </h3>
        {variant !== 'row' && video.summary && <p className="line-clamp-2 text-sm leading-6 text-foreground/80">{video.summary}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-[0.7rem] font-bold uppercase text-muted-foreground">
          <span className="max-w-full truncate">{video.channel_name}</span>
          <span>{formatViewCount(video.view_count)}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {video.favorites_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListPlus className="h-3 w-3" />
            {video.playlist_add_count}
          </span>
        </div>
      </div>
    </button>
  );
}
