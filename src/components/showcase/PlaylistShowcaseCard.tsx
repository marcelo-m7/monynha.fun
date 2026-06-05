import { ArrowRight, BookOpen, Clock3, GraduationCap, ListVideo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { HomeFacodiHighlight, HomeFeaturedPlaylist } from '@/entities/home/home.types';
import { LazyImage } from '@/shared/components/LazyImage';
import { formatDuration } from '@/shared/lib/format';
import { cn } from '@/lib/utils';

type PlaylistLike = HomeFeaturedPlaylist | HomeFacodiHighlight;

interface PlaylistShowcaseCardProps {
  playlist: PlaylistLike;
  className?: string;
  compact?: boolean;
}

function isFacodiHighlight(playlist: PlaylistLike): playlist is HomeFacodiHighlight {
  return 'playlist_id' in playlist;
}

export function PlaylistShowcaseCard({ playlist, className, compact = false }: PlaylistShowcaseCardProps) {
  const navigate = useNavigate();
  const id = isFacodiHighlight(playlist) ? playlist.playlist_id : playlist.id;
  const title = isFacodiHighlight(playlist) ? playlist.playlist_name : playlist.name;
  const description = isFacodiHighlight(playlist) ? playlist.playlist_description : playlist.description;
  const image = playlist.thumbnail_url || (!isFacodiHighlight(playlist) ? playlist.preview_video_thumbnail_url : null) || '/placeholder.png';
  const courseCode = playlist.course_code;
  const unitCode = playlist.unit_code;
  const videoCount = playlist.video_count;
  const duration = isFacodiHighlight(playlist) ? null : playlist.total_duration_seconds;

  return (
    <button
      type="button"
      onClick={() => navigate(`/playlists/${id}`)}
      className={cn(
        'group grid h-full border-2 border-border bg-card text-left text-card-foreground transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        compact ? 'grid-cols-[8rem_1fr]' : 'grid-rows-[auto_1fr]',
        className,
      )}
    >
      <div className={cn('relative overflow-hidden bg-muted', compact ? 'h-full min-h-32' : 'aspect-video')}>
        <LazyImage src={image} fallbackSrc="/placeholder.png" alt={title} className="object-cover" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 border border-black bg-[#efff00] px-2 py-1 text-[0.62rem] font-black uppercase text-black">
          {isFacodiHighlight(playlist) || playlist.is_ordered ? <GraduationCap className="h-3 w-3" /> : <ListVideo className="h-3 w-3" />}
          {videoCount}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2 text-[0.65rem] font-black uppercase text-muted-foreground">
          {courseCode && (
            <span className="inline-flex items-center gap-1 border border-border px-2 py-1">
              <BookOpen className="h-3 w-3" />
              {courseCode}
            </span>
          )}
          {unitCode && <span className="border border-border px-2 py-1">{unitCode}</span>}
          {duration && duration > 0 && (
            <span className="inline-flex items-center gap-1 border border-border px-2 py-1">
              <Clock3 className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg font-black uppercase leading-tight">{title}</h3>
        {description && <p className="line-clamp-2 text-sm leading-6 text-foreground/80">{description}</p>}
        <span className="mt-auto inline-flex items-center gap-2 text-xs font-black uppercase">
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}
