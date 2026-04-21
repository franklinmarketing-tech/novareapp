import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  /** number of text lines under the title (default 2) */
  lines?: number;
  /** show small icon placeholder in the top-right */
  withIcon?: boolean;
}

/**
 * Consistent shimmer skeleton matching the surface-card style.
 * Use anywhere KPI/info cards are loading.
 */
export const SkeletonCard = ({ className, lines = 2, withIcon = true }: SkeletonCardProps) => (
  <div
    className={cn(
      "surface-card p-5 sm:p-6 space-y-3",
      className,
    )}
    aria-hidden="true"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2 flex-1">
        <div className="skeleton-shimmer h-2.5 w-20 rounded-full" />
        <div className="skeleton-shimmer h-7 w-32 rounded-md" />
      </div>
      {withIcon && <div className="skeleton-shimmer h-10 w-10 rounded-xl shrink-0" />}
    </div>
    <div className="space-y-1.5 pt-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer h-2 rounded-full"
          style={{ width: `${100 - i * 18}%` }}
        />
      ))}
    </div>
  </div>
);

export const SkeletonLine = ({ className }: { className?: string }) => (
  <div className={cn("skeleton-shimmer h-3 rounded-full", className)} aria-hidden="true" />
);
