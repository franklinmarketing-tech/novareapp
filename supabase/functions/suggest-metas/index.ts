// suggest-metas — IA analisa os dados financeiros do cliente e sugere
// uma meta para cada item (renda, despesa, dívida, ativo, objetivo).
//
// Input:  { clientId: string }
// Output: { suggestions: MetaSuggestion[] }
//   MetaSuggestion { source_table, source_id, source_label, suggestion_text, target_value? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("[suggest-metas] OPENAI_API_KEY ausente");
      return json({ error: "OPENAI_API_KEY não configurada" }, 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRole);
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Valida admin
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: "Token inválido" }, 401);

    const { data: roleRows } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Acesso negado" }, 403);

    const { clientId } = await req.json();
    if (!clientId) return json({ error: "clientId obrigatório" }, 400);

    // Carrega todos os dados financeiros do cliente
    const [
      clientRes,
      incomeRes,
      expensesRes,
      debtsRes,
      assetsRes,
      goalsRes,
    ] = await Promise.all([
      serviceClient.from("clients").select("*").eq("id", clientId).maybeSingle(),
      serviceClient.from("income").select("*").eq("client_id", clientId),
      serviceClient.from("expenses").select("*").eq("client_id", clientId),
      serviceClient.from("debts").select("*").eq("client_id", clientId),
      serviceClient.from("assets").select("*").eq("client_id", clientId),
      serviceClient.from("goals").select("*").eq("client_id", clientId),
    ]);

    // Insurance é opcional — tabela pode não existir ainda
    const insuranceRes = await serviceClient.from("insurance").select("*").eq("client_id", clientId);

    const client    = clientRes.data;
    const income    = incomeRes.data    || [];
    const expenses  = expensesRes.data  || [];
    const debts     = debtsRes.data     || [];
    const assets    = assetsRes.data    || [];
    const insurance = insuranceRes.data || [];
    const goals     = goalsRes.data     || [];

    if (!client) return json({ error: "Cliente não encontrado" }, 404);

    // Monta contexto para a IA
    const totalIncome = (income || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const totalExpenses = (expenses || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const totalDebts = (debts || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const totalAssets = (assets || []).reduce((s: number, r: any) => s + Number(r.estimated_value || 0), 0);

    const formatBRL = (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const context = `
Cliente: ${client.full_name || "N/A"}
Profissão: ${client.profession || "N/A"} | Estado civil: ${client.marital_status || "N/A"} | Dependentes: ${client.dependents_count ?? 0}

RENDAS (total mensal: ${formatBRL(totalIncome)}):
${(income || []).map((r: any) => `- ${r.description}: ${formatBRL(Number(r.amount))} (${r.frequency}, estabilidade: ${r.stability})`).join("\n") || "Nenhuma"}

DESPESAS (total mensal: ${formatBRL(totalExpenses)}):
${(expenses || []).map((r: any) => `- ${r.category}${r.description ? " — " + r.description : ""}: ${formatBRL(Number(r.amount))} (${r.is_fixed ? "fixa" : "variável"})`).join("\n") || "Nenhuma"}

DÍVIDAS (total: ${formatBRL(totalDebts)}):
${(debts || []).map((r: any) => `- ${r.type} (${r.creditor || "N/A"}): total ${formatBRL(Number(r.total_amount))}, parcela ${formatBRL(Number(r.monthly_payment || 0))}/mês, juros ${r.interest_rate || 0}%/mês`).join("\n") || "Nenhuma"}

PATRIMÔNIO (total: ${formatBRL(totalAssets)}):
${(assets || []).map((r: any) => `- ${r.type}: ${r.description || ""} — ${formatBRL(Number(r.estimated_value))}`).join("\n") || "Nenhum"}

SEGUROS:
${(insurance || []).map((r: any) => `- ${r.type}${r.provider ? ` (${r.provider})` : ""}: prêmio ${formatBRL(Number(r.monthly_premium || 0))}/mês, cobertura ${formatBRL(Number(r.coverage_amount || 0))}`).join("\n") || "Nenhum"}

OBJETIVOS:
${(goals || []).map((r: any) => `- ${r.description}: meta ${formatBRL(Number(r.target_amount || 0))}, prazo ${r.deadline || "N/A"}, prioridade ${r.priority}`).join("\n") || "Nenhum"}

Capacidade de poupança: ${formatBRL(totalIncome - totalExpenses)}/mês
`.trim();

    // Monta lista de itens para a IA sugerir metas
    const items: { source_table: string; source_id: string; source_label: string; current_value: number }[] = [
      ...(income || []).map((r: any) => ({ source_table: "income", source_id: r.id, source_label: r.description, current_value: Number(r.amount) })),
      ...(expenses || []).map((r: any) => ({ source_table: "expenses", source_id: r.id, source_label: r.category + (r.description ? ` — ${r.description}` : ""), current_value: Number(r.amount) })),
      ...(debts || []).map((r: any) => ({ source_table: "debts", source_id: r.id, source_label: `${r.type} (${r.creditor || "N/A"})`, current_value: Number(r.total_amount) })),
      ...(assets || []).map((r: any) => ({ source_table: "assets", source_id: r.id, source_label: `${r.type}: ${r.description || ""}`, current_value: Number(r.estimated_value) })),
      ...(insurance || []).map((r: any) => ({ source_table: "insurance", source_id: r.id, source_label: `${r.type}${r.provider ? ` (${r.provider})` : ""}`, current_value: Number(r.monthly_premium || 0) })),
      ...(goals || []).map((r: any) => ({ source_table: "goals", source_id: r.id, source_label: r.description, current_value: Number(r.target_amount || 0) })),
    ];

    const itemsList = items.map((it, i) => `${i + 1}. [${it.source_table}|${it.source_id}] ${it.source_label}: valor atual ${formatBRL(it.current_value)}`).join("\n");

    const prompt = `Você é um consultor financeiro especialista. Analise os dados financeiros abaixo e sugira uma meta objetiva e realista para cada item listado.

DADOS DO CLIENTE:
${context}

ITENS PARA SUGERIR METAS (responda APENAS o JSON, sem markdown):
${itemsList}

Responda com um array JSON no formato:
[
  {
    "source_table": "income|expenses|debts|assets|goals",
    "source_id": "<uuid>",
    "suggestion_text": "Meta clara e motivadora em 1-2 frases. Ex: Aumentar renda para R$ 6.000/mês em 6 meses através de...",
    "target_value": 6000
  }
]

Regras:
- suggestion_text deve ser direto, motivador e com prazo realista
- target_value é opcional (número), preencha quando a meta tiver valor monetário claro
- Para despesas: sugira redução ou manutenção
- Para dívidas: sugira quitação com prazo
- Para renda: sugira crescimento ou diversificação
- Para patrimônio: sugira crescimento ou proteção
- Para objetivos: sugira estratégia para atingir
- Responda APENAS o JSON, sem texto adicional`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error("[suggest-metas] OpenAI error:", aiResp.status, err);
      let detail = "";
      try { detail = JSON.parse(err)?.error?.message || err; } catch { detail = err; }
      return json({ error: `OpenAI ${aiResp.status}: ${detail}` }, 500);
    }

    const aiData = await aiResp.json();
    const rawText = aiData.choices?.[0]?.message?.content || "[]";

    let suggestions: unknown[] = [];
    try {
      suggestions = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) suggestions = JSON.parse(match[0]);
    }

    return json({ success: true, suggestions });
  } catch (err) {
    console.error("[suggest-metas]", err);
    return json({ error: String(err) }, 500);
  }
});
