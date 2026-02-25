import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { YouTubeMetadata } from '../useYouTubeMetadata';

interface VideoPreviewCardProps {
  metadata: YouTubeMetadata | null;
}

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ metadata }) => {
  const { t } = useTranslation();

  if (!metadata) {
    return (
      <div className="bg-muted/50 border border-dashed border-border rounded-2xl aspect-video flex flex-col items-center justify-center text-muted-foreground">
        <Play className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">{t('submit.previewPlaceholder')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
      <div className="relative aspect-video">
        <img
          src={metadata.thumbnailUrl}
          alt={metadata.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.includes('maxresdefault')) {
              target.src = target.src.replace('maxresdefault', 'hqdefault');
            } else {
              target.src = '/placeholder.svg';
              target.onerror = null;
            }
          }}
        />
        <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-2">{metadata.title}</h3>
        <p className="text-sm text-muted-foreground">{metadata.channelName}</p>
      </div>
    </div>
  );
};