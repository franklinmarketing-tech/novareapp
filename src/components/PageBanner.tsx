import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface PageBannerProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

const PageBanner = ({ title, description, icon: Icon, action }: PageBannerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mb-8 rounded-2xl overflow-hidden px-7 py-7"
      style={{
        background: "linear-gradient(145deg, hsl(215 50% 12%) 0%, hsl(215 45% 22%) 35%, hsl(215 42% 18%) 65%, hsl(215 50% 10%) 100%)",
        border: "1px solid rgba(96,165,250,0.12)",
        borderTop: "1px solid rgba(96,165,250,0.18)",
        borderBottom: "1px solid rgba(0,0,0,0.3)",
        boxShadow: "0 1px 0 rgba(96,165,250,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 12px 40px -10px rgba(0,0,0,0.5), 0 4px 12px -4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Inner highlight */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
        borderTop: "1px solid rgba(96,165,250,0.1)",
        borderLeft: "1px solid rgba(96,165,250,0.05)",
        borderBottom: "1px solid rgba(0,0,0,0.2)",
        borderRight: "1px solid rgba(0,0,0,0.1)",
      }} />

      {/* Decorative orbs */}
      <motion.div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/[0.02] blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(145deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))",
                border: "1px solid rgba(96,165,250,0.15)",
                boxShadow: "0 0 12px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <Icon className="h-6 w-6 text-white/80" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-sm text-white/40 mt-0.5 font-normal">
              {description}
            </p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
};

export default PageBanner;
