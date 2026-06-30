// Webhook de cobrança do PLANO CONSULTOR (white-label SaaS) — Hotmart / Kiwify / genérico.
// Ativa/desativa `vidaplan_consultores.plano_status` após a compra do consultor.
// Segurança: ?token=<VIDAPLAN_WEBHOOK_SECRET>. Casa por user_id (tracking do checkout) ou e-mail.
// Observação: só ATUALIZA consultores que já existem (que já criaram o código/iniciaram o teste).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const APROVA = /aprov|approved|complete|active|paid|purchase_complete|subscription_active/i;
const CANCELA = /cancel|refund|chargeback|expired|overdue|inactive|subscription_canceled/i;

const deep = (obj: any, keys: string[]): any => {
  for (const k of keys) {
    const parts = k.split(".");
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    if (cur != null && cur !== "") return cur;
  }
  return undefined;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const secret = Deno.env.get("VIDAPLAN_WEBHOOK_SECRET") || "";
    const token = url.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
    if (!secret || token !== secret) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));

    const rawStatus = String(
      deep(body, ["status", "event", "data.purchase.status", "data.status", "type", "webhook_event_type"]) || "",
    );
    const ativar = APROVA.test(rawStatus);
    const desativar = CANCELA.test(rawStatus);
    if (!ativar && !desativar) return json({ ok: true, ignored: true, rawStatus });

    let userId = deep(body, ["user_id", "data.purchase.tracking.source", "sck", "src", "data.tracking.source"]);
    const email = deep(body, ["email", "data.buyer.email", "buyer.email", "customer.email", "data.subscriber.email"]);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!userId && email) {
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const u = data?.users?.find((x: any) => (x.email || "").toLowerCase() === String(email).toLowerCase());
        if (u) userId = u.id;
        if (!data?.users?.length) break;
      }
    }
    if (!userId) return json({ ok: true, matched: false, email });

    const plano_status = ativar ? "active" : "inactive";
    const { data, error } = await admin
      .from("vidaplan_consultores")
      .update({ plano_status, updated_at: new Date().toISOString() })
      .eq("consultor_id", userId)
      .select("consultor_id");
    if (error) throw error;

    // Sem linha = consultor ainda não criou o código. Reporta para o painel do provedor de pagamento.
    return json({ ok: true, userId, plano_status, atualizado: (data?.length ?? 0) > 0 });
  } catch (e) {
    console.error("vidaplan-consultor-webhook error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
