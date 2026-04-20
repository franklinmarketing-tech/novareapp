import { useEffect, useRef } from "react";

/**
 * Hook que faz scroll suave + foco no primeiro input/textarea do elemento
 * referenciado por um ID quando o `targetId` muda.
 *
 * Uso típico: ao adicionar um item à lista, salvar o `id` do novo item em
 * um state e passar como `targetId`. O hook detecta a mudança e foca o
 * primeiro campo editável dentro do container `[data-item-id="<id>"]`.
 */
export const useFocusOnAdd = (targetId: string | null, onDone?: () => void) => {
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (!targetId || targetId === lastHandled.current) return;
    lastHandled.current = targetId;

    // Aguarda o próximo frame para garantir que o DOM foi atualizado
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-item-id="${targetId}"]`);
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Foca o primeiro input/textarea/select editável dentro do item
      const focusable = el.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'
      );
      // Pequeno delay para o scroll iniciar antes do focus
      setTimeout(() => {
        focusable?.focus();
        onDone?.();
      }, 250);
    });

    return () => cancelAnimationFrame(raf);
  }, [targetId, onDone]);
};
