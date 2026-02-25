import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-black shadow-[0_0_10px_rgba(0,245,255,0.4)] hover:shadow-[0_0_15px_rgba(0,245,255,0.6)]",
        secondary:
          "border-transparent bg-secondary text-white shadow-[0_0_10px_rgba(255,0,200,0.4)] hover:shadow-[0_0_15px_rgba(255,0,200,0.6)]",
        destructive:
          "border-transparent bg-destructive text-white shadow-[0_0_10px_rgba(255,0,0,0.4)] hover:bg-destructive/80",
        outline: "text-foreground border-primary/50 shadow-[0_0_5px_rgba(0,245,255,0.2)]",
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
