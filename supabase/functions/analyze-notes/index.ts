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
    // ── AUTH: Verify caller is authenticated ──
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

    // ── AUTH: Verify caller is admin ──
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

    // ── INPUT VALIDATION ──
    const { content, clientId, snapshots: rawSnapshots } = await req.json();
    if (!clientId || typeof clientId !== "string" || clientId.length > 100) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId deve ser um UUID válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (content && typeof content === "string" && content.length > 10000) {
      return new Response(JSON.stringify({ error: "Conteúdo muito longo (máx 10.000 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // V9: snapshots = referencias do onboarding marcadas pelo consultor no parecer
    const snapshots: Array<{
      chipId?: string;
      source?: string;
      kind?: string;
      label?: string;
      value?: number;
      meta?: Record<string, unknown>;
    }> = Array.isArray(rawSnapshots) ? rawSnapshots.slice(0, 60) : [];

    // Fetch client financial summary using service role
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [incomeRes, expensesRes, debtsRes, assetsRes, goalsRes, insuranceRes, diagRes] = await Promise.all([
      serviceClient.from("income").select("amount, description, frequency").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount, category, is_fixed").eq("client_id", clientId),
      serviceClient.from("debts").select("total_amount, type, monthly_payment, interest_rate, remaining_months, creditor").eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value, type, description").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      serviceClient.from("insurance").select("type, monthly_premium, coverage_amount, provider").eq("client_id", clientId),
      serviceClient.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
    ]);

    const incomes = incomeRes.data || [];
    const expenses = expensesRes.data || [];
    const debts = debtsRes.data || [];
    const assets = assetsRes.data || [];
    const goals = goalsRes.data || [];
    const insurance = insuranceRes.data || [];
    const diagnosis = diagRes.data;

    const totalIncome = incomes.reduce((s, i) => {
      const amt = Number(i.amount);
      return s + (i.frequency === "anual" ? amt / 12 : amt);
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalDebts = debts.reduce((s, d) => s + Number(d.total_amount), 0);
    const totalAssets = assets.reduce((s, a) => s + Number(a.estimated_value), 0);
    const monthlyDebtPayments = debts.reduce((s, d) => s + Number(d.monthly_payment || 0), 0);
    const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome * 100) : 0;

    const financialSummary = `
RESUMO FINANCEIRO COMPLETO DO CLIENTE:

📊 VISÃO GERAL:
- Renda total mensal: R$ ${totalIncome.toFixed(2)}
- Despesas totais mensais: R$ ${totalExpenses.toFixed(2)}
- Parcelas de dívidas mensais: R$ ${monthlyDebtPayments.toFixed(2)}
- Fluxo de caixa líquido: R$ ${netCashFlow.toFixed(2)}
- Taxa de poupança: ${savingsRate.toFixed(1)}%
- Total de dívidas: R$ ${totalDebts.toFixed(2)}
- Total de patrimônio: R$ ${totalAssets.toFixed(2)}
- Patrimônio líquido: R$ ${(totalAssets - totalDebts).toFixed(2)}
${diagnosis ? `- Classificação de risco: ${diagnosis.risk_classification || "N/A"}` : ""}

💰 RENDAS:
${incomes.map(i => `- ${i.description}: R$ ${Number(i.amount).toFixed(2)} (${i.frequency})`).join("\n") || "- Nenhuma renda cadastrada"}

💳 DESPESAS POR CATEGORIA:
${expenses.map(e => `- ${e.category}: R$ ${Number(e.amount).toFixed(2)} ${e.is_fixed ? "(fixa)" : "(variável)"}`).join("\n") || "- Nenhuma despesa cadastrada"}

🔴 DÍVIDAS:
${debts.map(d => `- ${d.type}${d.creditor ? ` (${d.creditor})` : ""}: R$ ${Number(d.total_amount).toFixed(2)}, parcela R$ ${Number(d.monthly_payment || 0).toFixed(2)}, juros ${d.interest_rate || 0}% a.m., ${d.remaining_months || "?"} meses restantes`).join("\n") || "- Nenhuma dívida cadastrada"}

🏠 PATRIMÔNIO:
${assets.map(a => `- ${a.type}${a.description ? ` (${a.description})` : ""}: R$ ${Number(a.estimated_value).toFixed(2)}`).join("\n") || "- Nenhum ativo cadastrado"}

🛡️ SEGUROS:
${insurance.map(i => `- ${i.type}${i.provider ? ` (${i.provider})` : ""}: prêmio R$ ${Number(i.monthly_premium || 0).toFixed(2)}/mês, cobertura R$ ${Number(i.coverage_amount || 0).toFixed(2)}`).join("\n") || "- Nenhum seguro cadastrado"}

🎯 OBJETIVOS:
${goals.map(g => `- ${g.description}: R$ ${Number(g.target_amount || 0).toFixed(2)}, prioridade ${g.priority || "N/A"}, prazo ${g.deadline || "N/A"}`).join("\n") || "- Nenhum objetivo cadastrado"}
`.trim();

    const hasNotes = content && content.trim().length > 0;
    const hasSnapshots = snapshots.length > 0;

    const fmtBR = (n?: number) =>
      typeof n === "number"
        ? `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
        : "";

    const snapshotsBlock = hasSnapshots
      ? `

🎯 ITENS MARCADOS PELO CONSULTOR NO PARECER (foco prioritário):
O consultor inseriu referências explícitas a estes dados do onboarding ao escrever o parecer. Trate-os como pontos centrais da análise — as ações sugeridas devem endereçar diretamente estes itens.

${snapshots
  .map((s, i) => {
    const label = String(s.label ?? "").slice(0, 200);
    const valPart = s.value && s.value > 0 ? ` · ${fmtBR(Number(s.value))}` : "";
    const sourceLabel =
      {
        client: "Cliente",
        income: "Renda",
        expense: "Despesa",
        debt: "Dívida",
        asset: "Patrimônio",
        insurance: "Proteção",
        goal: "Objetivo",
      }[String(s.source ?? "")] || s.source || "Item";
    const kindLabel = s.kind === "group" ? " (categoria inteira)" : "";
    return `${i + 1}. [${sourceLabel}${kindLabel}] ${label}${valPart}`;
  })
  .join("\n")}`
      : "";

    const systemPrompt = `Você é um consultor financeiro sênior especializado em planejamento financeiro pessoal no Brasil. Analise os dados financeiros do cliente${hasNotes ? " junto com as observações do consultor" : ""} e gere um plano de ação completo e personalizado.

${financialSummary}${snapshotsBlock}

INSTRUÇÕES:
- Gere entre 3 e 8 ações concretas e prioritárias
- Priorize ações de alto impacto financeiro
- Retorne APENAS usando a função extract_suggestions
- IMPORTANTE: Cada ação DEVE estar vinculada a um dos objetivos do cliente. Use "goal_description" com a descrição exata do objetivo. Foque em COMO atingir cada objetivo.

Para cada action_item:
- area: "renda" | "despesas" | "dividas" | "investimentos" | "protecao" | "impostos"
- description: descrição clara e específica da ação
- objective: resultado esperado
- financial_impact: impacto financeiro mensal estimado em reais
- goal_description: descrição do objetivo do cliente ao qual esta ação se vincula

Para cada investment_recommendation:
- product_name: nome específico do produto
- product_type: "renda_fixa" | "renda_variavel" | "multimercado" | "cambial" | "cripto"
- risk_level: "baixo" | "moderado" | "alto"
- invested_amount: valor sugerido em reais
- rationale: justificativa
- expected_return: retorno esperado (texto)`;

    const userMessage = hasNotes
      ? `Observações do consultor:\n\n${content}\n\nCom base nos dados financeiros e nas observações acima, gere o plano de ação.`
      : `Com base exclusivamente nos dados financeiros do cliente acima, gere um plano de ação completo.`;

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
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_suggestions",
              description: "Extract action items and investment recommendations",
              parameters: {
                type: "object",
                properties: {
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string", enum: ["renda", "despesas", "dividas", "investimentos", "protecao", "impostos"] },
                        description: { type: "string" },
                        objective: { type: "string" },
                        financial_impact: { type: "number" },
                        goal_description: { type: "string", description: "Descrição do objetivo do cliente vinculado" },
                      },
                      required: ["area", "description", "objective", "financial_impact", "goal_description"],
                      additionalProperties: false,
                    },
                  },
                  investment_recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_name: { type: "string" },
                        product_type: { type: "string", enum: ["renda_fixa", "renda_variavel", "multimercado", "cambial", "cripto"] },
                        risk_level: { type: "string", enum: ["baixo", "moderado", "alto"] },
                        invested_amount: { type: "number" },
                        rationale: { type: "string" },
                        expected_return: { type: "string" },
                      },
                      required: ["product_name", "product_type", "risk_level", "invested_amount", "rationale"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["action_items", "investment_recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao analisar com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou sugestões" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-notes error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
