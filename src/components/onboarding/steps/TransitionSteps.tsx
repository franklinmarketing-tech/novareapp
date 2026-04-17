import { motion } from "framer-motion";
import { SECTION_NARRATIVES } from "./onboardingConfig";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import iconBehavioral from "@/assets/icon-behavioral.png";

interface WelcomeProps {
  userName?: string;
}

export const StepWelcome = ({ userName }: WelcomeProps) => {
  const narrative = SECTION_NARRATIVES.welcome;
  const firstName = userName?.split(" ")[0];

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8 px-4">
      {/* Animated emoji */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
        className="text-6xl md:text-7xl"
      >
        👋
      </motion.div>

      {/* Title with name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="space-y-3"
      >
        {firstName && (
          <p className="font-body text-accent text-[0.875rem] font-semibold tracking-wide uppercase">
            Olá, {firstName}!
          </p>
        )}
        <h1 className="font-display text-[2rem] md:text-[2.75rem] font-bold text-foreground leading-[1.1] tracking-[-0.04em] whitespace-pre-line max-w-md">
          {narrative.title}
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="font-body text-muted-foreground text-[1rem] md:text-[1.0625rem] max-w-sm leading-relaxed tracking-[-0.01em]"
      >
        {narrative.subtitle}
      </motion.p>

      {/* Steps preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="flex flex-col items-center gap-3 pt-2"
      >
        <div className="flex items-center gap-6 text-[0.8125rem] font-body text-muted-foreground">
          <span className="flex items-center gap-1.5">🧑 Identificação</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="flex items-center gap-1.5">💰 Finanças</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="flex items-center gap-1.5">🧠 Perfil</span>
        </div>
        <p className="font-body text-muted-foreground text-xs italic max-w-xs">
          {narrative.cta}
        </p>
      </motion.div>

      {/* Decorative sparkle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-32 right-8 text-accent pointer-events-none"
      >
        <Sparkles className="h-24 w-24" />
      </motion.div>
    </div>
  );
};

interface TransitionProps {
  type: "transition_financas" | "transition_comportamental";
}

export const StepTransition = ({ type }: TransitionProps) => {
  const narrative = SECTION_NARRATIVES[type];

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-7 px-4">
      {/* Completed badge */}
      {narrative.completedLabel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20"
        >
          <CheckCircle2 className="h-6 w-6 text-success" />
          <span className="text-sm font-medium text-success font-body">{narrative.completedLabel}</span>
        </motion.div>
      )}

      {type === "transition_financas" ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
          className="text-5xl md:text-6xl"
        >
          💰
        </motion.div>
      ) : (
        <motion.img
          src={iconBehavioral}
          alt="Perfil comportamental"
          width={96}
          height={96}
          // @ts-ignore
          fetchpriority="high"
          decoding="sync"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
          className="w-20 h-20 md:w-24 md:h-24 object-contain"
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="font-display text-[1.75rem] md:text-[2.25rem] font-bold text-foreground leading-[1.1] tracking-[-0.04em] whitespace-pre-line max-w-md">
          {narrative.title}
        </h2>
        <p className="font-body text-muted-foreground text-[0.9375rem] md:text-[1rem] max-w-sm leading-relaxed tracking-[-0.01em] mx-auto">
          {narrative.subtitle}
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="font-body text-muted-foreground text-[0.8125rem] italic max-w-xs"
      >
        {narrative.cta}
      </motion.p>

      {/* Animated arrow */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ delay: 0.7, repeat: Infinity, repeatType: "reverse", duration: 1.2 }}
      >
        <ArrowRight className="h-6 w-6 text-accent" />
      </motion.div>
    </div>
  );
};
