import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-[0.1em] border-[1.5px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-foreground hover:bg-primary-hover active:brightness-95 shadow-sm hover:shadow-md focus-visible:shadow-md",
        destructive:
          "bg-transparent border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm hover:shadow-md",
        outline:
          "border-foreground bg-transparent text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground shadow-sm hover:shadow-md",
        secondary:
          "border-foreground bg-secondary text-foreground hover:bg-muted shadow-sm hover:shadow-md",
        ghost:
          "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border-transparent hover:shadow-sm",
        link:
          "text-primary underline-offset-4 hover:underline bg-transparent border-none normal-case tracking-normal",
        hero:
          "bg-primary text-primary-foreground border-foreground font-black hover:bg-primary-hover active:brightness-95 text-xs shadow-md hover:shadow-lg focus-visible:shadow-lg",
        accent:
          "bg-primary text-primary-foreground border-foreground font-black hover:bg-primary-hover active:brightness-95 shadow-md hover:shadow-lg",
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
