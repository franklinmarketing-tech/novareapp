import { useEffect, useRef, useState } from "react";

/**
 * Persists `value` to localStorage under `key` (debounced ~600ms).
 * Returns the loaded draft (if any) on mount and a clear() helper.
 *
 * Usage:
 *   const { draft, clear } = useAutoSaveDraft("mydata.draft.<clientId>", formState);
 *   useEffect(() => { if (draft) setFormState(draft); }, []);
 */
export function useAutoSaveDraft<T>(key: string, value: T, enabled = true) {
  const [draft, setDraft] = useState<T | null>(null);
  const loaded = useRef(false);

  // Load once
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDraft(JSON.parse(raw) as T);
    } catch {
      // ignore corrupt drafts
    }
  }, [key, enabled]);

  // Debounced save
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // quota / serialize error — ignore
      }
    }, 600);
    return () => clearTimeout(t);
  }, [key, value, enabled]);

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setDraft(null);
  };

  return { draft, clear };
}
