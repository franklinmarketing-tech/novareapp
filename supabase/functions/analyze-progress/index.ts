// V9: Acompanhamento — IA analisa pareceres + acoes + dados atuais
// e retorna uma timeline de evolucoes/atencoes/proximos passos.
//
// Input:  { clientId }
// Output: { insights: Array<{ kind, title, description, financial_impact?, source_label? }> }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTH ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INPUT ──
    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.clientId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Coleta dados ──
    const sinceDate = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const [
      pareceresRes,
      planRes,
      snapshotsRes,
      incomeRes,
      expensesRes,
      debtsRes,
      assetsRes,
      goalsRes,
    ] = await Promise.all([
      serviceClient
        .from("consultant_notes")
        .select("id, title, content, snapshots, created_at, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(5),
      serviceClient
        .from("action_plans")
        .select("id, objective, applied_variant, applied_at")
        .eq("client_id", clientId)
        .maybeSingle(),
      serviceClient
        .from("monitoring_snapshots")
        .select("snapshot_date, total_income, total_expenses, total_assets, total_debts, savings_rate")
        .eq("client_id", clientId)
        .gte("snapshot_date", sinceDate)
        .order("snapshot_date", { ascending: true }),
      serviceClient.from("income").select("amount, frequency").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount").eq("client_id", clientId),
      serviceClient.from("debts").select("total_amount, monthly_payment").eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
    ]);

    const pareceres = pareceresRes.data || [];
    const plan = planRes.data;
    const snapshots = snapshotsRes.data || [];
    const goals = goalsRes.data || [];

    // Acoes concluidas recentemente
    let recentActions: any[] = [];
    if (plan?.id) {
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await serviceClient
        .from("action_items")
        .select("description, area, financial_impact, status, updated_at, objective")
        .eq("action_plan_id", plan.id)
        .gte("updated_at", since)
        .order("updated_at", { ascending: false });
      recentActions = data || [];
    }

    // Totais atuais
    const totalIncome = (incomeRes.data || []).reduce((s, r) => {
      const a = Number(r.amount) || 0;
      return s + (r.frequency === "anual" ? a / 12 : a);
    }, 0);
    const totalExpenses = (expensesRes.data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const monthlyDebtPayments = (debtsRes.data || []).reduce((s, r) => s + (Number(r.monthly_payment) || 0), 0);
    const totalDebts = (debtsRes.data || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const totalAssets = (assetsRes.data || []).reduce((s, r) => s + (Number(r.estimated_value) || 0), 0);
    const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

    const stripHtml = (html: string) =>
      html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const pareceresText = pareceres
      .map((p, i) => {
        const text = stripHtml(p.content || "").slice(0, 1500);
        const snapsCount = Array.isArray(p.snapshots) ? (p.snapshots as any[]).length : 0;
        return `[Parecer ${i + 1} · ${p.updated_at?.slice(0, 10)} · "${p.title || "sem título"}"]
${text}${snapsCount > 0 ? `\n(${snapsCount} referências do onboarding inseridas pelo consultor)` : ""}`;
      })
      .join("\n\n---\n\n");

    const completedActions = recentActions.filter((a) => a.status === "concluido");

    const snapshotsContext =
      snapshots.length >= 2
        ? snapshots
            .map(
              (s) =>
                `${s.snapshot_date}: renda R$ ${Number(s.total_income || 0).toFixed(0)}, despesas R$ ${Number(s.total_expenses || 0).toFixed(0)}, dívidas R$ ${Number(s.total_debts || 0).toFixed(0)}, patrimônio R$ ${Number(s.total_assets || 0).toFixed(0)}`,
            )
            .join("\n")
        : "(sem histórico suficiente para comparar)";

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro. Sua função é olhar a evolução do cliente nos últimos 60-90 dias e extrair um diagnóstico curto, factual e acionável da progressão.

Você deve retornar SOMENTE via a função return_insights, com 3 a 8 insights distribuídos entre:
- "evolution" — algo que mudou para melhor (ex: dívida reduzida, renda aumentou, ação concluída)
- "attention" — algo que precisa de atenção (ex: despesa subiu, ação parada, prazo se aproximando)
- "next_step" — próximo passo concreto recomendado para o consultor

REGRAS:
1. Cada insight DEVE citar dados reais (valores, datas, ações específicas) — nunca genérico
2. Em "evolution", cite a comparação numérica quando possível (de X para Y)
3. financial_impact é positivo para ganho mensal estimado, negativo para perda; deixe 0 se não se aplica
4. source_label é uma referência curta tipo "Parecer 10/05" ou "Ação concluída: ..." que ajuda o consultor a localizar a origem do insight
5. Priorize itens com maior impacto financeiro

================
SITUAÇÃO ATUAL DO CLIENTE:
- Renda mensal: R$ ${totalIncome.toFixed(0)}
- Despesas mensais: R$ ${totalExpenses.toFixed(0)}
- Parcelas de dívidas: R$ ${monthlyDebtPayments.toFixed(0)}
- Saldo mensal: R$ ${netCashFlow.toFixed(0)} (taxa de poupança ${savingsRate.toFixed(0)}%)
- Patrimônio total: R$ ${totalAssets.toFixed(0)}
- Dívidas totais: R$ ${totalDebts.toFixed(0)}
- Patrimônio líquido: R$ ${(totalAssets - totalDebts).toFixed(0)}

PLANO EM ANDAMENTO:
${
  plan?.objective
    ? `- Variante: Plano ${plan.applied_variant || "?"}\n- Objetivo: ${plan.objective}\n- Aplicado em: ${plan.applied_at?.slice(0, 10) || "?"}`
    : "- Nenhum plano aplicado"
}

OBJETIVOS DO CLIENTE:
${goals.map((g) => `- ${g.description} (alvo: R$ ${Number(g.target_amount || 0).toFixed(0)}, prazo: ${g.deadline || "N/A"})`).join("\n") || "- Sem objetivos cadastrados"}

AÇÕES CONCLUÍDAS NOS ÚLTIMOS 60 DIAS (${completedActions.length}):
${
  completedActions
    .map(
      (a) =>
        `- ${a.description}${a.financial_impact ? ` (impacto: R$ ${Number(a.financial_impact).toFixed(0)}/mês)` : ""}`,
    )
    .join("\n") || "- Nenhuma"
}

EVOLUÇÃO DOS SNAPSHOTS (últimos 90 dias):
${snapshotsContext}

PARECERES TÉCNICOS RECENTES (${pareceres.length}):
${pareceresText || "(nenhum parecer registrado)"}

================
Retorne os insights ordenados por relevância. Use a função return_insights.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analise a progressão do cliente e gere os insights." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_insights",
              description: "Returns timeline of progress insights for the client",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    minItems: 3,
                    maxItems: 8,
                    items: {
                      type: "object",
                      properties: {
                        kind: { type: "string", enum: ["evolution", "attention", "next_step"] },
                        title: { type: "string", description: "Frase curta resumindo o insight" },
                        description: { type: "string", description: "Explicação detalhada citando dados reais" },
                        financial_impact: { type: "number" },
                        source_label: {
                          type: "string",
                          description: "Referência curta tipo 'Parecer 10/05' ou 'Ação X'",
                        },
                      },
                      required: ["kind", "title", "description", "financial_impact"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-progress error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
