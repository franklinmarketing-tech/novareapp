import { motion } from "framer-motion";
import { SECTION_NARRATIVES } from "./onboardingConfig";
import { CheckCircle2 } from "lucide-react";

/* Subtle animated mesh gradient backdrop used on welcome / transition screens */
const MeshGradientBg = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-primary/15 blur-[120px]"
      animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full bg-accent/15 blur-[120px]"
      animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-success/10 blur-[140px]"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

interface WelcomeProps {
  userName?: string;
  estimatedMin?: number;
}

export const StepWelcome = ({ userName, estimatedMin = 8 }: WelcomeProps) => {
  const narrative = SECTION_NARRATIVES.welcome;
  const firstName = userName?.split(" ")[0];

  return (
    <div className="relative flex flex-col items-center justify-center text-center gap-3 md:gap-5 px-4 py-2">
      <MeshGradientBg />

      {/* Animated emoji */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="text-4xl md:text-6xl"
      >
        👋
      </motion.div>

      {/* Title with name */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-1.5"
      >
        {firstName && (
          <p className="font-body text-accent text-[0.75rem] md:text-[0.8125rem] font-semibold tracking-wide uppercase">
            Olá, {firstName}!
          </p>
        )}
        <h1 className="font-display font-bold text-foreground tracking-[-0.035em] whitespace-pre-line max-w-2xl text-[clamp(1.5rem,1.2rem+1.3vw,2rem)] leading-[1.1]">
          {narrative.title}
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="font-body text-muted-foreground text-[0.875rem] md:text-[0.9375rem] max-w-xl leading-[1.5] tracking-[-0.01em]"
      >
        {narrative.subtitle}
      </motion.p>

      {/* Steps preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="flex items-center gap-2.5 md:gap-4 text-[0.8125rem] md:text-[0.9375rem] font-body font-medium text-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="text-base md:text-lg">🧑</span> Identificação
          </span>
          <span className="text-muted-foreground/40">→</span>
          <span className="flex items-center gap-1.5">
            <span className="text-base md:text-lg">💰</span> Finanças
          </span>
          <span className="text-muted-foreground/40">→</span>
          <span className="flex items-center gap-1.5">
            <span className="text-base md:text-lg">💡</span> Perfil
          </span>
        </div>
        <p className="font-body text-muted-foreground/85 text-[0.8125rem] max-w-md">
          Vamos lá — leva uns {estimatedMin} minutos.
        </p>
      </motion.div>
    </div>
  );
};

interface TransitionProps {
  type: "transition_financas" | "transition_comportamental";
}

export const StepTransition = ({ type }: TransitionProps) => {
  const narrative = SECTION_NARRATIVES[type];

  // Mini-preview: floating icons hinting next sections
  const previewIcons =
    type === "transition_financas"
      ? ["📈", "🧾", "💳", "🏠", "🛡️", "🎯"]
      : ["🧠", "💭", "🎲", "✨"];

  // Section milestone indicator (used together with the existing completedLabel)
  const milestone =
    type === "transition_financas"
      ? { current: 1, total: 3 }
      : { current: 2, total: 3 };

  return (
    <div className="relative flex flex-col items-center justify-center text-center gap-3 md:gap-4 px-4 py-2">
      <MeshGradientBg />

      {/* Milestone badge */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-[0.6875rem] font-semibold text-primary/85 font-body tracking-[0.12em] uppercase"
      >
        Seção {milestone.current} de {milestone.total}
      </motion.div>

      {/* Completed badge */}
      {narrative.completedLabel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-success/10 border border-success/20"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-[0.75rem] font-semibold text-success font-body tracking-wide">{narrative.completedLabel}</span>
        </motion.div>
      )}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="text-4xl md:text-6xl"
      >
        {type === "transition_financas" ? "💰" : "💡"}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-2"
      >
        <h2 className="font-display font-bold text-foreground tracking-[-0.035em] whitespace-pre-line max-w-md text-[clamp(1.375rem,1.1rem+1.2vw,1.875rem)] leading-[1.15]">
          {narrative.title}
        </h2>
        <p className="font-body text-muted-foreground text-[0.875rem] md:text-[0.9375rem] max-w-sm leading-[1.5] tracking-[-0.01em] mx-auto">
          {narrative.subtitle}
        </p>
      </motion.div>

      {/* Floating icons preview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex items-center gap-2 md:gap-3"
      >
        {previewIcons.map((icon, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-card border border-border/40 shadow-soft flex items-center justify-center text-base md:text-lg"
          >
            {icon}
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="font-body text-muted-foreground/85 text-[0.8125rem] max-w-xs"
      >
        {narrative.cta}
      </motion.p>
    </div>
  );
};
