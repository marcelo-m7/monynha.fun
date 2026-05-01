import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListVideo, BookOpen, Code, Globe, Lock, GraduationCap } from 'lucide-react';
import type { Playlist } from '@/entities/playlist/playlist.types';

interface PlaylistCardProps {
  playlist: Playlist;
  index?: number;
}

export function PlaylistCard({ playlist, index = 0 }: PlaylistCardProps) {
  const { t } = useTranslation();

  // Use thumbnail_url from playlist, fallback to placeholder icon
  const thumbnailUrl = playlist.thumbnail_url;
  const totalVideos = playlist.video_count ?? 0;

  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className="group bg-card/95 border border-primary/20 rounded-md overflow-hidden shadow-sm hover:shadow-[0_0_15px_var(--glow-primary)] transition-all duration-300 animate-fade-up flex flex-col"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Thumbnail / Header */}
      <div className="relative h-32 bg-muted/30 overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg'; // Fallback to placeholder
              target.onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ListVideo className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[0.65rem] font-bold uppercase tracking-widest ${
            playlist.is_ordered 
              ? 'bg-primary/90 text-primary-foreground' 
              : 'bg-secondary/90 text-secondary-foreground'
          }`}>
            {playlist.is_ordered ? (
              <>
                <GraduationCap className="w-3 h-3" />
                {t('playlists.learningPath')}
              </>
            ) : (
              <>
                <ListVideo className="w-3 h-3" />
                {t('playlists.collection')}
              </>
            )}
          </span>
        </div>

        {/* Visibility badge */}
        {!playlist.is_public && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/90 text-yellow-950">
              <Lock className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h2 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1 mb-1 uppercase tracking-[0.08em]">
          {playlist.name}
        </h2>
        
        <p className="text-sm text-muted-foreground mb-2">
          {t('playlists.videoCount', { count: playlist.video_count || 0 })}
          {playlist.author?.username && ` • ${playlist.author.username}`}
        </p>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-3 flex-1">
          {playlist.description || t('playlists.noDescription')}
        </p>

        {/* Metadata tags */}
        <div className="flex flex-wrap gap-2 text-[0.65rem] text-muted-foreground mt-auto uppercase tracking-widest">
          {playlist.course_code && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted/50">
              <BookOpen className="w-3 h-3" /> {playlist.course_code}
            </span>
          )}
          {playlist.unit_code && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted/50">
              <Code className="w-3 h-3" /> {playlist.unit_code}
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted/50 uppercase">
            <Globe className="w-3 h-3" /> {playlist.language}
          </span>
        </div>
      </div>
    </Link>
  );
}
