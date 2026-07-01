// Perfil de consultor: o usuário vira consultor ao registrar um código.
// Usado para liberar o "Painel do Consultor" só para quem é consultor.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as unknown as { from: (t: string) => any };

interface PerfilCtx {
  codigo: string | null;
  isConsultor: boolean;
  hydrated: boolean;
  planoStatus: string | null;   // 'trial' | 'active' | 'inactive' (null = colunas ausentes)
  consultorAtivo: boolean;      // pode usar o Painel do Consultor (trial válido ou pago)
  diasTrial: number | null;     // dias restantes do teste, quando em trial
  marcaPublicada: boolean;      // logo/nome do sistema já publicados p/ os clientes
  salvarCodigo: (codigo: string, nome?: string, empresa?: string) => Promise<{ ok: boolean; erro?: string }>;
  publicarMarca: (m: { logo?: string; logoRatio?: number; sistema?: string; nome?: string; empresa?: string }) => Promise<{ ok: boolean; erro?: string }>;
}

const Ctx = createContext<PerfilCtx | null>(null);

export const ConsultorPerfilProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [planoStatus, setPlanoStatus] = useState<string | null>(null);
  const [trialUntil, setTrialUntil] = useState<string | null>(null);
  const [marcaPublicada, setMarcaPublicada] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) { setHydrated(true); return; }
      try {
        const { data } = await db.from("vidaplan_consultores").select("*").eq("consultor_id", user.id).maybeSingle();
        if (!cancel) { setCodigo(data?.codigo ?? null); setPlanoStatus(data?.plano_status ?? null); setTrialUntil(data?.trial_until ?? null); setMarcaPublicada(!!(data?.logo || data?.sistema)); }
      } catch { /* tabela ausente → não é consultor */ }
      finally { if (!cancel) setHydrated(true); }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  const trialValido = !!trialUntil && new Date(trialUntil).getTime() > Date.now();
  // Sem as colunas de plano (pré-migration) não bloqueia: considera ativo.
  const consultorAtivo = !!codigo && (planoStatus == null || planoStatus === "active" || (planoStatus === "trial" && trialValido));
  const diasTrial = planoStatus === "trial" && trialUntil ? Math.max(0, Math.ceil((new Date(trialUntil).getTime() - Date.now()) / 86400000)) : null;

  const salvarCodigo = async (cod: string, nome?: string, empresa?: string) => {
    if (!user) return { ok: false, erro: "Faça login primeiro." };
    const limpo = cod.trim().toUpperCase().replace(/\s+/g, "");
    if (limpo.length < 3) return { ok: false, erro: "Use um código com 3+ caracteres." };
    try {
      const { error } = await db.from("vidaplan_consultores").upsert({ consultor_id: user.id, codigo: limpo, nome, empresa, updated_at: new Date().toISOString() });
      if (error) {
        if (/duplicate|unique/i.test(String(error.message || error.code || ""))) return { ok: false, erro: "Esse código já está em uso. Escolha outro." };
        return { ok: false, erro: "Não foi possível salvar (rode a migration no Supabase)." };
      }
      setCodigo(limpo);
      if (planoStatus == null) setPlanoStatus("trial"); // recém-criado entra em teste
      return { ok: true };
    } catch { return { ok: false, erro: "Não foi possível salvar agora." }; }
  };

  const publicarMarca: PerfilCtx["publicarMarca"] = async (m) => {
    if (!user) return { ok: false, erro: "Faça login primeiro." };
    if (!codigo) return { ok: false, erro: "Crie seu código de consultor primeiro." };
    try {
      const { error } = await db.from("vidaplan_consultores").update({
        logo: m.logo ?? null, logo_ratio: m.logoRatio ?? null, sistema: m.sistema ?? null,
        nome: m.nome ?? null, empresa: m.empresa ?? null, updated_at: new Date().toISOString(),
      }).eq("consultor_id", user.id);
      if (error) return { ok: false, erro: "Não foi possível publicar (rode a migration da marca)." };
      setMarcaPublicada(!!(m.logo || m.sistema));
      return { ok: true };
    } catch { return { ok: false, erro: "Não foi possível publicar agora." }; }
  };

  return <Ctx.Provider value={{ codigo, isConsultor: !!codigo, hydrated, planoStatus, consultorAtivo, diasTrial, marcaPublicada, salvarCodigo, publicarMarca }}>{children}</Ctx.Provider>;
};

export const useConsultorPerfil = (): PerfilCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsultorPerfil deve ser usado dentro de <ConsultorPerfilProvider>");
  return c;
};
