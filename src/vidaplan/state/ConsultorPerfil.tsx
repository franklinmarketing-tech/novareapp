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
  salvarCodigo: (codigo: string, nome?: string, empresa?: string) => Promise<{ ok: boolean; erro?: string }>;
}

const Ctx = createContext<PerfilCtx | null>(null);

export const ConsultorPerfilProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) { setHydrated(true); return; }
      try {
        const { data } = await db.from("vidaplan_consultores").select("codigo").eq("consultor_id", user.id).maybeSingle();
        if (!cancel) setCodigo(data?.codigo ?? null);
      } catch { /* tabela ausente → não é consultor */ }
      finally { if (!cancel) setHydrated(true); }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

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
      return { ok: true };
    } catch { return { ok: false, erro: "Não foi possível salvar agora." }; }
  };

  return <Ctx.Provider value={{ codigo, isConsultor: !!codigo, hydrated, salvarCodigo }}>{children}</Ctx.Provider>;
};

export const useConsultorPerfil = (): PerfilCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsultorPerfil deve ser usado dentro de <ConsultorPerfilProvider>");
  return c;
};
