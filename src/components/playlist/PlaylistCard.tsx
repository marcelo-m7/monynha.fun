import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListVideo, BookOpen, Code, Globe, Lock, GraduationCap, Users, Clock3 } from 'lucide-react';
import type { Playlist } from '@/entities/playlist/playlist.types';
import { formatDuration } from '@/shared/lib/format';

interface PlaylistCardProps {
  playlist: Playlist;
  index?: number;
}

export function PlaylistCard({ playlist, index = 0 }: PlaylistCardProps) {
  const { t } = useTranslation();

  // Use thumbnail_url from playlist, fallback to placeholder icon
  const thumbnailUrl = playlist.thumbnail_url;
  const totalVideos = playlist.video_count ?? 0;
  const totalDuration = playlist.total_duration_seconds ?? 0;
  const collaboratorCount = playlist.collaborator_count ?? 0;

  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className="group premium-surface flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-ambient"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Thumbnail / Header */}
      <div className="relative h-36 overflow-hidden bg-muted/30">
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
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-bold ${
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
        <h2 className="mb-1 line-clamp-1 text-lg font-bold transition-colors group-hover:text-primary">
          {playlist.name}
        </h2>
        
        <p className="text-sm text-muted-foreground mb-2">
          {t('playlists.videoCount', { count: totalVideos })}
          {playlist.author?.username && ` • ${playlist.author.username}`}
        </p>

        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          {totalDuration > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3 h-3" /> {formatDuration(totalDuration)}
            </span>
          )}
          {collaboratorCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {collaboratorCount + 1}
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-3 flex-1">
          {playlist.description || t('playlists.noDescription')}
        </p>

        {/* Metadata tags */}
        <div className="flex flex-wrap gap-2 text-[0.65rem] text-muted-foreground mt-auto uppercase tracking-widest">
          {playlist.course_code && (
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1">
              <BookOpen className="w-3 h-3" /> {playlist.course_code}
            </span>
          )}
          {playlist.unit_code && (
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1">
              <Code className="w-3 h-3" /> {playlist.unit_code}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 uppercase">
            <Globe className="w-3 h-3" /> {playlist.language}
          </span>
        </div>
      </div>
    </Link>
  );
}
