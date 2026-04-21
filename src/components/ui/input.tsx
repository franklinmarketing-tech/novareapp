import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-[0.9375rem] shadow-subtle ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 hover:border-border focus-visible:outline-none focus-visible:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/12 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:focus-visible:ring-destructive/15",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
