import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "page" | "list" | "cards" | "table" | "form" | "inline";
  rows?: number;
  className?: string;
}

/**
 * Standard loading skeletons matching the app's visual rhythm.
 * Use one of the predefined variants instead of building ad-hoc skeletons.
 */
export const LoadingState = ({ variant = "page", rows = 4, className }: LoadingStateProps) => {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 py-4", className)}>
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-2.5", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden", className)}>
        <div className="p-4 border-b border-border/50 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border/40 last:border-0 flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-1/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-6 w-16 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-5", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  // page (default) — banner + cards + list
  return (
    <div className={cn("space-y-6", className)}>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingState;
