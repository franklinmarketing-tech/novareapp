// suggest-metas v2 — IA analisa dados completos (onboarding, diagnóstico,
// behavioral_profile, objetivos) e sugere metas inteligentes por item.
//
// Input:  { clientId: string }
// Output: { suggestions: MetaSuggestion[] }

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

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "N/A";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

function isoDateMonthsFromNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 500);

    const serviceClient = createClient(supabaseUrl, serviceRole);
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Valida caller como admin
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: "Token inválido" }, 401);

    const { data: roleRows } = await serviceClient
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roleRows || []).some(
      (r: any) => r.role === "admin" || r.role === "super_admin",
    );
    if (!isAdmin) return json({ error: "Acesso negado" }, 403);

    const { clientId } = await req.json();
    if (!clientId) return json({ error: "clientId obrigatório" }, 400);

    // Carrega todos os dados do cliente em paralelo
    const [
      clientRes, incomeRes, expensesRes, debtsRes,
      assetsRes, goalsRes, insuranceRes, diagnosisRes,
    ] = await Promise.all([
      serviceClient.from("clients").select("*").eq("id", clientId).maybeSingle(),
      serviceClient.from("income").select("*").eq("client_id", clientId),
      serviceClient.from("expenses").select("*").eq("client_id", clientId),
      serviceClient.from("debts").select("*").eq("client_id", clientId),
      serviceClient.from("assets").select("*").eq("client_id", clientId),
      serviceClient.from("goals").select("*").eq("client_id", clientId).order("priority"),
      serviceClient.from("insurance").select("*").eq("client_id", clientId),
      serviceClient.from("diagnosis").select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle(),
    ]);

    const client = clientRes.data;
    if (!client) return json({ error: "Cliente não encontrado" }, 404);

    const income    = incomeRes.data    || [];
    const expenses  = expensesRes.data  || [];
    const debts     = debtsRes.data     || [];
    const assets    = assetsRes.data    || [];
    const goals     = goalsRes.data     || [];
    const insurance = insuranceRes.data || [];
    const diagnosis = diagnosisRes.data;

    // Métricas calculadas
    const totalIncome = income.reduce((s: number, r: any) => {
      const a = Number(r.amount || 0);
      return s + (r.frequency === "anual" ? a / 12 : a);
    }, 0);
    const totalExpenses        = expenses.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const totalDebts           = debts.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const totalAssets          = assets.reduce((s: number, r: any) => s + Number(r.estimated_value || 0), 0);
    const monthlyDebtPayments  = debts.reduce((s: number, r: any) => s + Number(r.monthly_payment || 0), 0);
    const monthlySavings       = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate          = totalIncome > 0 ? (monthlySavings / totalIncome) * 100 : 0;
    const debtRatio            = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
    const emergencyMonths      = totalExpenses > 0 ? totalAssets / totalExpenses : 0;

    // Idade
    const age = client.date_of_birth
      ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Perfil comportamental
    const bp = client.behavioral_profile as any;
    const bpLines = bp ? [
      bp.spending_profile    ? `Perfil de gastos: ${bp.spending_profile}` : null,
      bp.investment_profile  ? `Perfil investidor: ${bp.investment_profile}` : null,
      bp.financial_knowledge ? `Conhecimento financeiro: ${bp.financial_knowledge}` : null,
      bp.main_concern        ? `Principal preocupação: ${bp.main_concern}` : null,
      bp.financial_goal      ? `Objetivo declarado: ${bp.financial_goal}` : null,
      bp.risk_tolerance      ? `Tolerância a risco: ${bp.risk_tolerance}` : null,
    ].filter(Boolean).join(" | ") : "Não informado";

    // Contexto completo para a IA
    const context = `
=== PERFIL DO CLIENTE ===
Nome: ${client.full_name || "N/A"}
Idade: ${age ? `${age} anos` : "N/A"} | Profissão: ${client.profession || "N/A"} (${client.years_in_profession ?? "?"} anos na área)
Estado civil: ${client.marital_status || "N/A"} | Dependentes: ${client.dependents_count ?? 0}
Perfil comportamental: ${bpLines}

=== INDICADORES FINANCEIROS ===
Renda líquida mensal: ${fmtBRL(totalIncome)}
Despesas mensais: ${fmtBRL(totalExpenses)} (${totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : "?"}% da renda)
Parcelas de dívidas: ${fmtBRL(monthlyDebtPayments)}/mês (${Math.round(debtRatio)}% da renda)
Capacidade de poupança: ${fmtBRL(Math.max(0, monthlySavings))}/mês (${Math.round(Math.max(0, savingsRate))}% da renda)
Patrimônio total: ${fmtBRL(totalAssets)} | Dívidas totais: ${fmtBRL(totalDebts)}
Patrimônio líquido: ${fmtBRL(totalAssets - totalDebts)}
Reserva de emergência atual: ${emergencyMonths.toFixed(1)} meses de despesas

=== DIAGNÓSTICO SALVO ===
${diagnosis
  ? `Risco: ${diagnosis.risk_classification || "N/A"} | Capacidade de poupança registrada: ${diagnosis.savings_capacity != null ? fmtBRL(Number(diagnosis.savings_capacity)) : "N/A"} | Notas: ${diagnosis.notes || "Nenhuma"}`
  : "Nenhum diagnóstico registrado"}

=== RENDAS ===
${income.map((r: any) => `[ID:${r.id}] ${r.description}: ${fmtBRL(Number(r.amount))}/${r.frequency || "mensal"} · estabilidade ${r.stability}${r.is_primary ? " · PRINCIPAL" : ""}`).join("\n") || "Nenhuma"}

=== DESPESAS ===
${expenses.map((r: any) => `[ID:${r.id}] ${r.category}${r.description ? " — " + r.description : ""}: ${fmtBRL(Number(r.amount))}/mês · ${r.is_fixed ? "fixa" : "variável"}`).join("\n") || "Nenhuma"}

=== DÍVIDAS ===
${debts.map((r: any) => {
  const saldo = Number(r.total_amount || 0);
  const parcela = Number(r.monthly_payment || 0);
  const mesesRestantes = r.remaining_months ?? (parcela > 0 ? Math.ceil(saldo / parcela) : null);
  return `[ID:${r.id}] ${r.type}${r.creditor ? ` (${r.creditor})` : ""}: saldo ${fmtBRL(saldo)} · parcela ${fmtBRL(parcela)}/mês · juros ${r.interest_rate || 0}%/mês · ${mesesRestantes ? mesesRestantes + " meses para quitar" : "prazo não informado"}`;
}).join("\n") || "Nenhuma"}

=== PATRIMÔNIO ===
${assets.map((r: any) => `[ID:${r.id}] ${r.type}${r.description ? " — " + r.description : ""}: ${fmtBRL(Number(r.estimated_value))}`).join("\n") || "Nenhum"}

=== SEGUROS ===
${insurance.map((r: any) => `[ID:${r.id}] ${r.type}${r.provider ? ` (${r.provider})` : ""}: prêmio ${fmtBRL(Number(r.monthly_premium || 0))}/mês · cobertura ${fmtBRL(Number(r.coverage_amount || 0))}`).join("\n") || "Nenhum"}

=== OBJETIVOS DO CLIENTE ===
${goals.map((r: any) => `[ID:${r.id}] ${r.description}: meta ${fmtBRL(Number(r.target_amount || 0))} · prazo ${fmtDate(r.deadline)} · prioridade ${r.priority || "N/A"}`).join("\n") || "Nenhum"}
`.trim();

    // Lista de itens com instrução específica por tipo
    const items: Array<{
      source_table: string; source_id: string;
      source_label: string; current_value: number;
      type_hint: string;
    }> = [
      ...income.map((r: any) => ({
        source_table: "income", source_id: r.id,
        source_label: r.description,
        current_value: Number(r.amount),
        type_hint: `RENDA — meta é AUMENTAR ou DIVERSIFICAR. target_value = valor mensal alvo (MAIOR que ${fmtBRL(Number(r.amount))}). direction = "increase". Considere estabilidade "${r.stability}" e potencial da profissão.`,
      })),
      ...expenses.map((r: any) => ({
        source_table: "expenses", source_id: r.id,
        source_label: `${r.category}${r.description ? " — " + r.description : ""}`,
        current_value: Number(r.amount),
        type_hint: `DESPESA — meta é REDUZIR ou MANTER. target_value = valor mensal alvo (MENOR OU IGUAL a ${fmtBRL(Number(r.amount))}). direction = "reduce" se há margem de corte, "maintain" se já está controlada.`,
      })),
      ...debts.map((r: any) => ({
        source_table: "debts", source_id: r.id,
        source_label: `${r.type}${r.creditor ? ` — ${r.creditor}` : ""}`,
        current_value: Number(r.total_amount),
        type_hint: `DÍVIDA — meta é QUITAR ou REDUZIR o saldo devedor. target_value = saldo alvo em R$ (0 para quitação total, ou valor reduzido). direction = "eliminate" se quitação é viável, "reduce" caso contrário. Capacidade de poupança: ${fmtBRL(Math.max(0, monthlySavings))}/mês. Calcule prazo realista.`,
      })),
      ...assets.map((r: any) => ({
        source_table: "assets", source_id: r.id,
        source_label: `${r.type}${r.description ? " — " + r.description : ""}`,
        current_value: Number(r.estimated_value),
        type_hint: `PATRIMÔNIO — meta é CRESCER ou PROTEGER. target_value = valor patrimonial alvo. direction = "increase" ou "maintain".`,
      })),
      ...insurance.map((r: any) => ({
        source_table: "insurance", source_id: r.id,
        source_label: `${r.type}${r.provider ? ` — ${r.provider}` : ""}`,
        current_value: Number(r.monthly_premium || 0),
        type_hint: `SEGURO — avaliar se cobertura é adequada. target_value = cobertura ideal em R$ (não o prêmio). direction = "increase" se cobertura está baixa, "maintain" se adequada.`,
      })),
      ...goals.map((r: any) => ({
        source_table: "goals", source_id: r.id,
        source_label: r.description,
        current_value: Number(r.target_amount || 0),
        type_hint: `OBJETIVO — meta é ESTRATÉGIA para atingir. target_value = ${fmtBRL(Number(r.target_amount || 0))} (confirmar ou ajustar). direction = "increase". Prazo declarado: ${fmtDate(r.deadline)}. Com poupança de ${fmtBRL(Math.max(0, monthlySavings))}/mês, calcule se é atingível.`,
      })),
    ];

    if (items.length === 0) return json({ error: "Cliente sem dados financeiros" }, 400);

    const itemsList = items.map((it, i) =>
      `${i + 1}. [${it.source_table}|${it.source_id}] "${it.source_label}"\n   Valor atual: ${fmtBRL(it.current_value)}\n   INSTRUÇÃO: ${it.type_hint}`,
    ).join("\n\n");

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro especializado em planejamento financeiro pessoal.
Analise TODOS os dados abaixo e gere metas financeiras inteligentes, personalizadas e realistas para cada item.

DADOS COMPLETOS DO CLIENTE:
${context}

REGRAS OBRIGATÓRIAS:
1. Para DÍVIDAS: a meta é sempre QUITAR ou REDUZIR o saldo. target_value deve ser ≤ ao saldo atual (idealmente 0).
   - Use direction = "eliminate" quando quitação total for viável no prazo sugerido
   - Use direction = "reduce" quando só for possível reduzir parcialmente
   - Mencione no texto: saldo atual, quanto pretende reduzir, e quando
2. Para DESPESAS: a meta é REDUZIR ou MANTER. target_value ≤ valor atual.
   - Identifique onde há "gordura" vs. despesas essenciais
3. Para RENDAS: meta é CRESCER. target_value > valor atual.
4. Para PATRIMÔNIO e OBJETIVOS: meta é ACUMULAR. Calcule prazo com base na capacidade de poupança.
5. suggestion_text: 1-2 frases específicas com valores em R$ e prazo. Ex: "Quitar o financiamento imobiliário reduzindo o saldo de R$ 180.000 para zero adiantando R$ 500/mês — previsão: dez/2030."
6. target_value: número obrigatório. Representa o RESULTADO a atingir (não o esforço mensal).
7. suggested_prazo: data ISO YYYY-MM-DD estimada. Calcule com base nos números reais.
8. Leve em conta o perfil comportamental, os objetivos declarados e o diagnóstico para priorizar.`;

    const toolSchema = {
      type: "function" as const,
      function: {
        name: "return_meta_suggestions",
        description: "Retorna sugestões de meta para cada item financeiro do cliente",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source_table: {
                    type: "string",
                    enum: ["income", "expenses", "debts", "assets", "insurance", "goals"],
                  },
                  source_id: { type: "string" },
                  suggestion_text: {
                    type: "string",
                    description: "Meta específica com valor R$ e prazo. 1-2 frases motivadoras.",
                  },
                  target_value: {
                    type: "number",
                    description: "Valor alvo numérico. Para dívidas = saldo alvo (≥0). Para despesas = valor mensal alvo. Para renda/ativos = valor alvo.",
                  },
                  suggested_prazo: {
                    type: "string",
                    description: "Data ISO YYYY-MM-DD estimada para atingir a meta",
                  },
                  direction: {
                    type: "string",
                    enum: ["increase", "reduce", "eliminate", "maintain"],
                    description: "increase=crescer, reduce=reduzir, eliminate=quitar/zerar, maintain=manter",
                  },
                },
                required: ["source_table", "source_id", "suggestion_text", "target_value", "direction"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Gere metas para todos os ${items.length} itens financeiros abaixo:\n\n${itemsList}`,
          },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "return_meta_suggestions" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[suggest-metas] OpenAI error:", aiResp.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* noop */ }
      return json({ error: `OpenAI ${aiResp.status}: ${detail}` }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[suggest-metas] No tool_call in response", JSON.stringify(aiData));
      return json({ error: "IA não retornou sugestões" }, 500);
    }

    const result = JSON.parse(toolCall.function.arguments);
    const suggestions = result.suggestions || [];

    console.log(`[suggest-metas] OK — ${suggestions.length} sugestões para cliente ${clientId}`);
    return json({ success: true, suggestions });
  } catch (err) {
    console.error("[suggest-metas]", err);
    return json({ error: String(err) }, 500);
  }
});
