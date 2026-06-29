// Estado da assinatura do usuário (free / trial / gold) — provider único.
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as unknown as { from: (t: string) => any };

export type SubStatus = "inactive" | "trial" | "active";

export interface SubInfo {
  loading: boolean;
  status: SubStatus;
  isPremium: boolean;
  daysLeft: number;
  startTrial: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubInfo | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubStatus>("inactive");
  const [trialUntil, setTrialUntil] = useState<Date | null>(null);

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
  const isPremium = status === "active" || (status === "trial" && trialValid);
  const daysLeft = trialUntil ? Math.max(0, Math.ceil((trialUntil.getTime() - now) / 86400000)) : 0;

  return createElement(Ctx.Provider, { value: { loading, status, isPremium, daysLeft, startTrial, refresh: load } }, children);
};

export const useSubscription = (): SubInfo => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubscription deve ser usado dentro de <SubscriptionProvider>");
  return ctx;
};
