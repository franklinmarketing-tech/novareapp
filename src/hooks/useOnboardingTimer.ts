import { useEffect, useRef, useState } from "react";

/**
 * Tracks the user's pace through a multi-step flow and estimates remaining
 * time. After 3 step changes we begin computing a moving average per step.
 */
export function useOnboardingTimer(currentStep: number, totalSteps: number) {
  const startedAt = useRef<number>(Date.now());
  const lastStepAt = useRef<number>(Date.now());
  const stepsSeen = useRef<number>(0);
  const [avgMs, setAvgMs] = useState<number>(20_000); // optimistic default

  useEffect(() => {
    const now = Date.now();
    const delta = now - lastStepAt.current;
    lastStepAt.current = now;
    stepsSeen.current += 1;

    // Skip the very first render, ignore implausibly fast/slow deltas
    if (stepsSeen.current > 1 && delta > 1500 && delta < 180_000) {
      setAvgMs((prev) => Math.round(prev * 0.6 + delta * 0.4));
    }
  }, [currentStep]);

  const remainingSteps = Math.max(0, totalSteps - currentStep - 1);
  const remainingMs = remainingSteps * avgMs;
  const remainingMin = Math.max(1, Math.round(remainingMs / 60_000));

  return {
    remainingMin,
    remainingSteps,
    elapsedMs: Date.now() - startedAt.current,
  };
}
