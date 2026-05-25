// Gera um comentário em texto simples sobre o alcance das metas e objetivos
// do cliente, usando Lovable AI (Gemini). Retorna { comment: string }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!clientId || !uuidRegex.test(clientId)) {
      return new Response(JSON.stringify({ error: "clientId inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [goalsRes, plansRes, metasRes, profileRes] = await Promise.all([
      service.from("goals").select("description, target_amount, priority, deadline").eq("client_id", clientId),
      service.from("action_plans").select("id, objective, applied_variant, applied_at").eq("client_id", clientId).maybeSingle(),
      service.from("parecer_metas").select("id, source_label, meta_valor, meta_text, prazo").eq("client_id", clientId),
      service.from("profiles").select("full_name").eq("user_id",
        (await service.from("clients").select("user_id").eq("id", clientId).maybeSingle()).data?.user_id ?? "00000000-0000-0000-0000-000000000000"
      ).maybeSingle(),
    ]);

    const goals = goalsRes.data || [];
    const plan = plansRes.data;
    const metas = metasRes.data || [];

    let actions: any[] = [];
    if (plan?.id) {
      const { data } = await service.from("action_items")
        .select("description, status, financial_impact, objective, goal_id")
        .eq("action_plan_id", plan.id);
      actions = data || [];
    }

    // Últimos registros de acompanhamento por meta
    const { data: acomp } = await service.from("acompanhamento_entries")
      .select("meta_id, valor_atual, estado_atual, progresso_pct, snapshotted_at")
      .eq("client_id", clientId)
      .order("snapshotted_at", { ascending: false });

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
      return `- ${g.description} | meta: R$ ${Number(g.target_amount || 0).toFixed(0)} | prazo: ${g.deadline || "—"} | progresso: ${done}/${related.length} ações (${pct}%)`;
    }).join("\n") || "- (sem objetivos cadastrados)";

    const metasCtx = metas.map((m: any) => {
      const last = latestByMeta[m.id];
      const meta = m.meta_valor != null ? `R$ ${Number(m.meta_valor).toFixed(0)}` : (m.meta_text || "—");
      const atual = last?.valor_atual != null ? `R$ ${Number(last.valor_atual).toFixed(0)}` : (last?.estado_atual || "sem registro");
      const pct = last?.progresso_pct != null ? `${last.progresso_pct}%` : "—";
      return `- ${m.source_label} | meta: ${meta} | atual: ${atual} | alcance: ${pct}`;
    }).join("\n") || "- (sem metas técnicas registradas)";

    const systemPrompt = `Você é um consultor financeiro sênior brasileiro escrevendo um comentário final no relatório do cliente sobre o alcance das metas e objetivos.

Escreva em PORTUGUÊS, tom profissional, claro e empático. Texto simples (sem markdown, sem bullets, sem títulos). 2 a 4 parágrafos curtos, totalizando 150 a 280 palavras.

Conteúdo obrigatório:
1. Visão geral do progresso (% de ações concluídas, status do plano).
2. Destaque das metas com maior alcance e das que precisam de atenção, citando percentuais reais.
3. Avaliação do que o consultor está executando bem.
4. Recomendação curta dos próximos focos.

Não invente números; use os fornecidos abaixo.`;

    const userPrompt = `CLIENTE: ${profileRes.data?.full_name || "—"}

PLANO DE AÇÃO:
- Objetivo: ${plan?.objective || "—"}
- Variante aplicada: ${plan?.applied_variant || "—"}
- Progresso geral: ${doneActions}/${totalActions} ações (${planPct}%)

OBJETIVOS FINANCEIROS:
${goalsCtx}

METAS TÉCNICAS / ACOMPANHAMENTO:
${metasCtx}

Escreva o comentário final.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ error: "Erro ao gerar comentário" }), {
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
