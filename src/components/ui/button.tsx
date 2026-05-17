import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/80 bg-primary text-primary-foreground shadow-glow hover:bg-primary-hover active:brightness-95",
        destructive:
          "border border-destructive/40 bg-destructive text-destructive-foreground shadow-sm hover:brightness-105",
        outline:
          "border border-border/80 bg-background/55 text-foreground backdrop-blur hover:border-primary/60 hover:bg-primary/10",
        secondary:
          "border border-border/60 bg-secondary/80 text-foreground hover:bg-muted shadow-sm",
        ghost:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline bg-transparent border-none normal-case tracking-normal",
        hero:
          "border border-primary/80 bg-primary text-primary-foreground font-black shadow-glow hover:bg-primary-hover active:brightness-95",
        accent:
          "border border-primary/80 bg-primary text-primary-foreground font-black shadow-glow hover:bg-primary-hover active:brightness-95",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
