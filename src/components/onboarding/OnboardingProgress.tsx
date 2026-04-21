import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEP_SECTION_LABELS, STEP_TITLES, STEP_ENCOURAGEMENT, SECTIONS, STEP_TO_SECTION, TOTAL_MICRO_STEPS } from "./steps/onboardingConfig";

interface Props {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingProgress = ({ currentStep, totalSteps }: Props) => {
  const navigate = useNavigate();
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const sectionIdx = STEP_TO_SECTION[currentStep] ?? 0;
  const section = SECTIONS[sectionIdx];
  const title = STEP_TITLES[currentStep] ?? "";
  const encouragement = STEP_ENCOURAGEMENT[currentStep] ?? "";

  // Don't show header on welcome/transition screens
  const isSpecialStep = currentStep === 0 || currentStep === 7 || currentStep === 14;

  return (
    <div className="sticky top-0 z-40 relative">
      {/* Progress bar - refined to 2px with subtle glow */}
      <div className="relative h-[2px] w-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/80 via-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
        <motion.div
          className="absolute top-0 h-full bg-gradient-to-r from-primary/0 via-primary/30 to-accent/0 blur-[3px]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      </div>

      {/* Header */}
      <div className={`px-4 sm:px-5 md:px-6 py-2.5 bg-background/90 backdrop-blur-xl border-b border-border/20 transition-all duration-300 ${isSpecialStep ? "py-2" : ""}`}>
        {/* Top row: section info left, close button right */}
        <div className="flex items-center justify-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0 justify-center sm:justify-start">
            <motion.div
              key={sectionIdx}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/8 shadow-soft ring-1 ring-inset ring-primary/10 shrink-0"
            >
              <span className="text-base">{section?.emoji}</span>
            </motion.div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[0.6875rem] uppercase tracking-[0.14em] font-semibold ${section?.color || "text-muted-foreground"}`}>
                  {section?.label}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground/70">·</span>
                <span className="text-[0.6875rem] text-muted-foreground tabular-nums font-medium">
                  {currentStep + 1} de {totalSteps}
                </span>
              </div>
              {!isSpecialStep && (
                <motion.span
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hidden min-[380px]:block text-[0.9375rem] font-medium text-foreground tracking-[-0.01em] leading-tight truncate"
                >
                  {title}
                </motion.span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/cliente")}
            className="hidden sm:flex h-8 w-8 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Encouragement — always centered */}
        {encouragement && !isSpecialStep && (
          <motion.span
            key={encouragement}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-[0.8125rem] text-muted-foreground/85 font-body text-center leading-snug mt-1.5"
          >
            {encouragement}
          </motion.span>
        )}
      </div>
    </div>
  );
};
