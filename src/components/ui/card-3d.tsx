import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Makes the card respond to hover with subtle tilt */
  interactive?: boolean;
  /** Glow color radial gradient, e.g. "rgba(96,165,250,0.12)" */
  glowColor?: string;
  /** Override the entire gradient background */
  gradient?: string;
  /** Clickable styling (cursor pointer, hover lift) */
  clickable?: boolean;
}

const Card3D = React.forwardRef<HTMLDivElement, Card3DProps>(
  ({ className, children, interactive = false, clickable = false, glowColor, gradient, onClick, ...props }, ref) => {
    const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: y * -6, y: x * 6 });
      },
      [interactive]
    );

    const handleMouseLeave = React.useCallback(() => {
      if (interactive) setTilt({ x: 0, y: 0 });
    }, [interactive]);

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative rounded-2xl overflow-hidden",
          clickable && "cursor-pointer",
          className
        )}
        style={{
          background: gradient || "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
          border: "1px solid hsl(var(--border) / 0.4)",
          borderTop: "1px solid hsl(var(--border) / 0.6)",
          borderBottom: "1px solid hsl(var(--border) / 0.15)",
          boxShadow: [
            "0 1px 0 hsl(var(--border) / 0.08) inset",
            "0 -1px 0 hsl(var(--foreground) / 0.04) inset",
            "0 8px 24px -8px hsl(var(--foreground) / 0.08)",
            "0 2px 8px -2px hsl(var(--foreground) / 0.04)",
          ].join(", "),
          perspective: interactive ? "800px" : undefined,
          transform: interactive
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            : undefined,
          transition: "transform 0.2s ease-out, box-shadow 0.3s ease",
        }}
        whileHover={
          clickable
            ? {
                y: -2,
                boxShadow: [
                  "0 1px 0 hsl(var(--border) / 0.08) inset",
                  "0 -1px 0 hsl(var(--foreground) / 0.04) inset",
                  "0 16px 40px -10px hsl(var(--foreground) / 0.12)",
                  "0 4px 12px -4px hsl(var(--foreground) / 0.06)",
                ].join(", "),
              }
            : undefined
        }
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        {...(props as any)}
      >
        {/* Inner highlight edges */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-[1]"
          style={{
            borderTop: "1px solid hsl(var(--foreground) / 0.04)",
            borderLeft: "1px solid hsl(var(--foreground) / 0.02)",
            borderBottom: "1px solid hsl(var(--foreground) / 0.01)",
          }}
        />

        {/* Optional glow */}
        {glowColor && (
          <motion.div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none z-0"
            style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Content */}
        <div className="relative z-[2]">{children}</div>
      </motion.div>
    );
  }
);

Card3D.displayName = "Card3D";

export { Card3D };
