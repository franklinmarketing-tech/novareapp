import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SettingsTabId =
  | "perfil"
  | "equipe"
  | "marca"
  | "notificacoes"
  | "cobranca"
  | "seguranca";

export interface SettingsCompletion {
  perfil: boolean;
  equipe: boolean;
  marca: boolean;
  notificacoes: boolean;
  cobranca: boolean;
  seguranca: boolean;
  /** total de itens pendentes */
  pendingCount: number;
  loading: boolean;
}

/**
 * Verifica se há itens pendentes em cada seção das configurações.
 * Retorna `true` quando a seção tem pendência (precisa de atenção).
 */
export const useSettingsCompletion = (): SettingsCompletion => {
  const { user } = useAuth();
  const [state, setState] = useState<SettingsCompletion>({
    perfil: false,
    equipe: false,
    marca: false,
    notificacoes: false,
    cobranca: false,
    seguranca: false,
    pendingCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Perfil: nome preenchido
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const perfilPending = !profile?.full_name || profile.full_name.trim().length < 2;

      // Equipe: ao menos 1 fundador ativo
      const { count: foundersCount } = await supabase
        .from("founders")
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      const equipePending = (foundersCount ?? 0) === 0;

      // Marca: ao menos 1 fundador com imagem (proxy de identidade visual configurada)
      const { count: brandCount } = await supabase
        .from("founders")
        .select("id", { count: "exact", head: true })
        .not("image_url", "is", null);
      const marcaPending = (brandCount ?? 0) === 0;

      // Notificações & Cobrança: ainda não implementadas → marcar como pendente
      const notificacoesPending = true;
      const cobrancaPending = true;

      // Segurança: sem método para detectar; marcar como ok por padrão
      const segurancaPending = false;

      const pendingCount = [
        perfilPending,
        equipePending,
        marcaPending,
        notificacoesPending,
        cobrancaPending,
        segurancaPending,
      ].filter(Boolean).length;

      if (cancelled) return;
      setState({
        perfil: perfilPending,
        equipe: equipePending,
        marca: marcaPending,
        notificacoes: notificacoesPending,
        cobranca: cobrancaPending,
        seguranca: segurancaPending,
        pendingCount,
        loading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
};
