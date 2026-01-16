import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';

interface PlaylistProgressBarProps {
  watched: number;
  total: number;
  className?: string;
}

export function PlaylistProgressBar({ watched, total, className }: PlaylistProgressBarProps) {
  const { t } = useTranslation();
  const percent = total > 0 ? (watched / total) * 100 : 0;
  const isComplete = watched === total && total > 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">
          {t('playlistDetails.yourProgress')}
        </span>
        <span className="font-medium flex items-center gap-1">
          {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {watched}/{total} {t('playlistDetails.videosWatched')}
        </span>
      </div>
      <Progress 
        value={percent} 
        className={`h-3 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
      />
      {isComplete && (
        <p className="text-sm text-green-600 mt-2 font-medium">
          🎉 {t('playlistDetails.playlistComplete')}
        </p>
      )}
    </div>
  );
}