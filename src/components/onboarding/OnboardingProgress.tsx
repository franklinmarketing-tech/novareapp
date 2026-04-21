import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STEP_TITLES, STEP_ENCOURAGEMENT, SECTIONS, STEP_TO_SECTION, TOTAL_MICRO_STEPS } from "./steps/onboardingConfig";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";
import { OnboardingProgressDrawer } from "./OnboardingProgressDrawer";

interface SectionStat {
  count?: number;
  total?: number;
  hint?: string;
}

interface Props {
  currentStep: number;
  totalSteps: number;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
  onRetrySave?: () => void;
  onJumpToStep?: (step: number) => void;
  drawerStats?: Record<number, SectionStat>;
  remainingMin?: number;
}

export const OnboardingProgress = ({
  currentStep,
  totalSteps,
  saveStatus = "idle",
  lastSavedAt = null,
  onRetrySave,
  onJumpToStep,
  drawerStats,
  remainingMin,
}: Props) => {
  const navigate = useNavigate();
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const sectionIdx = STEP_TO_SECTION[currentStep] ?? 0;
  const section = SECTIONS[sectionIdx];
  const title = STEP_TITLES[currentStep] ?? "";
  const encouragement = STEP_ENCOURAGEMENT[currentStep] ?? "";

  // Don't show header on welcome/transition screens
  const isSpecialStep = currentStep === 0 || currentStep === 7 || currentStep === 14;

  return (
    <TooltipProvider delayDuration={200}>
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
          {/* Top row: section info left, save indicator/actions right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    key={sectionIdx}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/8 shadow-soft ring-1 ring-inset ring-primary/10 shrink-0"
                  >
                    <span className="text-base">{section?.emoji}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">{section?.label}</TooltipContent>
              </Tooltip>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[0.6875rem] uppercase tracking-[0.14em] font-semibold ${section?.color || "text-muted-foreground"}`}>
                    {section?.label}
                  </span>
                  <span className="text-[0.6875rem] text-muted-foreground/70">·</span>
                  <span className="text-[0.6875rem] text-muted-foreground tabular-nums font-medium">
                    {currentStep + 1} / {totalSteps}
                  </span>
                  {typeof remainingMin === "number" && !isSpecialStep && (
                    <>
                      <span className="text-[0.6875rem] text-muted-foreground/70 hidden sm:inline">·</span>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground/85 tabular-nums">
                        <Clock className="h-2.5 w-2.5" />
                        ≈ {remainingMin} min
                      </span>
                    </>
                  )}
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

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:block">
                <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
              </div>
              {onJumpToStep && (
                <OnboardingProgressDrawer currentStep={currentStep} stats={drawerStats} onJump={onJumpToStep} />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/cliente")}
                    className="h-8 w-8 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/40"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sair sem perder o progresso</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile save indicator below header */}
          <div className="sm:hidden flex justify-center mt-1">
            <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
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
    </TooltipProvider>
  );
};
