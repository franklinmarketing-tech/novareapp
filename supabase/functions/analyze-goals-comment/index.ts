// Gera um comentário em texto simples sobre o alcance das metas e objetivos
// do cliente, usando OpenAI (gpt-4o-mini). Retorna { comment: string }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeDateOnly = (value?: string | null) => value?.slice(0, 10) ?? null;

const preferMonthRows = <T extends { month_ref?: string | null }>(rows: T[], monthRef?: string): T[] => {
  if (!monthRef) return rows;
  const exactRows = rows.filter((row) => normalizeDateOnly(row.month_ref) === monthRef);
  if (exactRows.length > 0) return exactRows;
  return rows.filter((row) => !row.month_ref);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: claimsData.claims.sub, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.clientId;
    const periodLabel: string | undefined = body.periodLabel;
    const monthStart: string | undefined = body.monthStart; // 'YYYY-MM-01'
    const monthEnd: string | undefined = body.monthEnd;     // 'YYYY-MM-01' do próximo mês

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const monthFilter = monthStart ? `month_ref.is.null,month_ref.eq.${monthStart}` : undefined;
    const goalsQuery = service
      .from("goals")
      .select("id, description, target_amount, priority, deadline, amount_applied, month_ref")
      .eq("client_id", clientId);

    const [goalsRes, plansRes, metasRes, profileLookup] = await Promise.all([
      monthFilter ? goalsQuery.or(monthFilter) : goalsQuery,
      service.from("action_plans").select("id, objective, applied_variant, applied_at").eq("client_id", clientId).maybeSingle(),
      service.from("parecer_metas").select("id, source_label, meta_valor, meta_text, prazo").eq("client_id", clientId),
      service.from("clients").select("user_id").eq("id", clientId).maybeSingle(),
    ]);

    const userId = profileLookup.data?.user_id ?? "00000000-0000-0000-0000-000000000000";
    const { data: profile } = await service.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();

    const goals = preferMonthRows((goalsRes.data || []) as any[], monthStart);
    const plan = plansRes.data;
    const metas = metasRes.data || [];

    let actions: any[] = [];
    if (plan?.id) {
      let actionsQuery = service.from("action_items")
        .select("description, status, financial_impact, objective, goal_id, month_ref")
        .eq("action_plan_id", plan.id);
      if (monthFilter) actionsQuery = actionsQuery.or(monthFilter);
      const { data } = await actionsQuery;
      actions = preferMonthRows((data || []) as any[], monthStart);
    }

    let acompQuery = service.from("acompanhamento_entradas")
      .select("meta_id, valor_atual, estado_atual, progresso_pct, snapshotted_at")
      .eq("client_id", clientId)
      .order("snapshotted_at", { ascending: false });
    if (monthStart && monthEnd) {
      acompQuery = acompQuery.gte("snapshotted_at", monthStart).lt("snapshotted_at", monthEnd);
    }
    const { data: acomp } = await acompQuery;

    const latestByMeta: Record<string, any> = {};
    (acomp || []).forEach((e: any) => {
      if (e.meta_id && !latestByMeta[e.meta_id]) latestByMeta[e.meta_id] = e;
    });

    const totalActions = actions.length;
    const doneActions = actions.filter((a) => a.status === "concluido").length;
    const planPct = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

    const goalsCtx = goals.map((g: any) => {
      const related = actions.filter((a) => a.goal_id === g.id);
      const done = related.filter((a) => a.status === "concluido").length;
      const pct = related.length > 0 ? Math.round((done / related.length) * 100) : 0;
      const applied = Number(g.amount_applied || 0);
      const target = Number(g.target_amount || 0);
      const pctApplied = target > 0 ? Math.round((applied / target) * 100) : null;
      return `- ${g.description} | meta: R$ ${target.toFixed(0)} | aplicado: R$ ${applied.toFixed(0)}${pctApplied != null ? ` (${pctApplied}%)` : ""} | prazo: ${g.deadline || "—"} | ações: ${done}/${related.length} (${pct}%)`;
    }).join("\n") || "- (sem objetivos cadastrados)";

    const metasCtx = metas.map((m: any) => {
      const last = latestByMeta[m.id];
      const meta = m.meta_valor != null ? `R$ ${Number(m.meta_valor).toFixed(0)}` : (m.meta_text || "—");
      const atual = last?.valor_atual != null ? `R$ ${Number(last.valor_atual).toFixed(0)}` : (last?.estado_atual || "sem registro");
      const pct = last?.progresso_pct != null ? `${last.progresso_pct}%` : "—";
      return `- ${m.source_label} | meta: ${meta} | atual: ${atual} | alcance: ${pct}`;
    }).join("\n") || "- (sem metas técnicas registradas)";

    const systemPrompt = `Você é o consultor financeiro do cliente, escrevendo uma mensagem pessoal e direta PARA ELE no relatório, como quem conversa olho no olho.

Escreva em PORTUGUÊS, em 2ª pessoa (use "você"), tom caloroso, motivador e celebratório — como um consultor que acompanha de perto e está orgulhoso da evolução do cliente. Dê os parabéns pelas conquistas, reconheça o esforço, mostre que ele está evoluindo, e incentive os próximos passos com confiança. Evite jargão frio e relatório impessoal.

Texto simples (sem markdown, sem bullets, sem títulos). 2 a 4 parágrafos curtos, totalizando 150 a 280 palavras.

Estrutura sugerida (fluida, não rotule):
1. Cumprimento + reconhecimento do progresso geral (cite o % de ações concluídas de forma natural).
2. Parabenize pelas metas com maior alcance, citando percentuais reais.
3. Aponte com leveza onde ainda há espaço para evoluir, sempre encorajando.
4. Finalize com uma mensagem de incentivo e os próximos focos combinados.

Não invente números; use apenas os fornecidos abaixo. Nunca fale "o cliente" — fale diretamente com ele.`;

    const userPrompt = `CLIENTE: ${profile?.full_name || "—"}
${periodLabel ? `PERÍODO DE REFERÊNCIA: ${periodLabel}` : ""}

PLANO DE AÇÃO:
- Objetivo: ${plan?.objective || "—"}
- Variante aplicada: ${plan?.applied_variant || "—"}
- Progresso geral: ${doneActions}/${totalActions} ações (${planPct}%)

OBJETIVOS FINANCEIROS:
${goalsCtx}

METAS TÉCNICAS / ACOMPANHAMENTO:
${metasCtx}

Escreva o comentário final.`;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("Open IA GPT");
    if (!OPENAI_KEY) {
      return new Response(JSON.stringify({ error: "Chave OpenAI não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido na OpenAI" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar comentário (OpenAI)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const comment: string = aiJson.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ comment, planPct, doneActions, totalActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-goals-comment error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
