// Proxy seguro do Banco MCP (Open Finance) — multi-tenant.
// - Admin: acesso total à conta Novare (todos os endpoints).
// - Cliente: vê SÓ os bancos ligados a ele (escopado via tabela client_connections).
// - Ação "claim": liga ao cliente o banco que ele acabou de conectar.
// A chave sk_live_ fica na secret BANCO_MCP_KEY (nunca no frontend).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED = new Set([
  "connectors/search","connections/list","connections/status","connections/sync",
  "accounts/list","accounts/detail","accounts/balance","transactions/list",
  "credit-card-bills/list","credit-card-bills/detail","investments/list",
  "investments/transactions/list","loans/list","categories/list",
]);
// Endpoints liberados para CLIENTE (escopados ao banco dele)
const CLIENT_ALLOWED = new Set([
  "connectors/search","connections/list","categories/list",
  "accounts/list","accounts/balance","transactions/list",
  "investments/list","investments/transactions/list",
  "credit-card-bills/list","loans/list",
]);
// Endpoints que NÃO precisam de item (globais / passthrough)
const CLIENT_PASSTHROUGH = new Set(["connectors/search","categories/list"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

let MCP_KEY = "";
async function mcp(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.mcp.ai/api/openfinance/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MCP_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const payload = await res.json().catch(() => ({ error: "resposta inválida do Banco MCP" }));
  return { status: res.status, payload };
}
const arr = (x: any, ...keys: string[]): any[] => {
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x?.[k])) return x[k];
  return [];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Token inválido (auth)" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: roles }, { data: clientRow }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin.from("clients").select("id").eq("user_id", userId).maybeSingle(),
    ]);
    const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    const clientId = clientRow?.id as string | undefined;
    // Escopo por usuário: cliente do app principal (client_connections) OU usuário
    // do Vida Plan self-service (vidaplan_open_finance, chaveado por user_id).
    const scopeTbl = clientId ? "client_connections" : "vidaplan_open_finance";
    const scopeCol = clientId ? "client_id" : "user_id";
    const scopeVal = clientId ? clientId : userId;

    MCP_KEY = Deno.env.get("BANCO_MCP_KEY") || "";
    if (!MCP_KEY) return json({ error: "BANCO_MCP_KEY não configurada nas secrets do Supabase" }, 500);

    const { endpoint, body } = await req.json().catch(() => ({}));

    // ── Ação custom: reivindica o banco recém-conectado (cliente OU Vida Plan) ──
    if (endpoint === "claim") {
      if (isAdmin) return json({ error: "Admin não precisa reivindicar." }, 400);
      const { status: st, payload } = await mcp("connections/list", {});
      // O Banco MCP responde { ok, tool, result: { connections: [...] } } — o dado fica em result.
      const box = (payload as any)?.result ?? payload;
      const conns = arr(box, "connections", "results", "items", "data");
      const itemOf = (c: any) => String(c.item_id || c.id || c.itemId || c.connection_id || "");
      const nameOf = (c: any) => c.connector_name || c.connector_id || c.name || null;

      // O Banco MCP não devolveu nenhuma conexão → mostra o diagnóstico bruto.
      if (!conns.length) {
        const keys = payload && typeof payload === "object" ? Object.keys(payload) : [];
        return json({ result: { claimed: false, message: `Banco MCP não retornou conexões. [diag: http ${st}, keys=${keys.join("|")}, ${JSON.stringify(payload).slice(0, 400)}]` } });
      }

      // O que já pertence a OUTROS usuários (não pode reivindicar); o que já é meu, revalido.
      const [{ data: cc }, { data: vpAll }] = await Promise.all([
        admin.from("client_connections").select("item_id"),
        admin.from("vidaplan_open_finance").select("item_id, user_id"),
      ]);
      const meus = new Set((vpAll || []).filter((r: any) => r.user_id === userId).map((r: any) => String(r.item_id)));
      const deOutros = new Set([
        ...(cc || []).map((r: any) => String(r.item_id)),
        ...(vpAll || []).filter((r: any) => r.user_id !== userId).map((r: any) => String(r.item_id)),
      ]);
      const claimaveis = conns.filter((c: any) => itemOf(c) && !deOutros.has(itemOf(c)));
      if (!claimaveis.length) {
        return json({ result: { claimed: false, message: "As conexões encontradas pertencem a outro usuário. Conecte um banco na sua própria conta." } });
      }

      let salvas = 0;
      for (const c of claimaveis) {
        const id = itemOf(c);
        if (meus.has(id)) { salvas++; continue; } // já é minha, ok
        const row: any = { item_id: id, connector_name: nameOf(c), status: c.status || null };
        row[scopeCol] = scopeVal;
        const { error: insErr } = await admin.from(scopeTbl).insert(row);
        if (insErr) {
          // 23505 = já existe (conflito) → considera conectado; outro erro → devolve pro usuário ver.
          if ((insErr as any).code === "23505") { salvas++; continue; }
          return json({ result: { claimed: false, message: `Erro ao salvar a conexão: ${insErr.message} [${(insErr as any).code || "?"}] tabela=${scopeTbl}` } });
        }
        salvas++;
      }
      return json({ result: { claimed: true, count: salvas } });
    }

    if (typeof endpoint !== "string" || !ALLOWED.has(endpoint)) return json({ error: `Endpoint não permitido: ${endpoint}` }, 400);

    // ── ADMIN: acesso total (conta Novare) ──
    if (isAdmin) {
      const { status, payload } = await mcp(endpoint, body || {});
      return json(payload, status);
    }

    // ── CLIENTE / VIDA PLAN: escopado aos próprios bancos ──
    if (!CLIENT_ALLOWED.has(endpoint)) return json({ error: "Endpoint não disponível" }, 403);

    // Passthrough (busca de conectores, categorias) — não precisa escopar por item.
    if (CLIENT_PASSTHROUGH.has(endpoint)) {
      const { status, payload } = await mcp(endpoint, body || {});
      return json(payload, status);
    }

    const { data: myConns } = await admin.from(scopeTbl).select("item_id, connector_name, status").eq(scopeCol, scopeVal);
    const myItems = (myConns || []).map((c: { item_id: string }) => c.item_id);

    if (endpoint === "connections/list") {
      return json({ result: { connections: (myConns || []).map((c: any) => ({ item_id: c.item_id, connector_name: c.connector_name, status: c.status })), count: myItems.length } });
    }

    // accounts/list, investments/list e transactions/list: chama por item e mescla
    if (!myItems.length) return json({ result: { results: [] } });
    const single = myItems.length === 1;
    const debugOn = !!(body as any)?.debug;
    const merged: any[] = [];
    const debugRaw: any[] = [];
    for (const item of myItems) {
      // Com 1 conexão, a API pede pra NÃO passar item; com várias, passa item_id e item.
      const reqBody: Record<string, unknown> = single ? { ...(body || {}) } : { ...(body || {}), item_id: item, item };
      delete reqBody.debug;
      const { status, payload } = await mcp(endpoint, reqBody);
      const box = (payload as any)?.result ?? payload;
      if (debugOn) debugRaw.push({ item, http: status, keys: box && typeof box === "object" ? Object.keys(box) : [], sample: JSON.stringify(payload).slice(0, 700) });
      arr(box, "accounts", "investments", "transactions", "bills", "loans", "results", "items", "data").forEach((x: any) => merged.push(x));
    }
    if (debugOn) return json({ result: { debug: debugRaw } });
    return json({ result: { results: merged } });
  } catch (e) {
    console.error("openfinance proxy error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
