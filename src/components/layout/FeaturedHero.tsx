import type { VideoWithCategory } from "@/entities/video/video.types";
import { formatDuration, formatViewCount } from "@/shared/lib/format";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useVideoViewIncrement } from '@/shared/hooks/useVideoViewIncrement';

interface FeaturedHeroProps {
  video: VideoWithCategory;
}

export const FeaturedHero = ({ video }: FeaturedHeroProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { viewCount, showPlus, handleViewIncrement } = useVideoViewIncrement(video.view_count || 0, 900);

  const handleClick = () => {
    handleViewIncrement(video.id);
    navigate(`/videos/${video.id}`);
  };

  return (
    <article
      onClick={handleClick}
      className="group cursor-pointer overflow-hidden rounded-md shadow-lg border border-primary/30 bg-card/95 transition-transform hover:scale-[1.01] hover:shadow-[0_0_25px_var(--glow-primary)]"
      aria-label={`Featured: ${video.title}`}
    >
      <div className="relative aspect-video">
        {/* Featured badge */}
        <div className="absolute left-4 top-4 z-20">
          <Badge variant="secondary" className="uppercase px-2 py-1 text-[0.65rem] tracking-widest">
            {t('labels.featured')}
          </Badge>
        </div>

        <img
          src={video.thumbnail_url}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg';
            target.onerror = null;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
          <div className="w-full text-white">
            <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-[0.08em] line-clamp-2 font-mono">{video.title}</h3>
            <p className="mt-2 text-xs max-w-2xl line-clamp-2 text-white/90 uppercase tracking-widest">{video.description}</p>
            <div className="mt-4 flex items-center gap-4">
              {video.duration_seconds && video.duration_seconds > 0 && (
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Play className="w-4 h-4" />
                  <span>{formatDuration(video.duration_seconds)}</span>
                </div>
              )}
              <div className="relative text-sm text-white/90">
                <span className="font-semibold">{formatViewCount(viewCount)}</span>
                {showPlus && (
                  <span className="absolute -right-8 -top-1 text-sm text-green-300 font-semibold animate-pop">
                    +1
                  </span>
                )}
              </div>
              <Button variant="ghost" className="ml-auto text-white/95 bg-white/5 hover:bg-white/10 uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                Watch
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
