// Estado compartilhado do plano de vida (Fase 1: local, com persistência em localStorage).
// Na Fase 2 isto passa a ler/gravar a tabela do cliente no Supabase.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeLifePlan, type LifePlanInput, type Goal, type LifePlan } from "@/lib/lifeplan";

const STORAGE_KEY = "vidaplan:input:v1";

const DEFAULT_INPUT: LifePlanInput = {
  anoAtual: new Date().getFullYear(),
  idadeAtual: 40,
  idadeAposentadoria: 65,
  idadeFim: 85,
  rendaMensal: 15000,
  custoFixoMensal: 9785,
  patrimonioAtual: 100000,
  rentRealPct: 4,
  rendaAposDesejada: 10500,
  rendaINSS: 0,
  goals: [
    { id: 1, tipo: "viagens", nome: "Viagens e lazer", valor: 8496, ano: new Date().getFullYear() },
    { id: 2, tipo: "imovel", nome: "Casa própria", valor: 600000, ano: new Date().getFullYear() + 9, financiar: true, entradaPct: 50, prazoAnos: 25, jurosAa: 9 },
  ],
};

function loadInput(): LifePlanInput {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LifePlanInput>;
      return { ...DEFAULT_INPUT, ...parsed, anoAtual: new Date().getFullYear() };
    }
  } catch { /* ignora */ }
  return DEFAULT_INPUT;
}

interface VidaPlanCtx {
  input: LifePlanInput;
  plan: LifePlan;
  setField: <K extends keyof LifePlanInput>(key: K, value: LifePlanInput[K]) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: number, patch: Partial<Goal>) => void;
  removeGoal: (id: number) => void;
  reset: () => void;
}

const Ctx = createContext<VidaPlanCtx | null>(null);

export const VidaPlanProvider = ({ children }: { children: ReactNode }) => {
  const [input, setInput] = useState<LifePlanInput>(loadInput);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(input)); } catch { /* ignora */ }
  }, [input]);

  const plan = useMemo(() => computeLifePlan(input), [input]);

  const value = useMemo<VidaPlanCtx>(() => ({
    input,
    plan,
    setField: (key, val) => setInput((p) => ({ ...p, [key]: val })),
    addGoal: (g) => setInput((p) => ({ ...p, goals: [...p.goals, { ...g, id: Date.now() }] })),
    updateGoal: (id, patch) => setInput((p) => ({ ...p, goals: p.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    removeGoal: (id) => setInput((p) => ({ ...p, goals: p.goals.filter((x) => x.id !== id) })),
    reset: () => setInput(DEFAULT_INPUT),
  }), [input, plan]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useVidaPlan = (): VidaPlanCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVidaPlan deve ser usado dentro de <VidaPlanProvider>");
  return ctx;
};

export const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
export const brl0 = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
