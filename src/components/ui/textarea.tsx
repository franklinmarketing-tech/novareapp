import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-subtle ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/45 hover:border-border/80 focus-visible:outline-none focus-visible:border-ring/40 focus-visible:ring-4 focus-visible:ring-ring/10 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:focus-visible:ring-destructive/15",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
