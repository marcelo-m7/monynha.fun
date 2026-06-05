import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/shared/lib/format';

interface VideoDurationBadgeProps {
  durationSeconds?: number | null;
  className?: string;
  variant?: 'overlay' | 'inline';
}

export function VideoDurationBadge({ durationSeconds, className, variant = 'overlay' }: VideoDurationBadgeProps) {
  const { t } = useTranslation();

  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  const duration = formatDuration(durationSeconds);

  return (
    <span
      aria-label={t('video.durationLabel', { duration })}
      className={cn(
        'inline-flex shrink-0 items-center justify-center tabular-nums',
        variant === 'overlay' &&
          'absolute bottom-2 right-2 z-20 min-w-12 bg-black/85 px-2 py-1 text-[0.65rem] font-bold leading-none text-white shadow-sm',
        variant === 'inline' && 'font-medium',
        className,
      )}
    >
      {duration}
    </span>
  );
}
