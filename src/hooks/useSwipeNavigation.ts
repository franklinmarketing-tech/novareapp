import { useEffect, useRef } from "react";

interface Options {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** minimum horizontal travel in px to count as swipe */
  threshold?: number;
  /** maximum vertical drift allowed (otherwise treated as scroll) */
  maxVertical?: number;
  enabled?: boolean;
}

/**
 * Lightweight swipe-detection hook attached to a container ref.
 * Used to navigate horizontally between micro-steps on mobile only —
 * intentionally ignores gestures that look like a vertical scroll.
 */
export function useSwipeNavigation<T extends HTMLElement>(
  ref: React.RefObject<T>,
  { onSwipeLeft, onSwipeRight, threshold = 60, maxVertical = 50, enabled = true }: Options,
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const handleStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      startTime.current = Date.now();
    };

    const handleEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      const dt = Date.now() - startTime.current;
      startX.current = null;
      startY.current = null;

      // Ignore long-press or scroll-y dominated gestures
      if (Math.abs(dy) > maxVertical) return;
      if (dt > 600) return;
      if (Math.abs(dx) < threshold) return;

      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    };

    node.addEventListener("touchstart", handleStart, { passive: true });
    node.addEventListener("touchend", handleEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", handleStart);
      node.removeEventListener("touchend", handleEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, threshold, maxVertical, enabled]);
}
