import { useEffect, useState } from "react";

/**
 * Smoothly animates a numeric value from 0 → target using requestAnimationFrame.
 * Eased with cubic-out for a premium feel.
 *
 * @param target    final value to animate to
 * @param duration  duration in ms (default 1400)
 * @param delay     delay before start in ms (default 0)
 * @param decimals  number of decimal places (default 0)
 */
export function useCountUp(
  target: number,
  duration = 1400,
  delay = 0,
  decimals = 0,
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(0);
      return;
    }
    if (target === 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const start = performance.now() + delay;

    const tick = (ts: number) => {
      if (ts < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, decimals]);

  return value;
}
