import type { VideoWithCategory } from "@/entities/video/video.types";
import { formatDuration, formatViewCount } from "@/shared/lib/format";
import { Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { useVideoViewIncrement } from '@/shared/hooks/useVideoViewIncrement';

interface VideoCardProps {
  video: VideoWithCategory;
  onClick?: () => void;
  variant?: 'default' | 'compact'; // Add variant prop
}

export const VideoCard = ({ video, onClick, variant = 'default' }: VideoCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { viewCount, showPlus, handleViewIncrement } = useVideoViewIncrement(video.view_count || 0);

  const handleClick = () => {
    handleViewIncrement(video.id);

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
        "group cursor-pointer rounded-xl sm:rounded-2xl bg-card overflow-hidden shadow-sm transition-all duration-300 card-hover hover:shadow-lg border border-border/50",
        variant === 'compact' && "flex items-center gap-3 p-2 rounded-lg sm:rounded-xl hover:bg-muted/50 hover:shadow-none border-none"
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative aspect-video overflow-hidden",
        variant === 'default' ? "h-auto" : "w-24 sm:w-28 h-14 sm:h-16 flex-shrink-0 rounded-md sm:rounded-lg"
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
            <Badge variant="secondary" className="uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs">
              {t('labels.featured')}
            </Badge>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg",
            variant === 'default' ? "w-12 h-12 sm:w-14 sm:h-14" : "w-8 h-8 sm:w-10 sm:h-10"
          )}>
            <Play className={cn(
              "text-primary-foreground ml-0.5 sm:ml-1",
              variant === 'default' ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5 sm:w-4 sm:h-4"
            )} fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {variant === 'default' && video.duration_seconds && video.duration_seconds > 0 && (
          <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-foreground/80 text-background text-[10px] sm:text-xs font-medium backdrop-blur-sm">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Language badge */}
        <Badge
          variant="secondary"
          className={cn(
            "absolute top-1.5 sm:top-2 left-1.5 sm:left-2 text-[10px] sm:text-xs font-medium bg-background/90 backdrop-blur-sm uppercase",
            variant === 'compact' && "hidden" // Hide language badge in compact view
          )}
        >
          {video.language}
        </Badge>
      </div>

      {/* Content */}
      <div className={cn(
        "space-y-2 sm:space-y-3",
        variant === 'default' ? "p-3 sm:p-4" : "flex-1 space-y-0.5 sm:space-y-1"
      )}>
        <h3 className={cn(
          "font-semibold leading-snug group-hover:text-primary transition-colors",
          variant === 'default' ? "text-sm sm:text-base line-clamp-2" : "text-xs sm:text-sm line-clamp-2"
        )}>
          {video.title}
        </h3>
        
        <p className={cn(
          "text-muted-foreground line-clamp-1",
          variant === 'default' ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs"
        )}>
          {video.channel_name}
        </p>

        <div className={cn(
          "flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground",
          variant === 'compact' && "hidden" // Hide view count and category in compact view
        )}>
          <div className="flex items-center gap-1 relative">
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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