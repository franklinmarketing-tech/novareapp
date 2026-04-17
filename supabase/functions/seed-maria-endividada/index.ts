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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    let body: any = {};
    try { body = await req.json(); } catch {}

    const email = body.email || "maria.endividada@novare.com";
    const password = body.password || "Maria@2026";
    const fullName = body.fullName || "Maria Aparecida Souza";

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (userErr && !userErr.message?.includes("already been registered")) throw userErr;

    let userId: string;
    if (userErr) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) throw new Error("User exists but not found");
      userId = existing.id;
    } else {
      userId = userData.user!.id;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const { data: clientRow } = await admin.from("clients").select("id").eq("user_id", userId).single();
    if (!clientRow) throw new Error("Client record not found after trigger");
    const clientId = clientRow.id;

    // === IDENTIFICAÇÃO + COMPORTAMENTAL ===
    await admin.from("clients").update({
      cpf: "123.456.789-10",
      date_of_birth: "1985-07-12",
      marital_status: "divorciada",
      property_regime: null,
      profession: "Auxiliar administrativa",
      company: "Comércio Local Ltda",
      years_in_profession: 12,
      city: "São Paulo",
      state: "SP",
      dependents_count: 2,
      dependents_ages: "8, 14",
      status: "em_acompanhamento",
      behavioral_profile: {
        financial_organization_score: 2,
        savings_discipline_score: 1,
        money_anxiety_score: 9,
        financial_confidence_score: 2,
        impulse_spending_score: 8,
        risk_tolerance_score: 2,
        spending_triggers: "Compras por impulso quando está estressada, parcelamentos no cartão para 'aliviar' o orçamento, presentes para os filhos por culpa do divórcio",
        family_money_history: "Pais sempre viveram endividados, nunca houve educação financeira em casa, dinheiro era assunto tabu",
        computed_profile: "Ansioso",
      },
    }).eq("id", clientId);

    await admin.from("profiles").update({ full_name: fullName, email }).eq("user_id", userId);

    // === RENDA: baixa e instável ===
    await admin.from("income").delete().eq("client_id", clientId);
    await admin.from("income").insert([
      { client_id: clientId, description: "Salário CLT - Auxiliar administrativa", amount: 2800, frequency: "mensal", stability: "alta", is_primary: true },
      { client_id: clientId, description: "Pensão alimentícia (filhos)", amount: 1200, frequency: "mensal", stability: "media", is_primary: false },
      { client_id: clientId, description: "Bicos de revenda de cosméticos", amount: 400, frequency: "mensal", stability: "baixa", is_primary: false },
    ]);
    // Total renda: R$ 4.400/mês

    // === DESPESAS: maiores que a renda ===
    await admin.from("expenses").delete().eq("client_id", clientId);
    await admin.from("expenses").insert([
      { client_id: clientId, category: "Moradia", description: "Aluguel apartamento 2 quartos", amount: 1800, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Condomínio + IPTU + água", amount: 450, is_fixed: true },
      { client_id: clientId, category: "Moradia", description: "Energia elétrica", amount: 280, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Supermercado", amount: 1200, is_fixed: false },
      { client_id: clientId, category: "Alimentação", description: "Delivery e fast food", amount: 450, is_fixed: false },
      { client_id: clientId, category: "Transporte", description: "Transporte público + Uber", amount: 380, is_fixed: false },
      { client_id: clientId, category: "Educação", description: "Material escolar e atividades dos filhos", amount: 350, is_fixed: false },
      { client_id: clientId, category: "Saúde", description: "Medicamentos e consultas particulares", amount: 280, is_fixed: false },
      { client_id: clientId, category: "Lazer", description: "Passeios com os filhos", amount: 200, is_fixed: false },
      { client_id: clientId, category: "Assinaturas", description: "Netflix, Spotify, celular", amount: 220, is_fixed: true },
      { client_id: clientId, category: "Vestuário", description: "Roupas (parceladas no cartão)", amount: 350, is_fixed: false },
      { client_id: clientId, category: "Dívidas", description: "Mínimo do cartão de crédito", amount: 800, is_fixed: true },
      { client_id: clientId, category: "Dívidas", description: "Parcelas do cheque especial", amount: 450, is_fixed: true },
      { client_id: clientId, category: "Dívidas", description: "Crediário lojas", amount: 320, is_fixed: true },
    ]);
    // Total despesas: R$ 7.530/mês — DÉFICIT de R$ 3.130/mês

    // === DÍVIDAS: cenário crítico de endividamento ===
    await admin.from("debts").delete().eq("client_id", clientId);
    await admin.from("debts").insert([
      { client_id: clientId, type: "Cartão de crédito rotativo", creditor: "Nubank", total_amount: 18500, monthly_payment: 800, interest_rate: 14.5, remaining_months: 36 },
      { client_id: clientId, type: "Cartão de crédito rotativo", creditor: "Itaucard", total_amount: 9800, monthly_payment: 450, interest_rate: 13.9, remaining_months: 30 },
      { client_id: clientId, type: "Cheque especial", creditor: "Banco do Brasil", total_amount: 4200, monthly_payment: 450, interest_rate: 8.2, remaining_months: 12 },
      { client_id: clientId, type: "Crediário (loja de móveis)", creditor: "Casas Bahia", total_amount: 3800, monthly_payment: 320, interest_rate: 4.5, remaining_months: 14 },
      { client_id: clientId, type: "Empréstimo consignado", creditor: "Caixa Econômica", total_amount: 12000, monthly_payment: 580, interest_rate: 2.1, remaining_months: 24 },
      { client_id: clientId, type: "Empréstimo familiar", creditor: "Irmã (sem juros)", total_amount: 5000, monthly_payment: 200, interest_rate: 0, remaining_months: 25 },
    ]);
    // Total dívidas: R$ 53.300

    // === PATRIMÔNIO: praticamente nulo ===
    await admin.from("assets").delete().eq("client_id", clientId);
    await admin.from("assets").insert([
      { client_id: clientId, type: "Veículo", description: "Fiat Uno 2010 (quitado)", estimated_value: 18000 },
      { client_id: clientId, type: "Eletrodomésticos", description: "Móveis e eletros da casa", estimated_value: 8000 },
      { client_id: clientId, type: "Poupança", description: "Conta poupança CEF (saldo mínimo)", estimated_value: 320 },
    ]);
    // Total patrimônio: R$ 26.320

    // === SEGUROS: nenhum ===
    await admin.from("insurance").delete().eq("client_id", clientId);
    // Maria não tem nenhum seguro — vulnerabilidade total

    // === OBJETIVOS: sair do vermelho ===
    await admin.from("goals").delete().eq("client_id", clientId);
    await admin.from("goals").insert([
      { client_id: clientId, description: "Quitar todas as dívidas de cartão e cheque especial", target_amount: 32500, priority: "alta", deadline: "2027-12-31" },
      { client_id: clientId, description: "Construir reserva de emergência de 3 meses", target_amount: 13200, priority: "alta", deadline: "2027-06-30" },
      { client_id: clientId, description: "Contratar plano de saúde para a família", target_amount: 800, priority: "media", deadline: "2026-09-30" },
      { client_id: clientId, description: "Voltar a estudar (técnico em administração)", target_amount: 4800, priority: "media", deadline: "2027-12-31" },
      { client_id: clientId, description: "Trocar o carro por um modelo mais novo", target_amount: 35000, priority: "baixa", deadline: "2030-12-31" },
    ]);

    // === DIAGNÓSTICO: situação crítica ===
    await admin.from("diagnosis").delete().eq("client_id", clientId);
    await admin.from("diagnosis").insert({
      client_id: clientId,
      total_income: 4400,
      total_expenses: 7530,
      total_assets: 26320,
      total_debts: 53300,
      savings_capacity: -3130,
      debt_ratio: 1211.4,
      risk_classification: "E",
      notes: "Cliente em situação crítica de endividamento. Despesas mensais 71% acima da renda, déficit de R$ 3.130/mês coberto via novas dívidas (rolagem). Patrimônio líquido negativo de R$ 26.980. Sem reserva de emergência, sem seguros, exposição total a imprevistos. Prioridade absoluta: estancar sangria de juros (cartão e cheque especial somam 27% da renda só em mínimos), renegociar dívidas e estabilizar orçamento antes de qualquer investimento.",
    });

    // === PLANO DE AÇÃO ===
    await admin.from("action_items").delete().in("action_plan_id",
      (await admin.from("action_plans").select("id").eq("client_id", clientId)).data?.map((p: any) => p.id) || []
    );
    await admin.from("action_plans").delete().eq("client_id", clientId);

    const { data: plan } = await admin.from("action_plans").insert({
      client_id: clientId, title: `Plano de Recuperação Financeira - ${fullName}`,
    }).select("id").single();

    const planId = plan!.id;

    const { data: parents } = await admin.from("action_items").insert([
      { action_plan_id: planId, area: "dividas", description: "Renegociar dívidas de cartão e cheque especial", objective: "Reduzir juros de 14% a.m. para parcelamento fixo", status: "em_andamento", deadline: "2026-06-30", financial_impact: 1800, responsible: "Novare" },
      { action_plan_id: planId, area: "despesas", description: "Cortar despesas não essenciais", objective: "Eliminar déficit mensal de R$ 3.130", status: "em_andamento", deadline: "2026-05-31", financial_impact: 1500, responsible: "Cliente" },
      { action_plan_id: planId, area: "renda", description: "Aumentar renda com nova fonte", objective: "Adicionar R$ 800-1.200/mês", status: "em_andamento", deadline: "2026-08-31", financial_impact: 1000, responsible: "Cliente" },
      { action_plan_id: planId, area: "protecao", description: "Contratar seguro básico de saúde", objective: "Proteger família contra emergências médicas", status: "pendente", deadline: "2026-09-30", financial_impact: 0, responsible: "Novare" },
      { action_plan_id: planId, area: "comportamento", description: "Acompanhamento comportamental quinzenal", objective: "Quebrar ciclo de compras por impulso", status: "em_andamento", deadline: "2026-12-31", financial_impact: 500, responsible: "Novare" },
    ]).select("id, area");

    if (parents) {
      const divida = parents.find(p => p.area === "dividas")!;
      const desp = parents.find(p => p.area === "despesas")!;
      const renda = parents.find(p => p.area === "renda")!;
      const comp = parents.find(p => p.area === "comportamento")!;

      await admin.from("action_items").insert([
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Listar todas as dívidas com taxas atualizadas", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Negociar Nubank: trocar rotativo por parcelamento", status: "em_andamento", responsible: "Novare" },
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Negociar Itaucard: portabilidade ou desconto à vista", status: "pendente", responsible: "Novare" },
        { action_plan_id: planId, parent_id: divida.id, area: "dividas", description: "Quitar cheque especial com consignado de menor juro", status: "pendente", responsible: "Cliente" },

        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Cancelar Netflix e reduzir Spotify para plano básico", status: "concluido", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Eliminar delivery: cozinhar marmitas em casa", status: "em_andamento", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Trocar mercado caro por atacado/feira", status: "em_andamento", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: desp.id, area: "despesas", description: "Suspender compras parceladas de roupas por 6 meses", status: "pendente", responsible: "Cliente" },

        { action_plan_id: planId, parent_id: renda.id, area: "renda", description: "Estruturar revenda de cosméticos como fonte fixa", status: "em_andamento", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: renda.id, area: "renda", description: "Buscar trabalho freelance administrativo aos fins de semana", status: "pendente", responsible: "Cliente" },

        { action_plan_id: planId, parent_id: comp.id, area: "comportamento", description: "Diário de gastos diário (app de controle)", status: "em_andamento", responsible: "Cliente" },
        { action_plan_id: planId, parent_id: comp.id, area: "comportamento", description: "Sessões quinzenais com consultor Novare", status: "em_andamento", responsible: "Novare" },
        { action_plan_id: planId, parent_id: comp.id, area: "comportamento", description: "Bloquear compras parceladas no app do cartão", status: "concluido", responsible: "Cliente" },
      ]);
    }

    // === SEM RECOMENDAÇÕES DE INVESTIMENTO (não faz sentido nesse momento) ===
    await admin.from("investment_recommendations").delete().eq("client_id", clientId);

    // === SESSÕES DE IMPLEMENTAÇÃO ===
    await admin.from("implementation_sessions").delete().eq("client_id", clientId);
    await admin.from("implementation_sessions").insert([
      { client_id: clientId, category: "ajuste_orcamento", title: "Diagnóstico inicial e mapeamento de dívidas", status: "concluido", session_date: "2025-11-20", notes: "Identificado endividamento crítico. Maria muito ansiosa com a situação." },
      { client_id: clientId, category: "renegociacao_dividas", title: "Primeira rodada de negociação Nubank", status: "concluido", session_date: "2026-01-15", notes: "Conseguimos parcelar rotativo em 24x com juros de 4,5% a.m. (era 14,5%)." },
      { client_id: clientId, category: "ajuste_orcamento", title: "Revisão de despesas fixas", status: "concluido", session_date: "2026-02-10", notes: "Cortamos R$ 380 em assinaturas e delivery." },
      { client_id: clientId, category: "renegociacao_dividas", title: "Negociação Itaucard em andamento", status: "em_andamento", session_date: "2026-03-25", notes: "Aguardando proposta de portabilidade." },
    ]);

    // === HISTÓRICO DE MONITORAMENTO ===
    await admin.from("monitoring_snapshots").delete().eq("client_id", clientId);
    await admin.from("monitoring_snapshots").insert([
      { client_id: clientId, snapshot_date: "2025-11-30", total_income: 4400, total_expenses: 8200, total_assets: 26000, total_debts: 58000, savings_rate: -86.4, emergency_reserve_months: 0.04, plan_completion_pct: 0 },
      { client_id: clientId, snapshot_date: "2026-01-31", total_income: 4400, total_expenses: 7900, total_assets: 26100, total_debts: 56200, savings_rate: -79.5, emergency_reserve_months: 0.04, plan_completion_pct: 15 },
      { client_id: clientId, snapshot_date: "2026-03-31", total_income: 4400, total_expenses: 7530, total_assets: 26320, total_debts: 53300, savings_rate: -71.1, emergency_reserve_months: 0.04, plan_completion_pct: 35 },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        clientId,
        userId,
        message: "Maria Endividada criada com cenário completo de superendividamento!"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seed-maria-endividada error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
