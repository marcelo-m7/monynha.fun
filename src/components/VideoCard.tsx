import { Video, formatDuration, formatViewCount } from "@/hooks/useVideos";
import { Play, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoCardProps {
  video: Video;
  onClick?: () => void;
}

export const VideoCard = ({ video, onClick }: VideoCardProps) => {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card overflow-hidden shadow-sm transition-all duration-300 card-hover hover:shadow-lg border border-border/50"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-foreground/80 text-background text-xs font-medium backdrop-blur-sm">
          {formatDuration(video.duration_seconds)}
        </div>

        {/* Language badge */}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-xs font-medium bg-background/90 backdrop-blur-sm uppercase"
        >
          {video.language}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <p className="text-xs text-muted-foreground line-clamp-1">
          {video.channel_name}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatViewCount(video.view_count)}</span>
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
