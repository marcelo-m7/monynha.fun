import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_0_10px_var(--glow-primary)] hover:shadow-[0_0_15px_var(--glow-primary)]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-[0_0_10px_var(--glow-secondary)] hover:shadow-[0_0_15px_var(--glow-secondary)]",
        destructive:
          "border-transparent bg-destructive text-white shadow-[0_0_10px_rgba(255,0,0,0.4)] hover:bg-destructive/80",
        outline: "text-foreground border-primary/50 shadow-[0_0_5px_var(--glow-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
