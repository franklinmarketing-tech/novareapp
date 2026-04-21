import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** When provided, renders a 3D PNG icon instead of the lucide circle. Overrides `icon`. */
  icon3D?: Icon3DName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
  tone?: "neutral" | "accent" | "success" | "warning" | "destructive";
}

const toneClasses: Record<NonNullable<EmptyStateProps["tone"]>, { bg: string; ring: string; text: string }> = {
  neutral:     { bg: "bg-muted/60",         ring: "ring-border/40",         text: "text-muted-foreground" },
  accent:      { bg: "bg-accent/10",        ring: "ring-accent/20",         text: "text-accent" },
  success:     { bg: "bg-success/10",       ring: "ring-success/20",        text: "text-success" },
  warning:     { bg: "bg-warning/10",       ring: "ring-warning/20",        text: "text-warning" },
  destructive: { bg: "bg-destructive/10",   ring: "ring-destructive/20",    text: "text-destructive" },
};

/**
 * Standard empty state used across lists and dashboards.
 * Always provides illustration (icon), title and optional CTA.
 */
export const EmptyState = ({
  icon: Icon,
  icon3D,
  title,
  description,
  action,
  className,
  variant = "default",
  tone = "neutral",
}: EmptyStateProps) => {
  const t = toneClasses[tone];
  const compact = variant === "compact";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center mx-auto",
        compact ? "py-8 px-4 max-w-xs" : "py-16 px-6 max-w-sm",
        className,
      )}
    >
      {icon3D ? (
        <div className={cn("mb-4 flex items-center justify-center", compact ? "w-14 h-14" : "w-20 h-20")}>
          <Icon3D name={icon3D} size={compact ? "lg" : "2xl"} alt={title} />
        </div>
      ) : Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl ring-1 mb-4",
            t.bg,
            t.ring,
            compact ? "w-12 h-12" : "w-16 h-16",
          )}
        >
          <Icon className={cn(t.text, compact ? "h-6 w-6" : "h-8 w-8")} strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className={cn("font-semibold text-foreground tracking-tight", compact ? "text-sm" : "text-base mb-1.5")}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-xs mt-1" : "text-sm")}>
          {description}
        </p>
      )}
      {action && <div className={compact ? "mt-3" : "mt-5"}>{action}</div>}
    </div>
  );
};

export default EmptyState;
