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

  // Determine unique completed sections for the pill indicators
  const completedSections = new Set<number>();
  for (let i = 0; i < currentStep; i++) {
    completedSections.add(STEP_TO_SECTION[i]);
  }

  // Don't show header on welcome/transition screens
  const isSpecialStep = currentStep === 0 || currentStep === 7 || currentStep === 14;

  return (
    <div className="sticky top-0 z-40 relative">
      {/* Progress bar */}
      <div className="h-[3px] w-full bg-muted/60 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Header */}
      <div className={`px-5 md:px-6 py-3 bg-background/90 backdrop-blur-xl border-b border-border/20 transition-all duration-300 ${isSpecialStep ? "py-2.5" : ""}`}>
        {/* Top row: section info left, close button right */}
        <div className="flex items-center justify-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0 justify-center sm:justify-start">
            <motion.div
              key={sectionIdx}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/8 shrink-0"
            >
              <span className="text-lg">{section?.emoji}</span>
            </motion.div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase tracking-[0.12em] font-semibold ${section?.color || "text-muted-foreground"}`}>
                  {section?.label}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground tabular-nums font-medium">
                  {currentStep + 1}/{totalSteps}
                </span>
              </div>
              {!isSpecialStep && (
                <motion.span
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base font-medium text-foreground tracking-[-0.01em] leading-tight truncate"
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
            className="hidden sm:flex h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Encouragement — always centered */}
        {encouragement && !isSpecialStep && (
          <motion.span
            key={encouragement}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-sm text-muted-foreground font-body italic text-center leading-tight mt-2"
          >
            {encouragement}
          </motion.span>
        )}
      </div>
    </div>
  );
};
