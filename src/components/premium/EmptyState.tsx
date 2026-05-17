import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon = Sparkles, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("premium-surface flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="max-w-xl text-2xl font-bold text-balance">{title}</h2>
      {description && (
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

