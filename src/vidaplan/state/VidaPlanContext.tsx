// Estado do plano de vida. Logado: carrega/salva em public.vidaplan_plans (Supabase),
// com auto-save (debounce). Cache local em localStorage para abrir rápido e offline.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeLifePlan, type LifePlanInput, type Goal, type LifePlan, type CustoCategoria } from "@/lib/lifeplan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Cache local isolado por usuário (evita vazar dados de uma conta pra outra no mesmo navegador).
const BASE_KEY = "vidaplan:input:v1";
const keyFor = (uid?: string | null) => (uid ? `${BASE_KEY}:${uid}` : `${BASE_KEY}:anon`);
// A tabela ainda não está nos tipos gerados do Supabase; acesso solto e seguro.
const db = supabase as unknown as {
  from: (t: string) => any;
};

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
  custoCategorias: [
    { nome: "Habitação", valor: 3626 },
    { nome: "Supermercado", valor: 1208 },
    { nome: "Educação", valor: 819 },
    { nome: "Veículo", valor: 791 },
    { nome: "Saúde", valor: 783 },
    { nome: "Contas de casa", valor: 725 },
    { nome: "Restaurantes", valor: 564 },
    { nome: "Cuidados pessoais", valor: 422 },
    { nome: "Lazer", valor: 281 },
    { nome: "Outros", valor: 566 },
  ],
  dividas: [],
  rendaEventos: [],
  custoEventos: [],
  seguros: [],
  aportes: [],
  ativosImobilizados: 0,
  consorcio: 0,
  advisorCodigo: "",
  planoConfig: {},
  goals: [
    { id: 1, tipo: "viagens", nome: "Viagens e lazer", valor: 8496, ano: new Date().getFullYear() },
    { id: 2, tipo: "imovel", nome: "Casa própria", valor: 600000, ano: new Date().getFullYear() + 9, financiar: true, entradaPct: 50, prazoAnos: 25, jurosAa: 9 },
  ],
};

// Primeiro acesso (conta nova, sem plano no servidor): começa LIMPO — nunca herda dados.
const CLEAN_INPUT: LifePlanInput = {
  ...DEFAULT_INPUT,
  rendaMensal: 0,
  custoFixoMensal: 0,
  patrimonioAtual: 0,
  reservaAtual: 0,
  ativosImobilizados: 0,
  consorcio: 0,
  custoCategorias: DEFAULT_INPUT.custoCategorias.map((c) => ({ ...c, valor: 0 })),
  dividas: [],
  goals: [],
};

function loadCache(uid?: string | null): LifePlanInput | null {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LifePlanInput>;
      return { ...DEFAULT_INPUT, ...parsed, anoAtual: new Date().getFullYear() };
    }
  } catch { /* ignora */ }
  return null;
}

type SaveState = "idle" | "saving" | "saved";

interface VidaPlanCtx {
  input: LifePlanInput;
  plan: LifePlan;
  hydrated: boolean;       // já carregou do servidor (ou decidiu modo local)
  saveState: SaveState;
  setField: <K extends keyof LifePlanInput>(key: K, value: LifePlanInput[K]) => void;
  setCategorias: (cats: CustoCategoria[]) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: number, patch: Partial<Goal>) => void;
  removeGoal: (id: number) => void;
  reset: () => void;
}

const Ctx = createContext<VidaPlanCtx | null>(null);

export const VidaPlanProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [input, setInput] = useState<LifePlanInput>(DEFAULT_INPUT);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const skipNextSave = useRef(true); // não salvar logo após carregar do servidor

  // Limpa a chave global antiga (que vazava dados entre contas no mesmo navegador).
  useEffect(() => { try { localStorage.removeItem(BASE_KEY); } catch { /* ignora */ } }, []);

  // Carrega o plano ao logar. Servidor manda; se não houver plano salvo, começa LIMPO.
  useEffect(() => {
    let cancel = false;
    (async () => {
      setHydrated(false);
      // Anônimo (trial sem login): usa só o cache anônimo, mostra o exemplo padrão.
      if (!user) {
        skipNextSave.current = true;
        setInput(loadCache(null) ?? DEFAULT_INPUT);
        setHydrated(true);
        return;
      }
      // Logado: cache do PRÓPRIO usuário pra abrir rápido (nunca de outro).
      const cached = loadCache(user.id);
      if (cached) { skipNextSave.current = true; setInput(cached); }
      try {
        const { data } = await db.from("vidaplan_plans").select("data").eq("user_id", user.id).maybeSingle();
        if (cancel) return;
        const saved = data?.data;
        if (saved && typeof saved === "object" && Object.keys(saved).length) {
          skipNextSave.current = true;
          setInput({ ...DEFAULT_INPUT, ...(saved as Partial<LifePlanInput>), anoAtual: new Date().getFullYear() });
        } else if (!cached) {
          // Primeiro acesso real desta conta: plano limpo, sem herdar nada.
          skipNextSave.current = true;
          setInput(CLEAN_INPUT);
        }
      } catch { /* mantém o que já tem */ }
      finally { if (!cancel) setHydrated(true); }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  // Cache local por usuário (isolado)
  useEffect(() => {
    try { localStorage.setItem(keyFor(user?.id), JSON.stringify(input)); } catch { /* ignora */ }
  }, [input, user?.id]);

  // Auto-save no servidor (debounce) quando logado e já hidratado
  useEffect(() => {
    if (!user || !hydrated) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await db.from("vidaplan_plans").upsert({ user_id: user.id, data: input, updated_at: new Date().toISOString() });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch { setSaveState("idle"); }
    }, 800);
    return () => clearTimeout(t);
  }, [input, user, hydrated]);

  const plan = useMemo(() => computeLifePlan(input), [input]);

  const value = useMemo<VidaPlanCtx>(() => ({
    input,
    plan,
    hydrated,
    saveState,
    setField: (key, val) => setInput((p) => ({ ...p, [key]: val })),
    setCategorias: (cats) => setInput((p) => ({ ...p, custoCategorias: cats, custoFixoMensal: cats.reduce((s, c) => s + (Number(c.valor) || 0), 0) })),
    addGoal: (g) => setInput((p) => ({ ...p, goals: [...p.goals, { ...g, id: Date.now() }] })),
    updateGoal: (id, patch) => setInput((p) => ({ ...p, goals: p.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    removeGoal: (id) => setInput((p) => ({ ...p, goals: p.goals.filter((x) => x.id !== id) })),
    reset: () => setInput(DEFAULT_INPUT),
  }), [input, plan, hydrated, saveState]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useVidaPlan = (): VidaPlanCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVidaPlan deve ser usado dentro de <VidaPlanProvider>");
  return ctx;
};

export const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
export const brl0 = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
