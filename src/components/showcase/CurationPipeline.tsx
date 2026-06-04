import { ArrowRight, Bolt, Flag, FolderOpen, Link2, PencilLine, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const pipelineSteps = [
  { key: 'link', icon: Link2 },
  { key: 'fast', icon: Bolt },
  { key: 'category', icon: FolderOpen },
  { key: 'deep', icon: Search },
  { key: 'review', icon: PencilLine },
  { key: 'path', icon: Flag },
] as const;

interface CurationPipelineProps {
  className?: string;
  compact?: boolean;
}

export function CurationPipeline({ className, compact = false }: CurationPipelineProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('grid gap-4', compact ? 'md:grid-cols-3' : 'lg:grid-cols-6', className)}>
      {pipelineSteps.map(({ key, icon: Icon }, index) => (
        <div key={key} className="group relative">
          <div className="flex h-full min-h-48 flex-col border-2 border-border bg-background p-4 shadow-[8px_8px_0_#efff00] transition-transform duration-300 group-hover:-translate-y-1">
            <div className="mb-8 flex items-start justify-between">
              <span className="font-black leading-none">{String(index + 1).padStart(2, '0')}</span>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black uppercase leading-tight">
              {t(`curationPage.pipeline.steps.${key}.title`)}
            </h3>
            <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
              {t(`curationPage.pipeline.steps.${key}.description`)}
            </p>
          </div>
          {index < pipelineSteps.length - 1 && (
            <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 bg-background text-foreground lg:block" />
          )}
        </div>
      ))}
    </div>
  );
}
