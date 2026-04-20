import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sem autorização" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuper) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const clientId = String(body.client_id ?? "");
    if (!clientId) return json({ error: "client_id obrigatório" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const tables = ["clients", "income", "expenses", "debts", "assets", "insurance", "goals",
      "action_plans", "action_items", "diagnosis", "consultant_notes",
      "monitoring_snapshots", "investment_recommendations", "implementation_sessions"];

    const result: Record<string, any> = { exported_at: new Date().toISOString(), client_id: clientId };

    for (const t of tables) {
      if (t === "action_items") {
        const { data: plans } = await admin.from("action_plans").select("id").eq("client_id", clientId);
        const planIds = (plans ?? []).map((p) => p.id);
        const { data } = await admin.from("action_items").select("*").in("action_plan_id", planIds.length ? planIds : ["00000000-0000-0000-0000-000000000000"]);
        result[t] = data ?? [];
      } else {
        const { data } = await admin.from(t).select("*").eq("client_id", clientId);
        result[t] = data ?? [];
      }
    }

    // log
    await admin.from("system_backups").insert({
      requested_by: user.id, scope: `client:${clientId}`, format: "json",
      status: "completed", completed_at: new Date().toISOString(),
    });

    return json(result);
  } catch (e: any) {
    return json({ error: e.message ?? "Erro" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
