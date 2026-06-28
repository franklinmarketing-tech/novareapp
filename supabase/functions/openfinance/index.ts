// Proxy seguro para a API REST do Banco MCP (Open Finance Brasil).
// A chave sk_live_ fica como secret (BANCO_MCP_KEY) e NUNCA vai ao frontend.
// Apenas admins autenticados podem chamar. Encaminha para
// https://api.mcp.ai/api/openfinance/<endpoint> com Authorization: Bearer.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowlist de endpoints de LEITURA (e o connect via search). Nada destrutivo
// exposto além do mínimo necessário.
const ALLOWED = new Set([
  "connectors/search",
  "connections/list",
  "connections/status",
  "connections/sync",
  "accounts/list",
  "accounts/detail",
  "accounts/balance",
  "transactions/list",
  "credit-card-bills/list",
  "credit-card-bills/detail",
  "investments/list",
  "investments/transactions/list",
  "loans/list",
  "categories/list",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // getUser valida o token no servidor de auth (robusto p/ qualquer chave de assinatura)
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Token inválido (auth)" }, 401);
    const userId = userData.user.id;

    // Exige papel admin/super_admin (a conexão é da conta Novare)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Acesso restrito a administradores" }, 403);

    const key = Deno.env.get("BANCO_MCP_KEY");
    if (!key) return json({ error: "BANCO_MCP_KEY não configurada nas secrets do Supabase" }, 500);

    const { endpoint, body } = await req.json().catch(() => ({}));
    if (typeof endpoint !== "string" || !ALLOWED.has(endpoint)) {
      return json({ error: `Endpoint não permitido: ${endpoint}` }, 400);
    }

    const res = await fetch(`https://api.mcp.ai/api/openfinance/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const payload = await res.json().catch(() => ({ error: "resposta inválida do Banco MCP" }));
    return json(payload, res.status);
  } catch (e) {
    console.error("openfinance proxy error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
