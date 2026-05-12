// V9: Diagnostico — IA analisa os dados financeiros do cliente e
// retorna pontos criticos, oportunidades e alertas.
// Dispara automaticamente ao abrir o Diagnostico.
//
// Input:  { clientId }
// Output: {
//   insights: Array<{
//     kind: "critico" | "oportunidade" | "alerta" | "ponto_forte",
//     severity: "alta" | "media" | "baixa",
//     title, description,
//     metric_value?, metric_label?,
//     suggested_action?
//   }>,
//   summary: string  // 1-2 frases resumo do estado geral
// }

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

    const [incomeRes, expensesRes, debtsRes, assetsRes, insuranceRes, goalsRes, clientRes] = await Promise.all([
      serviceClient.from("income").select("amount, description, frequency, stability").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount, category, is_fixed, description").eq("client_id", clientId),
      serviceClient
        .from("debts")
        .select("total_amount, type, monthly_payment, interest_rate, remaining_months, creditor")
        .eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value, type, description").eq("client_id", clientId),
      serviceClient.from("insurance").select("type, monthly_premium, coverage_amount, provider").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      serviceClient.from("clients").select("marital_status, dependents_count, profession, date_of_birth").eq("id", clientId).maybeSingle(),
    ]);

    const incomes = incomeRes.data || [];
    const expenses = expensesRes.data || [];
    const debts = debtsRes.data || [];
    const assets = assetsRes.data || [];
    const insurance = insuranceRes.data || [];
    const goals = goalsRes.data || [];
    const clientData = clientRes.data;

    const totalIncome = incomes.reduce((s, i) => {
      const a = Number(i.amount) || 0;
      return s + (i.frequency === "anual" ? a / 12 : a);
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalDebts = debts.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
    const totalAssets = assets.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0);
    const monthlyDebtPayments = debts.reduce((s, d) => s + (Number(d.monthly_payment) || 0), 0);
    const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
    const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;
    const debtRatio = totalIncome > 0 ? (monthlyDebtPayments / totalIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    const hasMinData = totalIncome > 0 || expenses.length > 0 || debts.length > 0 || assets.length > 0;
    if (!hasMinData) {
      return new Response(
        JSON.stringify({
          insights: [],
          summary: "Sem dados suficientes do onboarding para diagnóstico — verifique a coleta inicial.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

INDICADORES PRINCIPAIS:
- Renda líquida mensal: R$ ${totalIncome.toFixed(0)}
- Despesas mensais: R$ ${totalExpenses.toFixed(0)}
- Parcelas de dívidas: R$ ${monthlyDebtPayments.toFixed(0)}
- Saldo líquido mensal: R$ ${netCashFlow.toFixed(0)}
- Taxa de poupança: ${savingsRate.toFixed(1)}%
- Comprometimento c/ dívidas: ${debtRatio.toFixed(1)}% da renda
- Despesas/renda: ${expenseRatio.toFixed(1)}%
- Patrimônio total: R$ ${totalAssets.toFixed(0)}
- Dívidas totais: R$ ${totalDebts.toFixed(0)}
- Patrimônio líquido: R$ ${(totalAssets - totalDebts).toFixed(0)}
- Reserva atual em meses de despesa: ${emergencyMonths.toFixed(1)}

DETALHAMENTO DESPESAS:
${expenses.map((e) => `- ${e.category}: R$ ${Number(e.amount).toFixed(0)} ${e.is_fixed ? "(fixa)" : "(variável)"}`).join("\n") || "- Sem despesas cadastradas"}

DÍVIDAS:
${debts.map((d) => `- ${d.type}${d.creditor ? ` (${d.creditor})` : ""}: saldo R$ ${Number(d.total_amount).toFixed(0)}, parcela R$ ${Number(d.monthly_payment || 0).toFixed(0)}, juros ${d.interest_rate || 0}% a.m.`).join("\n") || "- Sem dívidas"}

PATRIMÔNIO:
${assets.map((a) => `- ${a.type}${a.description ? ` (${a.description})` : ""}: R$ ${Number(a.estimated_value).toFixed(0)}`).join("\n") || "- Sem patrimônio"}

PROTEÇÃO/SEGUROS:
${insurance.map((i) => `- ${i.type}${i.provider ? ` (${i.provider})` : ""}: prêmio R$ ${Number(i.monthly_premium || 0).toFixed(0)}/mês, cobertura R$ ${Number(i.coverage_amount || 0).toFixed(0)}`).join("\n") || "- Sem seguros cadastrados"}

OBJETIVOS:
${goals.map((g) => `- ${g.description}: R$ ${Number(g.target_amount || 0).toFixed(0)} · prio ${g.priority || "N/A"} · prazo ${g.deadline || "N/A"}`).join("\n") || "- Sem objetivos cadastrados"}
`.trim();

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro. Faça um DIAGNÓSTICO objetivo da saúde financeira do cliente com base nos dados do onboarding abaixo.

Retorne SOMENTE via a função return_diagnosis, com:
1. summary: 1-2 frases que resumem o estado geral (ex: "Cliente com poupança saudável de 22%, mas exposto a dívidas de cartão com juros altos. Reserva de emergência ainda insuficiente.")
2. insights: 3 a 7 itens distribuídos entre:
   - "critico": problema grave que precisa de atenção imediata (severidade alta)
   - "alerta": ponto de atenção que pode evoluir mal se não tratado (severidade média)
   - "oportunidade": ação que pode trazer ganho relevante (severidade média/baixa)
   - "ponto_forte": algo que está bem (severidade baixa)

REGRAS:
- Cada insight DEVE citar números reais (valores, percentuais, dívidas específicas)
- title: frase curta (max 80 caracteres)
- description: explicação em 1-2 frases CITANDO O DADO
- metric_value: número numérico relevante (R$ ou %) — opcional, use quando há um valor único de destaque
- metric_label: rótulo curto do número (ex: "R$/mês economizáveis", "% comprometimento")
- suggested_action: sugestão concreta do próximo passo — opcional mas recomendado para "critico", "alerta" e "oportunidade"
- Priorize por severidade (alta primeiro)
- Não invente dados que não estão no contexto abaixo

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
          { role: "user", content: "Gere o diagnóstico inicial deste cliente." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_diagnosis",
              description: "Returns financial diagnosis insights for the client",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Resumo em 1-2 frases" },
                  insights: {
                    type: "array",
                    minItems: 3,
                    maxItems: 7,
                    items: {
                      type: "object",
                      properties: {
                        kind: {
                          type: "string",
                          enum: ["critico", "alerta", "oportunidade", "ponto_forte"],
                        },
                        severity: { type: "string", enum: ["alta", "media", "baixa"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        metric_value: { type: "number" },
                        metric_label: { type: "string" },
                        suggested_action: { type: "string" },
                      },
                      required: ["kind", "severity", "title", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_diagnosis" } },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar diagnóstico" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou diagnóstico" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-diagnosis error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
