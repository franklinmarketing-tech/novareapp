import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-subtle hover:bg-accent/92 hover:shadow-soft",
        destructive: "bg-destructive text-destructive-foreground shadow-subtle hover:bg-destructive/92 hover:shadow-soft",
        outline: "border border-border bg-card shadow-subtle hover:bg-muted/50 hover:text-foreground hover:border-border",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        ghost: "hover:bg-muted/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-accent text-accent-foreground font-semibold shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.45),inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-[0_6px_22px_-4px_hsl(var(--accent)/0.55)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-6 text-[0.9375rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
