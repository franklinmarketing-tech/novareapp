import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface KpiCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind color class root e.g. "primary" | "success" | "accent" — used for glow/gradient */
  accent?: "primary" | "success" | "accent" | "destructive" | "warning";
  /** Disable interactive tilt (default: enabled) */
  staticCard?: boolean;
}

const ACCENT_MAP: Record<NonNullable<KpiCard3DProps["accent"]>, { glow: string; ring: string; shine: string }> = {
  primary: {
    glow: "hsl(var(--primary) / 0.18)",
    ring: "hsl(var(--primary) / 0.25)",
    shine: "hsl(var(--primary) / 0.10)",
  },
  success: {
    glow: "hsl(var(--success) / 0.18)",
    ring: "hsl(var(--success) / 0.25)",
    shine: "hsl(var(--success) / 0.10)",
  },
  accent: {
    glow: "hsl(var(--accent) / 0.18)",
    ring: "hsl(var(--accent) / 0.25)",
    shine: "hsl(var(--accent) / 0.10)",
  },
  destructive: {
    glow: "hsl(var(--destructive) / 0.18)",
    ring: "hsl(var(--destructive) / 0.25)",
    shine: "hsl(var(--destructive) / 0.10)",
  },
  warning: {
    glow: "hsl(var(--warning) / 0.18)",
    ring: "hsl(var(--warning) / 0.25)",
    shine: "hsl(var(--warning) / 0.10)",
  },
};

/**
 * Premium 3D KPI card with cursor-tracked tilt, glossy highlight,
 * animated radial glow, and depth-shadow. Designed for hero metrics.
 */
const KpiCard3D = React.forwardRef<HTMLDivElement, KpiCard3DProps>(
  ({ className, children, accent = "primary", staticCard = false, ...props }, ref) => {
    const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
    const [shine, setShine] = React.useState({ x: 50, y: 50 });
    const innerRef = React.useRef<HTMLDivElement>(null);

    const tone = ACCENT_MAP[accent];

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (staticCard) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        setTilt({ x: (py - 0.5) * -8, y: (px - 0.5) * 8 });
        setShine({ x: px * 100, y: py * 100 });
      },
      [staticCard],
    );

    const handleMouseLeave = React.useCallback(() => {
      setTilt({ x: 0, y: 0 });
      setShine({ x: 50, y: 50 });
    }, []);

    return (
      <motion.div
        ref={ref}
        className={cn("relative rounded-2xl", className)}
        style={{ perspective: "1000px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...(props as any)}
      >
        <motion.div
          ref={innerRef}
          className="relative rounded-2xl overflow-hidden h-full"
          style={{
            background: `linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.96) 100%)`,
            border: `1px solid ${tone.ring}`,
            boxShadow: [
              `0 1px 0 hsl(var(--foreground) / 0.04) inset`,
              `0 -2px 6px ${tone.glow} inset`,
              `0 12px 32px -10px ${tone.glow}`,
              `0 4px 12px -4px hsl(var(--foreground) / 0.08)`,
            ].join(", "),
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {/* Cursor-tracked glossy shine */}
          <div
            className="absolute inset-0 pointer-events-none z-[1] rounded-2xl opacity-80 mix-blend-overlay"
            style={{
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${tone.shine} 0%, transparent 45%)`,
              transition: "background 0.15s ease-out",
            }}
          />

          {/* Subtle inner highlight edge (top) */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none z-[1]"
            style={{
              background: `linear-gradient(to right, transparent, hsl(var(--foreground) / 0.12), transparent)`,
            }}
          />

          {/* Content */}
          <div
            className="relative z-[2] h-full"
            style={{ transform: "translateZ(20px)" }}
          >
            {children}
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

KpiCard3D.displayName = "KpiCard3D";

export { KpiCard3D };
