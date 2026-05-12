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

    // ── INPUT (V9: novo contrato) ──
    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.clientId;
    const objective: string = (body.objective ?? "").toString().trim().slice(0, 500);
    const parecerId: string | null = body.parecerId || null;
    const customInstructions: string = (body.customInstructions ?? "").toString().trim().slice(0, 2000);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parecerId && !uuidRegex.test(parecerId)) {
      return new Response(JSON.stringify({ error: "parecerId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!objective) {
      return new Response(JSON.stringify({ error: "Defina um objetivo para o plano" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [
      incomeRes, expensesRes, debtsRes, assetsRes, goalsRes, insuranceRes, diagRes, clientRes, parecerRes,
    ] = await Promise.all([
      serviceClient.from("income").select("amount, description, frequency, stability").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount, category, is_fixed, description").eq("client_id", clientId),
      serviceClient.from("debts").select("total_amount, type, monthly_payment, interest_rate, remaining_months, creditor").eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value, type, description").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      serviceClient.from("insurance").select("type, monthly_premium, coverage_amount, provider").eq("client_id", clientId),
      serviceClient.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
      serviceClient.from("clients").select("marital_status, dependents_count, profession, date_of_birth").eq("id", clientId).maybeSingle(),
      parecerId
        ? serviceClient.from("consultant_notes").select("title, content, snapshots").eq("id", parecerId).eq("client_id", clientId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const incomes = incomeRes.data || [];
    const expenses = expensesRes.data || [];
    const debts = debtsRes.data || [];
    const assets = assetsRes.data || [];
    const goals = goalsRes.data || [];
    const insurance = insuranceRes.data || [];
    const diagnosis = diagRes.data;
    const clientData = clientRes.data;
    const parecer = parecerRes.data as { title?: string; content?: string; snapshots?: unknown } | null;

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
    const emergencyMonths = totalExpenses > 0 ? totalAssets / totalExpenses : 0;

    const age = clientData?.date_of_birth
      ? Math.floor((Date.now() - new Date(clientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Extrai texto puro do parecer (HTML do contentEditable)
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const parecerText = parecer?.content ? stripHtml(parecer.content).slice(0, 3000) : "";
    const parecerSnapshots = Array.isArray(parecer?.snapshots) ? (parecer!.snapshots as any[]).slice(0, 40) : [];

    const financialContext = `
PERFIL DO CLIENTE:
- Idade: ${age ? `${age} anos` : "N/A"}
- Estado civil: ${clientData?.marital_status || "N/A"}
- Dependentes: ${clientData?.dependents_count ?? "N/A"}
- Profissão: ${clientData?.profession || "N/A"}

SITUAÇÃO FINANCEIRA:
- Renda mensal líquida: R$ ${totalIncome.toFixed(0)}
- Despesas mensais: R$ ${totalExpenses.toFixed(0)}
- Parcelas de dívidas: R$ ${monthlyDebtPayments.toFixed(0)}
- Fluxo de caixa líquido: R$ ${netCashFlow.toFixed(0)}
- Taxa de poupança: ${savingsRate.toFixed(0)}%
- Patrimônio total: R$ ${totalAssets.toFixed(0)}
- Dívidas totais: R$ ${totalDebts.toFixed(0)}
- Patrimônio líquido: R$ ${(totalAssets - totalDebts).toFixed(0)}
- Reserva atual: ${emergencyMonths.toFixed(1)} meses de despesas
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
${insurance.map(i => `- ${i.type}${i.provider ? ` (${i.provider})` : ""}: prêmio R$ ${Number(i.monthly_premium || 0).toFixed(0)}/mês, cobertura R$ ${Number(i.coverage_amount || 0).toFixed(0)}`).join("\n") || "- Sem seguros"}

OBJETIVOS DO CLIENTE:
${goals.map(g => `- ${g.description}: R$ ${Number(g.target_amount || 0).toFixed(0)}, prioridade ${g.priority || "N/A"}, prazo ${g.deadline || "N/A"}`).join("\n") || "- Sem objetivos cadastrados"}
`.trim();

    const parecerBlock = parecer
      ? `

PARECER TÉCNICO DO CONSULTOR (referência):
Título: ${parecer.title || "(sem título)"}
${parecerText || "(parecer sem texto)"}
${parecerSnapshots.length > 0
  ? `\nItens marcados no parecer:\n${parecerSnapshots
      .map((s: any, i: number) => `  ${i + 1}. [${s.source || "?"}] ${s.label || ""}${s.value ? ` · R$ ${Number(s.value).toFixed(0)}` : ""}`)
      .join("\n")}`
  : ""}`
      : "";

    const instructionsBlock = customInstructions
      ? `\n\nINSTRUÇÕES ADICIONAIS DO CONSULTOR:\n${customInstructions}`
      : "";

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro. Sua missão é gerar EXATAMENTE TRÊS planos de ação completos e DISTINTOS para alcançar o objetivo definido pelo consultor.

Cada plano deve ser uma estratégia coerente e auto-suficiente, com 5 a 10 ações concretas que, executadas em ordem, levam ao objetivo. As três variantes devem representar três ângulos diferentes do mesmo objetivo:

- PLANO A — Cauteloso: caminho sustentável, sem grandes sacrifícios, prioriza segurança e estabilidade. Aceita prazo maior.
- PLANO B — Equilibrado: mix balanceado entre velocidade e conforto. Atinge o objetivo num prazo médio com ajustes moderados.
- PLANO C — Acelerado: foco máximo no objetivo, aceita cortes mais agressivos e maior empenho. Prazo curto.

REGRAS:
1. Cada ação DEVE citar dados reais do cliente (valores específicos das despesas, dívidas, renda)
2. financial_impact é o impacto MENSAL estimado em reais (positivo se libera caixa, negativo se exige novo aporte)
3. deadline_offset_days é dias a contar de hoje para concluir a ação (ex: 30, 60, 90)
4. area: "renda" | "despesas" | "dividas" | "investimentos" | "protecao" | "impostos"
5. NÃO repita a mesma ação entre os 3 planos — cada plano tem ações específicas para sua estratégia
6. O title do plano deve ser curto (3-6 palavras) refletindo a estratégia
7. O approach deve explicar em 2-3 frases COMO a estratégia atinge o objetivo
8. O horizon_months é o prazo realista (em meses) para concluir o plano

OBJETIVO DEFINIDO PELO CONSULTOR:
"${objective}"

${financialContext}${parecerBlock}${instructionsBlock}

Retorne APENAS via a função return_plans com os 3 planos.`;

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
          { role: "user", content: "Gere os 3 planos para o objetivo acima." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_plans",
              description: "Returns exactly 3 complete action plans (A, B, C) for the given objective",
              parameters: {
                type: "object",
                properties: {
                  plans: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        letter: { type: "string", enum: ["A", "B", "C"] },
                        title: { type: "string", description: "Resumo curto da estratégia (3-6 palavras)" },
                        approach: { type: "string", description: "Descrição da estratégia em 2-3 frases" },
                        horizon_months: { type: "number", description: "Prazo realista do plano em meses" },
                        monthly_impact: { type: "number", description: "Impacto financeiro mensal médio (R$)" },
                        actions: {
                          type: "array",
                          minItems: 5,
                          maxItems: 10,
                          items: {
                            type: "object",
                            properties: {
                              area: { type: "string", enum: ["renda", "despesas", "dividas", "investimentos", "protecao", "impostos"] },
                              description: { type: "string" },
                              objective: { type: "string", description: "Resultado esperado desta ação" },
                              financial_impact: { type: "number" },
                              deadline_offset_days: { type: "number", description: "Dias a partir de hoje para concluir" },
                            },
                            required: ["area", "description", "objective", "financial_impact", "deadline_offset_days"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["letter", "title", "approach", "horizon_months", "monthly_impact", "actions"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["plans"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_plans" } },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar planos" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou planos" }), {
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
