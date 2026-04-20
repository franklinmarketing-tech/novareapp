import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ThemeToggleProps {
  variant?: "default" | "sidebar";
  className?: string;
}

/**
 * Theme toggle button. Two visual variants:
 *  - "default": fits the breadcrumb / topbar (uses foreground tokens)
 *  - "sidebar": fits the dark sidebar (uses sidebar-foreground tokens)
 */
export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(({ variant = "default", className }, ref) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  if (variant === "sidebar") {
    return (
      <button
        ref={ref}
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full",
          "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90",
          "transition-all duration-200",
          className,
        )}
      >
        <span className="relative flex items-center justify-center w-[18px] h-[18px]">
          <Sun
            className={cn(
              "h-[18px] w-[18px] absolute transition-all duration-300",
              isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
            )}
          />
          <Moon
            className={cn(
              "h-[18px] w-[18px] absolute transition-all duration-300",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50",
            )}
          />
        </span>
        <span className="flex-1 text-left">{isDark ? "Tema claro" : "Tema escuro"}</span>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9 rounded-xl",
        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span className="relative flex items-center justify-center w-[18px] h-[18px]">
        <Sun
          className={cn(
            "h-[18px] w-[18px] absolute transition-all duration-300",
            isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
          )}
        />
        <Moon
          className={cn(
            "h-[18px] w-[18px] absolute transition-all duration-300",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50",
          )}
        />
      </span>
    </button>
  );
});
ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
