import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import iconVault from "@/assets/icon-vault-3d.png";
import iconGrowth from "@/assets/icon-growth-3d.png";
import iconPipeline from "@/assets/icon-pipeline-3d.png";
import iconPremium from "@/assets/icon-premium-3d.png";

import iconDashboard from "@/assets/icons-3d/dashboard-3d.png";
import iconParecer from "@/assets/icons-3d/parecer-3d.png";
import iconMarket from "@/assets/icons-3d/market-3d.png";
import iconSelic from "@/assets/icons-3d/selic-3d.png";
import iconIpca from "@/assets/icons-3d/ipca-3d.png";
import iconCdi from "@/assets/icons-3d/cdi-3d.png";
import iconIbov from "@/assets/icons-3d/ibov-3d.png";
import iconSnapshot from "@/assets/icons-3d/snapshot-3d.png";
import iconTarget from "@/assets/icons-3d/target-3d.png";
import iconClipboard from "@/assets/icons-3d/clipboard-3d.png";
import iconWrench from "@/assets/icons-3d/wrench-3d.png";
import iconUsers from "@/assets/icons-3d/users-3d.png";

export const icon3DMap = {
  vault: iconVault,
  growth: iconGrowth,
  pipeline: iconPipeline,
  premium: iconPremium,
  dashboard: iconDashboard,
  parecer: iconParecer,
  market: iconMarket,
  selic: iconSelic,
  ipca: iconIpca,
  cdi: iconCdi,
  ibov: iconIbov,
  snapshot: iconSnapshot,
  target: iconTarget,
  clipboard: iconClipboard,
  wrench: iconWrench,
  users: iconUsers,
} as const;

export type Icon3DName = keyof typeof icon3DMap;

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  "2xl": "w-20 h-20",
} as const;

interface Icon3DProps {
  name: Icon3DName;
  size?: keyof typeof sizeMap;
  className?: string;
  /** Floating animation (use for hero/banner). Defaults false. */
  floating?: boolean;
  /** Lazy load. Defaults true (set false for above-the-fold). */
  lazy?: boolean;
  /** Subtle hover scale + tilt */
  hover?: boolean;
  alt?: string;
}

export const Icon3D = ({
  name,
  size = "md",
  className,
  floating = false,
  lazy = true,
  hover = false,
  alt = "",
}: Icon3DProps) => {
  const src = icon3DMap[name];
  const sizeCls = sizeMap[size];

  const img = (
    <img
      src={src}
      alt={alt}
      width={1024}
      height={1024}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      className={cn(
        "object-contain select-none pointer-events-none",
        "drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]",
        sizeCls,
        className,
      )}
    />
  );

  if (floating) {
    return (
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={cn("inline-flex", sizeCls)}
      >
        {img}
      </motion.div>
    );
  }

  if (hover) {
    return (
      <motion.div
        whileHover={{ scale: 1.08, rotate: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className={cn("inline-flex", sizeCls)}
      >
        {img}
      </motion.div>
    );
  }

  return img;
};

export default Icon3D;
