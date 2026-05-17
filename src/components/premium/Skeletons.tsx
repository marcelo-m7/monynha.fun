import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function VideoSkeleton({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("premium-surface flex gap-3 p-2", className)}>
        <Skeleton className="h-16 w-28 rounded-lg" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("premium-surface overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PlaylistSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("premium-surface overflow-hidden", className)}>
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

