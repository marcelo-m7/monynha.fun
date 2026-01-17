import type { VideoWithCategory } from "@/entities/video/video.types";
import { incrementVideoViewCount } from "@/entities/video/video.api";
import { formatDuration, formatViewCount } from "@/shared/lib/format";
import { Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils"; // Import cn for conditional class names
import { useState } from "react";
import { useTranslation } from 'react-i18next';

interface VideoCardProps {
  video: VideoWithCategory;
  onClick?: () => void;
  variant?: 'default' | 'compact'; // Add variant prop
}

export const VideoCard = ({ video, onClick, variant = 'default' }: VideoCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewCount, setViewCount] = useState<number>(video.view_count || 0);
  const [showPlus, setShowPlus] = useState(false);

  const handleClick = () => {
    // optimistic UI: increment local counter and show +1 briefly
    setViewCount((v) => v + 1);
    setShowPlus(true);
    setTimeout(() => setShowPlus(false), 700);

    try {
      // fire-and-forget: increment on the server (atomic in DB function)
      incrementVideoViewCount(video.id);
    } catch (e) {
      // ignore errors — navigation should still happen
      console.debug('increment view failed', e);
    }

    if (onClick) {
      onClick();
    } else {
      navigate(`/videos/${video.id}`);
    }
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        "group cursor-pointer rounded-2xl bg-card overflow-hidden shadow-sm transition-all duration-300 card-hover hover:shadow-lg border border-border/50",
        variant === 'compact' && "flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 hover:shadow-none border-none"
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative aspect-video overflow-hidden",
        variant === 'default' ? "h-auto" : "w-28 h-16 flex-shrink-0 rounded-lg"
      )}>
        <img
          src={video.thumbnail_url}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg'; // Use the new placeholder SVG
            target.onerror = null; // Prevent infinite loop if placeholder also fails
          }}
        />

        {/* Featured badge */}
        {video.is_featured && variant === 'default' && (
          <div className="absolute left-2 top-2 z-10">
            <Badge variant="secondary" className="uppercase px-2 py-1 text-xs">
              {t('labels.featured')}
            </Badge>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg",
            variant === 'default' ? "w-14 h-14" : "w-10 h-10"
          )}>
            <Play className={cn(
              "text-primary-foreground ml-1",
              variant === 'default' ? "w-6 h-6" : "w-4 h-4"
            )} fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {variant === 'default' && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-foreground/80 text-background text-xs font-medium backdrop-blur-sm">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Language badge */}
        <Badge
          variant="secondary"
          className={cn(
            "absolute top-2 left-2 text-xs font-medium bg-background/90 backdrop-blur-sm uppercase",
            variant === 'compact' && "hidden" // Hide language badge in compact view
          )}
        >
          {video.language}
        </Badge>
      </div>

      {/* Content */}
      <div className={cn(
        "space-y-3",
        variant === 'default' ? "p-4" : "flex-1 space-y-1"
      )}>
        <h3 className={cn(
          "font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors",
          variant === 'default' ? "text-sm" : "text-xs"
        )}>
          {video.title}
        </h3>
        
        <p className={cn(
          "text-muted-foreground line-clamp-1",
          variant === 'default' ? "text-xs" : "text-2xs" // Smaller text for compact
        )}>
          {video.channel_name}
        </p>

        <div className={cn(
          "flex items-center justify-between text-xs text-muted-foreground",
          variant === 'compact' && "hidden" // Hide view count and category in compact view
        )}>
          <div className="flex items-center gap-1 relative">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatViewCount(viewCount)}</span>
            {showPlus && (
              <span className="absolute -right-6 -top-1 text-xs text-green-400 font-semibold animate-pop">+1</span>
            )}
          </div>
          {video.category && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5"
              style={{ borderColor: video.category.color, color: video.category.color }}
            >
              {video.category.name}
            </Badge>
          )}
        </div>
      </div>
    </article>
  );
};
