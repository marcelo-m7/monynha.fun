import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-background border border-primary text-primary shadow-[0_0_10px_var(--glow-primary)] hover:shadow-[0_0_20px_var(--glow-primary)] hover:bg-primary/10 hover:border-primary active:scale-95",
        destructive: "bg-background border border-destructive text-destructive shadow-[0_0_10px_rgba(255,0,0,0.25)] hover:shadow-[0_0_20px_rgba(255,0,0,0.45)] hover:bg-destructive/10 active:scale-95",
        outline: "border border-input bg-background hover:bg-accent/10 hover:text-accent hover:border-accent hover:shadow-[0_0_10px_var(--glow-accent)] active:scale-95",
        secondary: "bg-background border border-secondary text-secondary shadow-[0_0_10px_var(--glow-secondary)] hover:shadow-[0_0_20px_var(--glow-secondary)] hover:bg-secondary/10 active:scale-95",
        ghost: "hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_10px_var(--glow-primary)] active:scale-95",
        link: "text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none bg-transparent border-none normal-case tracking-normal",
        hero: "bg-primary text-primary-foreground font-extrabold hover:bg-primary/90 shadow-[0_0_20px_var(--glow-primary)] hover:shadow-[0_0_30px_var(--glow-primary)] active:scale-95 text-base border border-primary",
        accent: "bg-accent text-accent-foreground font-bold hover:bg-accent/90 shadow-[0_0_15px_var(--glow-accent)] hover:shadow-[0_0_25px_var(--glow-accent)] active:scale-95 border border-accent",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-sm px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-md px-10 text-lg",
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
