// Estado da assinatura do usuário (free / trial / gold) — provider único.
// Premium também é HERDADO: cliente vinculado a um consultor com Plano Consultor
// ativo usa o app completo de graça (quem paga é o consultor).
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVidaPlan } from "./VidaPlanContext";

const db = supabase as unknown as { from: (t: string) => any };

export type SubStatus = "inactive" | "trial" | "active";

export interface SubInfo {
  loading: boolean;
  status: SubStatus;
  isPremium: boolean;
  premiumViaConsultor: boolean; // acesso liberado pelo consultor (não pelo GOLD próprio)
  daysLeft: number;
  startTrial: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubInfo | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { input } = useVidaPlan();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubStatus>("inactive");
  const [trialUntil, setTrialUntil] = useState<Date | null>(null);
  const [premiumViaConsultor, setPremiumViaConsultor] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setStatus("inactive"); setTrialUntil(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await db.from("vidaplan_subscriptions").select("status, trial_until").eq("user_id", user.id).maybeSingle();
      setStatus((data?.status as SubStatus) ?? "inactive");
      setTrialUntil(data?.trial_until ? new Date(data.trial_until) : null);
    } catch { /* mantém */ }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Premium herdado: o consultor vinculado tem Plano Consultor ativo?
  const vinculoConsultorId = input.advisorVinculo?.consultorId ?? null;
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!vinculoConsultorId) { setPremiumViaConsultor(false); return; }
      try {
        const { data } = await db.from("vidaplan_consultores").select("plano_status, trial_until").eq("consultor_id", vinculoConsultorId).maybeSingle();
        const trialOk = !!data?.trial_until && new Date(data.trial_until).getTime() > Date.now();
        const ativo = !!data && (data.plano_status === "active" || (data.plano_status === "trial" && trialOk) || data.plano_status == null);
        if (!cancel) setPremiumViaConsultor(ativo);
      } catch { if (!cancel) setPremiumViaConsultor(false); }
    })();
    return () => { cancel = true; };
  }, [vinculoConsultorId]);

  const startTrial = useCallback(async () => {
    if (!user) return;
    const until = new Date(); until.setDate(until.getDate() + 14);
    try {
      await db.from("vidaplan_subscriptions").insert({ user_id: user.id, plano: "gold", status: "trial", trial_until: until.toISOString() });
      setStatus("trial"); setTrialUntil(until);
    } catch { /* já possui assinatura */ }
  }, [user?.id]);

  const now = Date.now();
  const trialValid = !!trialUntil && trialUntil.getTime() > now;
  const isPremium = status === "active" || (status === "trial" && trialValid) || premiumViaConsultor;
  const daysLeft = trialUntil ? Math.max(0, Math.ceil((trialUntil.getTime() - now) / 86400000)) : 0;

  return createElement(Ctx.Provider, { value: { loading, status, isPremium, premiumViaConsultor, daysLeft, startTrial, refresh: load } }, children);
};

export const useSubscription = (): SubInfo => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubscription deve ser usado dentro de <SubscriptionProvider>");
  return ctx;
};
