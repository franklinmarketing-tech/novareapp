import { cn } from "@/lib/utils";

type SurfaceCardPadding = "sm" | "md" | "lg";
type SurfaceCardVariant = "default" | "subtle" | "outlined";

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: SurfaceCardPadding;
  variant?: SurfaceCardVariant;
}

const paddingMap: Record<SurfaceCardPadding, string> = {
  sm: "p-4",
  md: "p-5 lg:p-6",
  lg: "p-6 lg:p-8",
};

const variantMap: Record<SurfaceCardVariant, string> = {
  default: "bg-card border border-border/70 shadow-sm",
  subtle: "bg-muted/30 border border-border/30",
  outlined: "bg-transparent border border-border/60",
};

export function SurfaceCard({
  children,
  className,
  padding = "md",
  variant = "default",
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantMap[variant],
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
