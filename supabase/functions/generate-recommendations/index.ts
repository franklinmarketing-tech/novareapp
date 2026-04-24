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

    const { clientId, riskProfile } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [incomeRes, expensesRes, debtsRes, assetsRes, goalsRes, insuranceRes, diagRes, clientRes] = await Promise.all([
      serviceClient.from("income").select("amount, description, frequency, stability").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount, category, is_fixed, description").eq("client_id", clientId),
      serviceClient.from("debts").select("total_amount, type, monthly_payment, interest_rate, remaining_months, creditor").eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value, type, description").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      serviceClient.from("insurance").select("type, monthly_premium, coverage_amount, provider").eq("client_id", clientId),
      serviceClient.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
      serviceClient.from("clients").select("marital_status, dependents_count, profession, date_of_birth, behavioral_profile").eq("id", clientId).maybeSingle(),
    ]);

    const incomes = incomeRes.data || [];
    const expenses = expensesRes.data || [];
    const debts = debtsRes.data || [];
    const assets = assetsRes.data || [];
    const goals = goalsRes.data || [];
    const insurance = insuranceRes.data || [];
    const diagnosis = diagRes.data;
    const clientData = clientRes.data;

    const totalIncome = incomes.reduce((s, i) => {
      const amt = Number(i.amount);
      return s + (i.frequency === "anual" ? amt / 12 : amt);
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalDebts = debts.reduce((s, d) => s + Number(d.total_amount), 0);
    const totalAssets = assets.reduce((s, a) => s + Number(a.estimated_value), 0);
    const monthlyDebtPayments = debts.reduce((s, d) => s + Number(d.monthly_payment || 0), 0);
    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome * 100) : 0;
    const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;

    // Check if there's enough data to generate meaningful recommendations
    const hasMinData = totalIncome > 0 || totalAssets > 0 || totalDebts > 0 || expenses.length > 0;
    if (!hasMinData) {
      return new Response(JSON.stringify({ recommendations: [], message: "Dados insuficientes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const age = clientData?.date_of_birth
      ? Math.floor((Date.now() - new Date(clientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const financialContext = `
PERFIL DO CLIENTE:
- Idade: ${age ? `${age} anos` : "N/A"}
- Estado civil: ${clientData?.marital_status || "N/A"}
- Dependentes: ${clientData?.dependents_count ?? "N/A"}
- Profissão: ${clientData?.profession || "N/A"}
- Perfil comportamental: ${clientData?.behavioral_profile ? JSON.stringify(clientData.behavioral_profile) : "N/A"}
- Perfil de risco: ${riskProfile || "balanceado"}

SITUAÇÃO FINANCEIRA:
- Renda mensal: R$ ${totalIncome.toFixed(0)}
- Despesas mensais: R$ ${totalExpenses.toFixed(0)}
- Parcelas de dívidas: R$ ${monthlyDebtPayments.toFixed(0)}
- Fluxo de caixa líquido: R$ ${netCashFlow.toFixed(0)}
- Taxa de poupança: ${savingsRate.toFixed(0)}%
- Patrimônio total: R$ ${totalAssets.toFixed(0)}
- Dívidas totais: R$ ${totalDebts.toFixed(0)}
- Patrimônio líquido: R$ ${(totalAssets - totalDebts).toFixed(0)}
- Reserva de emergência: ${emergencyMonths.toFixed(1)} meses de despesas
${diagnosis?.risk_classification ? `- Classificação de risco: ${diagnosis.risk_classification}` : ""}

DETALHAMENTO DE RENDAS:
${incomes.map(i => `- ${i.description}: R$ ${Number(i.amount).toFixed(0)} (${i.frequency}, estabilidade: ${i.stability || "N/A"})`).join("\n") || "- Sem rendas cadastradas"}

DESPESAS POR CATEGORIA:
${expenses.map(e => `- ${e.category}: R$ ${Number(e.amount).toFixed(0)} ${e.is_fixed ? "(fixa)" : "(variável)"}`).join("\n") || "- Sem despesas"}

DÍVIDAS:
${debts.map(d => `- ${d.type}${d.creditor ? ` (${d.creditor})` : ""}: saldo R$ ${Number(d.total_amount).toFixed(0)}, parcela R$ ${Number(d.monthly_payment || 0).toFixed(0)}, juros ${d.interest_rate || 0}% a.m., ${d.remaining_months || "?"} meses`).join("\n") || "- Sem dívidas"}

PATRIMÔNIO:
${assets.map(a => `- ${a.type}${a.description ? ` (${a.description})` : ""}: R$ ${Number(a.estimated_value).toFixed(0)}`).join("\n") || "- Sem patrimônio"}

SEGUROS:
${insurance.map(i => `- ${i.type}${i.provider ? ` (${i.provider})` : ""}: R$ ${Number(i.monthly_premium || 0).toFixed(0)}/mês`).join("\n") || "- Sem seguros"}

OBJETIVOS:
${goals.map(g => `- ${g.description}: R$ ${Number(g.target_amount || 0).toFixed(0)}, prioridade ${g.priority || "N/A"}, prazo ${g.deadline || "N/A"}`).join("\n") || "- Sem objetivos"}
`.trim();

    const hasGoals = goals.length > 0;

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro especializado em planejamento financeiro pessoal. Sua função é analisar os dados financeiros reais do cliente e gerar recomendações personalizadas e acionáveis.

REGRAS CRÍTICAS:
1. Cada recomendação DEVE ser fundamentada em dados reais do cliente — nunca genérica
2. Cite números específicos do cliente na descrição (ex: "Suas despesas com moradia consomem 45% da renda")
3. O objetivo deve ser concreto e mensurável
4. O impacto financeiro deve ser calculado com base nos dados reais
5. Priorize ações de maior impacto financeiro primeiro
6. Considere o perfil de risco do cliente: ${riskProfile || "balanceado"}
7. Gere entre 3 e 6 recomendações
8. A severity deve refletir urgência real: "alta" = precisa agir agora, "media" = importante mas não urgente, "baixa" = oportunidade de otimização
9. Para cada recomendação, inclua 2 a 4 sub-tarefas concretas e sequenciais que detalham COMO executar a ação principal

ALINHAMENTO COM OBJETIVOS DO CLIENTE (REGRA PRINCIPAL):
${hasGoals
  ? `10. O cliente possui objetivos cadastrados (listados abaixo). PRIORIZE recomendações que ajudem a atingi-los. Para cada uma:
    - Se a recomendação avança um objetivo existente, copie em "goal_description" a descrição EXATA do objetivo do cliente (sem reformular).
    - Se você identificar uma oportunidade financeira relevante (ex: dívida cara, falta de reserva de emergência, ausência de seguro essencial, oportunidade tributária) que NÃO está coberta pelos objetivos atuais e cuja não-ação prejudica o cliente, gere a recomendação mesmo assim e em "goal_description" proponha um NOVO objetivo curto, claro e mensurável (ex: "Quitar cartão de crédito em 12 meses", "Construir reserva de emergência de 6 meses").
11. Tente cobrir TODOS os objetivos importantes do cliente — não deixe um objetivo prioritário sem pelo menos uma recomendação.`
  : `10. O cliente NÃO possui objetivos cadastrados. Para cada recomendação, proponha em "goal_description" um objetivo financeiro novo, claro e mensurável que faça sentido com a ação sugerida (ex: "Quitar cartão em 12 meses", "Construir reserva de 6 meses de despesas", "Investir 20% da renda mensal").`}
12. As recomendações devem sempre focar em COMO atingir os objetivos (existentes ou propostos).

${financialContext}`;

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
          { role: "user", content: "Analise os dados financeiros acima e gere recomendações personalizadas e acionáveis para este cliente." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recommendations",
              description: "Return personalized financial recommendations based on client data",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string", enum: ["renda", "despesas", "dividas", "investimentos", "protecao", "impostos"] },
                        description: { type: "string", description: "Descrição específica citando dados reais do cliente" },
                        objective: { type: "string", description: "Resultado esperado concreto e mensurável" },
                        financial_impact: { type: "number", description: "Impacto financeiro mensal estimado em reais" },
                        goal_description: { type: "string", description: "Descrição exata do objetivo do cliente ao qual esta recomendação se vincula" },
                        severity: { type: "string", enum: ["alta", "media", "baixa"] },
                        subtasks: {
                          type: "array",
                          description: "2 a 4 sub-tarefas concretas e sequenciais para executar esta recomendação",
                          items: {
                            type: "object",
                            properties: {
                              description: { type: "string", description: "Ação concreta e específica" },
                              objective: { type: "string", description: "Resultado esperado desta sub-tarefa" },
                            },
                            required: ["description"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["area", "description", "objective", "financial_impact", "severity", "subtasks", "goal_description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recommendations" } },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar recomendações" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou recomendações" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recommendations error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
