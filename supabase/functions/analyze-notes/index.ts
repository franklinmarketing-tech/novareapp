// V9: Parecer — IA gera um RASCUNHO de parecer tecnico (texto pronto)
// para o consultor revisar e inserir no editor. NAO sugere acoes — isso
// pertence ao Plano de Acao (generate-recommendations).
//
// Input:  { clientId, content?, snapshots? }
// Output: {
//   suggested_text: string,  // texto formatado em HTML simples (negrito, listas, paragrafos)
//   sections: [
//     { title: string, content: string }  // por secao para insercao granular
//   ],
//   key_findings: [
//     { kind: "atencao"|"oportunidade"|"forte", text: string }
//   ]
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
      authHeader.replace("Bearer ", ""),
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

    const { content, clientId, snapshots: rawSnapshots } = await req.json();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || typeof clientId !== "string" || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
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
    const snapshots: Array<{
      source?: string;
      kind?: string;
      label?: string;
      value?: number;
      meta?: Record<string, unknown>;
    }> = Array.isArray(rawSnapshots) ? rawSnapshots.slice(0, 60) : [];

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [incomeRes, expensesRes, debtsRes, assetsRes, goalsRes, insuranceRes, diagRes, clientRes] = await Promise.all([
      serviceClient.from("income").select("amount, description, frequency").eq("client_id", clientId),
      serviceClient.from("expenses").select("amount, category, is_fixed").eq("client_id", clientId),
      serviceClient.from("debts").select("total_amount, type, monthly_payment, interest_rate, remaining_months, creditor").eq("client_id", clientId),
      serviceClient.from("assets").select("estimated_value, type, description").eq("client_id", clientId),
      serviceClient.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      serviceClient.from("insurance").select("type, monthly_premium, coverage_amount, provider").eq("client_id", clientId),
      serviceClient.from("diagnosis").select("*").eq("client_id", clientId).maybeSingle(),
      serviceClient.from("clients").select("marital_status, dependents_count, profession, date_of_birth").eq("id", clientId).maybeSingle(),
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
      const a = Number(i.amount) || 0;
      return s + (i.frequency === "anual" ? a / 12 : a);
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalDebts = debts.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
    const monthlyDebtPayments = debts.reduce((s, d) => s + (Number(d.monthly_payment) || 0), 0);
    const totalAssets = assets.reduce((s, a) => s + (Number(a.estimated_value) || 0), 0);
    const netCashFlow = totalIncome - totalExpenses - monthlyDebtPayments;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

    const age = clientData?.date_of_birth
      ? Math.floor((Date.now() - new Date(clientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const fmtBR = (n?: number) =>
      typeof n === "number"
        ? `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        : "";

    const sourceLabel = (s?: string) =>
      ({
        client: "Cliente",
        income: "Renda",
        expense: "Despesa",
        debt: "Dívida",
        asset: "Patrimônio",
        insurance: "Proteção",
        goal: "Objetivo",
      }[String(s ?? "")] || s || "Item");

    const snapshotsBlock = snapshots.length > 0
      ? `

ITENS MARCADOS PELO CONSULTOR (foco do parecer):
O consultor selecionou os seguintes pontos para enderecar diretamente no parecer:
${snapshots
  .map((s, i) => {
    const val = s.value && s.value > 0 ? ` · ${fmtBR(Number(s.value))}` : "";
    const kind = s.kind === "group" ? " (categoria completa)" : "";
    return `${i + 1}. [${sourceLabel(s.source)}${kind}] ${s.label}${val}`;
  })
  .join("\n")}`
      : "";

    const notesBlock = content && typeof content === "string" && content.trim().length > 0
      ? `

OBSERVAÇÕES JÁ ESCRITAS PELO CONSULTOR (use como base):
${content.slice(0, 6000)}`
      : "";

    const financialContext = `
PERFIL FINANCEIRO DO CLIENTE:
- Idade: ${age ? `${age} anos` : "não informada"}
- Estado civil: ${clientData?.marital_status || "não informado"}
- Dependentes: ${clientData?.dependents_count ?? "não informado"}
- Profissão: ${clientData?.profession || "não informada"}

INDICADORES:
- Renda mensal: ${fmtBR(totalIncome)}
- Despesas mensais: ${fmtBR(totalExpenses)}
- Parcelas de dívidas: ${fmtBR(monthlyDebtPayments)}
- Saldo líquido mensal: ${fmtBR(netCashFlow)} (${savingsRate.toFixed(1)}% de poupança)
- Total de dívidas: ${fmtBR(totalDebts)}
- Patrimônio total: ${fmtBR(totalAssets)}
- Patrimônio líquido: ${fmtBR(totalAssets - totalDebts)}
${diagnosis?.risk_classification ? `- Classificação de risco: ${diagnosis.risk_classification}` : ""}

DETALHAMENTO DE DESPESAS:
${expenses.map(e => `- ${e.category}: ${fmtBR(Number(e.amount))} ${e.is_fixed ? "(fixa)" : "(variável)"}`).join("\n") || "- Sem despesas cadastradas"}

DÍVIDAS:
${debts.map(d => `- ${d.type}${d.creditor ? ` (${d.creditor})` : ""}: ${fmtBR(Number(d.total_amount))}, parcela ${fmtBR(Number(d.monthly_payment || 0))}, juros ${d.interest_rate || 0}% a.m.`).join("\n") || "- Sem dívidas"}

PATRIMÔNIO:
${assets.map(a => `- ${a.type}${a.description ? ` (${a.description})` : ""}: ${fmtBR(Number(a.estimated_value))}`).join("\n") || "- Sem patrimônio"}

SEGUROS:
${insurance.map(i => `- ${i.type}${i.provider ? ` (${i.provider})` : ""}: prêmio ${fmtBR(Number(i.monthly_premium || 0))}/mês, cobertura ${fmtBR(Number(i.coverage_amount || 0))}`).join("\n") || "- Sem seguros"}

OBJETIVOS DO CLIENTE:
${goals.map(g => `- ${g.description}: alvo ${fmtBR(Number(g.target_amount || 0))}, prioridade ${g.priority || "média"}, prazo ${g.deadline || "indefinido"}`).join("\n") || "- Sem objetivos cadastrados"}
`.trim();

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro escrevendo um PARECER TÉCNICO para entregar ao cliente. Sua tarefa NÃO é gerar plano de ação — é escrever um texto profissional, consultivo e empático que sintetize a situação do cliente.

REGRAS DO TEXTO:
1. Português brasileiro, tom profissional mas humano (NÃO use linguagem de robô)
2. SEMPRE cite números reais do cliente (valores, percentuais, dívidas específicas)
3. Estrutura em 3 a 5 seções com títulos curtos
4. Cada seção tem 2 a 5 frases bem escritas — NÃO use listas com bullets dentro do texto da seção
5. Comece pelo panorama geral, depois aprofunde nos pontos relevantes
6. NÃO sugira ações específicas ("o cliente deve fazer X") — isso é Plano de Ação
7. Você PODE descrever a situação e sinalizar oportunidades/atenções, mas em tom analítico
8. SE o consultor já escreveu algo (campo "OBSERVAÇÕES"), use como base e enriqueça — não substitua
9. SE há itens marcados pelo consultor (campo "ITENS MARCADOS"), priorize esses tópicos no parecer

OUTPUT EXIGIDO via função return_parecer:

- suggested_text: TEXTO COMPLETO formatado em HTML simples. Use APENAS:
  * <h3> para títulos de seção
  * <p> para parágrafos
  * <strong> para destaques (valores, nomes)
  * <em> para ênfase sutil
  NUNCA use <ul>/<ol>/<li>/<div>/<span>/<br>. Quebra de linha é via <p> separado.

- sections: array com a MESMA decomposição do texto (mesmas seções), para que o consultor possa inserir apenas algumas no editor. Cada seção tem:
  * title (3-5 palavras, sem <h3>)
  * content (HTML do conteúdo apenas, sem o título, com <p> e <strong> permitidos)

- key_findings: 3 a 6 pontos chave (frases curtas) classificados em "atencao", "oportunidade" ou "forte". Estes NÃO entram no texto — aparecem como cards laterais para o consultor decidir.

${financialContext}${snapshotsBlock}${notesBlock}`;

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
          {
            role: "user",
            content:
              "Gere o rascunho de parecer técnico para este cliente, seguindo as regras acima. Retorne via a função return_parecer.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_parecer",
              description: "Returns a draft of the consultant's parecer (technical opinion) for the client",
              parameters: {
                type: "object",
                properties: {
                  suggested_text: {
                    type: "string",
                    description: "Texto completo do parecer em HTML simples (h3, p, strong, em)",
                  },
                  sections: {
                    type: "array",
                    minItems: 3,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: {
                          type: "string",
                          description: "HTML do conteúdo da seção (p, strong, em apenas)",
                        },
                      },
                      required: ["title", "content"],
                      additionalProperties: false,
                    },
                  },
                  key_findings: {
                    type: "array",
                    minItems: 3,
                    maxItems: 6,
                    items: {
                      type: "object",
                      properties: {
                        kind: { type: "string", enum: ["atencao", "oportunidade", "forte"] },
                        text: { type: "string" },
                      },
                      required: ["kind", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggested_text", "sections", "key_findings"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_parecer" } },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar parecer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou parecer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
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
