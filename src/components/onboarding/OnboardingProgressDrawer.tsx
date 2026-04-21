import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ListChecks, ChevronRight } from "lucide-react";
import { SECTIONS, STEP_TO_SECTION, TOTAL_MICRO_STEPS } from "./steps/onboardingConfig";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionStat {
  count?: number;
  total?: number;
  hint?: string;
}

interface Props {
  currentStep: number;
  /** Per-section stats keyed by section index in SECTIONS array. */
  stats?: Record<number, SectionStat>;
  /** Jumps to a specific micro-step (must be a previously visited step). */
  onJump: (step: number) => void;
}

/**
 * "My progress" drawer — checklist of all sections, current/done/upcoming
 * state, plus mini-counters per section. The user can jump back to any
 * section that has already been visited.
 */
export const OnboardingProgressDrawer = ({ currentStep, stats, onJump }: Props) => {
  const currentSection = STEP_TO_SECTION[currentStep] ?? 0;

  // First micro-step that belongs to a given section.
  const firstStepOfSection = (sectionIdx: number) => {
    return STEP_TO_SECTION.findIndex((s) => s === sectionIdx);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full text-[0.75rem] text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Meu progresso</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display tracking-[-0.02em]">Meu progresso</SheetTitle>
          <p className="text-[0.8125rem] text-muted-foreground/85 font-body">
            Revise e pule para qualquer seção que já visitou.
          </p>
        </SheetHeader>

        <div className="space-y-1.5">
          {SECTIONS.map((sec, idx) => {
            const isCurrent = idx === currentSection;
            const isDone = idx < currentSection;
            const isUpcoming = idx > currentSection;
            const firstStep = firstStepOfSection(idx);
            const stat = stats?.[idx];

            return (
              <motion.button
                key={sec.key}
                type="button"
                disabled={isUpcoming}
                onClick={() => firstStep >= 0 && onJump(firstStep)}
                whileHover={!isUpcoming ? { x: 2 } : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                  "border",
                  isCurrent && "border-primary/30 bg-primary/[0.04]",
                  isDone && "border-border/40 bg-card hover:bg-muted/40 cursor-pointer",
                  isUpcoming && "border-border/20 bg-transparent opacity-50 cursor-not-allowed",
                )}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : isCurrent ? (
                    <div className="h-5 w-5 rounded-full bg-primary/10 ring-2 ring-primary/30 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{sec.emoji}</span>
                    <span
                      className={cn(
                        "text-[0.875rem] font-medium font-body tracking-[-0.01em]",
                        isCurrent ? "text-foreground" : isDone ? "text-foreground/85" : "text-muted-foreground",
                      )}
                    >
                      {sec.label}
                    </span>
                  </div>
                  {stat?.hint && (
                    <p className="text-[0.75rem] text-muted-foreground/75 font-body mt-0.5 truncate">
                      {stat.hint}
                    </p>
                  )}
                </div>

                {!isUpcoming && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border/40">
          <p className="text-[0.6875rem] text-muted-foreground/70 text-center font-body">
            Etapa {currentStep + 1} de {TOTAL_MICRO_STEPS}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
