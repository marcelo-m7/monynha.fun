import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary hover:bg-primary/90 active:brightness-90",
        destructive:
          "bg-transparent border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
        outline:
          "border border-foreground bg-transparent text-foreground hover:border-primary hover:text-primary",
        secondary:
          "border border-secondary bg-transparent text-secondary hover:bg-secondary hover:text-secondary-foreground",
        ghost:
          "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent",
        link:
          "text-primary underline-offset-4 hover:underline bg-transparent border-none normal-case tracking-normal",
        hero:
          "bg-primary text-primary-foreground border border-primary font-extrabold hover:bg-primary/90 active:brightness-90 text-base",
        accent:
          "bg-primary text-primary-foreground border border-primary font-bold hover:bg-primary/90 active:brightness-90",
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
