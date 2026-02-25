import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ListVideo, Lock, BookOpen, Code, Globe } from 'lucide-react';
import { Playlist } from '../index';

interface PlaylistDetailsHeaderProps {
  playlist: Playlist;
  thumbnail: string;
}

export const PlaylistDetailsHeader: React.FC<PlaylistDetailsHeaderProps> = ({ playlist, thumbnail }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
      <img
        src={thumbnail}
        alt={playlist.name}
        className="w-full md:w-64 h-40 md:h-auto object-cover rounded-2xl shadow-md flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/placeholder.svg';
        }}
      />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {playlist.is_ordered ? (
            <Badge variant="secondary" className="gap-1">
              <GraduationCap className="w-3 h-3" /> {t('playlists.learningPath')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <ListVideo className="w-3 h-3" /> {t('playlists.collection')}
            </Badge>
          )}
          {!playlist.is_public && (
            <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-500 bg-yellow-500/10">
              <Lock className="w-3 h-3" /> {t('playlistDetails.privateTitle')}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{playlist.name}</h1>
        <p className="text-lg text-muted-foreground">
          {playlist.author?.username ? t('playlistDetails.byAuthor', { author: playlist.author.display_name || playlist.author.username }) : t('playlistDetails.anonymousAuthor')}
        </p>
        <p className="text-muted-foreground text-base max-w-2xl">
          {playlist.description || t('playlistDetails.noDescription')}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {playlist.course_code && (
            <Badge variant="outline" className="gap-1">
              <BookOpen className="w-3.5 h-3.5" /> {playlist.course_code}
            </Badge>
          )}
          {playlist.unit_code && (
            <Badge variant="outline" className="gap-1">
              <Code className="w-3.5 h-3.5" /> {playlist.unit_code}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 uppercase">
            <Globe className="w-3.5 h-3.5" /> {playlist.language}
          </Badge>
        </div>
      </div>
    </div>
  );
};