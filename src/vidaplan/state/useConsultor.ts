// Estado do "Painel do Consultor": carteira de clientes (cada um com seu plano).
// Sincroniza com Supabase (tabela vidaplan_clientes) quando logado; cache local sempre.
import { useEffect, useRef, useState } from "react";
import type { LifePlanInput } from "@/lib/lifeplan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const KEY = "vidaplan:consultor:clientes:v1";
const db = supabase as unknown as { from: (t: string) => any };

export interface Cliente {
  id: string;
  nome: string;
  cidade?: string;
  telefone?: string;
  email?: string;
  input: LifePlanInput;
  criadoEm: number;
}

export const novoInputCliente = (): LifePlanInput => ({
  anoAtual: new Date().getFullYear(),
  idadeAtual: 40,
  idadeAposentadoria: 65,
  idadeFim: 85,
  rendaMensal: 15000,
  custoFixoMensal: 9000,
  patrimonioAtual: 100000,
  rentRealPct: 4,
  rendaAposDesejada: 10000,
  rendaINSS: 0,
  goals: [],
  custoCategorias: [],
  dividas: [],
  rendaEventos: [],
  custoEventos: [],
  seguros: [],
  aportes: [],
});

const gerarId = () => {
  try { return crypto.randomUUID(); } catch { return `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`; }
};

const load = (): Cliente[] => {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Cliente[]) : []; } catch { return []; }
};

export function useConsultor() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>(load);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(true);

  // Carrega da nuvem ao logar (cai no local se a tabela ainda não existir).
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) { setHydrated(true); return; }
      try {
        const { data } = await db.from("vidaplan_clientes").select("data").eq("consultor_id", user.id).maybeSingle();
        if (cancel) return;
        if (Array.isArray(data?.data)) { skipNextSave.current = true; setClientes(data.data as Cliente[]); }
      } catch { /* mantém o local */ }
      finally { if (!cancel) setHydrated(true); }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  // Cache local sempre.
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(clientes)); } catch { /* ignora */ }
  }, [clientes]);

  // Auto-save na nuvem (debounce) quando logado e já hidratado.
  useEffect(() => {
    if (!user || !hydrated) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const t = setTimeout(async () => {
      try { await db.from("vidaplan_clientes").upsert({ consultor_id: user.id, data: clientes, updated_at: new Date().toISOString() }); } catch { /* offline/local */ }
    }, 800);
    return () => clearTimeout(t);
  }, [clientes, user, hydrated]);

  const addCliente = (nome: string): Cliente => {
    const c: Cliente = { id: gerarId(), nome: nome || "Novo cliente", input: novoInputCliente(), criadoEm: Date.now() };
    setClientes((p) => [c, ...p]);
    return c;
  };
  const updateCliente = (id: string, patch: Partial<Cliente>) =>
    setClientes((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateInput = (id: string, patch: Partial<LifePlanInput>) =>
    setClientes((p) => p.map((c) => (c.id === id ? { ...c, input: { ...c.input, ...patch } } : c)));
  const removeCliente = (id: string) => setClientes((p) => p.filter((c) => c.id !== id));

  return { clientes, addCliente, updateCliente, updateInput, removeCliente };
}
