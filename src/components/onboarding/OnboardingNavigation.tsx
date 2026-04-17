import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { STEP_TO_SECTION, SECTIONS, TOTAL_MICRO_STEPS } from "./steps/onboardingConfig";

interface Props {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

export const OnboardingNavigation = ({ currentStep, totalSteps, onBack, onNext, isSubmitting }: Props) => {
  const isLast = currentStep === totalSteps - 1;
  const isWelcome = currentStep === 0;
  const isTransition = currentStep === 7 || currentStep === 14;

  // Calculate unique sections for dots
  const uniqueSections: { idx: number; emoji: string; label: string }[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < totalSteps; i++) {
    const si = STEP_TO_SECTION[i];
    if (si !== undefined && !seen.has(si)) {
      seen.add(si);
      const sec = SECTIONS[si];
      if (sec) uniqueSections.push({ idx: si, emoji: sec.emoji, label: sec.label });
    }
  }

  const currentSectionIdx = STEP_TO_SECTION[currentStep] ?? 0;

  // Dynamic CTA label
  const getCtaLabel = () => {
    if (isSubmitting) return "Salvando";
    if (isLast) return "Finalizar";
    if (isWelcome) return "Começar";
    if (isTransition) return "Continuar";
    return "Próximo";
  };

  const getCtaIcon = () => {
    if (isLast) return <Check className="h-6 w-6" />;
    if (isWelcome) return <Sparkles className="h-6 w-6" />;
    return <ArrowRight className="h-6 w-6" />;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/30">
      <div className="max-w-2xl mx-auto px-5 md:px-6 py-4 space-y-3">
        {/* Section dots */}
        <div className="flex items-center justify-center gap-1">
          {uniqueSections.map((sec) => {
            const isActive = sec.idx === currentSectionIdx;
            const isComplete = sec.idx < currentSectionIdx;
            return (
              <div
                key={sec.idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  isActive
                    ? "w-8 bg-primary"
                    : isComplete
                    ? "w-3 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
                title={sec.label}
              />
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={currentStep === 0}
            className="gap-2 text-muted-foreground hover:text-foreground h-12 px-5 text-[0.9375rem] font-body rounded-full"
          >
            <ArrowLeft className="h-6 w-6" />
            <span>Voltar</span>
          </Button>

          <AnimatePresence mode="wait">
            <motion.div
              key={getCtaLabel()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                type="button"
                onClick={onNext}
                disabled={isSubmitting}
                variant="premium"
                className={`gap-2.5 min-w-[150px] h-12 rounded-full text-[0.9375rem] font-medium font-body tracking-[-0.01em] transition-all duration-200 ${
                  isLast
                    ? "bg-success text-success-foreground shadow-[0_6px_20px_-4px_hsl(var(--success)/0.5),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_28px_-4px_hsl(var(--success)/0.6)]"
                    : ""
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                    Salvando
                  </span>
                ) : (
                  <>
                    {getCtaLabel()}
                    {getCtaIcon()}
                  </>
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
