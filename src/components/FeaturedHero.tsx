import { Video, formatDuration, formatViewCount } from "@/hooks/useVideos";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface FeaturedHeroProps {
  video: Video;
}

export const FeaturedHero = ({ video }: FeaturedHeroProps) => {
  const navigate = useNavigate();

  const handleClick = async () => {
    // increment views
    try {
      await supabase.rpc('increment_video_view_count', { p_video_id: video.id });
    } catch (e) {
      console.debug('increment view failed', e);
    }
    navigate(`/videos/${video.id}`);
  };

  return (
    <article
      onClick={handleClick}
      className="group cursor-pointer overflow-hidden rounded-3xl shadow-lg border border-border/50 bg-card transition-transform hover:scale-[1.01]"
      aria-label={`Featured: ${video.title}`}
    >
      <div className="relative aspect-video">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.svg';
            target.onerror = null;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
          <div className="w-full text-white">
            <h3 className="text-2xl md:text-3xl font-bold line-clamp-2">{video.title}</h3>
            <p className="mt-2 text-sm max-w-2xl line-clamp-2 text-white/90">{video.description}</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Play className="w-4 h-4" />
                <span>{formatDuration(video.duration_seconds)}</span>
              </div>
              <div className="text-sm text-white/90">{formatViewCount(video.view_count)}</div>
              <Button variant="ghost" className="ml-auto text-white/95 bg-white/5 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                Watch
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
