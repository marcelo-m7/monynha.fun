import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { HomeFacodiHighlight, HomeFeaturedPlaylist } from '@/entities/home/home.types';
import { LazyImage } from '@/shared/components/LazyImage';
import { cn } from '@/lib/utils';

type RailPlaylist = HomeFeaturedPlaylist | HomeFacodiHighlight;

interface LearningPathRailProps {
  title: string;
  description?: string | null;
  label: string;
  accent?: 'facodi' | 'lesti' | 'open';
  playlists: RailPlaylist[];
  className?: string;
}

function getPlaylistId(playlist: RailPlaylist) {
  return 'playlist_id' in playlist ? playlist.playlist_id : playlist.id;
}

function getPlaylistTitle(playlist: RailPlaylist) {
  return 'playlist_name' in playlist ? playlist.playlist_name : playlist.name;
}

function getPlaylistImage(playlist: RailPlaylist) {
  if (playlist.thumbnail_url) return playlist.thumbnail_url;
  if ('preview_video_thumbnail_url' in playlist && playlist.preview_video_thumbnail_url) return playlist.preview_video_thumbnail_url;
  return '/placeholder.png';
}

function getPlaylistMeta(playlist: RailPlaylist, videoCountLabel: string) {
  const courseCode = playlist.course_code;
  const unitCode = playlist.unit_code;
  return [courseCode, unitCode, videoCountLabel].filter(Boolean).join(' · ');
}

export function LearningPathRail({ title, description, label, accent = 'open', playlists, className }: LearningPathRailProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const accentClass = accent === 'lesti' ? 'bg-[#efff00] text-black' : accent === 'facodi' ? 'bg-black text-[#efff00]' : 'bg-background text-foreground';

  return (
    <section className={cn('grid gap-0 border-2 border-border bg-background lg:grid-cols-[12rem_minmax(0,1fr)]', className)}>
      <div className={cn('flex min-h-52 flex-col justify-between p-5', accentClass)}>
        <div className="space-y-4">
          <GraduationCap className="h-8 w-8" />
          <p className="text-3xl font-black uppercase leading-none">{label}</p>
        </div>
        <p className="text-sm font-bold leading-6 opacity-80">{description}</p>
      </div>
      <div className="min-w-0 p-4">
        <div className="mb-4 flex flex-col gap-2 border-b-2 border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-2xl font-black uppercase leading-tight">{title}</h3>
            {description && <p className="mt-1 text-sm font-medium text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => navigate('/playlists')}
            className="inline-flex items-center gap-2 text-xs font-black uppercase hover:text-primary"
          >
            <BookOpen className="h-4 w-4" />
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {playlists.slice(0, 4).map((playlist) => (
            <button
              key={getPlaylistId(playlist)}
              type="button"
              onClick={() => navigate(`/playlists/${getPlaylistId(playlist)}`)}
              className="group min-w-0 border border-border bg-card text-left transition-transform hover:-translate-y-1"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <LazyImage src={getPlaylistImage(playlist)} fallbackSrc="/placeholder.png" alt={getPlaylistTitle(playlist)} className="object-cover" />
                <span className="absolute bottom-2 right-2 bg-black px-2 py-1 text-[0.62rem] font-black uppercase text-white">
                  {playlist.language}
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-black uppercase leading-tight">{getPlaylistTitle(playlist)}</p>
                <p className="mt-2 truncate text-[0.65rem] font-black uppercase text-muted-foreground">
                  {getPlaylistMeta(playlist, t('playlists.videoCount', { count: playlist.video_count }))}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
