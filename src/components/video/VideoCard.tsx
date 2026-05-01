"use client";

import type { VideoWithCategory } from "@/entities/video/video.types";
import { formatDuration, formatViewCount } from "@/shared/lib/format";
import { Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { useVideoViewIncrement } from '@/shared/hooks/useVideoViewIncrement';
import { KeyboardEvent } from "react";
import { LazyImage } from "@/shared/components/LazyImage";
import { SemanticTagBadge } from "./SemanticTagBadge";
import { EnrichmentIndicator } from "./EnrichmentIndicator";

interface VideoCardProps {
  video: VideoWithCategory;
  onClick?: () => void;
  variant?: 'default' | 'compact';
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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={video.title}
      className={cn(
        "group cursor-pointer bg-card overflow-hidden transition-colors border border-border hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === 'default' && "flex h-full min-h-[320px] flex-col",
        variant === 'compact' && "flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 hover:shadow-none border border-border/40"
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative aspect-video overflow-hidden",
        variant === 'default' ? "h-auto" : "w-28 h-16 flex-shrink-0 rounded-sm"
      )}>
        <LazyImage
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Featured badge */}
        {video.is_featured && variant === 'default' && (
          <div className="absolute left-2 top-2 z-10">
            <Badge variant="secondary" className="uppercase px-2 py-1 text-xs">
              {t('labels.featured')}
            </Badge>
          </div>
        )}

          {/* Enrichment indicator */}
          {video.enrichment && variant === 'default' && (
            <div className="absolute right-2 top-2 z-10">
              <EnrichmentIndicator size="sm" />
            </div>
          )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/15 transition-colors duration-300 flex items-center justify-center">
          <div className={cn(
            "bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100",
            variant === 'default' ? "w-14 h-14" : "w-10 h-10"
          )}>
            <Play className={cn(
              "text-primary-foreground ml-1",
              variant === 'default' ? "w-6 h-6" : "w-4 h-4"
            )} fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        {variant === 'default' && video.duration_seconds && video.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-foreground/80 text-background text-xs font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Language badge */}
        <Badge
          variant="secondary"
          className={cn(
            "absolute top-2 left-2 text-[0.65rem] font-bold bg-background/90 uppercase tracking-widest",
            variant === 'compact' && "hidden"
          )}
        >
          {video.language}
        </Badge>
      </div>

      {/* Content */}
      <div className={cn(
        "flex flex-col",
        variant === 'default' ? "flex-1 space-y-3 p-4" : "flex-1 space-y-1"
      )}>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <h3 className={cn(
                  "font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors uppercase tracking-[0.05em]",
                  variant === 'default' ? "text-sm" : "text-xs"
                )}>
                  {video.title}
                </h3>
              </TooltipTrigger>
              {video.enrichment?.optimized_title && video.enrichment.optimized_title !== video.title && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs font-semibold mb-1">AI-Optimized Title:</p>
                  <p className="text-sm">{video.enrichment.optimized_title}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        
        <p className={cn(
          "text-muted-foreground line-clamp-1",
          variant === 'default' ? "text-xs" : "text-2xs"
        )}>
          {video.channel_name}
        </p>

          {/* Semantic tags - only show on default variant and mobile hidden */}
          {variant === 'default' && video.enrichment?.semantic_tags && video.enrichment.semantic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 hidden sm:flex">
              {video.enrichment.semantic_tags.slice(0, 3).map((tag, index) => (
                <SemanticTagBadge key={`${tag}-${index}`} tag={tag} />
              ))}
            </div>
          )}

        <div className={cn(
          "flex min-h-[24px] items-center justify-between text-xs text-muted-foreground",
          variant === 'compact' && "hidden",
          variant === 'default' && "mt-auto"
        )}>
          <div className="flex items-center gap-1 relative">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{formatViewCount(viewCount)}</span>
            {showPlus && (
              <span className="absolute -right-6 -top-1 text-xs text-green-400 font-semibold animate-pop">+1</span>
            )}
          </div>
          {video.category && (
            <Badge 
              variant="outline" 
              className="text-[0.65rem] px-2 py-0.5 uppercase tracking-widest"
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