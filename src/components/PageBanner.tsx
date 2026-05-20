import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { forwardRef } from "react";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";

interface PageBannerProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  icon3D?: Icon3DName;
  action?: React.ReactNode;
}

const PageBanner = forwardRef<HTMLDivElement, PageBannerProps>(({ title, description, icon: Icon, icon3D, action }, ref) => {
  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mb-5 rounded-xl overflow-hidden px-4 py-3 sm:px-5 sm:py-3"
      style={{
        background: "linear-gradient(135deg, hsl(215 50% 13%) 0%, hsl(215 45% 20%) 50%, hsl(215 50% 11%) 100%)",
        border: "1px solid rgba(96,165,250,0.12)",
        borderTop: "1px solid rgba(96,165,250,0.2)",
        boxShadow: "0 4px 20px -6px rgba(0,0,0,0.4), 0 1px 0 rgba(96,165,250,0.06) inset",
      }}
    >
      {/* Subtle glow orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-60"
        style={{ background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)" }}
      />

      {/* Single row: icon + title + separator + description | action */}
      <div className="relative z-10 flex items-center gap-3 min-w-0">

        {/* Icon */}
        {icon3D ? (
          <div className="shrink-0">
            <Icon3D name={icon3D} size="sm" floating={false} lazy={false} alt={title} />
          </div>
        ) : Icon ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(96,165,250,0.12)",
              border: "1px solid rgba(96,165,250,0.18)",
            }}
          >
            <Icon className="h-4 w-4 text-white/75" />
          </div>
        ) : null}

        {/* Title */}
        <h1 className="text-base sm:text-lg font-bold text-white tracking-[-0.02em] leading-none shrink-0">
          {title}
        </h1>

        {/* Divider + description — hidden on small screens */}
        <span className="hidden sm:block w-px h-4 bg-white/15 shrink-0" />
        <p className="hidden sm:block text-xs text-white/45 font-normal truncate min-w-0">
          {description}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action */}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
});
PageBanner.displayName = "PageBanner";

export default PageBanner;
