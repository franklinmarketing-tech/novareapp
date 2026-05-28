import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

interface ClientContextValue {
  clientId: string;
  clientSlug: string;
  /** Mês ativo compartilhado entre Onboarding, Diagnóstico, Plano de Ação, etc. */
  selectedMonth: string | null;
  setSelectedMonth: (month: string | null) => void;
}

interface ClientProviderProps {
  value: { clientId: string; clientSlug: string };
  children: React.ReactNode;
}

const ClientCtx = createContext<ClientContextValue | null>(null);

const currentMonthRef = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const storageKey = (clientId: string) => `novare:selectedMonth:${clientId}`;

export const ClientProvider = ({ value, children }: ClientProviderProps) => {
  // Persiste o mês selecionado por cliente em localStorage — assim navegar
  // entre abas (Onboarding → Diagnóstico → Plano de Ação) mantém o mês.
  const [selectedMonth, setSelectedMonthState] = useState<string | null>(() => {
    if (!value.clientId || typeof window === "undefined") return null;
    return localStorage.getItem(storageKey(value.clientId));
  });

  // Quando troca de cliente, recarrega do localStorage daquele cliente
  useEffect(() => {
    if (!value.clientId || typeof window === "undefined") return;
    const saved = localStorage.getItem(storageKey(value.clientId));
    setSelectedMonthState(saved);
  }, [value.clientId]);

  const setSelectedMonth = useCallback((month: string | null) => {
    setSelectedMonthState(month);
    if (typeof window === "undefined" || !value.clientId) return;
    if (month) localStorage.setItem(storageKey(value.clientId), month);
    else localStorage.removeItem(storageKey(value.clientId));
  }, [value.clientId]);

  const ctxValue = useMemo<ClientContextValue>(() => ({
    clientId: value.clientId,
    clientSlug: value.clientSlug,
    selectedMonth,
    setSelectedMonth,
  }), [value.clientId, value.clientSlug, selectedMonth, setSelectedMonth]);

  return <ClientCtx.Provider value={ctxValue}>{children}</ClientCtx.Provider>;
};

export const useClientId = () => {
  const ctx = useContext(ClientCtx);
  if (!ctx) throw new Error("useClientId must be used within ClientProvider");
  return ctx;
};

/**
 * Hook para usar o mês ativo compartilhado entre abas.
 * Quando uma aba muda o mês, todas as outras refletem a mudança.
 */
export const useSelectedMonth = () => {
  const ctx = useContext(ClientCtx);
  if (!ctx) throw new Error("useSelectedMonth must be used within ClientProvider");
  return { selectedMonth: ctx.selectedMonth, setSelectedMonth: ctx.setSelectedMonth };
};

/** Helper para garantir um mês válido (fallback para mês atual) */
export const ensureMonth = (m: string | null): string => m || currentMonthRef();
