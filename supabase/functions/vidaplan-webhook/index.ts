// Webhook de pagamento do Novare Vida Plan (Hotmart / Kiwify / genérico).
// Ativa ou desativa a assinatura GOLD automaticamente após a compra.
// Segurança: ?token=<VIDAPLAN_WEBHOOK_SECRET>. Ativa por user_id (de preferência,
// vindo do parâmetro de rastreio do checkout) ou, na falta dele, pelo e-mail.

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

    // Status do evento
    const rawStatus = String(
      deep(body, ["status", "event", "data.purchase.status", "data.status", "type", "webhook_event_type"]) || "",
    );
    const ativar = APROVA.test(rawStatus);
    const desativar = CANCELA.test(rawStatus);
    if (!ativar && !desativar) return json({ ok: true, ignored: true, rawStatus });

    // Identificação do comprador
    let userId = deep(body, ["user_id", "data.purchase.tracking.source", "sck", "src", "data.tracking.source"]);
    const email = deep(body, ["email", "data.buyer.email", "buyer.email", "customer.email", "data.subscriber.email"]);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!userId && email) {
      // Procura o usuário pelo e-mail (algumas páginas).
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const u = data?.users?.find((x: any) => (x.email || "").toLowerCase() === String(email).toLowerCase());
        if (u) userId = u.id;
        if (!data?.users?.length) break;
      }
    }
    if (!userId) return json({ ok: true, matched: false, email });

    const plano = ativar ? "gold" : "free";
    const status = ativar ? "active" : "inactive";
    await admin.from("vidaplan_subscriptions").upsert({
      user_id: userId, plano, status, updated_at: new Date().toISOString(),
    });

    return json({ ok: true, userId, status });
  } catch (e) {
    console.error("vidaplan-webhook error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
