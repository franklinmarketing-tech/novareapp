// Estado do "Painel do Consultor": carteira de clientes (cada um com seu plano).
// Guardado localmente no dispositivo do consultor (sem backend novo nesta v1).
import { useEffect, useState } from "react";
import type { LifePlanInput } from "@/lib/lifeplan";

const KEY = "vidaplan:consultor:clientes:v1";

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
  const [clientes, setClientes] = useState<Cliente[]>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(clientes)); } catch { /* ignora */ }
  }, [clientes]);

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
