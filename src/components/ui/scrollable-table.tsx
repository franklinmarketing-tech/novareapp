import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a table in a horizontally-scrollable container with visual cues:
 * - Right-edge fade gradient hints there's more to scroll on small screens
 * - Snap behavior + custom thin scrollbar
 *
 * Usage:
 *   <ScrollableTable>
 *     <table>...</table>
 *   </ScrollableTable>
 */
export const ScrollableTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { fadeColor?: string }
>(({ className, children, fadeColor = "hsl(var(--card))", ...props }, ref) => {
  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0",
          "[scrollbar-width:thin]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
      {/* Right edge fade hint (mobile only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 h-full w-8 sm:hidden"
        style={{
          background: `linear-gradient(to left, ${fadeColor}, transparent)`,
        }}
      />
    </div>
  );
});
ScrollableTable.displayName = "ScrollableTable";
