import { useEffect } from "react";

interface Options {
  onNext?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts for onboarding-style flows.
 * - Enter (without Shift) → next
 * - Shift+Enter → back
 * - Esc → close
 *
 * Ignores key events while the user is typing in inputs/textareas/selects
 * (except when the active element is the document body) so it does not
 * interfere with form input.
 */
export function useKeyboardNav({ onNext, onBack, onClose, enabled = true }: Options) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      // Don't hijack Enter while typing in form fields — let the field handle it.
      if (isEditable) return;

      if (e.key === "Enter") {
        if (e.shiftKey && onBack) {
          e.preventDefault();
          onBack();
        } else if (!e.shiftKey && onNext) {
          e.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onBack, onClose, enabled]);
}
